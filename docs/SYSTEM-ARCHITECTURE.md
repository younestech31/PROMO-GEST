# PROMO GEST — System Architecture

**Architectural Style:** Local-first, single-organization Modular Monolith with strict Clean / Layered Architecture inside a single ASP.NET Core 10 process serving both `/api/*` and the compiled static React SPA (`wwwroot`).

---

## 1. Layered Dependency Topology

Strict inward dependency direction enforced across `.NET 10` assemblies (`src/PromoGest.sln`):

```text
  [ apps/local-web (React 19 + Vite + Tailwind v4) ]
             │  (vite build -> src/PromoGest.Api/wwwroot/)
             ▼
  [ PromoGest.Api ] ──► [ PromoGest.Contracts ] ◄── [ PromoGest.Application ]
         │                                                   ▲
         ├────────────► [ PromoGest.Infrastructure ] ────────┤
         │                                                   │
         └────────────────────────────────────────► [ PromoGest.Domain ]
```

| Project | Responsibility | Forbidden Dependencies |
|---|---|---|
| `PromoGest.Domain` | Pure entities (`OrganizationSettings`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserSession`, `AuditLog`, `SystemSetting`, `StoredFile`, `Project`, `ProjectMember`, `Building`, `BuildingFloor`, `PropertyUnit`, `Party`, `ProjectCustomer`, `CustomerInteraction`, `ProjectSalesReservation`), value/validation invariants, domain exceptions. | EF Core, Npgsql, ASP.NET Core, HTTP, filesystem, external libraries. |
| `PromoGest.Contracts` | Immutable C# `record` DTOs for Setup, Auth, Users, Audit/Health, Projects, Structure, Documents, Customers, Parties, Reservations, `ApiErrorResponse`. | Domain entities, EF Core, Infrastructure. |
| `PromoGest.Application` | Use-case orchestration services (`SetupService`, `AuthService`, `UserManagementService`, `AuditQueryService`, `ProjectService`, `ProjectStructureService`, `ProjectDocumentService`, `ProjectCustomerService`, `PartyDirectoryService`, `ProjectSalesReservationService`, `AdminRecoveryService`), repository & port interfaces (`I*Repository`, `IPasswordHasher`, `ISessionTokenGenerator`, `IProjectFileStorage`, `IAuditWriter`, `IClock`). | Direct `Npgsql` / `AppDbContext` queries, `Microsoft.AspNetCore.*` HTTP types. |
| `PromoGest.Infrastructure` | `AppDbContext`, EF Core entity configurations, PostgreSQL 18 migrations (`Persistence/Migrations/`), repositories (`Ef*Repository`), **`Pbkdf2PasswordHasher`**, **`CryptoSessionTokenGenerator`**, `LocalFileStorageService`, `DbInitializer`, `CloudSqlRuntimePermissions`. | Direct controller logic or UI concerns. |
| `PromoGest.Api` | Thin REST controllers (`SetupController`, `AuthController`, `UsersController`, `AuditController`, `HealthController`, `ProjectsController`, `ProjectStructureController`, `ProjectDocumentsController`, `ProjectCustomersController`, `PartiesController`, `ProjectSalesReservationsController`), middleware (`SecurityHeadersMiddleware`, `ExceptionHandlingMiddleware`, `CsrfValidationMiddleware`), **`SessionAuthenticationHandler`**, SPA fallback hosting, `--migrate` / `--unlock-admin` / `--reset-admin-password` CLI modes. | Business rule invention or direct SQL. |
| `apps/local-web` | Bilingual RTL-first (`ar` / `fr`) React 19 + TypeScript + Tailwind v4 SPA. Consumes same-origin `/api/*` with `credentials: 'same-origin'` and `X-CSRF-TOKEN`. | Primary persistence in IndexedDB/localStorage, external SaaS calls, bearer tokens in `localStorage`. |

---

## 2. Production On-Premises Runtime Topology

```text
  [ Office LAN Workstations (Desktop / Laptop Browsers) ]
                         │
            HTTPS (Internal PKI CA / LAN IP)
                         ▼
  [ Local Reverse Proxy: Caddy (deploy/linux or deploy/windows) ]
       │ forwards X-Forwarded-Proto, X-Forwarded-For
       ▼
  [ Single Kestrel Process: PromoGest.Api (127.0.0.1:5080) ]
       ├── Serves static SPA from wwwroot/ (HTML/JS/CSS/Fonts/SW shell)
       ├── Authenticates via cookie `promogest_session` + `X-CSRF-TOKEN`
       ├── Writes binary project files ─► [ Local Filesystem Storage + SHA-256 ]
       └── Connects via least-privilege ─► [ PostgreSQL 18 (127.0.0.1:5432, role: promogest_app) ]
```

- **Production Node.js Dependency:** **Zero.** `scripts/build-production.{sh,ps1}` compiles `apps/local-web` with Vite into `src/PromoGest.Api/wwwroot/` and publishes a single ASP.NET Core deployment artifact.
- **No Internet Runtime Dependency:** Fonts, JS, CSS, SW shell, and internal PKI TLS terminate locally on the office LAN. (See [ADR-0001](ADR/0001-local-first-self-hosted-architecture.md), [ADR-0003](ADR/0003-aspnet-core-static-spa-same-origin.md), [ADR-0005](ADR/0005-public-website-separation.md)).

---

## 3. HTTP Middleware & Request Execution Pipeline (`src/PromoGest.Api/Program.cs`)

Observed pipeline order on every incoming HTTP request:

1. **Forwarded Headers (`UseForwardedHeaders`)** — honors `X-Forwarded-For` / `X-Forwarded-Proto` (`ForwardLimit = 1`) from local reverse proxy (`Caddy`).
2. **`SecurityHeadersMiddleware`** — injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and strict CSP (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`).
3. **`ExceptionHandlingMiddleware`** — translates typed `DomainException` hierarchy and PostgreSQL/EF conflicts into standardized `ApiErrorResponse` JSON:
   - `UnauthorizedDomainException` → **401**
   - `ForbiddenDomainException` → **403**
   - `NotFoundDomainException` → **404**
   - `ConflictDomainException` → **409**
   - Other `DomainException` → **400**
   - PostgreSQL unique/serialization `DbUpdateException` (`23505` / `40001`) → **409** (`SETUP_ALREADY_INITIALIZED` / `CONCURRENCY_CONFLICT` / `CONFLICT`)
   - EF Core `DbUpdateConcurrencyException` → **409** (`CONCURRENCY_CONFLICT`)
   - Unhandled exceptions → **500** (`INTERNAL_ERROR`, sanitized message without stack trace leak)
4. **Optional Local CORS (`UseCors("LocalOrigins")`)** — registered only when `Security:AllowedOrigins` is non-empty.
5. **Rate Limiting (`UseRateLimiter`)** — `"login"` fixed-window policy (`10` requests / minute / IP, HTTP `429`).
6. **Static Files (`UseDefaultFiles`, `UseStaticFiles`)** — serves built React assets from `wwwroot/`.
7. **Development-Only Preview Cookie Policy (`if (app.Environment.IsDevelopment()) UseCookiePolicy`)** — invokes `DevelopmentPreviewCookiePolicy` solely in Development behind cross-site HTTPS preview proxies; Production always enforces `SameSite=Strict`.
8. **Authentication (`SessionAuthenticationHandler`, scheme `"PromoGestSession"`)** — reads raw **`promogest_session`** cookie, hashes with SHA-256 via `CryptoSessionTokenGenerator`, validates active non-expired `UserSession` + matching `User.SecurityStamp` + `IsActive` via `AuthService.ValidateSessionAsync`, and builds `ClaimsPrincipal`.
9. **`CsrfValidationMiddleware`** — for **every** unsafe `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`), enforces Antiforgery validation matching the `.PromoGest.Antiforgery` cookie against the `X-CSRF-TOKEN` header (clients first obtain a token from `GET /api/auth/csrf`, including prior to `POST /api/auth/login` and `POST /api/setup/initialize`). Rejects invalid/missing tokens with `403` (`CSRF_TOKEN_INVALID`).
10. **Authorization (`UseAuthorization`)** — enforces `[Authorize]` per controller; fine-grained permission and explicit `ProjectMember` resource checks run in Application services.
11. **Controllers + JSON API 404 Fallbacks (`/api/{**slug}`, `/health/{**slug}`) + SPA Fallback (`MapFallbackToFile("index.html")`)**.

---

## 4. Modular Monolith Bounded Contexts

Inside `PromoGest.Domain` and `PromoGest.Application`, domains are logically partitioned (avoiding premature microservice distribution while preserving clear module contracts):

| Bounded Context | Implemented Aggregates & Services | Future Target Expansion (`PLANNED`) |
|---|---|---|
| **Identity, Security & Governance** | `OrganizationSettings`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserSession`, `AuditLog`, `SystemSetting` | Organization profile updates (`org.manage`), session viewer, `AdministrativeUnit` catalogue (ADR-0010) |
| **Real Estate Portfolio & Structure** | `Project`, `ProjectMember`, `Building`, `BuildingFloor`, `PropertyUnit` | Parcel/land deeds (*livret foncier*), unit price history, parking/cellar annexes |
| **Counterparties (Party) & CRM** | `Party`, `ProjectCustomer`, `CustomerInteraction` | Canonical contact-points & typed legal identifiers, manual Party merge governance, `Employee` detached from `User` (ADR-0009), Suppliers/Contractors |
| **Commercial Holds & Future Legal Contracts** | `ProjectSalesReservation` (internal operational unit hold) | Separate aggregates for Statutory Reservation Contracts (Law 11-04 Art. 27), VSP Contracts (Law 11-04 Art. 28 + Decree 13-431), and *Acte Notarié* sales; versioned payment schedules & cross-module financial event flow |
| **Document Vault** | `StoredFile` (`stored_files`) + `LocalFileStorageService` | **K-Min (pre-Phase 2):** explicit attachment links for Contract/Reservation/Milestone/Party; **K-Full (Phase 5):** enterprise retention & cold archival |
| **Execution, Finance, SCF & Reporting** *(Planned)* | None yet in code | Chantier lots/situations, supplier PO/stock, DZD receipts & treasury, Tax Events, SCF balanced double-entry journals, offline PDF/XLSX exports |

---

## 5. Offline Recovery & Maintenance CLI Modes

`PromoGest.Api` inspects command-line arguments before launching Kestrel (`Program.cs`):
- `--migrate`: Executes EF Core database migrations, runs `DbInitializer.SeedRolesAndPermissionsAsync`, and exits cleanly.
- `--unlock-admin` / `--reset-admin-password`: Server-console-only recovery via `AdminRecoveryService` — unlocks `SYSTEM_ADMIN` or resets password, revokes all active sessions, and writes an immutable `AuditLog` event without bypassing DB constraints or hardcoding credentials.
