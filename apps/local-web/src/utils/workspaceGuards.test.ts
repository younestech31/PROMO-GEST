import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser, ProjectDto } from '../types/erp';
import {
  canAccessRoute,
  getDeniedRouteNotice,
  revokeProjectAccessFromState,
  shouldIgnoreGlobalShortcut,
} from './workspaceGuards';

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
    permissions: ['org.read', 'projects.read', 'customers.read', 'parties.directory.read'],
    lastLoginAtUtc: null,
    mustChangePasswordAtNextLogin: false,
    passwordChangeRequiredUntilUtc: null,
    ...overrides,
    concurrencyStamp: overrides.concurrencyStamp ?? '00000000-0000-0000-0000-000000000001',
  };
}

test('canAccessRoute denies unauthorized users from admin and party routes while allowing sysadmin and authorized roles', () => {
  const commercial = makeUser();
  assert.equal(canAccessRoute(commercial, { kind: 'admin', section: 'users' }), false);
  assert.equal(canAccessRoute(commercial, { kind: 'admin', section: 'audit' }), false);
  assert.equal(canAccessRoute(commercial, { kind: 'admin', section: 'diagnostics' }), false);
  assert.equal(canAccessRoute(commercial, { kind: 'org', section: 'parties' }), true);
  assert.equal(canAccessRoute(commercial, { kind: 'org', section: 'projects' }), true);

  const financeWithoutParties = makeUser({
    roles: ['FINANCE_OFFICER'],
    permissions: ['org.read', 'projects.read', 'files.read'],
  });
  assert.equal(canAccessRoute(financeWithoutParties, { kind: 'org', section: 'parties' }), false);

  const sysAdmin = makeUser({ isSystemAdministrator: true, roles: ['SYSTEM_ADMIN'], permissions: [] });
  assert.equal(canAccessRoute(sysAdmin, { kind: 'admin', section: 'users' }), true);
  assert.equal(canAccessRoute(sysAdmin, { kind: 'admin', section: 'audit' }), true);
  assert.equal(canAccessRoute(sysAdmin, { kind: 'admin', section: 'diagnostics' }), true);
  assert.equal(canAccessRoute(sysAdmin, { kind: 'org', section: 'parties' }), true);

  const inactiveAdmin = makeUser({ isSystemAdministrator: true, isActive: false });
  assert.equal(canAccessRoute(inactiveAdmin, { kind: 'org', section: 'projects' }), false);
});

test('getDeniedRouteNotice provides localized bilingual explanation for restricted routes', () => {
  const arParties = getDeniedRouteNotice({ kind: 'org', section: 'parties' }, 'ar');
  const frAdmin = getDeniedRouteNotice({ kind: 'admin', section: 'users' }, 'fr');
  assert.ok(arParties.includes('parties.directory.read'));
  assert.ok(frAdmin.includes('administration'));
});

test('shouldIgnoreGlobalShortcut ignores editable controls (INPUT, TEXTAREA, SELECT, contentEditable)', () => {
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'input' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'TEXTAREA' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'SELECT' }), true);
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(
    shouldIgnoreGlobalShortcut({
      tagName: 'SPAN',
      isContentEditable: false,
      closest: (sel: string) => (sel.includes('contenteditable') ? {} : null),
    }),
    true
  );
  assert.equal(shouldIgnoreGlobalShortcut({ tagName: 'BODY', isContentEditable: false }), false);
  assert.equal(shouldIgnoreGlobalShortcut(null), false);
});

test('revokeProjectAccessFromState prunes revoked project from cached list and recent/pinned preferences', () => {
  const projects: ProjectDto[] = [
    {
      id: 'proj-a',
      code: 'A',
      nameAr: 'أ',
      nameFr: 'A',
      wilayaCode: '16',
      wilayaName: 'Alger',
      municipality: 'Hydra',
      address: null,
      landTitleReference: null,
      buildingPermitNumber: null,
      buildingPermitDate: null,
      status: 'Planning',
      estimatedBudgetDzd: 0,
      plannedBlocksCount: 1,
      plannedUnitsCount: 1,
      actualBuildingsCount: 0,
      actualUnitsCount: 0,
      createdAtUtc: '2026-01-01T00:00:00Z',
      concurrencyStamp: 's1',
      members: [],
    },
    {
      id: 'proj-b',
      code: 'B',
      nameAr: 'ب',
      nameFr: 'B',
      wilayaCode: '31',
      wilayaName: 'Oran',
      municipality: 'Es Senia',
      address: null,
      landTitleReference: null,
      buildingPermitNumber: null,
      buildingPermitDate: null,
      status: 'Planning',
      estimatedBudgetDzd: 0,
      plannedBlocksCount: 1,
      plannedUnitsCount: 1,
      actualBuildingsCount: 0,
      actualUnitsCount: 0,
      createdAtUtc: '2026-01-01T00:00:00Z',
      concurrencyStamp: 's2',
      members: [],
    },
  ];

  const cleaned = revokeProjectAccessFromState(
    projects,
    { recentProjectIds: ['proj-b', 'proj-a'], pinnedProjectIds: ['proj-a'] },
    'proj-a'
  );

  assert.deepEqual(
    cleaned.projects.map((p) => p.id),
    ['proj-b']
  );
  assert.deepEqual(cleaned.preferences.recentProjectIds, ['proj-b']);
  assert.deepEqual(cleaned.preferences.pinnedProjectIds, []);
});
