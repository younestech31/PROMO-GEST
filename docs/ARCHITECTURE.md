# PROMO GEST — System Architecture

## 1. Architectural Identity
PROMO GEST is a **local-first, self-hosted, multi-user ERP** designed specifically for Algerian real estate development organizations (*promoteurs immobiliers*).

Each customer organization owns and operates an isolated installation on its own premises:
- **1 local application server**: ASP.NET Core Web API (.NET 10 LTS) hosting both `/api/*` + `/health/*` and the compiled static React SPA from `wwwroot/`.
- **1 independent PostgreSQL 18 database**: Single-tenant database per organization, local to the organization server (`127.0.0.1:5432`).
- **1 local document storage directory**: Content-verified filesystem storage (`SHA-256` checksums + metadata stored in `stored_files`).
- **LAN workstations**: Employee browsers connect over the office LAN via a local HTTPS reverse proxy (Caddy internal PKI) with zero internet dependency.

## 2. Solution & Component Responsibilities
The codebase uses Clean/Layered Architecture inside `/src/PromoGest.sln`:

| Layer / Project | Responsibility | Dependencies |
|---|---|---|
| `PromoGest.Domain` | Pure business entities, invariants, domain enums, domain exceptions, `IClock` | None |
| `PromoGest.Contracts` | Strongly typed HTTP request/response records shared by API and tests | None |
| `PromoGest.Application` | Use-case orchestration (`SetupService`, `AuthService`, `UserManagementService`, `ProjectService`, `AuditQueryService`, `AdminRecoveryService`), password policy, repository ports | `Domain`, `Contracts` |
| `PromoGest.Infrastructure` | EF Core 10 `AppDbContext` (with append-only audit guard), PostgreSQL 18 migrations, PBKDF2-SHA512 hashing, opaque token hashing, `LocalFileStorageService`, repository implementations | `Domain`, `Application`, `Npgsql` |
| `PromoGest.Api` | Thin HTTP controllers, `UseForwardedHeaders`, `SessionAuthenticationHandler`, `CsrfValidationMiddleware`, rate limiting, security headers, API/health 404 isolation, local admin recovery CLI, static SPA hosting (`wwwroot`) | `Application`, `Infrastructure`, `Contracts` |
| `apps/local-web` | React 19 + TypeScript (strict) + Vite + Tailwind CSS v4 + `@fontsource` local fonts; Arabic RTL default + French LTR | None (static build into `wwwroot`) |

## 3. Request & Data Flow
1. Browser loads static React bundle (`index.html`, JS, CSS, local `.woff2` fonts) from ASP.NET Core same-origin (`/`).
2. On startup, the UI calls `GET /health/ready` and `GET /api/setup/status`. Unmatched `/api/*` and `/health/*` routes return explicit `404 JSON` (`ENDPOINT_NOT_FOUND`), never `index.html`.
3. Every state-changing `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`) carries `X-CSRF-TOKEN` obtained from `/api/auth/csrf` and validated against `.PromoGest.Antiforgery`.
4. Requests pass through:
   - `UseForwardedHeaders()` (trusting loopback Caddy proxy `127.0.0.1` / `::1`)
   - `SecurityHeadersMiddleware` (strict `'self'` CSP, `X-Frame-Options: DENY`, `nosniff`)
   - `ExceptionHandlingMiddleware` (maps `DomainException` subtypes and PostgreSQL `23505`/`40001` conflicts to 400/401/403/404/409 without leaking stack traces)
   - `SessionAuthenticationHandler` (validates hashed opaque session token against `user_sessions` and `User.SecurityStamp`)
   - `CsrfValidationMiddleware` -> Authorization -> Controller -> Application Service -> Domain Entity -> EF Core -> PostgreSQL 18.
5. No Node.js runtime exists in production. `apps/local-web/dev-api-middleware.ts` is loaded dynamically only during `vite serve` when `ASPNETCORE_URL` is unset and is never bundled into `dist/`.

## 4. Build, Deployment & Testing Strategy
- **Build**: `scripts/build-production.ps1` (or `.sh`) runs root workspace lint/tests/build (`apps/local-web`), copies `dist/*` into `src/PromoGest.Api/wwwroot/`, runs .NET unit tests, and publishes a self-contained ASP.NET Core executable.
- **Testing pyramid**:
  - Frontend pure logic (`node:test` via `tsx --test`): Algerian Wilaya/DZD formatting, validation rules, CSRF helpers, RBAC helpers.
  - Backend Domain & Application (`xUnit`): Single System Admin invariant, lockout, generic login errors, first-run idempotency, project-level authorization, admin recovery, audit failure atomicity.
  - Backend PostgreSQL 18 Integration (`xUnit` + `WebApplicationFactory` + PostgreSQL 18): Real EF Core migrations + `HasPendingModelChanges() == false`, CSRF enforcement, concurrent first-run setup race, audit immutability trigger (`42501`), partial unique index `ux_users_single_system_admin` (`23505`), cookie auth, `/health/*`, 403 IDOR enforcement, and restart persistence.

## 5. Separation of Future Public Website from Local ERP Runtime
If the organization later builds a public marketing or buyer portal website, it **must remain a completely separate deployment** (separate domain, separate hosting, separate read-only or curated public data store). The local PROMO GEST ERP server must **never** be exposed directly to the public internet, nor share its PostgreSQL database with public web traffic.
