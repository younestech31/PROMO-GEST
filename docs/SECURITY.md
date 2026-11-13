# PROMO GEST — Security Architecture

## 1. Single System Administrator Enforcement & Recovery
PROMO GEST enforces **at most one System Administrator per installation** at three layers:
1. **PostgreSQL 18 database level**: Partial unique index `ux_users_single_system_admin` on `users (is_system_administrator) WHERE is_system_administrator = true`. Any attempt to insert a second System Administrator fails with PostgreSQL `23505` unique violation.
2. **Application service level**:
   - `SetupService.InitializeAsync` executes inside an `IsolationLevel.Serializable` transaction (`_dbContext.ChangeTracker.Clear()` on retry) and returns `409 Conflict` (`SETUP_ALREADY_INITIALIZED`) if already initialized or on concurrent unique/serialization conflict.
   - `UserManagementService` blocks creating or promoting any user with `SYSTEM_ADMIN`, and blocks non-SystemAdmin callers from modifying or resetting the System Administrator (`CANNOT_MODIFY_SYSTEM_ADMIN`).
   - `User.SetActiveStatus` prevents deactivating the single System Administrator (`CANNOT_DEACTIVATE_SYSTEM_ADMIN`).
3. **Frontend UI**: Employee creation and editing forms exclude `SYSTEM_ADMIN` from assignable roles and do not render a deactivate button for the System Administrator.
4. **Local Server-Console-Only Admin Recovery**: If the single System Administrator is locked out or loses their password, recovery is **never** exposed over HTTP. An OS administrator with physical/console access to the local server runs:
   - `PromoGest.Api.exe --unlock-admin`
   - `PromoGest.Api.exe --reset-admin-password` (reads new password from `--password-env <VAR>` or interactive masked console input)
   This executes `AdminRecoveryService`, revokes all prior admin sessions, and records `ADMIN_LOCAL_UNLOCK` / `ADMIN_LOCAL_PASSWORD_RECOVERY` in `audit_logs`.

## 2. Password, Session & Timing-Safe Authentication Security
- **Zero hard-coded credentials**: No default admin account exists prior to running the First-Run Installation Wizard.
- **Password policy**: Minimum 10 characters with uppercase, lowercase, and numeric characters (`PasswordPolicyValidator`).
- **Password hashing**: `PBKDF2-SHA512` with 310,000 iterations, random 16-byte cryptographic salt per password, and constant-time comparison (`CryptographicOperations.FixedTimeEquals`).
- **Generic login errors & anti-enumeration**: `AuthService.LoginAsync` returns `401 AUTH_INVALID_CREDENTIALS` for unknown accounts, bad passwords, deactivated accounts, and locked accounts alike, performing a dummy PBKDF2 verification when no user exists to mitigate timing side-channels. Exact failure reasons (`AUTH_LOGIN_FAILED`, `AUTH_LOGIN_BLOCKED_INACTIVE`, `AUTH_LOGIN_BLOCKED_LOCKED`, `AUTH_LOCKOUT`) are recorded in `audit_logs`.
- **HTTP-only session cookies**: `promogest_session` uses `HttpOnly = true`, `SameSite = SameSiteMode.Strict`, and `Secure = true` when `Security:RequireHttpsCookies` is enabled (behind Caddy TLS termination with `UseForwardedHeaders`).
- **Immediate revocation**: Deactivating an account or resetting its password rotates `User.SecurityStamp` and revokes all active `user_sessions`.
- **Session touch throttling**: `UserSession.Touch` updates `last_seen_at_utc` at most once per minute to avoid write contention during concurrent read requests.

## 3. CSRF Protection (`SameSite=Strict` + ASP.NET Core Antiforgery)
`SameSite=Strict` alone is insufficient on local LAN deployments where multiple ports or sibling local services may share the same host/site boundary. Therefore:
- ASP.NET Core Antiforgery (`IAntiforgery`) is configured with `.PromoGest.Antiforgery` (`HttpOnly = true`, `SameSite = Strict`), paired with the `promogest_csrf` cookie and `X-CSRF-TOKEN` header.
- `DataProtection` keys are persisted locally (`Security:DataProtectionKeyDirectory`) so antiforgery tokens remain valid across server restarts.
- `CsrfValidationMiddleware` validates `X-CSRF-TOKEN` on **every** state-changing `/api/*` request (`POST`, `PUT`, `PATCH`, `DELETE`), rejecting missing/invalid tokens with `403 CSRF_TOKEN_INVALID`.
- `AuthController` rotates CSRF tokens whenever authentication state changes (`login` / `logout`).

## 4. Server-Side Authorization, IDOR Prevention & Audit Immutability
- All protected endpoints verify `actor.IsActive` server-side before evaluating permissions.
- Every project query filters by `ProjectMembers` for non-admin employees. Non-admin access to `GET /api/projects/{projectId}` verifies membership first and returns `403 Forbidden` (`PROJECT_ACCESS_DENIED`) even for non-existent UUIDs, preventing project ID probing.
- Every authorization failure records an `ACCESS_DENIED` entry in `audit_logs`.
- Audit records sanitize CR/LF characters and truncate oversized headers (e.g., `User-Agent`) to column limits so logging never fails with SQL `22001`.
- Audit immutability is enforced in EF Core (`AppDbContext.SaveChangesAsync` rejects `Modified`/`Deleted` entries), by the PostgreSQL `trg_audit_logs_immutable` trigger, and by the runtime role's table ACL. The `promogest_app` role receives only `SELECT` and `INSERT` on `audit_logs`; `UPDATE`, `DELETE`, `TRUNCATE`, and `TRIGGER` are explicitly revoked by migration `20261113000004_AuditLogRuntimePermissions`.

## 5. HTTP Security Headers & Reverse Proxy Trust
- `UseForwardedHeaders()` trusts only loopback reverse proxies (`127.0.0.1`, `::1`) for `X-Forwarded-For` and `X-Forwarded-Proto` with `ForwardLimit = 1`.
- `SecurityHeadersMiddleware` sets strict `'self'` CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Permissions-Policy`.
