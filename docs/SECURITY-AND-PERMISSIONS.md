# PROMO GEST — Security Architecture & Authorization Matrix

**Verified Against:** `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`, `src/PromoGest.Api/Middleware/`, `src/PromoGest.Api/Security/`, and `src/PromoGest.Application/Services/`.

---

## 1. Security-by-Design Foundation

| Control | Concrete Implementation | Verified Source |
|---|---|---|
| **Single System Administrator** | Enforced in Domain, `SetupService`, `UserManagementService`, and PostgreSQL partial unique index `ux_users_single_system_admin`. | `User.cs`, `DbContext`, `Application.Tests` |
| **Password Hashing & Lockout** | Argon2id (`Argon2PasswordHasher`); 5 consecutive failed logins trigger a 15-minute lockout (`FailedLoginAttempts`, `LockoutEndUtc`). | `AuthService.cs`, `Application.Tests` |
| **Zero Credential Enumeration** | Unknown username, wrong password, inactive user, and locked account all return a uniform `AUTH_INVALID_CREDENTIALS` error. | `AuthService.cs`, `Application.Tests` |
| **Opaque HTTP-Only Sessions** | 256-bit random session token stored only as SHA-256 hex in `user_sessions`; issued in `promogest.sid` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` configurable for HTTPS). No bearer tokens in `localStorage`. | `Sha256SessionTokenGenerator.cs`, `AuthController.cs` |
| **CSRF Protection** | `CsrfValidationMiddleware` enforces `X-CSRF-Token` header on all state-changing authenticated requests (`POST`, `PUT`, `PATCH`, `DELETE`). | `CsrfValidationMiddleware.cs` |
| **Security Headers & CSP** | `SecurityHeadersMiddleware` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and strict CSP (`default-src 'self'`, `frame-ancestors 'none'`). | `SecurityHeadersMiddleware.cs` |
| **Immutable Security Audit Log** | `audit_logs` protected by PostgreSQL `BEFORE UPDATE OR DELETE` trigger raising exception; failed audit writes propagate and abort operations. | `Migration #2`, `Application.Tests` |

---

## 2. Exact Seeded Permission × Role Matrix (18 Permissions × 7 Roles)

Verified directly from `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`:

| Permission Code | Module | `SYSTEM_ADMIN` | `PROJECT_DIRECTOR` | `COMMERCIAL_MANAGER` | `FINANCE_OFFICER` | `SITE_ENGINEER` | `LEGAL_OFFICER` | `VIEWER` |
|---|---|---|---|---|---|---|---|---|
| `org.read` | Organization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `org.manage` *(unused in API)* | Organization | ✓ | — | — | — | — | — | — |
| `users.read` | Administration | ✓ | — | — | — | — | — | — |
| `users.manage` | Administration | ✓ | — | — | — | — | — | — |
| `audit.read` | Security | ✓ | — | — | — | — | — | — |
| `projects.read` | Projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `projects.create` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.manage` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.access.manage` | Projects | ✓ | ✓ | — | — | — | — | — |
| `projects.structure.manage` *(not checked by service)* | Project Structure | ✓ | ✓ | — | — | — | — | — |
| `files.read` | Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `files.write` | Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `customers.read` | Customers | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `customers.manage` | Customers | ✓ | ✓ | ✓ | — | — | — | — |
| `sales.reservations.read` | Sales | ✓ | ✓ | ✓ | — | — | — | — |
| `sales.reservations.manage` | Sales | ✓ | ✓ | ✓ | — | — | — | — |
| `parties.directory.read` | Master Data | ✓ | ✓ | ✓ | — | — | — | — |
| `parties.identity.manage` | Master Data | ✓ | — | — | — | — | — | — |

> **Preview Parity Warning:** `apps/local-web/dev-api-middleware.ts` seeds only **12** of these 18 permissions (omitting the 6 Customers, Sales Reservations, and Party Master Data permissions).

---

## 3. Two-Layer Project Resource Scope (ADR-0006)

For all non-`SYSTEM_ADMIN` users, holding an organization role permission is **necessary but never sufficient** to access or mutate project-owned records:

```text
  Authorized Access = Active Authenticated Session
                    ∩ Global Role Permission
                    ∩ Explicit ProjectMember Row (for target ProjectId)
                    ∩ Required ProjectMember Role / Capability Flag
```

| Project Operation | Required Global Permission | Required `ProjectMember` Condition (non-Admin) |
|---|---|---|
| Read Project / Structure | `projects.read` | Any `ProjectMember` row |
| Create Project | `projects.create` | Auto-creates creator as `ProjectManager` member (`AllCapabilities`) |
| Update Project Details | `projects.manage` | `RoleInProject == ProjectManager` |
| Manage Project Team | `projects.access.manage` | `RoleInProject == ProjectManager` *(blocks removing last PM)* |
| Manage Buildings / Floors / Units | *(Note: `projects.structure.manage` not checked by service)* | `CanManageConstruction == true \|\| RoleInProject == ProjectManager` |
| Read Project Documents | `files.read` | Any `ProjectMember` row |
| Upload / Archive Documents | `files.write` | `CanManageDocuments == true \|\| RoleInProject == ProjectManager` |
| Read Customers & Interactions | `customers.read` | Any `ProjectMember` row |
| Create / Update Customers & Interactions | `customers.manage` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |
| Read Sales Reservations | `sales.reservations.read` | Any `ProjectMember` row |
| Create / Update / Cancel / Expire Reservations | `sales.reservations.manage` | `CanManageSales == true \|\| RoleInProject == ProjectManager` |

---

## 4. Segregation of Duties (SoD) & PII Isolation Boundaries

1. **System Administrator vs Business Operations:** `SYSTEM_ADMIN` manages technical setup, employees/roles, audit logs, and emergency access—never intended as a financial approver or commercial buyer manager; projects created by `SYSTEM_ADMIN` deliberately have no default business `ProjectManager` until explicitly assigned (`ADR-0006`).
2. **Party Search vs Project Confidential Data (`ADR-0009`):** `parties.directory.read` permits searching organization-wide canonical `Party` identities (`Id`, `Kind`, `DisplayName`, `ConcurrencyStamp`) when adding customers, **without** granting access to project-specific customer phones, notes, interactions, documents, or reservations in projects where the user is not a member.
3. **Audit Accountability & Known Gaps:**
   - All project, user, customer, and reservation denials record `ACCESS_DENIED` in `audit_logs`.
   - **Defect to Fix in Phase 0:** `PartyDirectoryService.EnsurePermission` currently throws `ForbiddenDomainException` without writing an `AuditLog` entry, and `PartyDirectoryService.UpdateIdentityAsync` logs the mutated `Kind` as `previousKind`.
4. **Future Finance / Accounting SoD (Modules G & J):** Sales agents (`COMMERCIAL_MANAGER`) creating reservations/contracts must remain separated from treasury receipt validation and SCF period closing (`FINANCE_OFFICER`), enforced before Phase 3A/4 rollout.
