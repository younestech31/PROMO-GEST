import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { AuditLogView } from '../modules/technical-admin';
import { apiClient, ApiError } from '../core/api/apiClient';
import { getTranslations } from '../core/localization/translations';
import type { AppLanguage, AuditLogDto, AuthenticatedUser } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const actor = {
  id: 'auditor', concurrencyStamp: 'v1', isActive: true, isSystemAdministrator: false,
  permissions: ['audit.read'],
} as AuthenticatedUser;
const row = (id: string, severity = 'Information'): AuditLogDto => ({
  id, occurredAtUtc: '2026-11-20T09:00:00Z', actorUserId: 'actor-1', actorUsername: 'Auditor',
  eventType: `EVENT-${id}`, severity, summary: `Résumé ${id}`, ipAddress: '192.0.2.1',
  targetEntityId: null, targetEntityType: null,
});

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`audit (${language}): initial failure is not an empty log; retry is a bounded read`, async () => {
    const original = apiClient.listAuditLogs;
    const requests: Array<{ limit: number | undefined; result: ReturnType<typeof deferred<AuditLogDto[]>> }> = [];
    apiClient.listAuditLogs = (limit) => {
      const result = deferred<AuditLogDto[]>(); requests.push({ limit, result }); return result.promise;
    };
    const labels = getTranslations(language).audit;
    const ui = await renderReact(createElement(AuditLogView, { currentUser: actor, language }));
    try {
      assert.equal(ui.button(labels.refresh).disabled, true);
      assert.equal(ui.container.querySelector('[aria-busy]')?.getAttribute('aria-busy'), 'true');
      await act(async () => requests[0].result.reject(new Error('PRIVATE-DETAILS')));
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.doesNotMatch(ui.container.textContent ?? '', /PRIVATE-DETAILS/);
      assert.ok(!ui.container.textContent?.includes(labels.emptyTitle));
      assert.equal(ui.container.querySelector('table'), null);
      await ui.click(labels.retry);
      await act(async () => requests[1].result.resolve([]));
      assert.equal(ui.container.querySelector('[role="alert"]'), null);
      assert.ok(ui.container.textContent?.includes(labels.emptyTitle));
      assert.deepEqual(requests.map((item) => item.limit), [100, 100]);
    } finally { await ui.cleanup(); apiClient.listAuditLogs = original; }
  });

  test(`audit (${language}): loaded search/severity/count/reset never issue a request or claim full-history search`, async () => {
    const original = apiClient.listAuditLogs;
    let reads = 0;
    apiClient.listAuditLogs = async () => { reads++; return [row('ALPHA'), { ...row('BETA', 'Security'), actorUsername: null, ipAddress: null }]; };
    const labels = getTranslations(language).audit;
    const ui = await renderReact(createElement(AuditLogView, { currentUser: actor, language }));
    try {
      assert.equal(ui.container.querySelectorAll('tbody tr').length, 2);
      assert.ok(ui.container.textContent?.includes(labels.boundedNotice));
      await ui.change('#audit-search', '  alpha  ');
      assert.equal(ui.container.querySelectorAll('tbody tr').length, 1);
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /ALPHA/);
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', /1 \/ 2/);
      await ui.change('#audit-severity', 'Security');
      assert.equal(ui.container.querySelector('table'), null);
      assert.ok(ui.container.textContent?.includes(labels.noMatches));
      assert.ok(!ui.container.textContent?.includes(labels.emptyTitle));
      await ui.click(labels.clearFilters);
      await ui.change('#audit-severity', 'Security');
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /BETA/);
      await ui.click(labels.clearFilters);
      await ui.change('#audit-search', '192.0.2');
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /ALPHA/);
      await ui.click(labels.clearFilters);
      await ui.change('#audit-search', 'résumé beta');
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /BETA/);
      await ui.click(labels.clearFilters);
      assert.equal(ui.container.querySelectorAll('tbody tr').length, 2);
      assert.equal(reads, 1, 'local filtering never searches the server or expands the 100-row read');
    } finally { await ui.cleanup(); apiClient.listAuditLogs = original; }
  });

  test(`audit (${language}): refresh is synchronous single-flight, language-stable and fail-closed with filters retained`, async () => {
    const original = apiClient.listAuditLogs;
    const requests: Array<ReturnType<typeof deferred<AuditLogDto[]>>> = [];
    apiClient.listAuditLogs = () => { const result = deferred<AuditLogDto[]>(); requests.push(result); return result.promise; };
    const labels = getTranslations(language).audit;
    const otherLanguage = language === 'ar' ? 'fr' : 'ar';
    const element = (lang = language) => createElement(AuditLogView, { currentUser: actor, language: lang });
    const ui = await renderReact(element());
    try {
      await act(async () => requests[0].resolve([row('OLD', 'Security')]));
      await ui.change('#audit-search', 'old');
      await ui.change('#audit-severity', 'Security');
      const refresh = ui.button(labels.refresh);
      await act(async () => { refresh.click(); refresh.click(); });
      assert.equal(requests.length, 2);
      assert.equal(ui.container.querySelector('tbody'), null, 'old rows are not presented as current while refreshing');
      await ui.render(element(otherLanguage));
      assert.equal(requests.length, 2, 'language does not restart loading');
      await act(async () => requests[1].reject(new ApiError(403, 'FORBIDDEN', 'PRIVATE-BACKEND-DETAILS')));
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.doesNotMatch(ui.container.textContent ?? '', /PRIVATE-BACKEND-DETAILS|EVENT-OLD/);
      await ui.click(getTranslations(otherLanguage).audit.retry);
      await act(async () => requests[2].resolve([row('NEW')]));
      assert.equal((ui.container.querySelector('#audit-search') as HTMLInputElement).value, 'old');
      assert.equal((ui.container.querySelector('#audit-severity') as HTMLSelectElement).value, 'Security', 'a missing level is not silently replaced');
      assert.equal(ui.container.querySelector('table'), null);
      await ui.click(getTranslations(otherLanguage).audit.clearFilters);
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /EVENT-NEW/);
    } finally { await ui.cleanup(); apiClient.listAuditLogs = original; }
  });

  test(`audit (${language}): actor/stamp/revoked access replaces scope and rejects obsolete reads`, async () => {
    const original = apiClient.listAuditLogs;
    const requests: Array<ReturnType<typeof deferred<AuditLogDto[]>>> = [];
    apiClient.listAuditLogs = () => { const result = deferred<AuditLogDto[]>(); requests.push(result); return result.promise; };
    const element = (currentUser = actor) => createElement(AuditLogView, { currentUser, language });
    const ui = await renderReact(element());
    try {
      await ui.render(element({ ...actor, id: 'another-actor' }));
      await act(async () => requests[0].resolve([row('OBSOLETE-ACTOR')]));
      assert.equal(ui.container.querySelector('tbody'), null);
      await act(async () => requests[1].resolve([row('CURRENT')]));
      await ui.change('#audit-search', 'private old query');
      await ui.render(element({ ...actor, id: 'another-actor', concurrencyStamp: 'v2' }));
      assert.equal(ui.container.querySelector('#audit-search'), null);
      await ui.render(element({ ...actor, permissions: [] }));
      await act(async () => requests[2].reject(new Error('OBSOLETE-FAILURE')));
      assert.equal(ui.container.querySelector('button'), null);
      assert.equal(ui.container.querySelector('table'), null);
      assert.equal(ui.container.querySelector('input'), null);
      assert.equal(requests.length, 3, 'denied reader never fetches');
      assert.ok(ui.container.textContent?.includes(getTranslations(language).audit.accessDenied));
      await ui.render(element({ ...actor, isActive: false }));
      assert.equal(requests.length, 3);
      await ui.render(element());
      await act(async () => requests[3].resolve([row('RESTORED')]));
      assert.equal((ui.container.querySelector('#audit-search') as HTMLInputElement).value, '');
      assert.doesNotMatch(ui.container.textContent ?? '', /OBSOLETE|private old query/);
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /RESTORED/);
    } finally { await ui.cleanup(); apiClient.listAuditLogs = original; }
  });
}
