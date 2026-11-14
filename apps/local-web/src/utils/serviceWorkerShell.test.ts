import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

type WorkerEvent = {
  waitUntil?: (promise: Promise<unknown>) => void;
  request?: { url: string; method: string; mode?: string };
  respondWith?: (response: Promise<unknown>) => void;
};

type WorkerHandler = (event: WorkerEvent) => void;

function createWorkerHarness() {
  const handlers: Record<string, WorkerHandler> = {};
  const cachedUrls: string[] = [];
  let cacheName = '';

  const script = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  const cache = {
    addAll: async (urls: string[]) => {
      cachedUrls.push(...urls);
    },
    put: async () => undefined,
  };

  const sandbox = {
    self: {
      location: { origin: 'https://promogest.test' },
      clients: { claim: async () => undefined },
      addEventListener: (name: string, handler: WorkerHandler) => {
        handlers[name] = handler;
      },
      skipWaiting: async () => undefined,
    },
    caches: {
      open: async (name: string) => {
        cacheName = name;
        return cache;
      },
      keys: async () => [cacheName],
      delete: async () => true,
      match: async (request: string | { url: string }) => {
        const url = typeof request === 'string' ? request : request.url;
        return cachedUrls.includes(url) ? `cached:${url}` : undefined;
      },
    },
    fetch: async () => {
      throw new Error('network unavailable');
    },
    URL,
  };

  runInNewContext(script, sandbox);

  return { handlers, cachedUrls, get cacheName() { return cacheName; } };
}

test('service worker pre-caches the HTML shell required by its offline navigation fallback', async () => {
  const worker = createWorkerHarness();
  let installPromise: Promise<unknown> | undefined;

  worker.handlers.install({
    waitUntil: (promise) => {
      installPromise = promise;
    },
  });

  assert.ok(installPromise, 'install handler must register its cache operation');
  await installPromise;

  assert.equal(worker.cacheName, 'promogest-shell-v3');
  assert.deepEqual([...worker.cachedUrls].sort(), ['/index.html', '/manifest.webmanifest']);
});

test('navigation uses the cached HTML shell when the network is unavailable', async () => {
  const worker = createWorkerHarness();
  let installPromise: Promise<unknown> | undefined;
  worker.handlers.install({ waitUntil: (promise) => { installPromise = promise; } });
  await installPromise;

  let navigationResponse: Promise<unknown> | undefined;
  worker.handlers.fetch({
    request: { url: 'https://promogest.test/', method: 'GET', mode: 'navigate' },
    respondWith: (response) => { navigationResponse = response; },
  });

  assert.ok(navigationResponse, 'navigation handler must supply a response');
  assert.equal(await navigationResponse, 'cached:/index.html');
});

test('service worker never intercepts API, health, or non-GET requests', () => {
  const worker = createWorkerHarness();
  const requests = [
    { url: 'https://promogest.test/api/projects', method: 'GET', mode: 'cors' },
    { url: 'https://promogest.test/health/ready', method: 'GET', mode: 'cors' },
    { url: 'https://promogest.test/api/projects', method: 'POST', mode: 'cors' },
  ];

  for (const request of requests) {
    let intercepted = false;
    worker.handlers.fetch({
      request,
      respondWith: () => { intercepted = true; },
    });
    assert.equal(intercepted, false, `request must bypass Cache Storage: ${request.method} ${request.url}`);
  }
});
