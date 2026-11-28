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

class MockResponse {
  readonly ok = true;
  readonly status = 200;
  readonly type = 'basic';
  readonly headers = { get: () => 'text/html' };
  constructor(readonly body: string) {}
  clone() { return new MockResponse(this.body); }
  async text() { return this.body; }
}

function createWorkerHarness() {
  const handlers: Record<string, WorkerHandler> = {};
  const entries = new Map<string, MockResponse>();
  let cacheName = '';
  let network = true;
  let html = '<script type="module" src="/assets/index-old.js"></script>';
  let failedAsset: string | null = null;
  const normalize = (request: string | { url: string }) => {
    const value = typeof request === 'string' ? request : request.url;
    const parsed = new URL(value, 'https://promogest.test');
    return parsed.origin === 'https://promogest.test' ? `${parsed.pathname}${parsed.search}` : parsed.href;
  };
  const cache = {
    addAll: async (urls: string[]) => {
      if (urls.includes(failedAsset ?? '')) throw new Error('asset unavailable');
      for (const url of urls) {
        entries.set(url, new MockResponse(url === '/index.html' ? html : `asset:${url}`));
      }
    },
    match: async (request: string | { url: string }) => entries.get(normalize(request)),
    put: async (request: string | { url: string }, response: MockResponse) => {
      entries.set(normalize(request), response);
    },
  };
  const sandbox = {
    self: {
      location: { origin: 'https://promogest.test' },
      clients: { claim: async () => undefined },
      addEventListener: (name: string, handler: WorkerHandler) => { handlers[name] = handler; },
      skipWaiting: async () => undefined,
    },
    caches: {
      open: async (name: string) => { cacheName = name; return cache; },
      keys: async () => [cacheName],
      delete: async () => true,
      match: cache.match,
    },
    fetch: async () => {
      if (!network) throw new Error('network unavailable');
      return new MockResponse(html);
    },
    URL,
  };
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return {
    handlers, entries,
    get cacheName() { return cacheName; },
    setNetwork: (value: boolean) => { network = value; },
    setHtml: (value: string) => { html = value; },
    setFailedAsset: (value: string | null) => { failedAsset = value; },
  };
}

async function install(worker: ReturnType<typeof createWorkerHarness>) {
  let promise: Promise<unknown> | undefined;
  worker.handlers.install({ waitUntil: (value) => { promise = value; } });
  assert.ok(promise);
  await promise;
}

async function navigate(worker: ReturnType<typeof createWorkerHarness>) {
  let response: Promise<unknown> | undefined;
  let lifetime: Promise<unknown> | undefined;
  worker.handlers.fetch({
    request: { url: 'https://promogest.test/', method: 'GET', mode: 'navigate' },
    respondWith: (value) => { response = value; },
    waitUntil: (value) => { lifetime = value; },
  });
  assert.ok(response);
  const result = await response as MockResponse;
  await lifetime;
  return result;
}

test('installation caches the shell and its entry assets', async () => {
  const worker = createWorkerHarness();
  await install(worker);
  assert.equal(worker.cacheName, 'promogest-shell-v4');
  assert.ok(worker.entries.has('/index.html'));
  assert.ok(worker.entries.has('/manifest.webmanifest'));
  assert.ok(worker.entries.has('/assets/index-old.js'));
});

test('offline navigation uses the cached shell', async () => {
  const worker = createWorkerHarness();
  await install(worker);
  worker.setNetwork(false);
  assert.match((await navigate(worker)).body, /index-old/);
});

test('a successful upgrade replaces the offline shell only after its entry assets are cached', async () => {
  const worker = createWorkerHarness();
  await install(worker);
  worker.setHtml('<script src="/assets/index-new.js"></script><link href="/assets/style-new.css">');
  await navigate(worker);
  assert.ok(worker.entries.has('/assets/index-new.js'));
  assert.ok(worker.entries.has('/assets/style-new.css'));
  worker.setNetwork(false);
  assert.match((await navigate(worker)).body, /index-new/);
});

test('a failed upgrade asset leaves the previous offline shell usable', async () => {
  const worker = createWorkerHarness();
  await install(worker);
  worker.setHtml('<script src="/assets/index-broken.js"></script>');
  worker.setFailedAsset('/assets/index-broken.js');
  await navigate(worker);
  worker.setNetwork(false);
  assert.match((await navigate(worker)).body, /index-old/);
});

test('service worker never intercepts API, health, or non-GET requests', () => {
  const worker = createWorkerHarness();
  for (const request of [
    { url: 'https://promogest.test/api/projects', method: 'GET', mode: 'cors' },
    { url: 'https://promogest.test/health/ready', method: 'GET', mode: 'cors' },
    { url: 'https://promogest.test/api/projects', method: 'POST', mode: 'cors' },
    { url: 'https://promogest.test.attacker.example/assets/index-old.js', method: 'GET', mode: 'cors' },
  ]) {
    let intercepted = false;
    worker.handlers.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, `${request.method} ${request.url} must bypass Cache Storage`);
  }
});

test('manifest.webmanifest is valid JSON and linked with use-credentials in index.html', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8')) as Record<string, unknown>;
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(typeof manifest.short_name, 'string');
  assert.ok((manifest.short_name as string).length <= 12);
  assert.match(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'),
    /<link\s+[^>]*rel="manifest"[^>]*href="\/manifest\.webmanifest"[^>]*crossorigin="use-credentials"[^>]*\/?>/i);
});
