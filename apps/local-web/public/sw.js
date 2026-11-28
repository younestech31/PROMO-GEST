/* PROMO GEST Offline Shell Service Worker
 * Caches ONLY static application shell assets.
 * NEVER caches /api/* or /health/* responses to protect confidential ERP data.
 */
const CACHE_NAME = 'promogest-shell-v4';
const SHELL_URLS = ['/index.html', '/manifest.webmanifest'];

// Vite emits immutable entry scripts, stylesheets and modulepreloads under /assets/.
// Cache them before publishing an HTML shell that references them. Lazy modules are
// still cached on first use and are not guaranteed to be available offline.
function shellAssets(html) {
  return [...new Set([...html.matchAll(/(?:src|href)=["'](\/assets\/[^"'?#]+)["']/g)].map((match) => match[1]))];
}

async function cacheShellResponse(cache, response) {
  const html = await response.clone().text();
  const assets = shellAssets(html);
  if (assets.length > 0) await cache.addAll(assets);
  await cache.put('/index.html', response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL_URLS);
      const shell = await cache.match('/index.html');
      if (!shell) throw new Error('Offline shell is missing');
      await cacheShellResponse(cache, shell);
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('promogest-shell-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strictly never intercept or cache API calls, health probes, or non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/health/') ||
    url.pathname === '/health'
  ) {
    return;
  }

  // Network-first. Only replace the offline shell after its referenced entry
  // assets have been fetched successfully, so upgrades never leave a broken pair.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    const network = fetch(event.request);
    event.respondWith(network.catch(() => caches.match('/index.html')));
    event.waitUntil(network.then(async (response) => {
      if (response.ok && response.type === 'basic' &&
          (response.headers.get('content-type') || '').includes('text/html')) {
        const cache = await caches.open(CACHE_NAME);
        await cacheShellResponse(cache, response);
      }
    }).catch(() => {
      // Keep the previous verified shell when the network or cache update fails.
    }));
    return;
  }

  // Cache-first only for immutable hashed static assets (/assets/*, fonts, manifest)
  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cloned = response.clone();
            return caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, cloned))
              .catch(() => {})
              .then(() => response);
          }
          return response;
        });
      })
    );
  }
});
