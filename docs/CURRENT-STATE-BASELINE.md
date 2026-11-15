# PROMO GEST — Current State Baseline

**Purpose:** Factual, evidence-backed baseline of what actually exists, compiles, passes, fails, or drifts in the PROMO GEST repository as of **2026-11-15**.  
**Baseline Anchor:** `main` at commit `ec8769a5f778429cad0fec8f35d59f84f93b049d` (PR #34 merged on **2026-11-15**; verified against `.github/workflows/ci.yml`, `src/`, `apps/local-web/`, `tests/`, `deploy/`, `scripts/`, and 11 EF Core migrations).

---

## 1. Automated Build, Test & GitHub Actions CI Evidence

### 1.1 GitHub Actions CI Run `43710844749` (Post-Merge on PR #34)

| Job in `.github/workflows/ci.yml` | Outcome | Exact Failure / Evidence Details |
|---|---|---|
| `frontend` (*Frontend install, checks, and static hosting*) | **Success** | `npm ci`, `npm run lint`, `npm test`, `npm run build`, and `npm run build:aspnetcore` + dev-preview leakage checks passed; uploaded `promogest-wwwroot` artifact. |
| PostgreSQL 18 Service Container (`postgres:18-alpine`) | **Started cleanly** | Service container became healthy on port `5432` in CI (`pg_isready -U postgres`). |
| `backend-and-postgres` (*.NET 10 and PostgreSQL 18 least-privilege tests*) | **Failure during Build** | Failed at `dotnet build src/PromoGest.sln --configuration Release --no-restore` with **`CS7036`** at `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs(1072,45)` (missing required `PartyConcurrencyStamp` argument in `UpdateProjectCustomerRequest`). **Because compilation failed, `.NET` integration tests did NOT run (do NOT interpret this run as passing PG18 integration tests).** |
| `windows-publish-and-powershell` | **Failure during Build** | Failed due to the same `PromoGest.sln` compilation break (`CS7036`) before Windows packaging verification could complete. |

> **Environment Distinction (Local Sandbox vs GitHub Actions CI):**  
> In container/sandbox workspaces without a Docker daemon (`docker info` unavailable), `Testcontainers`-based PostgreSQL 18 integration tests cannot run locally. In GitHub Actions CI (`ci.yml`), PostgreSQL 18 (`postgres:18-alpine`) starts normally — `PromoGest.IntegrationTests` was blocked in Run `43710844749` specifically by the `CS7036` solution compile error, **not** by PostgreSQL 18 unavailability.

### 1.2 Local Workspace Verification Commands

Commands executed against the audited baseline (`.NET SDK 10.0.404`, Node.js `v22` / TypeScript strict mode):

| Check | Command | Result | Notes |
|---|---|---|---|
| .NET Solution Build | `dotnet build src/PromoGest.sln --no-restore` | **FAILED (1 Error)** | `Domain`, `Contracts`, `Application`, `Infrastructure`, `Api`, `Domain.Tests`, `Application.Tests` succeeded; **`PromoGest.IntegrationTests` failed (`CS7036`)** at `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs(1072,45)` |
| Domain Unit Tests | `dotnet test tests/PromoGest.Domain.Tests/PromoGest.Domain.Tests.csproj --no-build` | **PASSED (27 / 27)** | `DomainInvariantTests`, `PartyDomainTests`, `ProjectCustomerDomainTests` |
| Application Tests | `dotnet test tests/PromoGest.Application.Tests/PromoGest.Application.Tests.csproj` | **PASSED (10 / 10)** | `ApplicationSecurityAndFoundationTests` (setup, auth, lockout, recovery, project authz, dynamic counts, structure, audit failure propagation) |
| PG18 End-to-End Integration | `PromoGest.IntegrationTests` | **BLOCKED** | Does not compile (`CS7036`); additionally no Docker daemon is available in the local container (`Testcontainers`), while CI Run `43710844749` failed at build before running tests |
| Frontend TypeScript Check | `npm run lint` (`tsc -p apps/local-web/tsconfig.json --noEmit`) | **PASSED (0 errors)** | `"strict": true` |
| Frontend Pure Logic Tests | `npm test` (`tsx --test apps/local-web/src/utils/*.test.ts`) | **PASSED (24 / 24)** | Covers `algerianFormat`, `csrf`, `devPreviewCookies`, `devPreviewProjectStore`, `permissions`, `serviceWorkerShell`, `validation` |

> **Specific Compile Defect (`CS7036`) Committed in PR #34:**  
> `src/PromoGest.Contracts/Projects/ProjectCustomerContracts.cs` defines `UpdateProjectCustomerRequest` with **12 required positional parameters** (adding `Guid PartyConcurrencyStamp` at the end without a default value).  
> `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs` (lines 1072–1083) still invokes `new UpdateProjectCustomerRequest(...)` with **11 arguments** (ending at `staleCustomerStamp`), breaking solution compilation.

---

## 2. Database Schema & Migrations Inventory (11 Migrations Inspected)

All migrations in `src/PromoGest.Infrastructure/Persistence/Migrations/` are accounted for:

| # | Migration Timestamp & Name | Core Schema Impact |
|---|---|---|
| 1 | `20261113000001_InitialFoundation` | `organization_settings`, `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `user_sessions`, `audit_logs`, `system_settings`, `projects`, `project_members` |
| 2 | `20261113000002_HardeningConstraintsAndAuditImmutability` | PostgreSQL functions/triggers blocking `UPDATE`/`DELETE` on `audit_logs` (`prevent_audit_log_mutation`); check constraints & hardening indexes |
| 3 | `20261113000003_SystemAdministratorInvariant` | Partial unique index `ux_users_single_system_admin` (`WHERE is_system_administrator = true`) |
| 4 | `20261113000004_AuditLogRuntimePermissions` | Runtime privilege alignment for `audit_logs` |
| 5 | `20261114090000_ProjectStructureFoundation` | `buildings`, `building_floors`, `property_units` + unique per-project/building/floor codes & check constraints |
| 6 | `20261114180000_ProjectDocumentMetadata` | `stored_files` (SHA-256 checksum, relative storage path, category, MIME/size limits, scope `Project`/`Organization`) |
| 7 | `20261114190000_ProjectCustomerRegistry` | `project_customers`, `customer_interactions`, `ux_project_customers_project_name_phone` |
| 8 | `20261114195931_CustomerModelSnapshotReconciliation` | Snapshot reconciliation for customer model |
| 9 | `20261114220000_ProjectSalesReservations` | `project_sales_reservations` + `ux_project_sales_reservations_active_unit` partial unique index (prevents double-booking `Active` units) |
| 10 | `20261115100000_OrganizationWidePartyFoundation` | `parties` table (`party_kind`, `display_name`, `normalized_display_name`, `concurrency_stamp`) + additive `party_id` FK (`NOT NULL` after 1:1 backfill from `project_customers`) |
| 11 | `20261115120000_UniqueProjectPartyCustomerLink` | `ux_project_customers_project_party` unique index on `(project_id, party_id)` |

---

## 3. Component-by-Component Honesty Ledger

| Component / Capability | Status | Evidence & Verified Details |
|---|---|---|
| **First-Run Setup Wizard** (`SetupController`, `SetupService`, `FirstRunSetupWizard.tsx`) | `IMPLEMENTED_AND_VERIFIED` | Single-org (`organization_settings` with `singleton_guard = 1`) + single `SYSTEM_ADMIN` atomic creation; `Application.Tests` verifies single-run lock & concurrent conflict handling (`SETUP_ALREADY_INITIALIZED`); PG18 test exists in `PostgresEndToEndTests` (currently blocked from running by `CS7036`). |
| **Auth, Sessions & CSRF** (`AuthController`, `AuthService`, `CsrfValidationMiddleware`, `SessionAuthenticationHandler`) | `IMPLEMENTED_AND_VERIFIED` | **PBKDF2-SHA512** password hashing (`Pbkdf2PasswordHasher`, 310,000 iterations, random 16-byte salt), 256-bit opaque session token (`CryptoSessionTokenGenerator`, SHA-256 stored in `user_sessions`), `HttpOnly; SameSite=Strict` cookie **`promogest_session`**, `GET /api/auth/me`, `GET /api/auth/csrf`, `X-CSRF-TOKEN` validation on every unsafe `/api/*` request, 5-attempt lockout (15 min), generic login error verified by `Application.Tests`. *(Development-only `DevelopmentPreviewCookiePolicy` adapts cookie attributes strictly when behind non-local HTTPS preview proxies; Production remains `SameSite=Strict`.)* |
| **User Management & Admin Recovery** (`UsersController`, `UserManagementService`, `AdminRecoveryService`) | `IMPLEMENTED_AND_VERIFIED` | Create/update employees, assign 6 non-admin seeded roles (`PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`, `FINANCE_OFFICER`, `SITE_ENGINEER`, `LEGAL_OFFICER`, `VIEWER`), disable + revoke sessions, reset password; second `SYSTEM_ADMIN` rejected & audited (`Application.Tests`); offline CLI (`--unlock-admin`, `--reset-admin-password`) verified. |
| **Organization Profile Management** (`OrganizationProfileView.tsx`) | `PARTIALLY_IMPLEMENTED` | Read-only display via `GET /api/auth/me` (`OrganizationSummaryResponse`). **No** `PUT /api/organization` endpoint or edit UI exists despite `org.manage` permission being seeded. |
| **Audit Log** (`AuditAndHealthControllers`, `AuditQueryService`, `AuditLogView.tsx`) | `IMPLEMENTED_AND_VERIFIED` | Append-only DB trigger blocks mutations (`prevent_audit_log_mutation`); query `GET /api/audit` filterable by limit; `audit.read` enforcement + `ACCESS_DENIED` logging verified in `Application.Tests`; audit failure propagation verified. |
| **Projects Core & Team Membership** (`ProjectsController`, `ProjectService`, `ProjectsAccessView.tsx`) | `IMPLEMENTED_AND_VERIFIED` | CRUD + status lifecycle (`GET/POST /api/projects`, `GET/PUT /api/projects/{id}`, `PUT/DELETE .../members`), Wilaya `01–69`, `ExpectedConcurrencyStamp` CAS conflict (`PROJECT_CONCURRENCY_CONFLICT`), explicit membership gate (`ADR-0006`), dynamic `actualBuildingsCount`/`actualUnitsCount`, last-PM protection, all verified in `Application.Tests`. |
| **Project Physical Structure** (`ProjectStructureController`, `ProjectStructureService`, `ProjectStructureModal.tsx`) | `IMPLEMENTED_AND_VERIFIED` (for API/App) / `PARTIALLY_IMPLEMENTED` (no DELETE or bulk routes / authz mismatch) | Buildings → Floors → Property Units `GET`, `POST`, `PUT` + `/status` + concurrency stamps verified in `Application.Tests`. **Notes:** No `/bulk` or `DELETE` endpoints exist in `ProjectStructureController`; `projects.structure.manage` is seeded in `DbInitializer` but ignored by `ProjectStructureService`, which checks `CanManageConstruction \|\| ProjectManager` on `ProjectMember`. |
| **Project Documents** (`ProjectDocumentsController`, `ProjectDocumentService`, `ProjectDocumentsModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | `GET /api/projects/{id}/documents`, `POST /api/projects/{id}/documents`, `GET /api/projects/{id}/documents/{fileId}/download`; `stored_files` metadata + `LocalFileStorageService`, SHA-256 verification on download, allowed extension/MIME whitelist (max 25 MB). No update/archive HTTP endpoint exists yet. Covered only inside blocked `PostgresEndToEndTests` (not `Application.Tests` or preview middleware). |
| **Project Customer Registry & Interactions (C1)** (`ProjectCustomersController`, `ProjectCustomerService`, `ProjectCustomerRegistryModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | Project-scoped customer CRUD (`GET/POST /api/projects/{id}/customers`, `GET/PUT .../customers/{customerId}`, `POST .../interactions`). `PartyDomainTests` & `ProjectCustomerDomainTests` pass (within 27 tests in `Domain.Tests`), **but** C2 modifications committed in PR #34 added `PartyId` / `PartyConcurrencyStamp` without updating `PostgresEndToEndTests` (`CS7036`) or `Application.Tests`. |
| **Organization-Wide Party Directory (C2 Merged Slice)** (`PartiesController`, `PartyDirectoryService`, `EfPartyRepository`, `Party.cs`) | `IMPLEMENTED_NOT_VERIFIED` *(committed & merged in PR #34, has active defects)* | Migration #10 & #11 exist, `PartyDomainTests` pass, `PartiesController` (`GET /api/parties`, `PUT /api/parties/{partyId}`) & lookup UI in `ProjectCustomerRegistryModal.tsx` are merged in `main` (`ec8769a5f778429cad0fec8f35d59f84f93b049d`), **not yet verified end-to-end**, with active defects documented in Section 4. |
| **Sales Reservations / Internal Unit Holds** (`ProjectSalesReservationsController`, `ProjectSalesReservationService`, `ProjectSalesReservationsModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | `GET /api/projects/{id}/reservations`, `GET .../reservations/{id}`, `POST .../reservations`, `POST .../reservations/{id}/cancel` (expiry handled lazily/via hosted worker; no `/expire` HTTP endpoint). `AvailableForSale -> Reserved` (guarded by `ux_project_sales_reservations_active_unit`) and release on cancel/expiry. Covered only inside blocked `PostgresEndToEndTests`. |
| **Vite Preview Middleware (`apps/local-web/dev-api-middleware.ts`)** | `PARTIALLY_IMPLEMENTED` *(Significant Drift)* | Simulates Setup, Auth, Users, Audit, Projects, Structure, Members, and `devPreviewProjectStore.ts`. **Drifts from real API:** see Section 5 below. *(In local AI Studio Cloud SQL mode, `scripts/dev-with-local-api.sh` runs `PromoGest.Api` on `127.0.0.1:5055` alongside Vite so `/api/*` and `/health/*` hit the real backend.)* |
| **Deployment Tooling & Data Protection** (`deploy/`, `scripts/`, `DataProtectionConfiguration`) | `PARTIALLY_IMPLEMENTED` | Windows DPAPI machine-scope & Linux PKCS#12 cert tests exist inside blocked `PromoGest.IntegrationTests`; Linux systemd, Windows NSSM/SC PowerShell, Caddy LAN HTTPS, and backup/restore scripts exist in repo. |

---

## 4. Active Defects in Committed C2 Party Changes (PR #34 — Unverified)

These defects exist in `main` at `ec8769a5f778429cad0fec8f35d59f84f93b049d`:

1. **`PostgresEndToEndTests.cs:1072` Compile Error (`CS7036`):**  
   `UpdateProjectCustomerRequest` requires a 12th positional parameter (`Guid PartyConcurrencyStamp`), while `PostgresEndToEndTests.cs` invokes it with 11 arguments — breaking CI jobs `backend-and-postgres` and `windows-publish-and-powershell` in Run `43710844749`.
2. **Stale `previousKind` Audit Metadata (`PartyDirectoryService.cs:95–102`):**  
   `party.UpdateIdentity(kind, normalizedDisplayName, nowUtc)` mutates `party.Kind` **before** line 102 reads `party.Kind.ToString()` as `previousKind`, causing audit metadata to log `previousKind == newKind`.
3. **Missing `ACCESS_DENIED` Audit on Party Permission Failure (`PartyDirectoryService.cs:128–143`):**  
   `EnsurePermission` throws `ForbiddenDomainException` without writing an `ACCESS_DENIED` `AuditLog` entry (unlike `UserManagementService`, `ProjectService`, and `ProjectCustomerService`).
4. **Dual Name Column Desynchronization (`ProjectCustomer` vs `Party`):**  
   `parties` and `project_customers` both persist `display_name` and `normalized_display_name`. Editing a Party via `PUT /api/parties/{partyId}` updates `parties`, whereas `project_customers.display_name` / `normalized_display_name` (still indexed by `ux_project_customers_project_name_phone`) is not updated by that endpoint; see formal resolution in [DECISION-LOG.md](DECISION-LOG.md) and [DOMAIN-MODEL.md](DOMAIN-MODEL.md).
5. **No Business Role Holds `parties.identity.manage` (`DbInitializer.cs`):**  
   `parties.identity.manage` is seeded **only** on `SYSTEM_ADMIN`; no seeded business role (`PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`, `LEGAL_OFFICER`, etc.) can currently update canonical Party identities.

---

## 5. Preview Middleware & Seeded Permission Drift Inventory

1. **Missing Permissions in `apps/local-web/dev-api-middleware.ts` (`ROLE_PERMS`):**  
   Only 12 of the 18 seeded permissions appear in `dev-api-middleware.ts`. Missing: `customers.read`, `customers.manage`, `sales.reservations.read`, `sales.reservations.manage`, `parties.directory.read`, `parties.identity.manage`.
2. **Missing Preview Routes in `dev-api-middleware.ts`:**  
   No preview API routes exist for `/api/projects/{id}/documents*`, `/api/projects/{id}/customers*`, `/api/projects/{id}/reservations*`, or `/api/parties*`.
3. **Setup Wilaya Regex Drift (`dev-api-middleware.ts:563`):**  
   Preview setup validation still checks `/^([0][1-9]|[1-4]\d|5[0-8])$/` (`01–58`), whereas Domain, `algerianFormat.ts`, `validation.ts`, and `devPreviewProjectStore.ts` accept `01–69`.
4. **Seeded vs Checked Permissions in Backend (`DbInitializer.cs` vs `Application/Services/`):**  
   - `org.manage` (seeded on `SYSTEM_ADMIN`) has no endpoint or organization-edit UI.  
   - `projects.structure.manage` (seeded on `SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) is ignored by `ProjectStructureService`, which checks `ProjectMember.CanManageConstruction || ProjectMemberRole.ProjectManager`.  
   - `org.read` and `users.read` are seeded but not separately checked in services (`UserManagementService` checks `users.manage` for all user list/role/edit actions; `/api/auth/me` exposes org summary to authenticated users).
