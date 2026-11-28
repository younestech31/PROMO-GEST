import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { ProjectCustomerRegistryModal } from '../modules/module-d-customers-parties';
import { apiClient, ApiError } from '../core/api/apiClient';
import type { AppLanguage, ProjectDto, ProjectCustomerDto, ProjectCustomerListItemDto, PartyDirectoryItemDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

function customer(id: string): ProjectCustomerDto {
  return {
    id, partyId: `party-${id}`, partyConcurrencyStamp: 'party-v1', projectId: 'project',
    customerType: 'Individual', displayName: id === 'a' ? 'Alice' : 'Bachir', contactPerson: null,
    phone: id === 'a' ? '0555123456' : '0777654321', email: `${id}@example.test`, address: null,
    preferredLanguage: 'fr', source: 'Phone', status: id === 'a' ? 'Prospect' : 'Archived',
    identityDocument: null, interactions: [], concurrencyStamp: 'v1',
    createdAtUtc: '2026-11-20T10:00:00Z', updatedAtUtc: '2026-11-20T10:00:00Z',
  };
}

async function mount(language: AppLanguage, canManage = true) {
  const original = {
    listProjectCustomers: apiClient.listProjectCustomers, listProjectDocuments: apiClient.listProjectDocuments,
    getProjectCustomer: apiClient.getProjectCustomer, addCustomerInteraction: apiClient.addCustomerInteraction,
    createProjectCustomer: apiClient.createProjectCustomer, updateProjectCustomer: apiClient.updateProjectCustomer,
    searchPartyDirectory: apiClient.searchPartyDirectory,
  };
  const state = {
    reads: [] as string[], interactions: [] as string[], writes: 0, documentReads: 0,
    failList: false, failDetails: false, dirty: false,
    details: async (id: string) => customer(id),
    interaction: async () => ({} as Awaited<ReturnType<typeof apiClient.addCustomerInteraction>>),
    search: async (_query: string): Promise<PartyDirectoryItemDto[]> => [],
    save: async () => customer('a'),
  };
  apiClient.listProjectCustomers = async () => {
    if (state.failList) throw new Error('Offline');
    return ['a', 'b'].map((id) => ({ ...customer(id), interactionCount: 0, hasIdentityDocument: false })) as ProjectCustomerListItemDto[];
  };
  apiClient.listProjectDocuments = async () => { ++state.documentReads; return []; };
  apiClient.getProjectCustomer = async (_project, id) => {
    state.reads.push(id);
    if (state.failDetails) throw new Error('Offline');
    return state.details(id);
  };
  apiClient.addCustomerInteraction = async (_project, id) => { state.interactions.push(id); return state.interaction(); };
  apiClient.createProjectCustomer = async () => { ++state.writes; return state.save(); };
  apiClient.updateProjectCustomer = async () => { ++state.writes; return state.save(); };
  apiClient.searchPartyDirectory = (query) => state.search(query);
  const ui = await renderReact(createElement(ProjectCustomerRegistryModal, {
    project: { id: 'project', code: 'P1' } as ProjectDto, language, canManage,
    canReadPartyDirectory: true, canManagePartyIdentity: false, mode: 'embedded',
    onDirtyChange: (dirty) => { state.dirty = dirty; },
  }));
  return { ...ui, state, cleanup: async () => { await ui.cleanup(); Object.assign(apiClient, original); } };
}

for (const language of ['ar', 'fr'] as const) {
  const stay = language === 'ar' ? 'البقاء في النموذج' : 'Rester sur le formulaire';
  const discard = language === 'ar' ? 'تجاهل والمتابعة' : 'Abandonner et continuer';
  test(`CRM (${language}) guards client switch, new/edit/cancel and keeps drafts on Stay`, async () => {
    const ui = await mount(language);
    try {
      await ui.click('Alice', false);
      await ui.change('form input[maxlength="120"]', 'Private note for Alice');
      await ui.change('form textarea', 'Must not move to another customer');
      await ui.click('Bachir', false);
      assert.ok(ui.container.querySelector('[role="dialog"]'));
      assert.deepEqual(ui.state.reads, ['a']);
      await ui.click(stay);
      assert.equal((ui.container.querySelector('form textarea') as HTMLTextAreaElement).value, 'Must not move to another customer');
      await ui.click(language === 'ar' ? 'إضافة' : 'Ajouter');
      await ui.click(stay);
      await ui.click(language === 'ar' ? 'تعديل البيانات' : 'Modifier');
      await ui.click(stay);
      await ui.click('Bachir', false);
      await ui.click(discard);
      assert.deepEqual(ui.state.reads, ['a', 'b']);
      assert.equal((ui.container.querySelector('form textarea') as HTMLTextAreaElement).value, '');
      assert.equal(ui.state.dirty, false);
      await ui.click(language === 'ar' ? 'إضافة' : 'Ajouter');
      await ui.change('form input[maxlength="200"]', 'Unsaved name');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      await ui.click(stay);
      assert.equal((ui.container.querySelector('form input[maxlength="200"]') as HTMLInputElement).value, 'Unsaved name');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      await ui.click(discard);
      assert.equal(ui.container.querySelector('form input[maxlength="200"]'), null);
      assert.equal(ui.state.writes, 0);
    } finally { await ui.cleanup(); }
  });

  test(`CRM (${language}) latest detail wins, abandoned reads cannot overwrite a new form, failed reads retry`, async () => {
    const ui = await mount(language);
    try {
      const slow = deferred<ProjectCustomerDto>();
      ui.state.details = async (id) => id === 'a' ? slow.promise : customer(id);
      await ui.click('Alice', false);
      await ui.click('Bachir', false);
      await act(async () => slow.resolve(customer('a')));
      assert.equal((ui.container.querySelector('form input[maxlength="120"]') as HTMLInputElement).value, '');
      await ui.click(language === 'ar' ? 'تعديل البيانات' : 'Modifier');
      assert.equal((ui.container.querySelector('form input[maxlength="200"]') as HTMLInputElement).value, 'Bachir');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      const abandoned = deferred<ProjectCustomerDto>();
      ui.state.details = () => abandoned.promise;
      await ui.click('Alice', false);
      await ui.click(language === 'ar' ? 'إضافة' : 'Ajouter');
      await act(async () => abandoned.resolve(customer('a')));
      assert.ok(ui.container.querySelector('form input[maxlength="200"]'), 'new form survives old details completion');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      ui.state.failDetails = true;
      await ui.click('Alice', false);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.equal(ui.container.querySelector('form'), null, 'failed selection is not the previous client');
      ui.state.failDetails = false;
      ui.state.details = async (id) => customer(id);
      await ui.click(language === 'ar' ? 'إعادة تحميل الزبون' : 'Recharger le client');
      assert.ok(ui.container.querySelector('form textarea'));
    } finally { await ui.cleanup(); }
  });

  test(`CRM (${language}) interaction failure keeps draft; successful write + read failure is not resubmitted`, async () => {
    const ui = await mount(language);
    try {
      await ui.click('Alice', false);
      await ui.change('form input[maxlength="120"]', 'Call about apartment');
      await ui.change('form textarea', 'Customer requested a visit');
      ui.state.interaction = async () => { throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid'); };
      await ui.submit('form textarea');
      assert.equal((ui.container.querySelector('form textarea') as HTMLTextAreaElement).value, 'Customer requested a visit');
      assert.equal(ui.state.dirty, true);
      const saving = deferred<Awaited<ReturnType<typeof apiClient.addCustomerInteraction>>>();
      ui.state.interaction = () => saving.promise;
      await ui.submit('form textarea');
      assert.equal(ui.button('Bachir', false).disabled, true);
      assert.equal(ui.button(language === 'ar' ? 'إضافة' : 'Ajouter').disabled, true);
      ui.state.failDetails = true;
      ui.state.failList = true;
      await act(async () => saving.resolve({} as Awaited<ReturnType<typeof apiClient.addCustomerInteraction>>));
      assert.equal(ui.state.interactions.length, 2);
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', language === 'ar' ? /تم تسجيل المتابعة/ : /suivi a été enregistré/);
      assert.equal(ui.state.dirty, false);
      ui.state.failDetails = false;
      ui.state.failList = false;
      await ui.click(language === 'ar' ? 'إعادة تحميل الزبون' : 'Recharger le client');
      await ui.click(language === 'ar' ? 'إعادة تحميل السجلات' : 'Recharger le registre');
      assert.equal(ui.state.interactions.length, 2, 'read retries never replay a successful write');
      assert.equal((ui.container.querySelector('form textarea') as HTMLTextAreaElement).value, '');
    } finally { await ui.cleanup(); }
  });

  test(`CRM (${language}) searches loaded records and filters status without dropping selected drafts`, async () => {
    const ui = await mount(language);
    try {
      await ui.click('Alice', false);
      await ui.change('form textarea', 'Retain this note');
      await ui.change('input[type="search"]', '0777');
      assert.equal([...ui.container.querySelectorAll('button')].some((item) => item.textContent?.trim().startsWith('Alice')), false);
      assert.ok(ui.button('Bachir', false));
      await ui.change('select[aria-label]', 'Prospect');
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /لا توجد سجلات تطابق/ : /Aucun client ne correspond/);
      assert.equal((ui.container.querySelector('form textarea') as HTMLTextAreaElement).value, 'Retain this note');
      await ui.click(language === 'ar' ? 'مسح التصفية' : 'Effacer les filtres');
      assert.ok(ui.button('Alice', false));
      assert.ok(ui.button('Bachir', false));
      assert.equal(ui.state.dirty, true);
    } finally { await ui.cleanup(); }
  });

  test(`CRM (${language}) customer save failure retains editable fields and success survives a registry read failure`, async () => {
    const ui = await mount(language);
    try {
      await ui.click('Alice', false);
      await ui.click(language === 'ar' ? 'تعديل البيانات' : 'Modifier');
      await ui.change('input[type="tel"]', '0555999888');
      ui.state.save = async () => { throw new ApiError(409, 'CONCURRENCY_CONFLICT', 'Conflict'); };
      await ui.submit('input[type="tel"]');
      assert.equal((ui.container.querySelector('input[type="tel"]') as HTMLInputElement).value, '0555999888');
      assert.equal(ui.state.dirty, true);
      ui.state.save = async () => ({ ...customer('a'), phone: '0555999888', concurrencyStamp: 'v2' });
      ui.state.failList = true;
      await ui.submit('input[type="tel"]');
      assert.equal(ui.state.writes, 2);
      assert.equal(ui.container.querySelector('input[type="tel"]'), null);
      assert.match(ui.container.textContent ?? '', /0555999888/);
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', language === 'ar' ? /تم حفظ السجل/ : /enregistré sur le serveur/);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.equal(ui.state.dirty, false);
      ui.state.failList = false;
      await ui.click(language === 'ar' ? 'إعادة تحميل السجلات' : 'Recharger le registre');
      assert.equal(ui.state.writes, 2);
    } finally { await ui.cleanup(); }
  });

  test(`CRM (${language}) invalidates party search when its query or form changes`, async () => {
    const ui = await mount(language);
    try {
      await ui.click(language === 'ar' ? 'إضافة' : 'Ajouter');
      const slow = deferred<PartyDirectoryItemDto[]>();
      ui.state.search = () => slow.promise;
      await ui.change('form input[maxlength="100"]', 'Old');
      await ui.click(language === 'ar' ? 'بحث' : 'Rechercher');
      await ui.change('form input[maxlength="100"]', 'New');
      await act(async () => slow.resolve([{ id: 'old', displayName: 'STALE-PARTY', kind: 'Person' } as PartyDirectoryItemDto]));
      assert.doesNotMatch(ui.container.textContent ?? '', /STALE-PARTY/);
      const abandoned = deferred<PartyDirectoryItemDto[]>();
      ui.state.search = () => abandoned.promise;
      await ui.click(language === 'ar' ? 'بحث' : 'Rechercher');
      await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler');
      await ui.click(discard);
      await ui.click(language === 'ar' ? 'إضافة' : 'Ajouter');
      await act(async () => abandoned.resolve([{ id: 'old', displayName: 'ABANDONED-PARTY', kind: 'Person' } as PartyDirectoryItemDto]));
      assert.doesNotMatch(ui.container.textContent ?? '', /ABANDONED-PARTY/);
    } finally { await ui.cleanup(); }
  });
}

test('CRM read-only registry retains viewing/filtering without manager document reads or write controls', async () => {
  const ui = await mount('fr', false);
  try {
    await ui.click('Alice', false);
    assert.equal(ui.state.documentReads, 0);
    assert.equal(ui.container.querySelector('form'), null);
    assert.ok(ui.container.querySelector('input[type="search"]'));
  } finally { await ui.cleanup(); }
});
