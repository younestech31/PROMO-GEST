import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { JSDOM } from 'jsdom';
import { apiClient } from '../core/api/apiClient';
import type { AppLanguage, AuthenticatedUser, ProjectDirectoryPageDto, ProjectDto } from '../types/erp';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const user: AuthenticatedUser = {
  id: 'directory-reader', username: 'reader', fullName: 'Reader', email: 'reader@example.test',
  phone: null, isSystemAdministrator: false, isActive: true, preferredLanguage: 'fr',
  concurrencyStamp: 'v1', roles: [], permissions: [], lastLoginAtUtc: null,
  mustChangePasswordAtNextLogin: false, passwordChangeRequiredUntilUtc: null,
};

function page(label: string, number = 1, pageSize = 25): ProjectDirectoryPageDto {
  return {
    items: [{
      id: label, code: label, nameAr: label, nameFr: label, status: 'Planning',
      members: [], estimatedBudgetDzd: null, actualBuildingsCount: 0, actualUnitsCount: 0,
    } as unknown as ProjectDto],
    page: number, pageSize, totalCount: 80, totalPages: Math.ceil(80 / pageSize),
  };
}

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`project directory (${language}): latest response wins, applied filters persist, failure retries safely`, async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'https://directory.example.test',
    });
    const globals = globalThis as unknown as Record<string, unknown>;
    const previous = new Map<string, PropertyDescriptor | undefined>();
    for (const [key, value] of Object.entries({
      window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
      HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true,
    })) {
      previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const originalDirectory = apiClient.listProjectDirectoryPage;
    const originalReference = apiClient.getAdministrativeUnits;
    const calls: Array<{
      query: Parameters<typeof apiClient.listProjectDirectoryPage>[0];
      result: ReturnType<typeof deferred<ProjectDirectoryPageDto>>;
    }> = [];
    apiClient.listProjectDirectoryPage = (query) => {
      const result = deferred<ProjectDirectoryPageDto>();
      calls.push({ query, result });
      return result.promise;
    };
    apiClient.getAdministrativeUnits = async () => { throw new Error('Reference not needed by directory'); };
    const { createRoot } = await import('react-dom/client');
    const { ProjectsAccessView } = await import('../modules/module-b-projects');
    const container = dom.window.document.getElementById('root');
    assert.ok(container);
    const root = createRoot(container);
    const render = (actor = user) => root.render(createElement(ProjectsAccessView, { currentUser: actor, language }));
    const change = async (selector: string, value: string) => {
      const element = container.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
      assert.ok(element, selector);
      const prototype = element.tagName === 'INPUT' ? dom.window.HTMLInputElement.prototype : dom.window.HTMLSelectElement.prototype;
      await act(async () => {
        const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        assert.ok(setValue);
        setValue.call(element, value);
        element.dispatchEvent(new dom.window.Event(element.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }));
      });
    };
    const submit = async () => act(async () => {
      const form = container.querySelector('form');
      assert.ok(form);
      form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    });
    const click = async (text: string) => {
      const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === text);
      assert.ok(button, text);
      await act(async () => button.click());
    };
    const settle = async (index: number, label: string) => act(async () => {
      const query = calls[index].query;
      calls[index].result.resolve(page(label, query.page, query.pageSize));
    });
    try {
      await act(async () => render());
      assert.equal(calls.length, 1);
      // Filter request finishes before the initial slow response.
      await change('input[type="search"]', 'approved');
      await submit();
      assert.equal(calls[1].query.q, 'approved');
      await settle(1, 'LATEST');
      await settle(0, 'STALE');
      assert.match(container.textContent ?? '', /LATEST/);
      assert.doesNotMatch(container.textContent ?? '', /STALE/);

      // Typing a draft must not silently apply it via paging, size, or status.
      await change('input[type="search"]', 'unsent-draft');
      await click(language === 'ar' ? 'التالي' : 'Suivant');
      assert.deepEqual(calls[2].query, { q: 'approved', status: undefined, page: 2, pageSize: 25 });
      await settle(2, 'SECOND-PAGE');
      await change('select', 'Delivered');
      assert.equal(calls[3].query.q, 'approved');
      assert.equal(calls[3].query.status, 'Delivered');
      assert.equal(calls[3].query.page, 1);
      await settle(3, 'DELIVERED');
      await change('label select', '50');
      assert.equal(calls[4].query.q, 'approved');
      assert.equal(calls[4].query.pageSize, 50);
      await settle(4, 'FIFTY');

      // Neither stale rejection nor its finally may hide the newer skeleton.
      await submit();
      await submit();
      await act(async () => calls[5].result.reject(new Error('Superseded')));
      assert.equal(container.querySelector('[aria-busy]')?.getAttribute('aria-busy'), 'true');
      assert.equal(container.querySelector('[role="alert"]'), null);
      await act(async () => calls[6].result.reject(new Error('Offline')));
      assert.ok(container.querySelector('[role="alert"]'));
      assert.equal(container.querySelector('article'), null);
      assert.equal(container.querySelector('tbody'), null);
      assert.equal(container.querySelector('h2'), null, 'failure must not masquerade as an empty directory');
      await click(language === 'ar' ? 'إعادة المحاولة' : 'Réessayer');
      assert.deepEqual(calls[7].query, calls[6].query);
      await settle(7, 'RETRIED');
      assert.match(container.textContent ?? '', /RETRIED/);
      assert.equal(container.querySelector('[role="alert"]'), null);

      // Reset and actor change invalidate old work; a completion after unmount is ignored.
      await submit();
      await click(language === 'ar' ? 'مسح' : 'Réinitialiser');
      assert.equal(calls[9].query.q, undefined);
      assert.equal(calls[9].query.status, undefined);
      await settle(9, 'RESET');
      await settle(8, 'BEFORE-RESET');
      assert.doesNotMatch(container.textContent ?? '', /BEFORE-RESET/);
      await submit();
      await act(async () => render({ ...user, id: 'another-reader' }));
      await settle(10, 'OTHER-USER-STALE');
      assert.doesNotMatch(container.textContent ?? '', /OTHER-USER-STALE/);
      await settle(11, 'OTHER-USER');
      await submit();
      await act(async () => root.unmount());
      await settle(12, 'UNMOUNTED');
    } finally {
      await act(async () => root.unmount());
      apiClient.listProjectDirectoryPage = originalDirectory;
      apiClient.getAdministrativeUnits = originalReference;
      dom.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globals[key];
      }
    }
  });
}
