## Latest verified repository checkpoint — 21 November 2026 (PR #187 post-merge)

- **Current GitHub main:** `ecc3e52ec990bcd8ef3dc7f8c68f82e1632e1901` (PR #187, documentation-only, squash-merged).
- **Latest code-bearing merge:** PR #186 at `07cba896eec07bb28878d948a6cfb905313a2b22`; its Project aggregate-root concurrency implementation remains the current executable code baseline.
- **Post-merge CI on exact current main SHA:** [CI #44911252345](https://github.com/younestech31/PROMO-GEST/actions/runs/44911252345) passed all three required jobs: Frontend install/checks/static hosting; .NET 10 + PostgreSQL 18 least-privilege/integration/restore; Windows publish and PowerShell validation.
- **Post-merge CodeQL on exact current main SHA:** [CodeQL #44911252403](https://github.com/younestech31/PROMO-GEST/actions/runs/44911252403) passed both C# and JavaScript/TypeScript analysis.
- **P1-15:** implementation and deterministic PostgreSQL 18 race coverage are merged; automated CI/CodeQL now pass on current main. Keep capability `IMPLEMENTED_NOT_VERIFIED` and task In Review / Pending until the required manual Arabic RTL / French LTR acceptance is recorded.
- **P1-01 remains the Phase 1 gate:** 1,541 practitioner sign-offs remain PENDING; decision book remains 1,540 PENDING + W30-R007 NEEDS_EVIDENCE; no commune records imported (`communesCount = 0`); P1-01 In Progress / Pending and P1-02 Blocked. No phase advancement or legal approval is inferred from CI.
- **Security boundary:** GitHub main branch protection and required status checks were observed disabled; this was not changed. No production data, live database, authorization policy, roles, permissions, or Cloud SQL business data were changed.

---

## P1-15 — Concurrent last-ProjectManager invariant (PR #186)

- PR #186 merged at `07cba896eec07bb28878d948a6cfb905313a2b22`. Existing-member role/capability updates touch the Project aggregate root, rotating the Project concurrency token in the same SaveChanges transaction as the membership and audit event.
- Competing demotions/removals against different membership rows cannot both commit against the same root version; the losing transaction returns HTTP 409 `CONCURRENCY_CONFLICT` and rolls back its pending membership and audit changes.
- The real PostgreSQL 18 deterministic-barrier integration test passed on the exact PR head; CI/CodeQL evidence and the post-merge verification limitation are recorded in CURRENT-STATE-BASELINE.md.
- No permission, role, SYSTEM_ADMIN, CSRF, audit, or authorization policy was loosened. P1-15 remains `IMPLEMENTED_NOT_VERIFIED` until post-merge checks and manual bilingual acceptance are evidenced.

---

# PROMO GEST — Security Architecture & Authorization Matrix

**Verified Against:** `src/PromoGest.Infrastructure/Security/SecurityServices.cs`, `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`, `src/PromoGest.Domain/Entities/RbacEntities.cs`, `src/PromoGest.Api/Middleware/ApiMiddleware.cs`, `src/PromoGest.Api/Security/SessionAuthenticationHandler.cs`, `src/PromoGest.Api/Controllers/AuthController.cs`, and `src/PromoGest.Application/Services/*.cs`.

---

## 1. Security-by-Design Foundation

| Control | Concrete Implementation | Verified Source |
|---|---|---|
| **Single System Administrator** | Enforced in Domain, `SetupService`, `UserManagementService`, and PostgreSQL partial unique index `ux_users_single_system_admin` (`WHERE is_system_administrator = true`). | `User.cs`, `UserConfiguration.cs`, `Application.Tests` |
| **Setup Bootstrap Guard** | `POST /api/setup/initialize` allows execution only from loopback client IPs (`_environment.IsDevelopment()` when `RemoteIpAddress` is null) or with a constant-time verified `X-PROMOGEST-SETUP-TOKEN` (`Security:SetupBootstrapToken` / `PROMOGEST_SETUP_TOKEN`). `GET /api/setup/status` omits `initializedAtUtc` and reports `requiresBootstrapToken`. | `SetupController.cs`, `PostgresEndToEndTests.cs` |
| **Password Policy, Hashing & Lockout** | `PasswordPolicyValidator` enforces length `10..128` (`MaximumLength = 128`); `AuthService.LoginAsync` rejects passwords `> 128` chars before hashing to prevent CPU DoS. **`Pbkdf2PasswordHasher` (`PBKDF2-SHA512`, 310,000 iterations, random 16-byte salt, 32-byte hash, serialized format `PBKDF2-SHA512$<iterations>$<salt_b64>$<hash_b64>`)**; 5 consecutive failed logins trigger a 15-minute lockout (`FailedLoginAttempts`, `LockoutEndUtc`), and stale counters reset after lockout expiry so a user always gets 5 fresh attempts after expiry. Newly created or administratively reset employees must change their temporary password within a configurable deadline (`Security:TemporaryPasswordLifetimeHours`, 1–168 hours, default 24) before business APIs are available. The forced rotation shipped with PR #161 and is `IMPLEMENTED_NOT_VERIFIED` for manual Arabic/French review. | `PasswordPolicyValidator.cs`, `User.cs`, `UserManagementService.cs`, `AuthService.cs`, `PasswordChangeRequiredMiddleware`, `PostgresEndToEndTests.cs` |
| **Zero Credential Enumeration** | Unknown username, wrong password, inactive user, and locked account all return a uniform `AUTH_INVALID_CREDENTIALS` error. | `AuthService.cs`, `Application.Tests` |
| **Opaque HTTP-Only Sessions** | 256-bit random session token (`CryptoSessionTokenGenerator`) stored only as SHA-256 hex in `user_sessions`; issued in **`promogest_session`** cookie (`HttpOnly`, `SameSite=Strict`, `Secure` configurable via `Security:RequireHttpsCookies`). No bearer tokens in `localStorage`. | `SecurityServices.cs`, `SessionAuthenticationHandler.cs`, `AuthController.cs` |
| **CSRF Protection** | `CsrfValidationMiddleware` enforces Antiforgery validation matching `.PromoGest.Antiforgery` cookie against `X-CSRF-TOKEN` header on **every** state-changing `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`, including login and first-run setup after fetching the intentionally `[AllowAnonymous]` bootstrap endpoint `GET /api/auth/csrf`). | `ApiMiddleware.cs`, `AuthController.cs`, `SessionAuthenticationHandler.cs` |
| **Security Headers & CSP** | `SecurityHeadersMiddleware` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and strict CSP (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`). | `ApiMiddleware.cs` |
| **Sensitive Response Cache & Health Exposure Policy** | Every `/api` and `/health` response receives `Cache-Control: no-store` centrally, including success, error/fallback, and CSRF-rejection responses. `/health/live` and `/health/ready` suppress `environmentMode` (`null`) outside `Development`. Static SPA routes and assets are excluded and retain their existing cache behavior. | `SecurityHeadersMiddleware`, `HealthChecks`, `SecurityHeadersMiddlewareTests.cs`, `PostgresEndToEndTests.cs` |
| **Development Preview Cookie Guard** | `DevelopmentPreviewCookiePolicy` activates **only** when `IsDevelopment()` AND request arrives from an HTTPS preview proxy (`*.run.app` or forwarded `https://`), emitting `SameSite=None; Secure; Partitioned`; Production & localhost HTTP remain untouched (`SameSite=Strict`). | `DevelopmentPreviewCookiePolicy.cs`, `Program.cs` |
| **Immutable Security Audit Log** | `audit_logs` protected by PostgreSQL `BEFORE UPDATE OR DELETE` trigger (`prevent_audit_log_mutation`); failed audit writes propagate and abort operations. | `Migration #2`, `Application.Tests` |

### 1.1 Session & Credential Lifecycle (implemented 2026-11-20)

| Rule | Implementation | Configuration |
|---|---|---|
| **Absolute session lifetime** | `UserSession.ExpiresAtUtc` is set from the configured absolute lifetime at login and is also the cookie expiry. | `Security:SessionAbsoluteLifetimeHours` (1–72, default 12) |
| **Idle lock** | Every validated request compares `LastSeenAtUtc` with the idle timeout. An idle session is revoked individually and audited as `AUTH_SESSION_IDLE_EXPIRED`; the cookie is rejected on the next request. | `Security:SessionIdleTimeoutMinutes` (5–480, default 30) |
| **Activity touch** | `LastSeenAtUtc` is rewritten at most once per touch interval, bounding session writes per active user. | `Security:SessionTouchIntervalMinutes` (1–30, default 1) |
| **Temporary-password deadline** | Administrator-issued passwords carry `PasswordChangeRequiredUntilUtc`; login and session validation fail closed after it, and sessions are revoked with `AUTH_TEMPORARY_PASSWORD_EXPIRED`. | `Security:TemporaryPasswordLifetimeHours` (1–168, default 24) |
| **Voluntary rotation** | Any authenticated user may call `POST /api/auth/change-password` after proving the current password. Policy, reuse check, lockout accounting, `SecurityStamp` rotation and full session revocation apply exactly as in the forced path; the forced path additionally enforces the deadline. | — |
| **Console recovery** | `--reset-admin-password` rotates the stamp, clears lockout and does not impose a hidden deadline; the operator is told to rotate the password after signing in. | — |
| **Consistency guard** | The composed policy fails at startup if the touch interval is not shorter than the idle timeout, or the idle timeout exceeds the absolute lifetime. | `DependencyInjection.AddPromoGestInfrastructure` |

**Verification state:** frontend lint, typecheck, unit tests and production build pass on the implementation branch. The .NET side (domain/application tests and PostgreSQL integration) is verified only by the pull-request CI run; the table is not acceptance evidence until that run and the post-merge `main` run are green.

**Frontend surface:** the authenticated sidebar exposes "change password" for every role, backed by a modal that reuses the shared password-strength validator and the central translation bundle. The forced-rotation screen uses the same bundle instead of inline bilingual strings.

---

## 2. Exact Seeded Role Catalog (7 Roles in `Role.cs` & `DbInitializer.cs`)

| Role Code | Arabic Name (`NameAr`) | French Name (`NameFr`) | `IsSystemRole` |
|---|---|---|---|
| `SYSTEM_ADMIN` | مدير النظام | Administrateur Système | `true` *(singleton account)* |
| `PROJECT_DIRECTOR` | مدير المشاريع | Directeur de Projets | `false` |
| `COMMERCIAL_MANAGER` | مسؤول المبيعات والتسويق | Responsable Commercial | `false` |
| `FINANCE_OFFICER` | مسؤول المالية والمحاسبة | Responsable Financier | `false` |
| `SITE_ENGINEER` | مهندس متابعة الأشغال | Ingénieur Travaux | `false` |
| `LEGAL_OFFICER` | المكلف بالشؤون القانونية والعقود | Chargé Juridique & Contrats | `false` |
| `VIEWER` | مستخدم للمطالعة فقط | Consultant Lecture Seule | `false` |

---

## 3. 18 Seeded Permissions: Seed Matrix vs Actual Enforcement Status

> **Governance Rule:** Seeding a permission in `DbInitializer.cs` does **not** prove an API service or UI checks it. The two tables below keep seeded grants and actual runtime checks strictly separated.

### 3.1 Seeded Role × Permission Grants (`DbInitializer.cs`)

| Permission Code | Module | `SYSTEM_ADMIN` | `PROJECT_DIRECTOR` | `COMMERCIAL_MANAGER` | `FINANCE_OFFICER` | `SITE_ENGINEER` | `LEGAL_OFFICER` | `VIEWER` |
|---|---|---|---|---|---|---|---|---|
| `org.read` | Organization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `org.manage` | Organization | ✓ | — | — | — | — | — | — |
| `users.read` | Administration | ✓ | — | — | — | — | — | — |
| `users.manage` | Administration | ✓ | — | — | — | — | — | — |
| `audit.read` | Security | ✓ | — | — | — | — | — | — |
| `projects.read` | Projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `projects.create` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.manage` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.access.manage` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.structure.manage` | Project Structure | ✓ | ✓ | — | — | ✓ | — | — |
| `files.read` | Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `files.write` | Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `customers.read` | Customers | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `customers.manage` | Customers | ✓ | ✓ | ✓ | — | — | — | — |
| `sales.reservations.read` | Sales | ✓ | ✓ | ✓ | — | — | — | — |
| `sales.reservations.manage` | Sales | ✓ | ✓ | ✓ | — | — | — | — |
| `parties.directory.read` | Master Data | ✓ | ✓ | ✓ | — | — | — | — |
| `parties.identity.manage` | Master Data | ✓ | — | — | — | — | — | — |

### 3.2 Permission Enforcement Classification (Seeded vs Backend vs Preview vs Planned)

| Permission Code | Seeded? | Checked by API / Application (`src/`) | Available in Preview (`dev-api-middleware.ts`) | Frontend Helper (`permissions.ts`) | Effective Classification |
|---|---|---|---|---|---|
| `org.read` | Yes (all 7 roles) | **Checked** in `AuthService.BuildSessionResponse` (gates fiscal/contact organization summary fields alongside `org.manage` / `IsSystemAdministrator`) | Seeded in `ROLE_PERMS` | `OrganizationProfileView.tsx` checks `org.read` / `org.manage` | **Checked by API + Available in preview** |
| `org.manage` | Yes (`SYSTEM_ADMIN`) | **Checked** in `OrganizationProfileService.UpdateAsync` (`PUT /api/organization`, writes `ACCESS_DENIED` on failure) and `AuthService.BuildSessionResponse` (gates `ConcurrencyStamp`) | Seeded in `ROLE_PERMS` | `canManageOrganizationProfile` (`permissionPolicy.ts`, consumed by `App.tsx` and `OrganizationProfileView.tsx`) | **Checked by API + UI** |
| `users.read` | Yes (`SYSTEM_ADMIN`) | **Not checked separately** (`UserManagementService` checks `users.manage` for `ListUsers` and `ListRoles`) | Seeded in `ROLE_PERMS` | None (`canManageUsers` checks `users.manage`) | **Seeded only / Superseded by `users.manage` in API** |
| `users.manage` | Yes (`SYSTEM_ADMIN`) | **Checked** in `UserManagementService.EnsureCanManageUsersAsync` | Yes (seeded & enforced) | `canManageUsers` + `canAccessRoute` (`/admin/users`) | **Checked by API + Available in preview + Route Guarded** |
| `audit.read` | Yes (`SYSTEM_ADMIN`) | **Checked** in `AuditQueryService.ListRecentAsync` | Yes (seeded & enforced) | `canViewAuditLogs` + `canAccessRoute` (`/admin/audit`) | **Checked by API + Available in preview + Route Guarded** |
| `projects.read` | Yes (all 7 roles) | **Checked** in `ProjectStructureService`; `ProjectService` enforces explicit `ProjectMember` row (`ListForUserWithMembersAsync` / `GetMemberAsync`) | Seeded in `ROLE_PERMS` | Membership checked + `revokeProjectAccessFromState` | **Partially checked by API** (Structure checks it; `ProjectService` relies on `ProjectMember`) |
| `projects.create` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.CreateProjectAsync` | Yes (seeded & enforced) | `canCreateProject` | **Checked by API + Available in preview** |
| `projects.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.UpdateProjectAsync` (+ `ProjectManager`) | Yes (seeded & enforced) | `canManageProjects` | **Checked by API + Available in preview** |
| `projects.access.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.EnsureCanManageProjectAccessAsync` (+ `ProjectManager`) | Yes (seeded & enforced) | `canManageProjectAccess` | **Checked by API + Available in preview** |
| `projects.structure.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `SITE_ENGINEER`) | **Checked** in `ProjectStructureService` (+ `ProjectMember.CanManageConstruction \|\| ProjectManager`) | Yes (seeded & enforced in `devPreviewProjectStore.ts`) | `canManageProjectStructure` | **Checked by API + Available in preview + UI** |
| `files.read` | Yes (all roles except `VIEWER`) | **Checked** in `ProjectDocumentService` (`ListAsync`, `GetDownloadAsync`, plus category scoping and `customers.read` isolation for customer identity files) & `ProjectCustomerService` (`ValidateIdentityDocumentAsync`, DTO visibility) | Seeded & enforced in `dev-api-middleware.ts` (`/documents`, KYC metadata redaction, category scoping) | `canReadProjectDocuments` | **Checked by API + Preview parity** |
| `files.write` | Yes (all except `VIEWER`) | **Checked** in `ProjectDocumentService.UploadAsync` (+ `CanManageDocuments` + category scoping) | Seeded & enforced in `dev-api-middleware.ts` (`POST /documents` multipart upload + SHA-256 + category checks) | `canUploadProjectDocuments` | **Checked by API + Preview parity** |
| `customers.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`, `LEGAL_OFFICER`) | **Checked** in `ProjectCustomerService`, `ProjectSalesReservationService`, and `ProjectDocumentService` (customer identity document isolation) | Seeded & enforced in `dev-api-middleware.ts` (including KYC identity file exclusion without `customers.read`) | `canReadProjectCustomers` | **Checked by API + Preview parity** |
| `customers.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectCustomerService` (`CreateAsync`, `UpdateAsync`, `AddInteractionAsync`) | Seeded & enforced in `dev-api-middleware.ts` (+ `canManageSales`/`ProjectManager`, dual concurrency) | `canManageProjectCustomers` | **Checked by API + Preview parity** |
| `sales.reservations.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectSalesReservationService` (requires `customers.read` as well) | Seeded & enforced in `dev-api-middleware.ts` (requires `customers.read`) | `canReadProjectSalesReservations` | **Checked by API + Preview parity** |
| `sales.reservations.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectSalesReservationService` (`CreateAsync`, `CancelAsync`) | Seeded & enforced in `dev-api-middleware.ts` (+ `canManageSales`/`ProjectManager`, expiry/cancel checks) | `canManageProjectSalesReservations` | **Checked by API + Preview parity** |
| `parties.directory.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `PartyDirectoryService.SearchAsync` & `ProjectCustomerService.CreateAsync` (`PartyId` reuse) | Seeded & enforced in `dev-api-middleware.ts` (`GET /api/parties` + audit) | `canReadPartyDirectory` + `canAccessRoute` (`/organization/parties`) | **Checked by API + Preview parity + Route Guarded** |
| `parties.identity.manage` | Yes (`SYSTEM_ADMIN` only) | **Checked** in `PartyDirectoryService.UpdateIdentityAsync` & `ProjectCustomerService.UpdateAsync` | Seeded & enforced in `dev-api-middleware.ts` (`PUT /api/parties/:id`, `PUT /customers/:id` identity change, CAS) | `canManagePartyIdentity` | **Checked by API + Preview parity** *(no business role assigned yet)* |

---

## 4. Two-Layer Project Resource Scope (ADR-0006)

For all non-`SYSTEM_ADMIN` users, holding an organization role permission is **necessary but never sufficient** to access or mutate project-owned records:

```text
  Authorized Access = Active Authenticated Session
                    ∩ Global Role Permission (where checked)
                    ∩ Explicit ProjectMember Row (for target ProjectId)
                    ∩ Required ProjectMember Role / Capability Flag
```

| Project Operation | Required Global Permission | Required `ProjectMember` Condition (non-Admin) |
|---|---|---|
| Read Project Summary (non-financial fields) | *(Enforced by member filter/lookup)* | Any `ProjectMember` row; `EstimatedBudgetDzd` is separately gated by `CanViewFinancials` below |
| Read Estimated Project Budget | Existing project-read scope | Explicit `ProjectMember` row with `CanViewFinancials == true`; no implicit `SYSTEM_ADMIN` or `ProjectManager` bypass |
| Update Estimated Project Budget | `projects.manage` | Both `RoleInProject == ProjectManager` and `CanViewFinancials == true` on the actor's explicit membership |
| Read Project Structure | `projects.read` | Any `ProjectMember` row |
| Create Project | `projects.create` | Non-admin creator is explicitly assigned as `ProjectManager` with existing creation-time capabilities; `SYSTEM_ADMIN` creates with zero budget until a financial member is explicitly assigned |
| Update Project Details (non-financial master data) | `projects.manage` | `RoleInProject == ProjectManager`; send `EstimatedBudgetDzd: null` to preserve the restricted value when lacking `CanViewFinancials` |
| Manage Project Team | `projects.access.manage` | `RoleInProject == ProjectManager`; aggregate-root concurrency serializes role changes/removals so concurrent requests cannot remove or demote the last Project Manager |
| Manage Buildings / Floors / Units | `projects.structure.manage` | `CanManageConstruction == true \|\| RoleInProject == ProjectManager` |
| Read Project Documents | `files.read` *(plus `customers.read` for customer identity documents)* | Any `ProjectMember` row + category capability check (`Financial` -> `CanViewFinancials`, `Commercial` -> `CanManageSales`, `Engineering`/`Plans` -> `CanManageConstruction \|\| CanManageDocuments`, `Legal`/`LandAndTitle` -> `CanManageDocuments`; `ProjectManager` bypasses category cap except customer identity PII isolation) |
| Upload Project Documents | `files.write` | `CanManageDocuments == true` + category capability check (`Financial` -> `CanViewFinancials`, `Commercial` -> `CanManageSales`, `Engineering`/`Plans` -> `CanManageConstruction`, `Legal`/`LandAndTitle` -> `CanManageDocuments`; `ProjectManager` bypasses category cap) |
| Read Customers & Interactions | `customers.read` | Any `ProjectMember` row |
| Create / Update Customers & Interactions | `customers.manage` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |
| Read Sales Reservations | `sales.reservations.read` + `customers.read` | Any `ProjectMember` row |
| Create / Cancel Reservations | `sales.reservations.manage` + `sales.reservations.read` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |

### 4.1 Last Project Manager invariant under concurrent membership changes

Every change to an existing `ProjectMember` role or capability flags, as well as membership removal, touches the owning `Project` aggregate root. EF Core persists that root's `ConcurrencyStamp` as a concurrency token in the same SaveChanges transaction as the child membership and its audit event. Concurrent requests that loaded the same project version therefore cannot both commit mutations to different manager rows: one succeeds and the other receives HTTP 409 `CONCURRENCY_CONFLICT`; the losing transaction rolls back its membership mutation and pending audit event. The service-level last-manager count remains an early, readable guard, but is not the concurrency control. PostgreSQL 18 integration tests use a deterministic SaveChanges barrier to exercise simultaneous demotions and simultaneous removals against independent request scopes.

---

## 5. Segregation of Duties (SoD) & PII Isolation Boundaries

1. **System Administrator vs Business Operations:** `SYSTEM_ADMIN` manages technical setup, employees/roles, audit logs, and emergency access—never an implicit financial approver. It has no automatic access to `EstimatedBudgetDzd`; a `ProjectMember` row with `CanViewFinancials == true` is required even for `SYSTEM_ADMIN` (`ADR-0011`). Projects created by `SYSTEM_ADMIN` deliberately have no default business `ProjectManager` until explicitly assigned (`ADR-0006`).
2. **Party Search vs Project Confidential Data (`ADR-0009`):** `parties.directory.read` permits searching organization-wide canonical `Party` identities (`Id`, `Kind`, `DisplayName`, `ConcurrencyStamp`) when adding customers, **without** granting access to project-specific phones, emails, addresses, notes/interactions, identity documents, or reservations in projects where the user is not a member.
3. **Identity Document & Category Isolation:** Even within a project, viewing or downloading a file linked as `ProjectCustomer.IdentityDocumentStoredFileId` requires `customers.read` (in addition to `files.read`), preventing non-commercial/non-legal members (e.g., site engineers) from accessing buyer KYC identity files via `/api/projects/{id}/documents`; sales users without `files.read` can still update non-document contact fields without unlinking the file. Category scoping further isolates `Financial`, `Commercial`, `Engineering`/`Plans`, and `Legal`/`LandAndTitle` documents by `ProjectMember` capabilities.
4. **Audit Accountability & Verified Party Directory Denials:**
   - User, project, structure, document, customer, reservation, and Party directory authorization denials are written as `ACCESS_DENIED` security audit events before the operation is rejected.
   - Returning a non-null project estimated budget on list/detail reads writes `PROJECT_FINANCIALS_VIEWED`; denied budget updates write `ACCESS_DENIED`. Successful project create/update events remain `PROJECT_CREATED` / `PROJECT_UPDATED`.
   - **Resolved — PR #36:** `PartyDirectoryService.EnsurePermissionAsync` writes the denial audit through `IAuditWriter` before throwing `ForbiddenDomainException`. `UpdateIdentityAsync` captures `previousKind` before mutating the canonical Party. `ApplicationSecurityAndFoundationTests` covers `PartyDirectory_DeniedPermissionsAreSecurityAuditedBeforeRejecting` and `PartyDirectory_UpdateIdentityAudit_UsesOriginalKindBeforeMutation`; the project-customer denial path is also covered. This is not a remaining Phase 0 defect.
5. **Planned Future Role & Permission Scope (`PLANNED`):** Finance treasury approval (`FINANCE_OFFICER`), Chantier situation verification (`SITE_ENGINEER`), notarial contract verification (`LEGAL_OFFICER`), and SCF journal posting/period close will introduce dedicated permissions enforced strictly with SoD before Phases 2–4.


## P1-07 — Financial project-document read authorization

For every actor other than the single `SYSTEM_ADMIN`, listing and downloading a project document whose category is `Financial` requires an explicit project membership with `CanViewFinancials = true`. The `ProjectManager` project role does not bypass this read requirement. This is aligned with ADR-0011, which requires an explicit `CanViewFinancials` capability for financial project data.

This rule applies to read/list and download only. Existing upload authorization is unchanged, including the existing `ProjectManager` upload behavior. Customer identity-document (`KYC`) isolation remains a separate check requiring `customers.read`, and the `SYSTEM_ADMIN` behavior is unchanged.

When a list response omits Financial documents due to missing capability, the attempt is recorded as `ACCESS_DENIED` against the project. A direct download attempt returns `PROJECT_DOCUMENT_ACCESS_DENIED` and records `ACCESS_DENIED` against the stored file. The Vite-only preview applies the same rule and audit behavior; it remains a simulator, not production authorization evidence.


### P1-07 verification evidence

Implementation/test commit `4b04bd9dcf0dec806def7780a9d0b22d52d21878` is merged in [PR #87](https://github.com/younestech31/PROMO-GEST/pull/87) at main SHA `b41d34aae03e1549ca1963a23d92643ff91bf393`. Final PR head `8dc81b0bc74629d125c01f2549caec1370bd2ec1` passed PR CI [#766](https://github.com/younestech31/PROMO-GEST/actions/runs/44123351434) 3/3 (Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32, restore drill, frontend/static hosting and Windows publish). Post-merge main CI [#767](https://github.com/younestech31/PROMO-GEST/actions/runs/44123972890) also passed all 3 jobs on the exact merge SHA. This evidence does not establish manual installation/browser acceptance or production deployment.


## P1-18 — Mandatory temporary-password rotation (implementation pending verification)

The current implementation branch adds `MustChangePasswordAtNextLogin` and `PasswordChangeRequiredUntilUtc` to `users`. Accounts created through `UserManagementService.CreateEmployeeAsync` and accounts reset through `ResetEmployeePasswordAsync` receive a temporary credential deadline 24 hours in the future. Existing users are backfilled to `false` by the additive migration.

A temporary session receives no roles, permissions, or organization fiscal/contact data. `PasswordChangeRequiredMiddleware` rejects every API request except `GET /api/auth/me`, `GET /api/auth/csrf`, `POST /api/auth/change-password`, `POST /api/auth/logout`, and health checks; ordinary non-API GET routes are allowed only to serve the SPA shell. The change endpoint is CSRF-protected and rate-limited. It verifies the temporary password, applies the existing password policy, disallows reuse, rotates the SecurityStamp, revokes every session, writes a secret-free audit event, and requires fresh login.

**Truth boundary:** branch `security/p1-18-password-lifecycle`; PR and CI not yet opened. This is not a verified capability or release acceptance until PostgreSQL 18 migration/backfill and end-to-end tests, frontend strict checks/build, all 3 CI jobs, and exact post-merge main CI pass.
