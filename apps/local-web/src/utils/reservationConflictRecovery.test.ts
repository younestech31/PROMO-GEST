import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { JSDOM } from 'jsdom';
import { apiClient, ApiError } from '../core/api/apiClient';
import type { AppLanguage, ProjectDto, ProjectSalesReservationDto, ProjectStructureDto } from '../types/erp';

function hold(overrides: Partial<ProjectSalesReservationDto> = {}): ProjectSalesReservationDto {
  return {
    id: 'hold-1', projectId: 'project-1', propertyUnitId: 'unit-1', unitNumber: 'A-001',
    projectCustomerId: 'customer-1', customerName: 'Client', reservationNumber: 'RSV-001',
    status: 'Active', reservedAtUtc: '2026-11-20T09:00:00Z', expiresAtUtc: '2026-12-01T09:00:00Z',
    closedAtUtc: null, closedByUserId: null, closeReason: null, createdByUserId: 'actor',
    createdAtUtc: '2026-11-20T09:00:00Z', concurrencyStamp: 'v1',
    reviewRequiredAtUtc: null, reviewCompletedAtUtc: null, isAwaitingReview: false,
    ...overrides,
  };
}

async function mount(language: AppLanguage, manage = true) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://reservations.example.test' });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const original = {
    listProjectSalesReservations: apiClient.listProjectSalesReservations,
    getProjectStructure: apiClient.getProjectStructure,
    listProjectCustomers: apiClient.listProjectCustomers,
    cancelProjectSalesReservation: apiClient.cancelProjectSalesReservation,
    reviewProjectSalesReservation: apiClient.reviewProjectSalesReservation,
    createProjectSalesReservation: apiClient.createProjectSalesReservation,
  };
  const state = {
    rows: [hold()], failRead: false, dirty: false, availableUnit: 'unit-1', structureReads: 0,
    listReads: 0,
    cancellations: [] as Array<Parameters<typeof apiClient.cancelProjectSalesReservation>[2]>,
    reviews: [] as Array<Parameters<typeof apiClient.reviewProjectSalesReservation>[2]>,
    creations: [] as Array<Parameters<typeof apiClient.createProjectSalesReservation>[1]>,
    cancel: async () => hold(), review: async () => hold(), create: async () => hold(),
  };
  apiClient.listProjectSalesReservations = async (_id, params) => {
    ++state.listReads;
    if (state.failRead) throw new Error('Offline');
    return params?.reviewRequired ? state.rows.filter((row) => row.isAwaitingReview) : state.rows;
  };
  apiClient.getProjectStructure = async () => {
    ++state.structureReads;
    return { buildings: [{ floors: [{ units: [{ id: state.availableUnit, unitNumber: 'AVAILABLE', unitType: 'Apartment', status: 'AvailableForSale' }] }] }] } as ProjectStructureDto;
  };
  apiClient.listProjectCustomers = async () => [{ id: 'customer-1', displayName: 'Client', status: 'Prospect' }] as Awaited<ReturnType<typeof apiClient.listProjectCustomers>>;
  apiClient.cancelProjectSalesReservation = async (_id, _holdId, payload) => {
    state.cancellations.push(payload);
    return state.cancel();
  };
  apiClient.reviewProjectSalesReservation = async (_id, _holdId, payload) => {
    state.reviews.push(payload);
    return state.review();
  };
  apiClient.createProjectSalesReservation = async (_id, payload) => {
    state.creations.push(payload);
    return state.create();
  };
  const { createRoot } = await import('react-dom/client');
  const { ProjectSalesReservationsModal } = await import('../modules/module-e-reservations');
  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);
  const onDirtyChange = (dirty: boolean) => { state.dirty = dirty; };
  await act(async () => root.render(createElement(ProjectSalesReservationsModal, {
    project: { id: 'project-1' } as ProjectDto, language, canManage: manage, mode: 'embedded', onDirtyChange,
  })));
  const button = (label: string) => {
    const found = [...container.querySelectorAll('button')].find((element) => element.textContent?.trim() === label);
    assert.ok(found, `button: ${label}`);
    return found;
  };
  const click = async (label: string) => act(async () => button(label).click());
  const fill = async (selector: string, value: string) => {
    const element = container.querySelector(selector) as HTMLTextAreaElement | HTMLInputElement;
    assert.ok(element, selector);
    const prototype = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    assert.ok(setter);
    await act(async () => {
      setter.call(element, value);
      element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  const submit = async (selector: string) => {
    const element = container.querySelector(selector);
    const form = element?.closest('form');
    assert.ok(form);
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  };
  const cleanup = async () => {
    await act(async () => root.unmount());
    Object.assign(apiClient, original);
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globals[key];
    }
  };
  return { container, state, button, click, fill, submit, cleanup };
}

for (const language of ['ar', 'fr'] as const) {
  test(`reservation expiry recovery (${language}) reloads server truth without replaying cancellation or losing a create draft`, async () => {
    const ui = await mount(language);
    try {
      await ui.fill('input[type="datetime-local"]', '2026-12-05T10:00');
      await ui.click(language === 'ar' ? 'إلغاء الحجز' : 'Annuler');
      await ui.fill('textarea', 'Requested by customer');
      ui.state.cancel = async () => {
        ui.state.rows = [hold({ status: 'Expired', concurrencyStamp: 'v2', closeReason: 'EXPIRED' })];
        throw new ApiError(409, 'RESERVATION_EXPIRY_REACHED', 'Do not show raw backend text');
      };
      await ui.submit('textarea');
      assert.equal(ui.state.cancellations.length, 1, 'never automatically replay a rejected write');
      assert.equal(ui.container.querySelector('textarea'), null, 'terminal hold closes obsolete cancellation form');
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /منتهٍ/ : /Expirée/);
      assert.ok(ui.container.querySelector('[role="alert"]'), 'conflict stays visible after refresh');
      assert.ok(ui.container.querySelector('[role="status"]'), 'successful refresh is explicitly reported');
      assert.equal((ui.container.querySelector('input[type="datetime-local"]') as HTMLInputElement).value, '2026-12-05T10:00');
      assert.equal(ui.state.dirty, true, 'creation draft stays protected');
      assert.doesNotMatch(ui.container.textContent ?? '', /Do not show raw backend text/);

      // The same 409 may preserve an active protected hold. Never infer Expired locally.
      ui.state.rows = [hold({ reviewRequiredAtUtc: '2026-11-25T10:00:00Z', isAwaitingReview: true })];
      await ui.click(language === 'ar' ? 'تحديث' : 'Actualiser');
      await ui.click(language === 'ar' ? 'إلغاء الحجز' : 'Annuler');
      await ui.fill('textarea', 'Protected hold');
      ui.state.cancel = async () => { throw new ApiError(409, 'RESERVATION_EXPIRY_REACHED', 'Protected'); };
      await ui.submit('textarea');
      assert.equal(ui.state.cancellations.length, 2);
      assert.ok(ui.container.querySelector('textarea'), 'protected active hold remains open');
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /بانتظار المراجعة/ : /En attente de revue/);
    } finally { await ui.cleanup(); }
  });

  test(`reservation concurrency recovery (${language}) blocks failed refreshes and uses a fresh stamp only after explicit confirmation`, async () => {
    const ui = await mount(language);
    try {
      await ui.click(language === 'ar' ? 'إلغاء الحجز' : 'Annuler');
      await ui.fill('textarea', 'Keep my reason');
      ui.state.cancel = async () => {
        ui.state.rows = [hold({ concurrencyStamp: 'v2', reviewRequiredAtUtc: '2026-11-25T10:00:00Z', isAwaitingReview: true })];
        ui.state.failRead = true;
        throw new ApiError(409, 'CONCURRENCY_CONFLICT', 'Conflict');
      };
      await ui.submit('textarea');
      assert.equal(ui.state.cancellations[0].expectedConcurrencyStamp, 'v1');
      assert.equal(ui.button(language === 'ar' ? 'تأكيد الإلغاء' : 'Confirmer l’annulation').disabled, true);
      assert.equal(ui.container.querySelector('[role="status"]'), null, 'a failed reload never claims refresh success');
      assert.equal(ui.container.querySelector('tbody'), null, 'failed snapshot is not actionable');
      await ui.submit('textarea');
      assert.equal(ui.state.cancellations.length, 1, 'even programmatic submission cannot use a stale snapshot');
      assert.equal((ui.container.querySelector('textarea') as HTMLTextAreaElement).value, 'Keep my reason');
      ui.state.failRead = false;
      await ui.click(language === 'ar' ? 'إعادة تحميل البيانات' : 'Recharger les données');
      assert.equal((ui.container.querySelector('textarea') as HTMLTextAreaElement).value, 'Keep my reason');
      assert.equal(ui.state.cancellations.length, 1);
      ui.state.cancel = async () => {
        ui.state.rows = [hold({ status: 'Cancelled', concurrencyStamp: 'v3' })];
        return ui.state.rows[0];
      };
      await ui.submit('textarea');
      assert.equal(ui.state.cancellations.length, 2);
      assert.deepEqual(ui.state.cancellations[1], { expectedConcurrencyStamp: 'v2', reason: 'Keep my reason' });
      assert.equal(ui.container.querySelector('textarea'), null);
    } finally { await ui.cleanup(); }
  });

  test(`reservation create/review recovery (${language}) never substitutes an unavailable unit or repeats a completed review`, async () => {
    const ui = await mount(language);
    try {
      ui.state.create = async () => {
        ui.state.availableUnit = 'unit-2';
        throw new ApiError(409, 'RESERVATION_UNIT_UNAVAILABLE', 'Unavailable');
      };
      await ui.submit('input[type="datetime-local"]');
      assert.equal(ui.state.creations.length, 1);
      assert.equal(ui.state.creations[0].propertyUnitId, 'unit-1');
      assert.equal((ui.container.querySelector('select') as HTMLSelectElement).value, '', 'do not silently reserve a different unit');
      assert.equal(ui.button(language === 'ar' ? 'إنشاء حجز' : 'Créer une réservation').disabled, true);
      ui.state.rows = [hold({ reviewRequiredAtUtc: '2026-11-25T10:00:00Z', isAwaitingReview: true })];
      await ui.click(language === 'ar' ? 'تحديث' : 'Actualiser');
      await ui.click(language === 'ar' ? 'تمت المراجعة' : 'Revue effectuée');
      ui.state.review = async () => {
        ui.state.rows = [hold({ reviewRequiredAtUtc: '2026-11-25T10:00:00Z', reviewCompletedAtUtc: '2026-11-26T10:00:00Z', concurrencyStamp: 'v2' })];
        throw new ApiError(409, 'RESERVATION_REVIEW_ALREADY_COMPLETED', 'Already reviewed');
      };
      await ui.click(language === 'ar' ? 'تأكيد تسجيل المراجعة' : 'Confirmer la revue');
      assert.equal(ui.state.reviews.length, 1);
      assert.equal(ui.state.reviews[0].expectedConcurrencyStamp, 'v1');
      assert.doesNotMatch(ui.container.textContent ?? '', language === 'ar' ? /تأكيد تسجيل المراجعة/ : /Confirmer la revue/);
      assert.match(ui.container.textContent ?? '', language === 'ar' ? /روجع في/ : /Revu le/);
    } finally { await ui.cleanup(); }
  });
}

test('read-only reservation viewers never fetch manager-only options or expose write forms', async () => {
  const ui = await mount('fr', false);
  try {
    assert.equal(ui.state.structureReads, 0);
    assert.equal(ui.container.querySelector('form'), null);
    assert.equal(ui.state.listReads, 2);
  } finally { await ui.cleanup(); }
});
