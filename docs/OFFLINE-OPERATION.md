# PROMO GEST — Offline & LAN-First Operation

## 1. What "Local-First / Offline-Capable" Means in PROMO GEST
PROMO GEST operates inside the organization's premises without requiring any public internet connection:
- **Zero internet dependency**: All business operations (setup, login, employee management, project access control, future sales/contracts/payments) execute exclusively between employee workstations on the office LAN and the organization's local ASP.NET Core + PostgreSQL 18 server.
- **Zero external runtime requests**: Fonts (`IBM Plex Sans Arabic`, `Plus Jakarta Sans`, `IBM Plex Mono`) are bundled as local `.woff2` assets via `@fontsource`. There are zero Google Fonts requests, zero CDN scripts, and zero cloud analytics/telemetry.

## 2. Authoritative Source of Truth
**PostgreSQL 18 on the organization's local server is the sole authoritative database.**

- The browser **does not** use IndexedDB as an offline business database.
- The browser **does not** queue financial, contractual, or user authorization mutations offline when the local server is down.
- Why? In a multi-user real estate ERP, allowing disconnected workstations to accept unit reservations, payments, or permission changes locally would cause double-selling of apartments, split-brain accounting ledgers, and stale authorization decisions.

## 3. Service Worker Boundary (`/sw.js`)
The optional Service Worker caches **only static application shell assets** (`/` shell, compiled JS/CSS bundles, local fonts, manifest).
- Every request to `/api/*` or `/health/*` is **explicitly bypassed** (`return;` without touching CacheStorage) so confidential customer, financial, and security records are never cached in the browser.

## 4. Behavior When the Local Server Is Unavailable
- The frontend polls `/health/ready` and monitors API fetch failures (`ApiConnectionError`).
- If the local server or PostgreSQL stops or the LAN cable is unplugged, the UI switches the connection indicator to **Disconnected** and displays a prominent banner explaining that business transactions are paused until the local server is reachable again.
