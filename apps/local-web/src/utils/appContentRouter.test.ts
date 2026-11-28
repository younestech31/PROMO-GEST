import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement, Suspense } from 'react';
import { AppContentRouter } from '../app/App';
import { apiClient } from '../core/api/apiClient';
import { getTranslations } from '../core/localization/translations';
import { DEFAULT_APP_ROUTE, getDeniedRouteNotice, type AppRouteState } from '../app/routeRegistry';
import type { AppLanguage, AuditLogDto, AuthenticatedUser, SessionResponse } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const actor = {
  id: 'route-reader', username: 'reader', concurrencyStamp: 'v1', isActive: true,
  isSystemAdministrator: false, roles: ['FINANCE_OFFICER'],
  permissions: ['org.read', 'projects.read', 'files.read'],
} as AuthenticatedUser;

const protectedRoutes: AppRouteState[] = [
  { kind: 'admin', section: 'users' },
  { kind: 'admin', section: 'audit' },
  { kind: 'admin', section: 'diagnostics' },
  { kind: 'org', section: 'parties' },
];

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`actual AppContentRouter (${language}): denied routes stay visible without protected content or requests`, async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = async (input) => { requests.push(String(input)); throw new Error('Denied route issued an API request'); };
    const navigations: AppRouteState[] = [];
    const element = (route: AppRouteState, user = actor) => createElement(Suspense, { fallback: 'UNEXPECTED-LAZY-MOUNT' },
      createElement(AppContentRouter, {
        session: { user, organization: {} } as SessionResponse, language, health: null, projects: [],
        activeRoute: route, onNavigate: (target) => navigations.push(target),
        onOpenSwitcher: () => assert.fail('denied route opened switcher'),
        onProjectVerified: () => assert.fail('denied route verified project'),
        onProjectVerificationFailed: () => assert.fail('denied route read project'),
        onDirtyChange: () => assert.fail('denied form mounted'), onOrganizationUpdated: () => {},
        saveActionRef: { current: null }, discardActionRef: { current: null },
      }));
    const ui = await renderReact(element(protectedRoutes[0]));
    try {
      for (const user of [actor, { ...actor, isSystemAdministrator: true, isActive: false }]) {
        for (const route of protectedRoutes) {
          await ui.render(element(route, user));
          assert.equal(ui.container.querySelector('[role="alert"]')?.textContent?.includes(getDeniedRouteNotice(route, language)), true);
          assert.equal(ui.container.querySelector('table, form, input, select'), null);
          assert.doesNotMatch(ui.container.textContent ?? '', /UNEXPECTED-LAZY-MOUNT/);
          assert.deepEqual(navigations, [], 'refusal must not silently redirect');
        }
      }
      assert.deepEqual(requests, [], 'denied routes must not read protected APIs');
      await ui.click(getTranslations(language).nav.overview);
      assert.deepEqual(navigations, [DEFAULT_APP_ROUTE], 'only explicit acknowledgement navigates home');
    } finally { await ui.cleanup(); globalThis.fetch = originalFetch; }
  });

  test(`actual AppContentRouter (${language}): audit permission mounts real reader; revocation removes it and ignores late completion`, async () => {
    const original = apiClient.listAuditLogs;
    const requests: Array<ReturnType<typeof deferred<AuditLogDto[]>>> = [];
    apiClient.listAuditLogs = () => { const result = deferred<AuditLogDto[]>(); requests.push(result); return result.promise; };
    const route: AppRouteState = { kind: 'admin', section: 'audit' };
    const element = (user: AuthenticatedUser) => createElement(Suspense, { fallback: 'loading' },
      createElement(AppContentRouter, {
        session: { user, organization: {} } as SessionResponse, language, health: null, projects: [], activeRoute: route,
        onNavigate: () => {}, onOpenSwitcher: () => {}, onProjectVerified: () => {},
        onProjectVerificationFailed: () => {}, onDirtyChange: () => {}, onOrganizationUpdated: () => {},
        saveActionRef: { current: null }, discardActionRef: { current: null },
      }));
    const auditor = { ...actor, permissions: ['audit.read'] };
    const ui = await renderReact(element(auditor));
    try {
      // Resolve the real React.lazy module without substituting a protected view.
      await act(async () => { await import('../modules/technical-admin'); });
      assert.equal(requests.length, 1);
      await act(async () => requests[0].resolve([{
        id: 'event', eventType: 'ROUTER_VISIBLE_EVENT', severity: 'Information', summary: 'Synthetic event',
        occurredAtUtc: '2026-11-20T09:00:00Z', actorUserId: null, actorUsername: null,
        ipAddress: null, targetEntityId: null, targetEntityType: null,
      }]));
      assert.match(ui.container.querySelector('tbody')?.textContent ?? '', /ROUTER_VISIBLE_EVENT/);
      await ui.click(getTranslations(language).audit.refresh);
      assert.equal(requests.length, 2);
      await ui.render(element({ ...actor, concurrencyStamp: 'revoked' }));
      assert.equal(ui.container.querySelector('table, input, select'), null);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      await act(async () => requests[1].resolve([{
        id: 'late', eventType: 'FORBIDDEN_LATE_EVENT', severity: 'Information', summary: 'Late synthetic event',
        occurredAtUtc: '2026-11-20T09:00:00Z', actorUserId: null, actorUsername: null,
        ipAddress: null, targetEntityId: null, targetEntityType: null,
      }]));
      assert.doesNotMatch(ui.container.textContent ?? '', /ROUTER_VISIBLE_EVENT|FORBIDDEN_LATE_EVENT/);
      await ui.render(element({ ...auditor, concurrencyStamp: 'restored' }));
      assert.equal(requests.length, 3, 'restored access must mount a fresh reader');
      await act(async () => requests[2].resolve([]));
      assert.ok(ui.container.textContent?.includes(getTranslations(language).audit.emptyTitle));
    } finally { await ui.cleanup(); apiClient.listAuditLogs = original; }
  });
}
