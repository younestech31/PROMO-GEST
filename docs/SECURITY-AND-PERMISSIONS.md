# PROMO GEST — Security Architecture & Authorization Matrix

**Verified Against:** `src/PromoGest.Infrastructure/Security/SecurityServices.cs`, `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`, `src/PromoGest.Domain/Entities/RbacEntities.cs`, `src/PromoGest.Api/Middleware/ApiMiddleware.cs`, `src/PromoGest.Api/Security/SessionAuthenticationHandler.cs`, `src/PromoGest.Api/Controllers/AuthController.cs`, and `src/PromoGest.Application/Services/*.cs`.

---

## 1. Security-by-Design Foundation

| Control | Concrete Implementation | Verified Source |
|---|---|---|
| **Single System Administrator** | Enforced in Domain, `SetupService`, `UserManagementService`, and PostgreSQL partial unique index `ux_users_single_system_admin` (`WHERE is_system_administrator = true`). | `User.cs`, `UserConfiguration.cs`, `Application.Tests` |
| **Password Hashing & Lockout** | **`Pbkdf2PasswordHasher` (`PBKDF2-SHA512`, 310,000 iterations, random 16-byte salt, 32-byte hash, serialized format `PBKDF2-SHA512$<iterations>$<salt_b64>$<hash_b64>`)**; 5 consecutive failed logins trigger a 15-minute lockout (`FailedLoginAttempts`, `LockoutEndUtc`). *(Any future algorithm upgrade requires a standalone ADR guaranteeing legacy verification and transparent safe rehashing on login.)* | `SecurityServices.cs`, `AuthService.cs`, `Application.Tests` |
| **Zero Credential Enumeration** | Unknown username, wrong password, inactive user, and locked account all return a uniform `AUTH_INVALID_CREDENTIALS` error. | `AuthService.cs`, `Application.Tests` |
| **Opaque HTTP-Only Sessions** | 256-bit random session token (`CryptoSessionTokenGenerator`) stored only as SHA-256 hex in `user_sessions`; issued in **`promogest_session`** cookie (`HttpOnly`, `SameSite=Strict`, `Secure` configurable via `Security:RequireHttpsCookies`). No bearer tokens in `localStorage`. | `SecurityServices.cs`, `SessionAuthenticationHandler.cs`, `AuthController.cs` |
| **CSRF Protection** | `CsrfValidationMiddleware` enforces Antiforgery validation matching `.PromoGest.Antiforgery` cookie against `X-CSRF-TOKEN` header on **every** state-changing `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`, including login and first-run setup after fetching `GET /api/auth/csrf`). | `ApiMiddleware.cs`, `SessionAuthenticationHandler.cs` |
| **Security Headers & CSP** | `SecurityHeadersMiddleware` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and strict CSP (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`). | `ApiMiddleware.cs` |
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
| `projects.structure.manage` | Project Structure | ✓ | ✓ | — | — | — | — | — |
| `files.read` | Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
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
| `org.read` | Yes (all 7 roles) | **Not checked explicitly** (`/api/auth/me` exposes org summary to any authenticated session) | Seeded in `ROLE_PERMS` | Not checked separately | Seeded & available in preview; implicit via auth |
| `org.manage` | Yes (`SYSTEM_ADMIN`) | **None** (no update endpoint exists yet) | Seeded in `ROLE_PERMS` (unused) | None | **Seeded only — Planned for Phase 1** |
| `users.read` | Yes (`SYSTEM_ADMIN`) | **Not checked separately** (`UserManagementService` checks `users.manage` for `ListUsers` and `ListRoles`) | Seeded in `ROLE_PERMS` | None (`canManageUsers` checks `users.manage`) | **Seeded only / Superseded by `users.manage` in API** |
| `users.manage` | Yes (`SYSTEM_ADMIN`) | **Checked** in `UserManagementService.EnsureCanManageUsersAsync` | Yes (seeded & enforced) | `canManageUsers` | **Checked by API + Available in preview** |
| `audit.read` | Yes (`SYSTEM_ADMIN`) | **Checked** in `AuditQueryService.ListRecentAsync` | Yes (seeded & enforced) | `canViewAuditLogs` | **Checked by API + Available in preview** |
| `projects.read` | Yes (all 7 roles) | **Checked** in `ProjectStructureService`; `ProjectService` enforces explicit `ProjectMember` row (`ListForUserWithMembersAsync` / `GetMemberAsync`) | Seeded in `ROLE_PERMS` | Membership checked | **Partially checked by API** (Structure checks it; `ProjectService` relies on `ProjectMember`) |
| `projects.create` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.CreateProjectAsync` | Yes (seeded & enforced) | `canCreateProject` | **Checked by API + Available in preview** |
| `projects.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.UpdateProjectAsync` (+ `ProjectManager`) | Yes (seeded & enforced) | `canManageProjects` | **Checked by API + Available in preview** |
| `projects.access.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **Checked** in `ProjectService.EnsureCanManageProjectAccessAsync` (+ `ProjectManager`) | Yes (seeded & enforced) | `canManageProjectAccess` | **Checked by API + Available in preview** |
| `projects.structure.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`) | **NOT checked** (`ProjectStructureService` checks `ProjectMember.CanManageConstruction \|\| ProjectManager`) | Seeded in `ROLE_PERMS` (ignored) | `canManageProjectStructure` ignores it too | **Seeded only — Ignored by API/UI** (align in Phase 1) |
| `files.read` | Yes (all 7 roles) | **Checked** in `ProjectDocumentService` (`ListAsync`, `GetDownloadAsync`) & `ProjectCustomerService` (`ValidateIdentityDocumentAsync`, DTO visibility) | Seeded in `ROLE_PERMS` (**no `/documents` preview routes**) | `canReadProjectDocuments` | **Checked by API** *(Missing routes in preview)* |
| `files.write` | Yes (all except `VIEWER`) | **Checked** in `ProjectDocumentService.UploadAsync` (+ `CanManageDocuments`) | Seeded in `ROLE_PERMS` (**no `/documents` preview routes**) | `canUploadProjectDocuments` | **Checked by API** *(Missing routes in preview)* |
| `customers.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`, `LEGAL_OFFICER`) | **Checked** in `ProjectCustomerService` & `ProjectSalesReservationService` | **Missing from preview** (`ROLE_PERMS` & routes absent) | `canReadProjectCustomers` | **Checked by API** *(Missing in preview)* |
| `customers.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectCustomerService` (`CreateAsync`, `UpdateAsync`, `AddInteractionAsync`) | **Missing from preview** | `canManageProjectCustomers` | **Checked by API** *(Missing in preview)* |
| `sales.reservations.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectSalesReservationService` (requires `customers.read` as well) | **Missing from preview** | `canReadProjectSalesReservations` | **Checked by API** *(Missing in preview)* |
| `sales.reservations.manage` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `ProjectSalesReservationService` (`CreateAsync`, `CancelAsync`) | **Missing from preview** | `canManageProjectSalesReservations` | **Checked by API** *(Missing in preview)* |
| `parties.directory.read` | Yes (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`) | **Checked** in `PartyDirectoryService.SearchAsync` & `ProjectCustomerService.CreateAsync` (`PartyId` reuse) | **Missing from preview** | Direct check in `ProjectsAccessView.tsx` | **Checked by API** *(Missing in preview; PG18/App tests pending)* |
| `parties.identity.manage` | Yes (`SYSTEM_ADMIN` only) | **Checked** in `PartyDirectoryService.UpdateIdentityAsync` & `ProjectCustomerService.UpdateAsync` | **Missing from preview** | Direct check in `ProjectsAccessView.tsx` | **Checked by API** *(Missing in preview; no business role assigned yet)* |

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
| Read Project Summary | *(Enforced by member filter/lookup)* | Any `ProjectMember` row |
| Read Project Structure | `projects.read` | Any `ProjectMember` row |
| Create Project | `projects.create` | Auto-creates creator as `ProjectManager` member (all capabilities `true`) |
| Update Project Details | `projects.manage` | `RoleInProject == ProjectManager` |
| Manage Project Team | `projects.access.manage` | `RoleInProject == ProjectManager` *(blocks removing last PM)* |
| Manage Buildings / Floors / Units | *(`projects.structure.manage` not currently checked)* | `CanManageConstruction == true \|\| RoleInProject == ProjectManager` |
| Read Project Documents | `files.read` | Any `ProjectMember` row |
| Upload Project Documents | `files.write` | `CanManageDocuments == true` *(note: does not auto-pass on `ProjectManager` alone unless capability is enabled)* |
| Read Customers & Interactions | `customers.read` | Any `ProjectMember` row |
| Create / Update Customers & Interactions | `customers.manage` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |
| Read Sales Reservations | `sales.reservations.read` + `customers.read` | Any `ProjectMember` row |
| Create / Cancel Reservations | `sales.reservations.manage` + `sales.reservations.read` + `customers.read` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |

---

## 5. Segregation of Duties (SoD) & PII Isolation Boundaries

1. **System Administrator vs Business Operations:** `SYSTEM_ADMIN` manages technical setup, employees/roles, audit logs, and emergency access—never intended as a financial approver or commercial buyer manager; projects created by `SYSTEM_ADMIN` deliberately have no default business `ProjectManager` until explicitly assigned (`ADR-0006`).
2. **Party Search vs Project Confidential Data (`ADR-0009`):** `parties.directory.read` permits searching organization-wide canonical `Party` identities (`Id`, `Kind`, `DisplayName`, `ConcurrencyStamp`) when adding customers, **without** granting access to project-specific phones, emails, addresses, notes/interactions, identity documents, or reservations in projects where the user is not a member.
3. **Identity Document Isolation:** Even within a project, viewing or changing a customer's `identity_document_stored_file_id` requires `files.read`; sales users without `files.read` can still update non-document contact fields without unlinking the file.
4. **Audit Accountability & Known Gaps:**
   - All user, project, structure, document, customer, and reservation denials record `ACCESS_DENIED` in `audit_logs`.
   - **Defect to Fix in Phase 0:** `PartyDirectoryService.EnsurePermission` throws `ForbiddenDomainException` without writing an `ACCESS_DENIED` `AuditLog` entry, and `PartyDirectoryService.UpdateIdentityAsync` logs mutated `Kind` as `previousKind`.
5. **Planned Future Role & Permission Scope (`PLANNED`):** Finance treasury approval (`FINANCE_OFFICER`), Chantier situation verification (`SITE_ENGINEER`), notarial contract verification (`LEGAL_OFFICER`), and SCF journal posting/period close will introduce dedicated permissions enforced strictly with SoD before Phases 2–4.
