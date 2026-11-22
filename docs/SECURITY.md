# PROMO GEST — Security Architecture

> **Canonical Reference Notice:** For the full verified 18-permission × 7-role matrix, `ProjectMember` resource scoping, and C2 audit/permission gaps, see [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md) and [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md).

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
   This executes `AdminRecoveryService`, revokes all prior admin sessions, and records `ADMIN_LOCAL_UNLOCK` / `ADMIN_LOCAL_PASSWORD_RECOVERY` in `audit_logs`. The CLI-only recovery modes intentionally skip Data Protection initialization, so a missing or damaged Linux certificate/key ring does not block database-backed administrator recovery; a valid local runtime database connection is still required.

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
- `DataProtection` keys are persisted locally (`Security:DataProtectionKeyDirectory`) so antiforgery tokens remain valid across server restarts. On Windows they are encrypted with machine-scope DPAPI (`ProtectKeysWithDpapi(protectToLocalMachine: true)`) so the virtual service account and local maintenance identity can read the same key ring; filesystem ACLs restrict the key directory to the service account, SYSTEM, and local Administrators. On Linux the local key ring is encrypted at rest with the configured PKCS#12 certificate (`Security:DataProtectionCertificatePath`), and its password is supplied through `PROMOGEST_DATA_PROTECTION_CERT_PASSWORD` in the protected service environment. Keep the certificate/private key and its password separately protected; the backup bundle includes the certificate file when it is stored inside the configured Data Protection key directory. File-system permissions remain an additional protection, not a replacement for certificate encryption. On Windows, the installer grants the application service write access only to document storage, the Data Protection key ring, and logs. Backup archives are restricted to `SYSTEM` and local Administrators; the application service identity has no access to the backup directory.
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
- `SecurityHeadersMiddleware` sets a same-origin CSP including `object-src 'none'` and `frame-ancestors 'none'`, plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Permissions-Policy`.
- Production enables HSTS only after `UseForwardedHeaders()` has restored the external scheme. Its initial policy is deliberately short (`max-age=86400`), with no subdomain expansion or preload; Development/preview does not emit HSTS. Increase the lifetime only after the internal HTTPS certificate and hostname lifecycle are confirmed stable.
- Kestrel applies an explicit 30,000,000-byte global request-body cap, a 15-second request-header timeout, and a two-minute keep-alive timeout. Project document upload keeps its stricter 26 MiB action-level limit, leaving a small outer allowance for multipart framing.

## 6. Data-at-Rest Protection — Deployment Requirement

- Production hosts must use full-volume encryption for the operating-system and every data-bearing volume that can contain PostgreSQL files, customer document storage, Data Protection keys, application configuration, logs, temporary work, exports, or local backups.
- Windows deployments use BitLocker; Linux deployments use LUKS2. Removable offsite media must be encrypted (for example, BitLocker To Go or LUKS2), and NAS targets must provide storage-side encryption at rest. Transport encryption alone does not satisfy this requirement.
- Recovery keys/passphrases must be held by the organization's independent recovery process, not only on the PROMO GEST host or beside encrypted backup media. A controlled reboot/unlock and post-unlock readiness check are required before acceptance.
- CMS-encrypted offsite backup artifacts remain a separate control; disk encryption does not replace backup encryption, retention, offsite replication, or restore drills.
- This is an installation acceptance requirement, not a claim that any customer host is already encrypted. Operators must record actual volume inventory and encryption evidence in the signed installation checklist. Full-volume encryption protects locked/offline media; it does not defend a running, unlocked host against malware or privileged compromise.
