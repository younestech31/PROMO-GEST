import assert from 'node:assert/strict';
import test from 'node:test';
import { readAppHistoryIndex, withAppHistoryIndex } from '../app/browserHistory';
import {
  emptyProjectPreferences as emptyStoredProjectPreferences,
  recordRecentProjectId as recordStoredRecentProjectId,
  togglePinnedProjectId as toggleStoredPinnedProjectId,
} from '../shared/utils/navigationPreferences';
import {
  buildAppPath,
  emptyProjectPreferences,
  filterAuthorizedPreferenceIds,
  isSameRoute,
  parseAppLocation,
  recordRecentProjectId,
  togglePinnedProjectId,
} from './navigation';

test('parseAppLocation parses organization, project, and technical admin routes accurately', () => {
  assert.deepEqual(parseAppLocation('/'), { kind: 'org', section: 'workspace' });
  assert.deepEqual(parseAppLocation('/workspace'), { kind: 'org', section: 'workspace' });
  assert.deepEqual(parseAppLocation('/projects'), { kind: 'org', section: 'projects' });
  assert.deepEqual(parseAppLocation('/organization/profile'), { kind: 'org', section: 'organizationProfile' });
  assert.deepEqual(parseAppLocation('/organization/parties'), { kind: 'org', section: 'parties' });
  assert.deepEqual(parseAppLocation('/organization/employees'), { kind: 'org', section: 'employees' });
  assert.deepEqual(parseAppLocation('/organization/territorial-reference'), { kind: 'org', section: 'territorialReference' });
  assert.deepEqual(parseAppLocation('/reports'), { kind: 'org', section: 'reports' });

  assert.deepEqual(parseAppLocation('/projects/prj-123/overview'), {
    kind: 'project',
    projectId: 'prj-123',
    section: 'overview',
  });
  assert.deepEqual(parseAppLocation('/projects/prj-123'), {
    kind: 'project',
    projectId: 'prj-123',
    section: 'overview',
  });
  assert.deepEqual(parseAppLocation('/projects/prj-123/reservations/'), {
    kind: 'project',
    projectId: 'prj-123',
    section: 'reservations',
  });
  assert.deepEqual(parseAppLocation('/projects/prj-123/contracts'), {
    kind: 'project',
    projectId: 'prj-123',
    section: 'contracts',
  });
  assert.deepEqual(parseAppLocation('/projects/prj-123/unknown-tab'), {
    kind: 'project',
    projectId: 'prj-123',
    section: 'overview',
  });

  assert.deepEqual(parseAppLocation('/admin/users'), { kind: 'admin', section: 'users' });
  assert.deepEqual(parseAppLocation('/admin/audit'), { kind: 'admin', section: 'audit' });
  assert.deepEqual(parseAppLocation('/admin/diagnostics'), { kind: 'admin', section: 'diagnostics' });
});

test('parseAppLocation rejects unsafe dot path segments safely', () => {
  assert.deepEqual(parseAppLocation('/projects/..'), { kind: 'org', section: 'projects' });
  assert.deepEqual(parseAppLocation('/projects/%2e%2e/overview'), { kind: 'org', section: 'projects' });
});

test('buildAppPath round-trips every route cleanly', () => {
  const routes = [
    { kind: 'org', section: 'workspace' },
    { kind: 'org', section: 'projects' },
    { kind: 'org', section: 'parties' },
    { kind: 'org', section: 'territorialReference' },
    { kind: 'project', projectId: '30000000-0000-0000-0000-000000000003', section: 'structure' },
    { kind: 'project', projectId: '30000000-0000-0000-0000-000000000003', section: 'accounting' },
    { kind: 'admin', section: 'diagnostics' },
  ] as const;

  for (const route of routes) {
    const path = buildAppPath(route);
    assert.equal(isSameRoute(parseAppLocation(path), route), true);
  }
});

test('recent and pinned preferences stay bounded and never expose unauthorized projects', () => {
  let prefs = emptyProjectPreferences();
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    prefs = recordRecentProjectId(prefs, id);
  }
  assert.deepEqual(prefs.recentProjectIds, ['p6', 'p5', 'p4', 'p3', 'p2']);

  prefs = togglePinnedProjectId(prefs, 'p6');
  prefs = togglePinnedProjectId(prefs, 'unauthorized-prj');
  assert.deepEqual(prefs.pinnedProjectIds, ['unauthorized-prj', 'p6']);

  const authorized = [{ id: 'p6', code: 'P-06' }, { id: 'p2', code: 'P-02' }];
  assert.deepEqual(
    filterAuthorizedPreferenceIds(prefs.pinnedProjectIds, authorized).map((p) => p.id),
    ['p6']
  );
  assert.deepEqual(
    filterAuthorizedPreferenceIds(prefs.recentProjectIds, authorized).map((p) => p.id),
    ['p6', 'p2']
  );
});


test('stored project navigation preferences update recents and pin state immutably', () => {
  let preferences = emptyStoredProjectPreferences();
  preferences = recordStoredRecentProjectId(preferences, 'project-1');
  preferences = recordStoredRecentProjectId(preferences, 'project-2');
  preferences = recordStoredRecentProjectId(preferences, 'project-1');
  assert.deepEqual(preferences.recentProjectIds, ['project-1', 'project-2']);

  preferences = toggleStoredPinnedProjectId(preferences, 'project-1');
  assert.deepEqual(preferences.pinnedProjectIds, ['project-1']);
  preferences = toggleStoredPinnedProjectId(preferences, 'project-1');
  assert.deepEqual(preferences.pinnedProjectIds, []);
  assert.deepEqual(preferences.recentProjectIds, ['project-1', 'project-2']);
});


test('app history state preserves entry metadata and validates its index', () => {
  const state = withAppHistoryIndex({ source: 'app-router' }, 3);
  assert.deepEqual(state, {
    source: 'app-router',
    __promoGestHistoryIndex: 3,
  });
  assert.equal(readAppHistoryIndex(state), 3);
  assert.equal(readAppHistoryIndex(null), null);
  assert.equal(readAppHistoryIndex({ __promoGestHistoryIndex: -1 }), null);
  assert.equal(readAppHistoryIndex({ __promoGestHistoryIndex: 1.5 }), null);
  assert.equal(readAppHistoryIndex({ __promoGestHistoryIndex: '2' }), null);
});
