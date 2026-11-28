import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { apiClient, ApiError } from '../core/api/apiClient';
import { StagedAdministrativeReferencePanel, TerritorialReferenceView } from '../modules/module-a-organization';
import type { AppLanguage, AuthenticatedUser, StagedAdministrativeSnapshotDto, StagedAdministrativeCommunePageDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const snapshotId = `sheets-sha256-${'a'.repeat(64)}`;
const snapshot: StagedAdministrativeSnapshotDto = {
  snapshotId, canonicalContentSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64),
  sourceSpreadsheetId: 'SYNTHETIC-SOURCE-NOT-EVIDENCE', claimedCaptureAtUtc: '2026-11-27T12:00:00Z',
  publicationStatus: 'StagedNotActivated', declaredWilayaCount: 1, declaredCommuneCount: 2, declaredAliasCount: 1,
  declaredDairaCount: 2, recordedObservedDairaCount: 1, storedWilayaCount: 1, storedCommuneCount: 2,
  storedAliasCount: 1, storedObservedDairaCount: 1, countsMatchMetadata: true,
  wilayas: [{ id: 'w1', code: '01', nameAr: 'ولاية', nameFr: 'Wilaya', nameArSource: 'SOURCE', declaredCommuneCount: 2, storedCommuneCount: 2, declaredDairaCount: 2 }],
};
const page: StagedAdministrativeCommunePageDto = {
  snapshotId, page: 1, pageSize: 50, totalCount: 51, totalPages: 2,
  items: [{ id: 'c1', code: '0101', wilayaId: 'w1', wilayaCode: '01', nameAr: 'الاسم الأصلي', nameFr: 'ORIGINAL-FR',
    dairaNameAr: 'دائرة', dairaNameFr: 'Daira', isDairaSeat: null, parentEffectiveFrom: null, parentEffectiveTo: null, parentDateEvidence: null,
    alias: { referenceNameAr: 'مرجع', referenceNameFr: 'REFERENCE-FR', aliasNameFr: 'ALIAS-FR', repositoryNameAr: 'العرض', evidence: 'SYNTHETIC-EVIDENCE' } }],
};

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  const inspect = language === 'ar' ? 'فحص النسخة' : 'Inspecter la version';
  test(`staged reference (${language}): explicit ID, preserved source/alias/unknowns, safe paging and no activation`, async () => {
    const original = { snapshot: apiClient.getStagedAdministrativeSnapshot, communes: apiClient.getStagedAdministrativeCommunes };
    const reads: Array<{ filters: { wilayaCode: string; query: string; page: number }; result: ReturnType<typeof deferred<StagedAdministrativeCommunePageDto>>; signal?: AbortSignal }> = [];
    let metadataReads = 0;
    apiClient.getStagedAdministrativeSnapshot = async () => { metadataReads++; return snapshot; };
    apiClient.getStagedAdministrativeCommunes = (_id, filters, signal) => {
      const result = deferred<StagedAdministrativeCommunePageDto>(); reads.push({ filters, result, signal }); return result.promise;
    };
    const element = (lang = language) => createElement(StagedAdministrativeReferencePanel, { language: lang });
    const ui = await renderReact(element());
    try {
      assert.equal(metadataReads, 0);
      await ui.change('input', 'invalid'); await ui.click(inspect);
      assert.equal(metadataReads, 0);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      await ui.change('input', snapshotId); await ui.click(inspect);
      assert.equal(metadataReads, 1);
      assert.equal(reads.length, 1);
      await act(async () => reads[0].result.resolve(page));
      assert.match(ui.container.textContent ?? '', /ORIGINAL-FR/);
      assert.match(ui.container.textContent ?? '', /ALIAS-FR/);
      assert.match(ui.container.textContent ?? '', /SYNTHETIC-EVIDENCE/);
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /غير معلوم/ : /Inconnu/);
      assert.equal(ui.container.querySelector('input[type="date"]'), null);
      assert.equal(ui.container.querySelectorAll('button').length, 4);
      await ui.click(language === 'ar' ? 'التالي' : 'Suivant');
      assert.equal(reads[1].filters.page, 2);
      assert.doesNotMatch(ui.container.textContent ?? '', /ORIGINAL-FR/);
      await ui.change('select', '01');
      assert.equal(reads[2].filters.page, 1);
      assert.equal(reads[2].filters.wilayaCode, '01');
      assert.equal(reads[1].signal?.aborted, true);
      await act(async () => reads[1].result.resolve({ ...page, items: [{ ...page.items[0], nameFr: 'STALE-PAGE' }] }));
      assert.doesNotMatch(ui.container.textContent ?? '', /STALE-PAGE/);
      await act(async () => reads[2].result.resolve({ ...page, totalCount: 1, totalPages: 1 }));
      await ui.render(element(language === 'ar' ? 'fr' : 'ar'));
      assert.equal(reads.length, 3, 'language switch must not refetch');
      assert.equal(metadataReads, 1);
      assert.match(ui.container.textContent ?? '', /ORIGINAL-FR/);
    } finally { await ui.cleanup(); apiClient.getStagedAdministrativeSnapshot = original.snapshot; apiClient.getStagedAdministrativeCommunes = original.communes; }
  });

  test(`staged reference (${language}): failure is not an empty catalogue, retry works, 403 clears all inspected data`, async () => {
    const original = { snapshot: apiClient.getStagedAdministrativeSnapshot, communes: apiClient.getStagedAdministrativeCommunes };
    let metadataReads = 0;
    const reads: Array<ReturnType<typeof deferred<StagedAdministrativeCommunePageDto>>> = [];
    apiClient.getStagedAdministrativeSnapshot = async () => {
      if (++metadataReads === 1) throw new Error('PRIVATE-DETAIL');
      return snapshot;
    };
    apiClient.getStagedAdministrativeCommunes = () => { const result = deferred<StagedAdministrativeCommunePageDto>(); reads.push(result); return result.promise; };
    const ui = await renderReact(createElement(StagedAdministrativeReferencePanel, { language }));
    try {
      await ui.change('input', snapshotId); await ui.click(inspect);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.doesNotMatch(ui.container.textContent ?? '', /PRIVATE-DETAIL|SYNTHETIC-SOURCE/);
      await ui.click(language === 'ar' ? 'إعادة المحاولة' : 'Réessayer');
      await act(async () => reads[0].resolve(page));
      assert.match(ui.container.textContent ?? '', /ORIGINAL-FR/);
      await ui.click(language === 'ar' ? 'التالي' : 'Suivant');
      await act(async () => reads[1].reject(new ApiError(403, 'FORBIDDEN_REFERENCE_INSPECTION', 'PRIVATE-DETAIL')));
      assert.doesNotMatch(ui.container.textContent ?? '', /ORIGINAL-FR|SYNTHETIC-SOURCE|PRIVATE-DETAIL/);
      assert.equal(ui.container.querySelector('form'), null);
      assert.ok(ui.container.querySelector('[role="alert"]'));
    } finally { await ui.cleanup(); apiClient.getStagedAdministrativeSnapshot = original.snapshot; apiClient.getStagedAdministrativeCommunes = original.communes; }
  });
}

test('territorial view: unauthorized panel never mounts; revocation/session stamp aborts and clears pending inspection', async () => {
  const original = { public: apiClient.getAdministrativeUnits, snapshot: apiClient.getStagedAdministrativeSnapshot };
  apiClient.getAdministrativeUnits = async () => { throw new Error('public catalogue unavailable'); };
  const reads: Array<{ result: ReturnType<typeof deferred<StagedAdministrativeSnapshotDto>>; signal?: AbortSignal }> = [];
  apiClient.getStagedAdministrativeSnapshot = (_id, signal) => {
    const result = deferred<StagedAdministrativeSnapshotDto>(); reads.push({ result, signal }); return result.promise;
  };
  const admin = { id: 'admin1', isActive: true, isSystemAdministrator: true, concurrencyStamp: 'v1' } as AuthenticatedUser;
  const element = (user?: AuthenticatedUser) => createElement(TerritorialReferenceView, { language: 'fr', currentUser: user, onNavigateHome: () => {} });
  const ui = await renderReact(element());
  try {
    assert.equal(ui.container.querySelector('form'), null);
    await ui.render(element({ ...admin, isSystemAdministrator: false }));
    assert.equal(ui.container.querySelector('form'), null);
    await ui.render(element({ ...admin, isActive: false }));
    assert.equal(ui.container.querySelector('form'), null);
    assert.equal(reads.length, 0);
    await ui.render(element(admin));
    await ui.change('input', snapshotId); await ui.click('Inspecter la version');
    await ui.render(element({ ...admin, concurrencyStamp: 'v2' }));
    assert.equal(reads[0].signal?.aborted, true);
    assert.equal((ui.container.querySelector('input') as HTMLInputElement).value, '');
    await act(async () => reads[0].result.resolve(snapshot));
    assert.doesNotMatch(ui.container.textContent ?? '', /SYNTHETIC-SOURCE/);
    await ui.change('input', snapshotId); await ui.click('Inspecter la version');
    await ui.render(element({ ...admin, isSystemAdministrator: false }));
    assert.equal(reads[1].signal?.aborted, true);
    assert.equal(ui.container.querySelector('form'), null);
  } finally { await ui.cleanup(); apiClient.getAdministrativeUnits = original.public; apiClient.getStagedAdministrativeSnapshot = original.snapshot; }
});

test('staged reference: removed snapshot clears metadata rather than showing an empty catalogue', async () => {
  const original = { snapshot: apiClient.getStagedAdministrativeSnapshot, communes: apiClient.getStagedAdministrativeCommunes };
  apiClient.getStagedAdministrativeSnapshot = async () => snapshot;
  apiClient.getStagedAdministrativeCommunes = async () => { throw new ApiError(404, 'REFERENCE_SNAPSHOT_NOT_FOUND', 'PRIVATE'); };
  const ui = await renderReact(createElement(StagedAdministrativeReferencePanel, { language: 'fr' }));
  try {
    await ui.change('input', snapshotId); await ui.click('Inspecter la version');
    assert.match(ui.container.textContent ?? '', /Version absente ou retirée/);
    assert.doesNotMatch(ui.container.textContent ?? '', /SYNTHETIC-SOURCE|PRIVATE|ORIGINAL-FR/);
  } finally { await ui.cleanup(); apiClient.getStagedAdministrativeSnapshot = original.snapshot; apiClient.getStagedAdministrativeCommunes = original.communes; }
});
