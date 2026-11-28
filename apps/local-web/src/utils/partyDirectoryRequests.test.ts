import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { PartiesDirectoryView } from '../modules/module-d-customers-parties';
import { apiClient, ApiError } from '../core/api/apiClient';
import type { AppLanguage, AuthenticatedUser, PartyDirectoryItemDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const actor: AuthenticatedUser = {
  id: 'reader', username: 'reader', fullName: 'Reader', email: 'reader@example.test', phone: null,
  isSystemAdministrator: false, isActive: true, preferredLanguage: 'fr', concurrencyStamp: 'v1', roles: [],
  permissions: ['parties.directory.read', 'parties.identity.manage'], lastLoginAtUtc: null,
  mustChangePasswordAtNextLogin: false, passwordChangeRequiredUntilUtc: null,
};
const party = (name: string): PartyDirectoryItemDto => ({
  id: 'party-1', kind: 'Person', displayName: name, concurrencyStamp: 'v1',
});

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`party directory (${language}) latest submitted search wins and exact failed query retries`, async () => {
    const original = apiClient.searchPartyDirectory;
    const calls: Array<{ query: string; result: ReturnType<typeof deferred<PartyDirectoryItemDto[]>> }> = [];
    apiClient.searchPartyDirectory = (query) => {
      const result = deferred<PartyDirectoryItemDto[]>();
      calls.push({ query, result });
      return result.promise;
    };
    const element = (currentUser = actor) => createElement(PartiesDirectoryView, { currentUser, language, onNavigateHome: () => {} });
    const ui = await renderReact(element());
    let cleaned = false;
    try {
      await ui.change('input[type="search"]', 'Old');
      await ui.submit('input[type="search"]');
      await ui.change('input[type="search"]', 'New');
      await ui.submit('input[type="search"]');
      await act(async () => calls[0].result.reject(new Error('Stale')));
      assert.equal(ui.container.querySelector('[aria-busy]')?.getAttribute('aria-busy'), 'true');
      assert.equal(ui.container.querySelector('[role="alert"]'), null);
      await act(async () => calls[1].result.resolve([party('NEWEST')]));
      assert.match(ui.container.textContent ?? '', /NEWEST/);
      await ui.submit('input[type="search"]');
      await act(async () => calls[2].result.reject(new Error('Offline')));
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.equal(ui.container.querySelector('tbody'), null);
      assert.doesNotMatch(ui.container.textContent ?? '', /Aucun tiers trouvé|لم يتم العثور على أطراف/);
      await ui.change('input[type="search"]', 'Unsubmitted draft');
      await ui.click(language === 'ar' ? 'إعادة المحاولة' : 'Réessayer');
      assert.equal(calls[3].query, 'New');
      await act(async () => calls[3].result.resolve([party('RETRIED')]));
      assert.match(ui.container.textContent ?? '', /RETRIED/);
      await ui.submit('input[type="search"]');
      await ui.render(element({ ...actor, id: 'another-user' }));
      await act(async () => calls[4].result.resolve([party('OTHER-USER-STALE')]));
      assert.doesNotMatch(ui.container.textContent ?? '', /OTHER-USER-STALE/);
      await ui.change('input[type="search"]', 'Pending');
      await ui.submit('input[type="search"]');
      await ui.cleanup();
      cleaned = true;
      await act(async () => calls[5].result.resolve([party('AFTER-UNMOUNT')]));
    } finally {
      if (!cleaned) await ui.cleanup();
      apiClient.searchPartyDirectory = original;
    }
  });

  test(`party identity (${language}) failed save retains draft and dirty close guard; saving freezes controls`, async () => {
    const originalSearch = apiClient.searchPartyDirectory;
    const originalSave = apiClient.updatePartyIdentity;
    apiClient.searchPartyDirectory = async () => [party('Original')];
    const saved = deferred<PartyDirectoryItemDto>();
    const writes: Array<Parameters<typeof apiClient.updatePartyIdentity>[1]> = [];
    let fail = true;
    apiClient.updatePartyIdentity = async (_id, payload) => {
      writes.push(payload);
      if (fail) throw new ApiError(409, 'CONCURRENCY_CONFLICT', 'Conflict');
      return saved.promise;
    };
    const ui = await renderReact(createElement(PartiesDirectoryView, { currentUser: actor, language, onNavigateHome: () => {} }));
    try {
      await ui.change('input[type="search"]', 'Original');
      await ui.submit('input[type="search"]');
      await ui.click(language === 'ar' ? 'تحديث الهوية' : 'Modifier l’identité');
      await ui.change('#party-edit-name', 'Edited');
      await ui.submit('#party-edit-name');
      assert.equal((ui.container.querySelector('#party-edit-name') as HTMLInputElement).value, 'Edited');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      await ui.click(language === 'ar' ? 'البقاء في النموذج' : 'Continuer l’édition');
      assert.equal((ui.container.querySelector('#party-edit-name') as HTMLInputElement).value, 'Edited');
      fail = false;
      await ui.submit('#party-edit-name');
      assert.equal((ui.container.querySelector('#party-edit-name') as HTMLInputElement).disabled, true);
      assert.equal(ui.button(language === 'ar' ? 'إلغاء' : 'Annuler').disabled, true);
      await act(async () => saved.resolve({ ...party('Edited'), concurrencyStamp: 'v2' }));
      assert.equal(writes.length, 2);
      assert.equal(writes[1].concurrencyStamp, 'v1', 'never manufacture a fresh concurrency stamp after conflict');
      assert.equal(ui.container.querySelector('#party-edit-name'), null);
      assert.match(ui.container.textContent ?? '', /Edited/);
    } finally {
      await ui.cleanup();
      apiClient.searchPartyDirectory = originalSearch;
      apiClient.updatePartyIdentity = originalSave;
    }
  });
}

test('party directory does not fetch or expose search for actors without read permission', async () => {
  const original = apiClient.searchPartyDirectory;
  let calls = 0;
  apiClient.searchPartyDirectory = async () => { ++calls; return []; };
  const ui = await renderReact(createElement(PartiesDirectoryView, {
    currentUser: { ...actor, permissions: [] }, language: 'fr', onNavigateHome: () => {},
  }));
  try {
    assert.equal(ui.container.querySelector('form'), null);
    assert.equal(calls, 0);
    assert.ok(ui.container.querySelector('[role="alert"]'));
  } finally { await ui.cleanup(); apiClient.searchPartyDirectory = original; }
});

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`party identity (${language}): same-event lock, language-stable draft, explicit retry and localized success`, async () => {
    const originalSearch = apiClient.searchPartyDirectory;
    const originalSave = apiClient.updatePartyIdentity;
    let pending = deferred<PartyDirectoryItemDto>();
    let reads = 0;
    const writes: Array<{ id: string; payload: Parameters<typeof apiClient.updatePartyIdentity>[1] }> = [];
    apiClient.searchPartyDirectory = async () => { reads++; return [party('Original')]; };
    apiClient.updatePartyIdentity = (id, payload) => { writes.push({ id, payload }); return pending.promise; };
    const otherLanguage = language === 'ar' ? 'fr' : 'ar';
    const dirty: boolean[] = [];
    const onDirtyChange = (value: boolean) => dirty.push(value);
    const element = (lang = language) => createElement(PartiesDirectoryView, {
      currentUser: actor, language: lang, onNavigateHome: () => {}, onDirtyChange,
    });
    const ui = await renderReact(element());
    try {
      await ui.change('#party-directory-search', 'Original');
      await ui.submit('#party-directory-search');
      await ui.click(language === 'ar' ? 'تحديث الهوية' : 'Modifier l’identité');
      await ui.change('#party-edit-kind', 'LegalEntity');
      await ui.change('#party-edit-name', 'Edited canonical identity');
      assert.equal(dirty.at(-1), true);
      const form = ui.container.querySelector('#party-edit-name')?.closest('form');
      assert.ok(form);
      await act(async () => {
        for (let i = 0; i < 2; i++) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
        ui.button(language === 'ar' ? 'إلغاء' : 'Annuler').click();
      });
      assert.equal(writes.length, 1);
      assert.equal(ui.container.querySelector('#confirm-dialog-title'), null, 'same-event close cannot discard a submitted intent');
      await ui.submit('#party-directory-search');
      assert.equal(reads, 1, 'search cannot compete with an identity write');
      for (const input of ui.container.querySelectorAll('input, select')) assert.equal((input as HTMLInputElement).disabled, true);
      await ui.render(element(otherLanguage));
      await ui.submit('#party-edit-name');
      assert.equal(writes.length, 1);
      assert.equal(reads, 1, 'language change does not fetch');
      await act(async () => pending.reject(new ApiError(409, 'CONCURRENCY_CONFLICT', 'PRIVATE-DETAILS')));
      assert.equal((ui.container.querySelector('#party-edit-name') as HTMLInputElement).value, 'Edited canonical identity');
      assert.equal((ui.container.querySelector('#party-edit-kind') as HTMLSelectElement).value, 'LegalEntity');
      assert.equal(dirty.at(-1), true);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.doesNotMatch(ui.container.textContent ?? '', /PRIVATE-DETAILS/);
      await ui.click(otherLanguage === 'ar' ? 'إلغاء' : 'Annuler');
      await ui.submit('#party-edit-name');
      await ui.submit('#party-directory-search');
      assert.equal(writes.length, 1, 'confirmation must not permit a background write');
      assert.equal(reads, 1, 'confirmation must not permit a background search');
      await ui.click(otherLanguage === 'ar' ? 'البقاء في النموذج' : 'Continuer l’édition');
      pending = deferred<PartyDirectoryItemDto>();
      await ui.submit('#party-edit-name');
      assert.equal(writes.length, 2);
      assert.deepEqual(writes[1], writes[0], 'retry preserves canonical ID, submitted fields and original concurrency stamp');
      await act(async () => pending.resolve({ ...party('Edited canonical identity'), kind: 'LegalEntity', concurrencyStamp: 'v2' }));
      assert.equal(ui.container.querySelector('#party-edit-name'), null);
      assert.equal(dirty.at(-1), false);
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', otherLanguage === 'ar' ? /تم تحديث الهوية/ : /L’identité centrale/);
      assert.equal(reads, 1, 'successful identity response is applied without a second read');
      await ui.render(element(language));
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', language === 'ar' ? /تم تحديث الهوية/ : /L’identité centrale/);
    } finally {
      await ui.cleanup(); apiClient.searchPartyDirectory = originalSearch; apiClient.updatePartyIdentity = originalSave;
    }
  });

  test(`party identity (${language}): actor/stamp/read/manage scope replacements clear drafts and ignore obsolete completions`, async () => {
    const originalSearch = apiClient.searchPartyDirectory;
    const originalSave = apiClient.updatePartyIdentity;
    const scopes = [
      { ...actor, id: 'another-actor' },
      { ...actor, concurrencyStamp: 'new-stamp' },
      { ...actor, permissions: ['parties.directory.read'] },
      { ...actor, permissions: ['parties.identity.manage'] },
    ];
    try {
      for (const [index, nextActor] of scopes.entries()) {
        const pending = deferred<PartyDirectoryItemDto>();
        let reads = 0;
        let writes = 0;
        let dirty = false;
        const onDirtyChange = (value: boolean) => { dirty = value; };
        apiClient.searchPartyDirectory = async () => { reads++; return [party('Original')]; };
        apiClient.updatePartyIdentity = () => { writes++; return pending.promise; };
        const element = (currentUser = actor) => createElement(PartiesDirectoryView, {
          currentUser, language, onNavigateHome: () => {}, onDirtyChange,
        });
        const ui = await renderReact(element());
        try {
          await ui.change('#party-directory-search', 'Original');
          await ui.submit('#party-directory-search');
          await ui.click(language === 'ar' ? 'تحديث الهوية' : 'Modifier l’identité');
          await ui.change('#party-edit-name', 'OLD-ACTOR-DRAFT');
          await ui.submit('#party-edit-name');
          assert.equal(dirty, true);
          await ui.render(element(nextActor));
          assert.equal(dirty, false);
          assert.equal(ui.container.querySelector('#party-edit-name'), null, 'scope replacement closes old editor even if read remains allowed');
          const search = ui.container.querySelector('#party-directory-search') as HTMLInputElement | null;
          if (search) {
            assert.equal(search.value, '', 'old query does not leak into replacement scope');
            await ui.change('#party-directory-search', 'Fresh');
            await ui.submit('#party-directory-search');
          } else {
            assert.equal(ui.container.querySelector('form'), null, 'read revocation exposes no form even with manage permission');
          }
          const currentReads = reads;
          await act(async () => index % 2 === 0
            ? pending.resolve(party('OBSOLETE-SUCCESS')) : pending.reject(new Error('OBSOLETE-FAILURE')));
          assert.doesNotMatch(ui.container.textContent ?? '', /OBSOLETE|OLD-ACTOR-DRAFT/);
          assert.equal(ui.container.querySelector('[role="status"]'), null);
          assert.equal(reads, currentReads);
          assert.equal(writes, 1);
          if (index === 2) assert.equal(ui.container.querySelector('tbody button'), null, 'read-only actor cannot reopen identity editor');
        } finally { await ui.cleanup(); }
      }
    } finally { apiClient.searchPartyDirectory = originalSearch; apiClient.updatePartyIdentity = originalSave; }
  });
}
