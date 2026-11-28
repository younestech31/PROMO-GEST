import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { ProjectsAccessView } from '../modules/module-b-projects';
import { apiClient } from '../core/api/apiClient';
import type { AppLanguage, AuthenticatedUser, ProjectDto, UserDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const actor: AuthenticatedUser = {
  id: 'admin', username: 'admin', fullName: 'Admin', email: 'admin@example.test', phone: null,
  isSystemAdministrator: true, isActive: true, preferredLanguage: 'fr', concurrencyStamp: 'v1',
  roles: [], permissions: [], lastLoginAtUtc: null, mustChangePasswordAtNextLogin: false,
  passwordChangeRequiredUntilUtc: null,
};
const project = {
  id: 'project', code: 'VISIBLE-PROJECT', nameAr: 'مشروع', nameFr: 'Projet', status: 'Planning',
  members: [], estimatedBudgetDzd: null, actualBuildingsCount: 0, actualUnitsCount: 0,
} as unknown as ProjectDto;
const employee = (id: string, extra: Partial<UserDto> = {}): UserDto => ({
  ...actor, id, fullName: id, username: id, isSystemAdministrator: false, roleCodes: [],
  failedLoginAttempts: 0, lockoutEndUtc: null, createdAtUtc: '2026-01-01T00:00:00Z', ...extra,
});

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`project employees (${language}): pending/failing lookup never hides projects; retry is isolated`, async () => {
    const original = { listUsers: apiClient.listUsers, directory: apiClient.listProjectDirectoryPage,
      reference: apiClient.getAdministrativeUnits, assign: apiClient.assignProjectMember };
    const requests: Array<ReturnType<typeof deferred<UserDto[]>>> = [];
    let directoryCalls = 0;
    let writes = 0;
    apiClient.listUsers = () => {
      const result = deferred<UserDto[]>(); requests.push(result); return result.promise;
    };
    apiClient.listProjectDirectoryPage = async () => {
      directoryCalls++;
      return { items: [project], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 };
    };
    apiClient.getAdministrativeUnits = async () => { throw new Error('No reference fixture'); };
    apiClient.assignProjectMember = async () => { writes++; return project; };
    const ui = await renderReact(createElement(ProjectsAccessView, { currentUser: actor, language }));
    try {
      assert.match(ui.container.textContent ?? '', /VISIBLE-PROJECT/);
      await ui.click(language === 'ar' ? 'صلاحيات المشروع' : 'Accès projet');
      assert.equal((ui.container.querySelector('#pm-user') as HTMLSelectElement).disabled, true);
      await act(async () => requests[0].reject(new Error('EMPLOYEE-SECRET-ERROR')));
      assert.match(ui.container.textContent ?? '', /VISIBLE-PROJECT/);
      assert.doesNotMatch(ui.container.textContent ?? '', /EMPLOYEE-SECRET-ERROR/);
      assert.ok(ui.container.querySelector('[role="dialog"] [role="alert"]'));
      await ui.submit('#pm-user');
      assert.equal(writes, 0);
      await ui.click(language === 'ar' ? 'إعادة تحميل الموظفين' : 'Recharger les employés');
      assert.equal(directoryCalls, 1, 'employee retry must not repeat directory query');
      await act(async () => requests[1].resolve([
        employee('ACTIVE'), employee('INACTIVE', { isActive: false }),
        employee('SYSTEM', { isSystemAdministrator: true }),
      ]));
      const select = ui.container.querySelector('#pm-user') as HTMLSelectElement;
      assert.equal(select.disabled, false);
      assert.deepEqual([...select.options].map((option) => option.value), ['', 'ACTIVE']);
      assert.equal(select.value, '', 'retry must not silently select an employee');
      await ui.change('#pm-user', 'ACTIVE');
      await ui.submit('#pm-user');
      assert.equal(writes, 1);
      assert.equal(requests.length, 2, 'project refresh must not refetch cached employee lookup');
      assert.equal(directoryCalls, 2);
    } finally {
      await ui.cleanup();
      apiClient.listUsers = original.listUsers; apiClient.listProjectDirectoryPage = original.directory;
      apiClient.getAdministrativeUnits = original.reference; apiClient.assignProjectMember = original.assign;
    }
  });

  test(`project employees (${language}): actor change/revocation ignores stale response and does not fetch protected users`, async () => {
    const original = { listUsers: apiClient.listUsers, directory: apiClient.listProjectDirectoryPage,
      reference: apiClient.getAdministrativeUnits };
    const requests: Array<ReturnType<typeof deferred<UserDto[]>>> = [];
    apiClient.listUsers = () => {
      const result = deferred<UserDto[]>(); requests.push(result); return result.promise;
    };
    apiClient.listProjectDirectoryPage = async () => ({ items: [project], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 });
    apiClient.getAdministrativeUnits = async () => { throw new Error('No reference fixture'); };
    const element = (currentUser = actor) => createElement(ProjectsAccessView, { currentUser, language });
    const ui = await renderReact(element());
    let cleaned = false;
    try {
      await ui.click(language === 'ar' ? 'صلاحيات المشروع' : 'Accès projet');
      await ui.render(element({ ...actor, id: 'second-admin' }));
      assert.equal(ui.container.querySelector('[role="dialog"]'), null);
      await act(async () => requests[0].resolve([employee('STALE-EMPLOYEE')]));
      await act(async () => requests[1].resolve([]));
      await ui.click(language === 'ar' ? 'صلاحيات المشروع' : 'Accès projet');
      assert.doesNotMatch(ui.container.textContent ?? '', /STALE-EMPLOYEE/);
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /لا يوجد موظفون نشطون/ : /Aucun employé actif/);
      await ui.render(element({ ...actor, id: 'second-admin', isSystemAdministrator: false }));
      assert.equal(ui.container.querySelector('[role="dialog"]'), null);
      assert.equal(requests.length, 2);
      await ui.render(element());
      await ui.cleanup();
      cleaned = true;
      await act(async () => requests[2].reject(new Error('Late unmounted failure')));
    } finally {
      if (!cleaned) await ui.cleanup();
      apiClient.listUsers = original.listUsers; apiClient.listProjectDirectoryPage = original.directory;
      apiClient.getAdministrativeUnits = original.reference;
    }
  });
}
