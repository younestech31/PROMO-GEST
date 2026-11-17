# PROMO GEST — Security Architecture & Authorization Matrix

**Verified Against:** `src/PromoGest.Infrastructure/Security/SecurityServices.cs`, `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`, `src/PromoGest.Domain/Entities/RbacEntities.cs`, `src/PromoGest.Api/Middleware/ApiMiddleware.cs`, `src/PromoGest.Api/Security/SessionAuthenticationHandler.cs`, `src/PromoGest.Api/Controllers/AuthController.cs`, and `src/PromoGest.Application/Services/*.cs`.

---

## 1. Security-by-Design Foundation

| Control | Concrete Implementation | Verified Source |
|---|---|---|
| **Single System Administrator** | Enforced in Domain, `SetupService`, `UserManagementService`, and PostgreSQL partial unique index `ux_users_single_system_admin` (`WHERE is_system_administrator = true`). | `User.cs`, `UserConfiguration.cs`, `Application.Tests` |
| **Setup Bootstrap Guard** | `POST /api/setup/initialize` allows execution only from loopback client IPs (`_environment.IsDevelopment()` when `RemoteIpAddress` is null) or with a constant-time verified `X-PROMOGEST-SETUP-TOKEN` (`Security:SetupBootstrapToken` / `PROMOGEST_SETUP_TOKEN`). `GET /api/setup/status` omits `initializedAtUtc` and reports `requiresBootstrapToken`. | `SetupController.cs`, `PostgresEndToEndTests.cs` |
| **Password Policy, Hashing & Lockout** | `PasswordPolicyValidator` enforces length `12..128` (`MaximumLength = 128`); `AuthService.LoginAsync` rejects passwords `> 128` chars before hashing to prevent CPU DoS. **`Pbkdf2PasswordHasher` (`PBKDF2-SHA512`, 310,000 iterations, random 16-byte salt, 32-byte hash, serialized format `PBKDF2-SHA512$<iterations>$<salt_b64>$<hash_b64>`)**; 5 consecutive failed logins trigger a 15-minute lockout (`FailedLoginAttempts`, `LockoutEndUtc`), and stale counters reset after lockout expiry so a user always gets 5 fresh attempts after expiry. | `PasswordPolicyValidator.cs`, `User.cs`, `SecurityServices.cs`, `AuthService.cs`, `DomainInvariantTests.cs`, `Application.Tests` |
| **Zero Credential Enumeration** | Unknown username, wrong password, inactive user, and locked account all return a uniform `AUTH_INVALID_CREDENTIALS` error. | `AuthService.cs`, `Application.Tests` |
| **Opaque HTTP-Only Sessions** | 256-bit random session token (`CryptoSessionTokenGenerator`) stored only as SHA-256 hex in `user_sessions`; issued in **`promogest_session`** cookie (`HttpOnly`, `SameSite=Strict`, `Secure` configurable via `Security:RequireHttpsCookies`). No bearer tokens in `localStorage`. | `SecurityServices.cs`, `SessionAuthenticationHandler.cs`, `AuthController.cs` |
| **CSRF Protection** | `CsrfValidationMiddleware` enforces Antiforgery validation matching `.PromoGest.Antiforgery` cookie against `X-CSRF-TOKEN` header on **every** state-changing `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`, including login and first-run setup after fetching the intentionally `[AllowAnonymous]` bootstrap endpoint `GET /api/auth/csrf`). | `ApiMiddleware.cs`, `AuthController.cs`, `SessionAuthenticationHandler.cs` |
| **Security Headers & CSP** | `SecurityHeadersMiddleware` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and strict CSP (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`). | `ApiMiddleware.cs` |
| **Sensitive Response Cache & Health Exposure Policy** | Every `/api` and `/health` response receives `Cache-Control: no-store` centrally, including success, error/fallback, and CSRF-rejection responses. `/health/live` and `/health/ready` suppress `environmentMode` (`null`) outside `Development`. Static SPA routes and assets are excluded and retain their existing cache behavior. | `SecurityHeadersMiddleware`, `HealthChecks`, `SecurityHeadersMiddlewareTests.cs`, `PostgresEndToEndTests.cs` |
| **Development Preview Cookie Guard** | `DevelopmentPreviewCookiePolicy` activates **only** when `IsDevelopment()` AND request arrives from an HTTPS preview proxy (`*.run.app` or forwarded `https://`), emitting `SameSite=None; Secure; Partitioned`; Production & localhost HTTP remain untouched (`SameSite=Strict`). | `DevelopmentPreviewCookiePolicy.cs`, `Program.cs` |
| **Immutable Security Audit Log** | `audit_logs` protected by PostgreSQL `BEFORE UPDATE OR DELETE` trigger (`prevent_audit_log_mutation`); failed audit writes propagate and abort operations. | `Migration #2`, `Application.Tests` |

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
| `org.manage` | Yes (`SYSTEM_ADMIN`) | **Checked** in `OrganizationProfileService.UpdateAsync` (`PUT /api/organization`, writes `ACCESS_DENIED` on failure) and `AuthService.BuildSessionResponse` (gates `ConcurrencyStamp`) | Seeded in `ROLE_PERMS` | `canManageOrganization` (`OrganizationProfileView.tsx`) | **Checked by API + UI** |
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
| Manage Project Team | `projects.access.manage` | `RoleInProject == ProjectManager` *(blocks removing last PM)* |
| Manage Buildings / Floors / Units | `projects.structure.manage` | `CanManageConstruction == true \|\| RoleInProject == ProjectManager` |
| Read Project Documents | `files.read` *(plus `customers.read` for customer identity documents)* | Any `ProjectMember` row + category capability check (`Financial` -> `CanViewFinancials`, `Commercial` -> `CanManageSales`, `Engineering`/`Plans` -> `CanManageConstruction \|\| CanManageDocuments`, `Legal`/`LandAndTitle` -> `CanManageDocuments`; `ProjectManager` bypasses category cap except customer identity PII isolation) |
| Upload Project Documents | `files.write` | `CanManageDocuments == true` + category capability check (`Financial` -> `CanViewFinancials`, `Commercial` -> `CanManageSales`, `Engineering`/`Plans` -> `CanManageConstruction`, `Legal`/`LandAndTitle` -> `CanManageDocuments`; `ProjectManager` bypasses category cap) |
| Read Customers & Interactions | `customers.read` | Any `ProjectMember` row |
| Create / Update Customers & Interactions | `customers.manage` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |
| Read Sales Reservations | `sales.reservations.read` + `customers.read` | Any `ProjectMember` row |
| Create / Cancel Reservations | `sales.reservations.manage` + `sales.reservations.read` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |

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

Implementation and regression-test commit: `4b04bd9dcf0dec806def7780a9d0b22d52d21878`, in [PR #87](https://github.com/younestech31/PROMO-GEST/pull/87). CI [#763](https://github.com/younestech31/PROMO-GEST/actions/runs/44122602882) passed all 3 jobs on that exact commit: Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32, Linux publish, full database/storage/Data Protection restore drill, Windows x64 publish and PowerShell validation. The PR-triggered workflow for the same SHA is being checked separately. This evidence does not establish manual installation/browser acceptance or production deployment.
