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
| `PromoGest.Domain` | Pure entities (`OrganizationSettings`, `User`, `Role`, `Permission`, `UserSession`, `AuditLog`, `Project`, `ProjectMember`, `Building`, `BuildingFloor`, `PropertyUnit`, `ProjectDocument`, `Party`, `ProjectCustomer`, `CustomerInteraction`, `ProjectSalesReservation`), value/validation invariants, domain exceptions. | EF Core, Npgsql, ASP.NET Core, HTTP, filesystem, external libraries. |
| `PromoGest.Contracts` | Immutable C# `record` DTOs for Setup, Auth, Users, Audit/Health, Projects, Structure, Documents, Customers, Parties, Reservations, `ApiErrorResponse`. | Domain entities, EF Core, Infrastructure. |
| `PromoGest.Application` | Use-case orchestration services (`SetupService`, `AuthService`, `UserManagementService`, `AuditLogQueryService`, `ProjectService`, `ProjectStructureService`, `ProjectDocumentService`, `ProjectCustomerService`, `PartyDirectoryService`, `ProjectSalesReservationService`, `AdminRecoveryService`), repository & port interfaces (`I*Repository`, `IPasswordHasher`, `ISessionTokenGenerator`, `IFileStorageService`, `IAuditWriter`, `IClock`). | Direct `Npgsql` / `AppDbContext` queries, `Microsoft.AspNetCore.*` HTTP types. |
| `PromoGest.Infrastructure` | `AppDbContext`, EF Core entity configurations, PostgreSQL 18 migrations (`Migrations/`), repositories (`Ef*Repository`), `Argon2PasswordHasher`, `Sha256SessionTokenGenerator`, `LocalFileStorageService`, `DbInitializer`, `DataProtectionConfiguration`. | Direct controller logic or UI concerns. |
| `PromoGest.Api` | Thin REST controllers (`SetupController`, `AuthController`, `UsersController`, `AuditController`, `ProjectsController`, `ProjectStructureController`, `ProjectDocumentsController`, `ProjectCustomersController`, `PartiesController`, `ProjectSalesReservationsController`, `HealthController`), middleware (`SecurityHeadersMiddleware`, `CsrfValidationMiddleware`, `DomainExceptionMiddleware`), SPA fallback hosting, `--recover-admin` CLI mode. | Business rule invention or direct SQL. |
| `apps/local-web` | Bilingual RTL-first (`ar` / `fr`) React 19 + TypeScript + Tailwind v4 SPA. Consumes same-origin `/api/*` with `credentials: 'same-origin'` and `X-CSRF-Token`. | Primary persistence in IndexedDB/localStorage, external SaaS calls, bearer tokens in `localStorage`. |

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
       ├── Authenticates via cookie `promogest.sid` + `X-CSRF-Token`
       ├── Writes binary project files ─► [ Local Filesystem Storage + SHA-256 ]
       └── Connects via least-privilege ─► [ PostgreSQL 18 (127.0.0.1:5432, role: promogest_app) ]
```

- **Production Node.js Dependency:** **Zero.** `scripts/build-production.{sh,ps1}` compiles `apps/local-web` with Vite into `src/PromoGest.Api/wwwroot/` and publishes a single ASP.NET Core deployment artifact.
- **No Internet Runtime Dependency:** Fonts, JS, CSS, SW shell, and internal PKI TLS terminate locally on the office LAN. (See [ADR-0001](ADR/0001-local-first-self-hosted-architecture.md), [ADR-0003](ADR/0003-aspnet-core-static-spa-same-origin.md), [ADR-0005](ADR/0005-public-website-separation.md)).

---

## 3. HTTP Middleware & Request Execution Pipeline (`src/PromoGest.Api/Program.cs`)

Observed pipeline order on every incoming HTTP request:

1. **Forwarded Headers (`UseForwardedHeaders`)** — honors `X-Forwarded-For` / `X-Forwarded-Proto` from local loopback reverse proxy (`Caddy`).
2. **`SecurityHeadersMiddleware`** — injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and strict CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`).
3. **`DomainExceptionMiddleware`** — translates typed `DomainException` hierarchy into standardized `ApiErrorResponse` JSON:
   - `UnauthorizedDomainException` → **401**
   - `ForbiddenDomainException` → **403**
   - `NotFoundDomainException` → **404**
   - `ConflictDomainException` → **409**
   - Other `DomainException` → **400**
   - EF Core `DbUpdateConcurrencyException` → **409** (`CONCURRENCY_CONFLICT`)
   - Unhandled exceptions → **500** (`INTERNAL_ERROR`, sanitized message without stack trace leak)
4. **Static Files (`UseDefaultFiles`, `UseStaticFiles`)** — serves built React assets from `wwwroot/` with `no-cache` for `/index.html`, `/sw.js`, `/manifest.webmanifest`.
5. **Authentication (`CookieSessionAuthenticationHandler`)** — hashes raw `promogest.sid` cookie with SHA-256, loads active non-expired `UserSession` + `User` + roles, builds `ClaimsPrincipal` on every request.
6. **Authorization (`UseAuthorization`)** — enforces `[Authorize]` per controller.
7. **`CsrfValidationMiddleware`** — for authenticated unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`), enforces exact match between Antiforgery cookie/session-bound token and `X-CSRF-Token` header (exempting `/api/auth/login` and `/api/setup/initialize` before session establishment).
8. **Controllers + SPA Fallback (`MapFallbackToFile("index.html")`)**.

---

## 4. Modular Monolith Bounded Contexts

Inside `PromoGest.Domain` and `PromoGest.Application`, domains are logically partitioned (avoiding premature microservice distribution while preserving future module isolation):

| Bounded Context | Implemented Aggregates & Services | Future Target Expansion |
|---|---|---|
| **Identity, Security & Governance** | `OrganizationSettings`, `User`, `Role`, `Permission`, `UserSession`, `AuditLog` | Organization profile updates, session viewer, administrative notifications |
| **Real Estate Portfolio & Structure** | `Project`, `ProjectMember`, `Building`, `BuildingFloor`, `PropertyUnit` | Parcel/land title deeds (*livret foncier*), unit price history, parking/cellar annexes |
| **Counterparties (Party) & CRM** | `Party`, `ProjectCustomer`, `CustomerInteraction` | Party merge governance, Employee master separated from `User`, Suppliers/Contractors |
| **Commercial Sales & Reservations** | `ProjectSalesReservation` | VSP / notarized sale contracts, payment schedules, receipts, cancellations/refunds |
| **Document Vault** | `ProjectDocument` + `LocalFileStorageService` | Polymorphic entity attachments (contracts, unit plans, NIF/RC, payment proofs) |
| **Execution, Finance, SCF & Reporting** *(Planned)* | None yet in code | Chantier lots/situations, supplier PO/stock, DZD treasury, SCF journal, tax/director KPIs |

---

## 5. Offline Recovery CLI Mode

`PromoGest.Api` inspects command-line arguments before launching Kestrel (`--recover-admin` in `Program.cs` + `AdminRecoveryService`): enables physical server-console administrator unlock and password reset, revokes all active sessions, and writes an immutable `AuditLog` event without bypassing database constraints or hardcoding credentials.
