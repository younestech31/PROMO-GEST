# PROMO GEST — Offline & LAN-First Operation

## 1. What "Local-First" means

PROMO GEST is designed to run on the organization's premises without requiring a public internet connection for normal business operations:

- Employee workstations communicate over the office LAN with the organization's local ASP.NET Core server.
- PostgreSQL 18 on that server is the sole authoritative business database.
- Static JavaScript, CSS, fonts, and other application assets are bundled locally. No CDN, Google Fonts, cloud analytics, or external runtime service is required for the core ERP.
- The optional Cloud SQL connector exists only for Google AI Studio development/testing and is not part of a customer's production deployment.

## 2. Authoritative data and transaction safety

The browser is not a second business database:

- The browser does not use IndexedDB as the authoritative ERP store.
- Financial, contractual, reservation, inventory, employee, and authorization mutations are not accepted offline and are not queued for automatic replay.
- This avoids conflicting unit reservations, double-selling, duplicated payments, stale permissions, and split-brain accounting.
- If the local API or PostgreSQL is unavailable, the UI reports the disconnected state and business transactions must wait until the local server is restored.

## 3. Service Worker cache boundary

The optional service worker caches only public static shell resources:

- `/index.html` and `/manifest.webmanifest` are pre-cached during installation.
- Hashed static bundles under `/assets/` are cached after a successful network fetch.
- A navigation request can fall back to the cached `/index.html` when the local server is temporarily unreachable. The shell may render, but it cannot load current business data or perform transactions while the API is unavailable.
- Requests to `/api/*`, `/health/*`, and all non-GET requests bypass Cache Storage. Private business and health responses are never cached.

This is an **offline shell fallback**, not offline ERP operation. Static assets are refreshed through normal application updates; the cache version is advanced when the shell caching strategy changes.

## 4. Behavior when the local server is unavailable

The frontend monitors `/health/ready` and API request failures. When the local server, PostgreSQL, or LAN connection is unavailable:

1. The connection indicator changes to Disconnected.
2. The application shell can be displayed from the service-worker cache when it was installed and its shell resources were cached successfully.
3. Business data and every state-changing operation remain unavailable until the local server is reachable again.
4. No API or health response is replayed from a browser cache.

A device with no previously installed service worker or no successful shell cache may show the browser's normal network error page instead.
