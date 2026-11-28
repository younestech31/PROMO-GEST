import assert from 'node:assert/strict';
import { act, type ReactNode } from 'react';
import { JSDOM } from 'jsdom';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** A rendered component harness, not a browser or backend acceptance substitute. */
export async function renderReact(element: ReactNode) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://component.example.test' });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const { createRoot } = await import('react-dom/client');
  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);
  const render = async (next: ReactNode) => act(async () => root.render(next));
  const button = (text: string, exact = true) => {
    const found = [...container.querySelectorAll('button')].find((item) => exact
      ? item.textContent?.trim() === text : item.textContent?.trim().startsWith(text));
    assert.ok(found, `button: ${text}`);
    return found;
  };
  const click = async (text: string, exact = true) => act(async () => button(text, exact).click());
  const change = async (selector: string, value: string) => {
    const input = container.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    assert.ok(input, selector);
    const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype
      : input.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    assert.ok(setter);
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new dom.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  };
  const submit = async (selector: string) => {
    const form = container.querySelector(selector)?.closest('form');
    assert.ok(form);
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  };
  const cleanup = async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globals[key];
    }
  };
  try { await render(element); }
  catch (error) { await cleanup(); throw error; }
  return { container, button, click, change, submit, render, cleanup };
}
