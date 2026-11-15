# PROMO GEST — Data Sovereignty & Local Deployment Guide

**Core Mandate:** PROMO GEST runs 100% locally on customer hardware over the office LAN with PostgreSQL 18 as the sole authoritative database and zero internet runtime dependencies.

---

## 1. Local PostgreSQL 18 Security Topology (`deploy/postgresql/00-init-db.sql`)

PROMO GEST enforces a strict **3-role database separation**:

| Role | Responsibility | Privileges |
|---|---|---|
| `postgres` (cluster superuser) | Initial cluster administration only | Not used by application runtime or CI migrations |
| `promogest_owner` | Schema owner used strictly during EF Core migrations & upgrades | Owns `promogest` DB & schema tables; executes DDL |
| `promogest_app` (`LOGIN`) | Least-privilege application runtime role (`PromoGest.Api`) | `SELECT, INSERT, UPDATE, DELETE` on application tables (`audit_logs` permits `INSERT`/`SELECT` while trigger blocks `UPDATE`/`DELETE` unconditionally); **zero DDL privileges** (`CREATE`, `DROP`, `ALTER` denied) |

- **Network Binding (`postgresql.recommended.conf`):** `listen_addresses = '127.0.0.1'`, `port = 5432`, `wal_level = replica`, `synchronous_commit = on`, `full_page_writes = on` (data durability against power loss on office servers).
- **Single-Tenant Isolation:** One dedicated `promogest` database per legal organization installation (`ADR-0002`).

---

## 2. Local Document Storage & Integrity (`LocalFileStorageService`)

- **Root Path:** Configured via `Storage:RootDirectory` (Linux template: `/var/lib/promogest/storage`; Windows template: `C:\PromoGest\storage`).
- **Path Traversal Defense:** Relative storage paths are server-generated (`projects/{projectId}/...`) and validated against root canonical path before I/O.
- **Cryptographic Verification:** SHA-256 digest computed on upload, persisted in `project_documents.sha256_checksum`, and re-verified on download to detect disk corruption or tampering.
- **Upload Guardrails:** Whitelisted extensions/MIME types (`pdf`, `png`, `jpg`, `jpeg`, `docx`, `xlsx`) and 25 MB per-file cap enforced server-side.

---

## 3. Data Protection & Key Ring Persistence (`DataProtectionConfiguration.cs`)

ASP.NET Core Data Protection secures Antiforgery/CSRF tokens and server-side protected payloads across restarts:

| Operating Mode | Mechanism | Verification Evidence |
|---|---|---|
| **Production Windows** (`deploy/windows/`) | Persist keys in `C:\PromoGest\dataprotection-keys` protected via **Windows DPAPI (`ProtectKeysWithDpapi(protectToLocalMachine: true)`)** | `WindowsDpapiMachineScopeTests.cs` (inside `PromoGest.IntegrationTests`) |
| **Production Linux** (`deploy/linux/`) | Persist keys in `/var/lib/promogest/dataprotection-keys` protected with an internal **X.509 PKCS#12 certificate** (`DataProtectionCertificatePath` + `DataProtectionCertificatePassword`) | `LinuxCertificateDataProtectionTests.cs` (inside `PromoGest.IntegrationTests`) |
| **Development** | Ephemeral / development fallback; warns explicitly when production key protection is unconfigured | Verified in `DataProtectionConfiguration.cs` |

---

## 4. On-Premises Packaging, Services & LAN HTTPS

### Linux Server (`deploy/linux/`)
- **Service Unit:** `promogest.service` runs `PromoGest.Api` bound to `127.0.0.1:5080` using `promogest.env` secrets.
- **Reverse Proxy (`Caddyfile`):** Terminates local LAN HTTPS (`tls internal` internal PKI CA or organization LAN IP/hostname) and forwards `X-Forwarded-Proto` & `X-Forwarded-For` to `127.0.0.1:5080`.
- **Scheduled Backup:** `promogest-backup.timer` triggers `promogest-backup.service` daily at `22:00` (`Persistent=true`).

### Windows Server (`deploy/windows/`)
- **Service Installer:** `install-service.ps1` registers `PromoGest` Windows Service running published self-contained `PromoGest.Api.exe` on `127.0.0.1:5080` + configures ACLs for `C:\PromoGest\storage` & `dataprotection-keys`.
- **Reverse Proxy:** `caddy-local-https.Caddyfile` exposes HTTPS over office LAN (`https://promogest.lan` / LAN IP with `tls internal`).

### Production Build Pipeline (`scripts/build-production.sh` & `.ps1`)
1. Runs `npm --prefix apps/local-web ci && npm run build`.
2. Copies static Vite bundle (`dist/`) into `src/PromoGest.Api/wwwroot/`.
3. Publishes `PromoGest.Api` (`dotnet publish`) — **zero Node.js runtime required on the production host**.

---

## 5. Backup, Restore & Disaster Recovery Drills

- **Backup Scripts (`scripts/backup-promogest.sh`, `backup-promogest.ps1`):** Captures consistent PostgreSQL custom dump (`pg_dump -Fc`) + local document storage directory + manifest checksums.
- **Restore & Verification (`scripts/verify-backup-restore.sh`, `restore-promogest.ps1`):** Creates/targets an isolated verification database, restores dump via `pg_restore`, validates table row counts and `project_documents` SHA-256 digests against storage files.
- **Offline Boundary (`apps/local-web/public/sw.js` & [OFFLINE-OPERATION.md](OFFLINE-OPERATION.md)):**
  - Service worker caches **only static UI shell assets** (`/`, `/index.html`, `/manifest.webmanifest`, local fonts/icons).
  - `/api/*` and `/health/*` requests are **never cached offline** (`network-only`).
  - Browser `IndexedDB` / `localStorage` is **prohibited** from holding primary business records. When the office server stops, the UI displays an explicit disconnected banner instead of stale fake data.

---

## 6. Strict Non-Production Boundary (Cloud SQL & Preview)

- **Cloud SQL (`docs/GOOGLE-AI-STUDIO-CLOUD-SQL.md`):** Provisioned solely for ephemeral development inspection in AI Studio if `SQL_HOST` environment variables are configured (`CloudSqlDevelopmentConnectionStringsTests.cs`). **Explicitly forbidden** for customer/organization ERP runtime or production data (`ADR-0001`, `ADR-0002`, `ADR-0005`).
- **Vite Preview (`dev-api-middleware.ts`):** Ephemeral in-memory simulator using `.promogest-dev-state.json` for rapid UI previewing only when ASP.NET Core on port 5055 is absent. Never deployed to production.
