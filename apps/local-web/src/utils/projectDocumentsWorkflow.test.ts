import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { ProjectDocumentsModal } from '../modules/module-k-documents';
import { apiClient, ApiError } from '../core/api/apiClient';
import type { AppLanguage, ProjectDocumentDto, ProjectDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

function document(id: string, category = 'Plans'): ProjectDocumentDto {
  return {
    id, originalFileName: `${id}.pdf`, category, description: id === 'plan' ? 'Building A layout' : 'Permit dossier',
    contentType: 'application/pdf', sizeBytes: 128, sha256Checksum: 'a'.repeat(64),
    uploadedByUserId: 'operator', uploadedByFullName: 'Operator', createdAtUtc: '2026-11-20T10:00:00Z',
    isCustomerIdentitySensitive: false, requiresSensitivityReview: false, concurrencyStamp: 'v1',
  };
}

async function mount(language: AppLanguage, canUpload = true) {
  const original = {
    listProjectDocuments: apiClient.listProjectDocuments,
    uploadProjectDocument: apiClient.uploadProjectDocument,
    downloadProjectDocument: apiClient.downloadProjectDocument,
  };
  const state = {
    dirty: false, reads: [] as string[], uploads: [] as FormData[], downloads: [] as string[],
    list: async (_project: string): Promise<ProjectDocumentDto[]> => [document('plan'), document('permit', 'Permits')],
    upload: async (): Promise<ProjectDocumentDto> => document('uploaded'),
    download: async (): Promise<Blob> => new Blob(['document']),
  };
  apiClient.listProjectDocuments = (project) => { state.reads.push(project); return state.list(project); };
  apiClient.uploadProjectDocument = (_project, data) => { state.uploads.push(data); return state.upload(); };
  apiClient.downloadProjectDocument = (_project, id) => { state.downloads.push(id); return state.download(); };
  const element = (id = 'project', lang = language) => createElement(ProjectDocumentsModal, {
    project: { id, code: id } as ProjectDto, language: lang, canUpload, mode: 'embedded',
    onDirtyChange: (dirty) => { state.dirty = dirty; },
  });
  const ui = await renderReact(element());
  const selectFile = async (file: File) => {
    const input = ui.container.querySelector('input[type="file"]');
    assert.ok(input);
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };
  return {
    ...ui, state, selectFile,
    renderProject: async (id: string, lang = language) => ui.render(element(id, lang)),
    cleanup: async () => { await ui.cleanup(); Object.assign(apiClient, original); },
  };
}

for (const language of ['ar', 'fr'] as const) {
  test(`documents (${language}) validates files, retains failed draft and distinguishes upload success from failed list reload`, async () => {
    const ui = await mount(language);
    try {
      await ui.selectFile(new File([], 'empty.pdf', { type: 'application/pdf' }));
      await ui.submit('input[type="file"]');
      assert.equal(ui.state.uploads.length, 0);
      await ui.selectFile(new File(['data'], 'draft.pdf', { type: 'application/pdf' }));
      await ui.change('form input[type="text"]', 'My upload description');
      ui.state.upload = async () => { throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid'); };
      await ui.submit('input[type="file"]');
      assert.equal(ui.state.dirty, true);
      assert.equal((ui.container.querySelector('form input[type="text"]') as HTMLInputElement).value, 'My upload description');
      const write = deferred<ProjectDocumentDto>();
      ui.state.upload = () => write.promise;
      await ui.submit('input[type="file"]');
      assert.ok(ui.container.querySelector('form fieldset:disabled'));
      const planned = [...ui.container.querySelectorAll('button')].find((item) => item.textContent?.includes('DocumentLink'));
      assert.ok(planned?.disabled, 'cannot leave upload while its outcome is unknown');
      await ui.submit('input[type="file"]');
      assert.equal(ui.state.uploads.length, 2, 'pending write cannot be submitted twice');
      ui.state.list = async () => { throw new Error('Offline after upload'); };
      await act(async () => write.resolve(document('uploaded')));
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', /draft.pdf/);
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.equal(ui.container.querySelector('article'), null);
      assert.doesNotMatch(ui.container.textContent ?? '', /Aucun document enregistré|لا توجد وثائق مسجلة/);
      assert.equal(ui.state.dirty, false);
      assert.equal((ui.container.querySelector('form input[type="text"]') as HTMLInputElement).value, '');
      assert.equal(ui.state.uploads[1].get('description'), 'My upload description');
      ui.state.list = async () => [document('uploaded')];
      await ui.click(language === 'ar' ? 'إعادة تحميل الوثائق' : 'Recharger les documents');
      assert.equal(ui.state.uploads.length, 2, 'read retry never uploads again');
      assert.match(ui.container.querySelector('article')?.textContent ?? '', /uploaded.pdf/);
    } finally { await ui.cleanup(); }
  });

  test(`documents (${language}) filtering preserves upload draft and Stay/Discard navigation`, async () => {
    const ui = await mount(language);
    try {
      await ui.selectFile(new File(['data'], 'draft.pdf'));
      await ui.change('form input[type="text"]', 'Keep this draft');
      await ui.change('input[type="search"]', 'LAYOUT');
      assert.equal(ui.container.querySelectorAll('article').length, 1);
      assert.match(ui.container.querySelector('article')?.textContent ?? '', /plan.pdf/);
      await ui.change('select[aria-label]', 'Permits');
      assert.equal(ui.container.querySelector('article'), null);
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /لا توجد وثائق تطابق/ : /Aucun document ne correspond/);
      await ui.click(language === 'ar' ? 'مسح التصفية' : 'Effacer les filtres');
      assert.equal(ui.container.querySelectorAll('article').length, 2);
      assert.equal(ui.state.reads.length, 1, 'local filters do not fetch or change access scope');
      const planned = [...ui.container.querySelectorAll('button')].find((item) => item.textContent?.includes('DocumentLink'));
      assert.ok(planned);
      await act(async () => planned.click());
      await ui.click(language === 'ar' ? 'البقاء في النموذج' : 'Rester sur le formulaire');
      assert.equal((ui.container.querySelector('form input[type="text"]') as HTMLInputElement).value, 'Keep this draft');
      await act(async () => planned.click());
      await ui.click(language === 'ar' ? 'تجاهل والمتابعة' : 'Abandonner et continuer');
      assert.equal(ui.state.dirty, false);
      assert.equal(ui.state.uploads.length, 0);
    } finally { await ui.cleanup(); }
  });

  test(`documents (${language}) obsolete list and upload completions do not affect another project`, async () => {
    const ui = await mount(language);
    try {
      const oldRead = deferred<ProjectDocumentDto[]>();
      ui.state.list = () => oldRead.promise;
      await ui.click(language === 'ar' ? 'تحديث القائمة' : 'Actualiser');
      ui.state.list = async () => [document('NEW-PROJECT')];
      await ui.renderProject('project-2');
      await act(async () => oldRead.resolve([document('OLD-PROJECT')]));
      assert.match(ui.container.textContent ?? '', /NEW-PROJECT/);
      assert.doesNotMatch(ui.container.textContent ?? '', /OLD-PROJECT/);
      const upload = deferred<ProjectDocumentDto>();
      ui.state.upload = () => upload.promise;
      await ui.selectFile(new File(['data'], 'old-project-draft.pdf'));
      await ui.submit('input[type="file"]');
      await ui.renderProject('project-3');
      await ui.change('form input[type="text"]', 'New project draft');
      const readsBefore = ui.state.reads.length;
      await act(async () => upload.resolve(document('OLD-UPLOAD')));
      assert.equal(ui.state.reads.length, readsBefore, 'obsolete write must not reload the old project');
      assert.equal((ui.container.querySelector('form input[type="text"]') as HTMLInputElement).value, 'New project draft');
      assert.doesNotMatch(ui.container.textContent ?? '', /old-project-draft.pdf|OLD-UPLOAD/);
    } finally { await ui.cleanup(); }
  });

  test(`documents (${language}) language change does not unlock a pending upload`, async () => {
    const ui = await mount(language);
    try {
      const upload = deferred<ProjectDocumentDto>();
      ui.state.upload = () => upload.promise;
      await ui.selectFile(new File(['data'], 'language-draft.pdf'));
      await ui.submit('input[type="file"]');
      await ui.renderProject('project', language === 'ar' ? 'fr' : 'ar');
      assert.ok(ui.container.querySelector('form fieldset:disabled'));
      await ui.submit('input[type="file"]');
      assert.equal(ui.state.uploads.length, 1);
      await act(async () => upload.resolve(document('uploaded')));
      assert.equal(ui.state.dirty, false);
      assert.equal(ui.container.querySelector('form fieldset:disabled'), null);
      assert.match(ui.container.querySelector('[role="status"]')?.textContent ?? '', language === 'ar' ? /téléversé/ : /تم رفع/);
    } finally { await ui.cleanup(); }
  });
}

test('document read-only viewing and download errors never expose uploads or create a stale cross-project download', async () => {
  const ui = await mount('fr', false);
  const originalCreate = URL.createObjectURL;
  let objectUrls = 0;
  URL.createObjectURL = () => { ++objectUrls; return 'blob:test'; };
  try {
    assert.equal(ui.container.querySelector('form'), null);
    await ui.change('input[type="search"]', 'plan.pdf');
    const blob = deferred<Blob>();
    ui.state.download = () => blob.promise;
    await ui.click('Télécharger');
    assert.equal(ui.button('Télécharger').disabled, true);
    await ui.renderProject('another-project');
    await act(async () => blob.resolve(new Blob(['old file'])));
    assert.equal(objectUrls, 0, 'a prior project download cannot be delivered into the new view');
    ui.state.download = async () => { throw new ApiError(403, 'PROJECT_ACCESS_DENIED', 'Denied'); };
    await ui.change('input[type="search"]', 'plan.pdf');
    await ui.click('Télécharger');
    assert.ok(ui.container.querySelector('[role="alert"]'));
    assert.equal(ui.button('Télécharger').disabled, false);
    assert.equal(ui.state.uploads.length, 0);
    assert.equal(objectUrls, 0);
  } finally { await ui.cleanup(); URL.createObjectURL = originalCreate; }
});
