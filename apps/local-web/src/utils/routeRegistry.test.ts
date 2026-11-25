import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser, ProjectDto } from '../types/erp';
import {
  ADMIN_ROUTE_META,
  ORG_ROUTE_META,
  PROJECT_ROUTE_META,
  buildAppPath,
  canAccessRoute,
  getDeniedRouteNotice,
  isSameRoute,
  parseAppLocation,
  revokeProjectAccessFromState,
  shouldBlockNavigation,
  shouldIgnoreGlobalShortcut,
} from '../app/routeRegistry';

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    username: 'sales.user',
    fullName: 'Commercial User',
    email: 'sales@promogest.local',
    phone: null,
    isSystemAdministrator: false,
    isActive: true,
    preferredLanguage: 'ar',
    roles: ['COMMERCIAL_MANAGER'],
    permissions: ['projects.read', 'customers.read'],
    lastLoginAtUtc: null,
    mustChangePasswordAtNextLogin: false,
    passwordChangeRequiredUntilUtc: null,
    ...overrides,
    concurrencyStamp: overrides.concurrencyStamp ?? '00000000-0000-0000-0000-000000000001',
  };
}

test('the application route registry owns unique organization, project and admin paths', () => {
  const orgPaths = ORG_ROUTE_META.map((item) => buildAppPath({ kind: 'org', section: item.section }));
  const projectPaths = PROJECT_ROUTE_META.map((item) =>
    buildAppPath({ kind: 'project', projectId: 'project-1', section: item.section })
  );
  const adminPaths = ADMIN_ROUTE_META.map((item) => buildAppPath({ kind: 'admin', section: item.section }));

  assert.equal(new Set(orgPaths).size, orgPaths.length, 'duplicate organization route');
  assert.equal(new Set(projectPaths).size, projectPaths.length, 'duplicate project route');
  assert.equal(new Set(adminPaths).size, adminPaths.length, 'duplicate admin route');
  assert.deepEqual(
    PROJECT_ROUTE_META.map((item) => item.section),
    [
      'overview', 'structure', 'customers', 'reservations', 'contracts', 'finance',
      'construction', 'procurement', 'accounting', 'documents', 'reports', 'settings',
    ]
  );
});

test('parseAppLocation and buildAppPath round-trip project paths and safely normalize invalid routes', () => {
  const route = parseAppLocation('/projects/project%20one/structure?tab=units#details');
  assert.deepEqual(route, { kind: 'project', projectId: 'project one', section: 'structure' });
  assert.equal(buildAppPath(route), '/projects/project%20one/structure');
  assert.deepEqual(parseAppLocation('/projects/project-1/not-a-section'), {
    kind: 'project', projectId: 'project-1', section: 'overview',
  });
  assert.deepEqual(parseAppLocation('/projects/%E0%A4%A/structure'), {
    kind: 'org', section: 'projects',
  });
  assert.deepEqual(parseAppLocation('/admin/audit'), { kind: 'admin', section: 'audit' });
  assert.deepEqual(parseAppLocation('/organization/parties'), { kind: 'org', section: 'parties' });
});

test('actual route guard blocks unauthorized admin and Party pages before their views mount', () => {
  const user = makeUser();
  assert.equal(canAccessRoute(user, { kind: 'admin', section: 'users' }), false);
  assert.equal(canAccessRoute(user, { kind: 'admin', section: 'audit' }), false);
  assert.equal(canAccessRoute(user, { kind: 'admin', section: 'diagnostics' }), false);
  assert.equal(canAccessRoute(user, { kind: 'org', section: 'parties' }), false);

  const partyReader = makeUser({ permissions: ['parties.directory.read'] });
  assert.equal(canAccessRoute(partyReader, { kind: 'org', section: 'parties' }), true);

  const userAdmin = makeUser({ permissions: ['users.manage'] });
  assert.equal(canAccessRoute(userAdmin, { kind: 'admin', section: 'users' }), true);
  assert.equal(canAccessRoute(userAdmin, { kind: 'admin', section: 'diagnostics' }), true);
  assert.equal(canAccessRoute(userAdmin, { kind: 'admin', section: 'audit' }), false);

  const auditor = makeUser({ permissions: ['audit.read'] });
  assert.equal(canAccessRoute(auditor, { kind: 'admin', section: 'audit' }), true);
  assert.equal(canAccessRoute(auditor, { kind: 'admin', section: 'diagnostics' }), true);

  const systemAdmin = makeUser({ isSystemAdministrator: true, roles: ['SYSTEM_ADMIN'], permissions: [] });
  assert.equal(canAccessRoute(systemAdmin, { kind: 'admin', section: 'users' }), true);
  assert.equal(canAccessRoute(systemAdmin, { kind: 'admin', section: 'audit' }), true);
  assert.equal(canAccessRoute(systemAdmin, { kind: 'admin', section: 'diagnostics' }), true);

  const inactiveAdmin = makeUser({ isSystemAdministrator: true, isActive: false });
  assert.equal(canAccessRoute(inactiveAdmin, { kind: 'org', section: 'workspace' }), false);

  assert.match(getDeniedRouteNotice({ kind: 'admin', section: 'users' }, 'ar'), /صلاحية/);
  assert.match(getDeniedRouteNotice({ kind: 'org', section: 'parties' }, 'fr'), /répertoire/);
});

test('navigation guard blocks only a real destination change while a draft is dirty', () => {
  const current = { kind: 'project', projectId: 'p1', section: 'settings' } as const;
  const same = { kind: 'project', projectId: 'p1', section: 'settings' } as const;
  const otherTab = { kind: 'project', projectId: 'p1', section: 'structure' } as const;
  const otherProject = { kind: 'project', projectId: 'p2', section: 'overview' } as const;
  const org = { kind: 'org', section: 'workspace' } as const;

  assert.equal(isSameRoute(current, same), true);
  assert.equal(shouldBlockNavigation(false, current, otherTab), false);
  assert.equal(shouldBlockNavigation(true, current, same), false);
  assert.equal(shouldBlockNavigation(true, current, otherTab), true);
  assert.equal(shouldBlockNavigation(true, current, otherProject), true);
  assert.equal(shouldBlockNavigation(true, current, org), true);
});

test('revoking project access removes the project from cache and local navigation preferences', () => {
  const projects = [
    { id: 'project-a' },
    { id: 'project-b' },
  ] as unknown as ProjectDto[];
  const result = revokeProjectAccessFromState(
    projects,
    { recentProjectIds: ['project-a', 'project-b'], pinnedProjectIds: ['project-a'] },
    'project-a'
  );

  assert.deepEqual(result.projects.map((project) => project.id), ['project-b']);
  assert.deepEqual(result.preferences.recentProjectIds, ['project-b']);
  assert.deepEqual(result.preferences.pinnedProjectIds, []);
});

test('global project-switcher shortcut never hijacks editable controls', () => {
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'INPUT' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'textarea' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'SELECT' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(
    shouldIgnoreGlobalShortcut({
      tagName: 'SPAN',
      closest: (selector) => selector.includes('contenteditable') ? {} : null,
    }),
    true
  );
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'BODY' }), false);
});
