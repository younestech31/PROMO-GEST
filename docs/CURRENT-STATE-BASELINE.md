# PROMO GEST — Current State Baseline

**Purpose:** Factual, evidence-backed baseline of what actually exists, compiles, passes, fails, or drifts in the PROMO GEST repository as of **2026-11-15**.

---

## 1. Verified Build & Automated Test Evidence

Commands executed read-only against the current workspace (`.NET SDK 10.0.404`, Node.js `v22`/TypeScript):

| Check | Command | Result | Notes |
|---|---|---|---|
| .NET Solution Build | `dotnet build src/PromoGest.sln --no-restore` | **FAILED (1 Error)** | `Domain`, `Contracts`, `Application`, `Infrastructure`, `Api`, `Domain.Tests`, `Application.Tests` succeeded; **`PromoGest.IntegrationTests` failed (`CS7036`)** at `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs(1072,45)` |
| Domain Unit Tests | `dotnet test tests/PromoGest.Domain.Tests/PromoGest.Domain.Tests.csproj --no-build` | **PASSED (27 / 27)** | 143 ms (`DomainInvariantTests`, `PartyDomainTests`, `ProjectCustomerDomainTests`) |
| Application Tests | `dotnet test tests/PromoGest.Application.Tests/PromoGest.Application.Tests.csproj` | **PASSED (10 / 10)** | 9.13 s (`ApplicationSecurityAndFoundationTests`: setup, auth, lockout, recovery, project authz, dynamic counts, structure, audit failure propagation) |
| PG18 End-to-End Integration | `PromoGest.IntegrationTests` | **BLOCKED** | Does not compile (`CS7036`); additionally `docker info` reports **no Docker daemon** in this container environment (`Testcontainers` cannot run here) |
| Frontend TypeScript Check | `npm run lint` (`tsc -p apps/local-web/tsconfig.json --noEmit`) | **PASSED (0 errors)** | Strict mode enabled (`"strict": true`) |
| Frontend Pure Logic Tests | `npm test` (`tsx --test apps/local-web/src/utils/*.test.ts`) | **PASSED (22 / 22)** | Covers `algerianFormat`, `csrf`, `devPreviewCookies`, `devPreviewProjectStore`, `permissions`, `serviceWorkerShell`, `validation` |

> **Specific Compile Defect Observed (`CS7036`):**  
> `src/PromoGest.Contracts/Projects/ProjectCustomerContracts.cs` (lines 76–88) defines `UpdateProjectCustomerRequest` with **12 required positional parameters** (adding `Guid PartyConcurrencyStamp` at the end without a default value).  
> `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs` (lines 1072–1083) still invokes `new UpdateProjectCustomerRequest(...)` with **11 arguments** (ending at `staleCustomerStamp`), breaking solution compilation.

---

## 2. Database Schema & Migrations Inventory (11 Migrations Inspected)

All migrations in `src/PromoGest.Infrastructure/Migrations/` are accounted for:

| # | Migration Timestamp & Name | Core Schema Impact |
|---|---|---|
| 1 | `20261113000001_InitialFoundation` | `organizations`, `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `user_sessions`, `projects`, `project_members`, `audit_logs` |
| 2 | `20261113000002_HardeningConstraintsAndAuditImmutability` | PostgreSQL functions/triggers blocking `UPDATE`/`DELETE` on `audit_logs`; check constraints & hardening indexes |
| 3 | `20261113000003_SystemAdministratorInvariant` | DB partial unique index `ux_users_single_system_admin` (`WHERE is_system_administrator = TRUE`), `organizations` singleton check constraint (`singleton_key = 1`) |
| 4 | `20261114000001_AuditLogRuntimePermissions` | Grants/runtime permissions alignment for `promogest_app` on `audit_logs` |
| 5 | `20261114090000_ProjectStructureFoundation` | `buildings`, `building_floors`, `property_units` + unique per-project/building/floor codes & check constraints |
| 6 | `20261114180000_ProjectDocumentMetadata` | `project_documents` (SHA-256 checksum, relative storage path, category, MIME/size limits) |
| 7 | `20261114190000_ProjectCustomerRegistry` | `project_customers`, `customer_interactions`, `ux_project_customers_project_name_phone` |
| 8 | `20261114200000_CustomerModelSnapshotReconciliation` | Snapshot reconciliation for customer model |
| 9 | `20261114230000_ProjectSalesReservations` | `project_sales_reservations` + `ux_reservations_active_unit` partial unique index (prevents double-booking `Active` units) |
| 10 | `20261115100000_OrganizationWidePartyFoundation` | `parties` table, additive `party_id` FK (`NOT NULL` after 1:1 backfill from `project_customers` inside migration SQL) |
| 11 | `20261115120000_UniqueProjectPartyCustomerLink` | `ux_project_customers_project_party` unique index on `(project_id, party_id)` |

---

## 3. Component-by-Component Honesty Ledger

| Component / Capability | Status | Evidence & Verified Details |
|---|---|---|
| **First-Run Setup Wizard** (`SetupController`, `SetupService`, `FirstRunSetupWizard.tsx`) | `IMPLEMENTED_AND_VERIFIED` | Single-org + single `SYSTEM_ADMIN` atomic creation; `App.Tests` verifies single-run lock & concurrent conflict handling (`SETUP_ALREADY_INITIALIZED`); PG18 test exists in `PostgresEndToEndTests` (currently blocked from running by `CS7036`). |
| **Auth, Sessions & CSRF** (`AuthController`, `AuthService`, `CsrfValidationMiddleware`) | `IMPLEMENTED_AND_VERIFIED` | Argon2id password hashing, 256-bit opaque cookie (`SHA-256` in `user_sessions`), `HttpOnly; SameSite=Strict`, `X-CSRF-Token` validation on unsafe methods, 5-attempt lockout (15 min), generic login error across unknown/wrong/inactive/locked states verified by `Application.Tests`. |
| **User Management & Admin Recovery** (`UsersController`, `UserManagementService`, `AdminRecoveryCli`) | `IMPLEMENTED_AND_VERIFIED` | Create/update employees, assign 6 non-admin roles, disable + revoke sessions, reset password; second `SYSTEM_ADMIN` rejected & audited (`Application.Tests`); offline CLI unlock/password reset verified. |
| **Organization Profile Management** (`OrganizationProfileView.tsx`) | `PARTIALLY_IMPLEMENTED` | Read-only display via `/api/auth/session` (`OrganizationSummaryResponse`). **No** `PUT /api/organization` endpoint or edit form exists despite `org.manage` permission being seeded. |
| **Audit Log** (`AuditController`, `AuditLogQueryService`, `AuditLogView.tsx`) | `IMPLEMENTED_AND_VERIFIED` | Append-only DB trigger blocks mutations; query filterable by event/severity/date; `audit.read` enforcement + `ACCESS_DENIED` logging verified in `Application.Tests`; failure propagation verified. |
| **Projects Core & Team Membership** (`ProjectsController`, `ProjectService`, `ProjectsView.tsx`) | `IMPLEMENTED_AND_VERIFIED` | CRUD + status lifecycle, Wilaya `01–69`, `ExpectedConcurrencyStamp` CAS conflict (`PROJECT_CONCURRENCY_CONFLICT`), explicit membership gate (ADR-0006), dynamic `actualBuildingsCount`/`actualUnitsCount`, last-PM protection, all verified in `Application.Tests`. |
| **Project Physical Structure** (`ProjectStructureController`, `ProjectStructureService`, `ProjectStructureModal.tsx`) | `IMPLEMENTED_AND_VERIFIED` (for API/App) / `PARTIALLY_IMPLEMENTED` (no DELETE / authz inconsistency) | Buildings → Floors → Property Units CRUD + concurrency stamps + bulk floor/unit creation verified in `Application.Tests`. **Note:** `projects.structure.manage` permission is seeded in `DbInitializer` but `ProjectStructureService` checks `CanManageConstruction \|\| ProjectManager` on `ProjectMember` instead of that permission; DELETE endpoints are intentionally not exposed. |
| **Project Documents** (`ProjectDocumentsController`, `ProjectDocumentService`, `ProjectDocumentsModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | Local disk storage (`Storage__RootDirectory`), SHA-256 verification on download, allowed extension/MIME whitelist (`pdf`, `png`, `jpg`, `docx`, `xlsx`, max 25 MB), metadata & soft/archive lifecycle. Covered only by blocked `PostgresEndToEndTests` (not `Application.Tests` or preview middleware). |
| **Project Customer Registry & Interactions (C1)** (`ProjectCustomersController`, `ProjectCustomerService`, `ProjectCustomerRegistryModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | Project-scoped customer CRUD, `CustomerInteraction` logging, 45+ unit/invariant tests in `ProjectCustomerDomainTests` (27 tests total in `Domain.Tests`), **but** C2 modifications added `PartyId` / `PartyConcurrencyStamp` without updating `PostgresEndToEndTests` (`CS7036`) or `Application.Tests`. |
| **Organization-Wide Party Directory (C2 Unverified Slice)** (`PartiesController`, `PartyDirectoryService`, `EfPartyRepository`, `Party.cs`) | `IMPLEMENTED_NOT_VERIFIED` (has active defects) | Migration #10 & #11 exist, `PartyDomainTests` pass, `PartiesController` (`GET /api/parties`, `PUT /api/parties/{partyId}`) & UI lookup in `ProjectCustomerRegistryModal.tsx` exist. **Active defects documented below.** |
| **Sales Reservations** (`ProjectSalesReservationsController`, `ProjectSalesReservationService`, `ProjectSalesReservationsModal.tsx`) | `IMPLEMENTED_NOT_VERIFIED` | Unit status coupling (`Reserved` / `Available`), PG partial index `ux_reservations_active_unit`, cancellation/expiry/extension workflows. Only tested inside blocked `PostgresEndToEndTests` (no `Application.Tests` or `Domain.Tests` dedicated suite for reservation state machine). |
| **Vite Preview Gateway (`apps/local-web/dev-api-middleware.ts`)** | `PARTIALLY_IMPLEMENTED` (Significant Drift) | Supports Setup, Auth, Users, Audit, Projects, Structure, Members, and `devPreviewProjectStore.ts`. **Drifts from real API:** see Section 5 below. |
| **Deployment Tooling & Data Protection** (`deploy/`, `scripts/`, `DataProtectionConfiguration.cs`) | `PARTIALLY_IMPLEMENTED` | Windows DPAPI machine-scope & Linux PKCS#12 cert tests exist inside blocked `PromoGest.IntegrationTests`; Linux systemd, Windows NSSM/SC PowerShell, Caddy LAN HTTPS, and backup/restore scripts exist, awaiting host verification outside container. |

---

## 4. Active Defects & Gaps Discovered in Unverified C2 Party Changes

Do **not** conceal these findings — they exist directly in inspected source files:

1. **`PostgresEndToEndTests.cs:1072` Compile Error (`CS7036`):**  
   `UpdateProjectCustomerRequest` added a mandatory 12th positional parameter (`Guid PartyConcurrencyStamp`), breaking the 11-argument call in `PostgresEndToEndTests.cs`.
2. **Stale `previousKind` Audit Metadata (`PartyDirectoryService.cs:95–102`):**  
   `party.UpdateIdentity(kind, normalizedDisplayName, nowUtc)` mutates `party.Kind` **before** line 102 reads `party.Kind.ToString()` as `previousKind`, causing audit metadata to log `previousKind == newKind`.
3. **Missing `ACCESS_DENIED` Audit on Party Permission Failure (`PartyDirectoryService.cs:128–143`):**  
   `EnsurePermission` throws `ForbiddenDomainException` without writing an `ACCESS_DENIED` `AuditLog` entry (unlike `UserManagementService`, `ProjectService`, and `ProjectCustomerService`).
4. **Dual Name Column Desynchronization (`ProjectCustomer` vs `Party`):**  
   `parties` and `project_customers` both store `display_name` and `normalized_display_name`. Updating a Party's identity via `PUT /api/parties/{partyId}` updates `parties.display_name`, while `project_customers.display_name` (still indexed by `ux_project_customers_project_name_phone` and queried by `EfProjectCustomerRepository.ExistsDuplicateAsync`) is not synchronized unless the customer endpoint also updates it.
5. **No Business Role Holds `parties.identity.manage` (`DbInitializer.cs`):**  
   `parties.identity.manage` is assigned **only** to `SYSTEM_ADMIN`; no seeded business role (`PROJECT_DIRECTOR`, `SALES_AGENT`, etc.) has permission to correct central Party identities.

---

## 5. Preview Middleware & Cross-Layer Drift Inventory

1. **Missing Permissions in `apps/local-web/dev-api-middleware.ts` (`ROLE_PERMS`):**  
   Only 12 of the 18 seeded permissions appear in `dev-api-middleware.ts`. Missing: `customers.read`, `customers.manage`, `sales.reservations.read`, `sales.reservations.manage`, `parties.directory.read`, `parties.identity.manage`.
2. **Missing Preview Routes in `dev-api-middleware.ts`:**  
   No preview API routes exist for `/api/projects/{id}/documents*`, `/api/projects/{id}/customers*`, `/api/projects/{id}/reservations*`, or `/api/parties*`.
3. **Setup Wilaya Regex Drift (`dev-api-middleware.ts:563`):**  
   Preview setup validation still checks `/^(0[1-9]|[1-4][0-9]|5[0-8])$/` (`01–58`), whereas Domain, `algerianFormat.ts`, `validation.ts`, and `devPreviewProjectStore.ts` accept `01–69`.
4. **Unused Seeded Permissions in Real Backend (`DbInitializer.cs`):**  
   - `org.manage` (seeded on `SYSTEM_ADMIN`) has no endpoint or organization-edit UI.  
   - `projects.structure.manage` (seeded on `PROJECT_DIRECTOR` + `SYSTEM_ADMIN`) is ignored by `ProjectStructureService`, which checks `ProjectMember.CanManageConstruction || ProjectMemberRole.ProjectManager`.
