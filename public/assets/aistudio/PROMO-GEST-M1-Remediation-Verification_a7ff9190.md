# PROMO GEST — Milestone 1 Remediation Verification

**Review basis:** independent inspection of the uploaded `promo-gest (1).zip` archive (201 files, extracted for read-only review).

**Overall decision: NOT APPROVED for Milestone 2 or production installation.**

The archive does contain real changes: Windows Service hosting integration was added to the API project; Vite output paths now agree on `apps/local-web/dist`; a root `package-lock.json` exists; the audit trigger now includes `TRUNCATE`; and DPAPI protection is configured on Windows. However, multiple reported remediations are absent or incomplete in the actual source.

## Confirmed improvements

1. `src/PromoGest.Api/PromoGest.Api.csproj` references `Microsoft.Extensions.Hosting.WindowsServices` 10.0.0, and `Program.cs` calls `UseWindowsService()` and configures Event Log logging.
2. Root and app Vite configs both target `apps/local-web/dist`.
3. `package-lock.json` exists.
4. Migration `20261113000002_HardeningConstraintsAndAuditImmutability` installs a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger on `audit_logs`.
5. `Program.cs` calls `ProtectKeysWithDpapi()` on Windows.
6. The Windows restore script no longer contains the former `LIMIT 20` restriction and checks file existence, byte length, and SHA-256 for records it reads.

These are source-level observations, not proof that the corresponding runtime tests passed.

## Blocking findings

### P0 — Runtime database identity cannot apply migrations

**Evidence:** `src/PromoGest.Api/Program.cs`, lines 99–103, runs `dbContext.Database.MigrateAsync()` on every application start. `src/PromoGest.Api/appsettings.json` and `deploy/windows/appsettings.Production.template.json` configure `promogest_app` as `DefaultConnection`. But `deploy/postgresql/00-init-db.sql` grants `promogest_app` only `USAGE` on schema `public`, while `CREATE` is granted to `promogest_owner` only. The runtime account is deliberately not a schema owner.

**Impact:** a fresh install using the documented database setup cannot apply the first migration using the configured application account. The design also defeats the stated migration/runtime identity separation. The admin recovery CLI is reached only after the unconditional migration call, so it is also blocked if schema migration is pending and the runtime role lacks DDL privileges.

**Required correction:** remove production auto-migration from the runtime startup path. Provide an explicit, separately invoked migration/upgrade command or deployment step using a dedicated migration connection/identity. The Windows service must receive only the runtime connection string. Test both first install and upgrade with the actual runtime role after migrations have been applied.

### P0 — Windows service still runs under the default service identity

**Evidence:** `deploy/windows/install-service.ps1`, lines 28–40, calls `sc.exe create` without `obj=` / service-account configuration. It also contains no `icacls`, ACL, or equivalent permission setup for the application, storage, or Data Protection directories.

**Impact:** Windows creates the service under its default LocalSystem identity. The claimed least-privilege service identity and folder ACL hardening are not implemented in this script.

**Required correction:** configure an explicit virtual service account or dedicated restricted account, grant only necessary directory permissions, deny interactive access as appropriate, and verify the resulting service identity and ACLs on Windows. Also validate `sc.exe` exit codes and wait for service state transitions instead of assuming the service started after a two-second delay.

## High-priority findings

### P1 — Storage path containment is still vulnerable to prefix confusion

**Evidence:** `src/PromoGest.Infrastructure/Storage/LocalFileStorageService.cs`, lines 47–50 and 81–85, still uses `fullPath.StartsWith(_rootDirectory, StringComparison.OrdinalIgnoreCase)`.

**Impact:** a sibling path such as `C:\PromoGest\storage-evil\...` shares the textual prefix `C:\PromoGest\storage` and can pass this check. The report's claim that a `Path.GetRelativePath` containment check was implemented is false for this archive.

**Required correction:** resolve the root with a trailing directory separator, calculate `Path.GetRelativePath(root, candidate)`, and reject rooted results, `..`, and any relative path escaping the root. Add tests for sibling-prefix paths, rooted paths, traversal, mixed separators, and valid in-root paths.

### P1 — Session metadata is still persisted without clamping

**Evidence:** `SystemEntities.cs`, lines 175–195, assigns raw `ipAddress` and `userAgent` values in `UserSession.Create`. EF maps these fields to `varchar(64)` and `varchar(300)` in `SystemConfigurations.cs`. The domain test only verifies `AuditLog.Record` truncation, not session creation or login.

**Impact:** oversized request metadata can still cause a successful login's session insert to fail with PostgreSQL string-length error `22001`.

**Required correction:** normalize and clamp metadata centrally before constructing both audit and session entities; add real persistence/login tests for values above both column limits.

### P1 — The one-administrator database invariant remains incomplete

**Evidence:** the model has a partial unique index on `is_system_administrator = true`, which enforces **at most one** flagged administrator. `docs/SECURITY.md` itself describes the invariant as “at most one”. No database trigger or equivalent guard preventing direct SQL demotion, deactivation, or deletion of the sole admin was found in the migrations.

**Impact:** direct SQL or an overly privileged maintenance operation can leave an initialized installation with no active System Administrator. Application-level guards do not protect against direct database writes.

**Required correction:** introduce a durable installation-initialized marker and database enforcement preventing deletion, deactivation, or demotion of the only administrator after setup, while preserving a controlled local recovery path. Add direct-SQL PostgreSQL regression tests.

### P1 — Restore is configured to use a role that cannot create or restore a database

**Evidence:** `00-init-db.sql` sets `NOCREATEDB` on `promogest_app` and grants it only `USAGE` on schema `public`. Nevertheless:
- `scripts/restore-promogest.ps1` defaults `DatabaseUser` to `promogest_app` and invokes `pg_restore` with `--clean`.
- `docs/BACKUP-AND-RESTORE.md` instructs `createdb -U promogest_app ...`.
- `scripts/verify-backup-restore.sh` documents `PGUSER=promogest_app`, then calls `dropdb` and `createdb`.

**Impact:** the documented restore/verification flow cannot create the scratch database or recreate schema objects under the runtime role. This is a direct conflict with the new least-privilege database model.

**Required correction:** use a separate restore/maintenance identity with explicit permissions, keep its credentials out of the application service, and update both scripts and documentation. Test restoring into an empty scratch database using the actual documented procedure.

### P1 — The restricted runtime role is not tested by PostgreSQL CI

**Evidence:** `.github/workflows/ci.yml` initializes the PostgreSQL service with `POSTGRES_USER=promogest_test`. The integration fixture creates isolated databases using that same connection. The PostgreSQL container's initial user is the database superuser. Tests do not provision `promogest_owner` and `promogest_app` and do not connect using `promogest_app` to verify effective privileges.

**Impact:** the integration suite can pass while the production application's restricted role cannot start, seed, or perform required operations.

**Required correction:** add a role-provisioning integration test that applies migrations as the migration owner, then runs application startup and core workflows as `promogest_app`. Test audit INSERT allowed and UPDATE/DELETE/TRUNCATE/DDL/trigger alteration denied.

### P1 — Runtime default grants omit DELETE required by current code

**Evidence:** `00-init-db.sql` grants default `SELECT, INSERT, UPDATE` on tables but not `DELETE`. `EfRepositories.cs` removes existing user-role rows using `UserRoles.RemoveRange`.

**Impact:** employee role updates that delete/recreate role links can fail with permission denied when running as `promogest_app`.

**Required correction:** review every EF operation and grant only the specific DML privileges actually required per table. Prefer narrow explicit grants; do not add broad DDL or TRUNCATE privileges to solve this.

### P1 — Data Protection keys are not included in the backup archive

**Evidence:** `scripts/backup-promogest.ps1` archives the database, storage, sanitized app configuration, and Caddyfile. It does not archive `dataprotection-keys/`, and has no parameter for the key directory. The restore script has no step to restore that directory.

**Impact:** the report claims key material is included in backup/restore, but the archive code does not implement it. Restored installations will not retain the existing Data Protection key ring. DPAPI-protected keys are also machine-bound; cross-machine recovery needs an explicitly supported certificate/key migration procedure, not simply copying protected XML files.

**Required correction:** define and test the recovery policy. For same-machine restore, back up and restore the key directory with strict access controls. For new-machine recovery, use a supported certificate-based protection and secure certificate backup/recovery process, or explicitly document that sessions and tokens are invalidated and keys are regenerated. Do not claim cross-machine key recovery without a tested drill.

## Additional CI and verification gaps

1. `package-lock.json` exists, but CI and both production build scripts still use `npm install`, not `npm ci`. The archive also retains a zero-byte `bun.lock`. Remove the empty alternate lockfile and enforce one package manager/lockfile.
2. The CI grep check uses `if grep ... apps/local-web/dist; then`. If the directory is missing, `grep` exits with an error that is treated like “no match” by the `if`, so the check can silently pass. Assert the directory and `index.html` exist before scanning.
3. CI does not verify that built assets were copied into `src/PromoGest.Api/wwwroot`, does not run the production publish script, and has no Windows job for PowerShell/service publish checks.
4. `scripts/verify-backup-restore.sh` checks hashes but not restored byte lengths, despite the report claiming both. It also uses the runtime account for `dropdb`/`createdb` as described above.
5. The Windows restore script's `DatabaseUser` default is `promogest_app`, which cannot own or create the restored schema under the stated grants.
6. `build-production.sh` describes a self-contained publish but runs `dotnet publish` without an explicit runtime identifier or `--self-contained true`. The Windows script does specify `win-x64` and self-contained output; Linux publishing claims should be corrected or explicitly targeted.
7. The Service Worker only precaches `/manifest.webmanifest`; it does not precache `/index.html` or the required assets. Its navigation fallback to `caches.match('/index.html')` therefore has no guaranteed offline shell. Because the intended production UI is served by the local server, document this accurately: loss of internet is supported while the LAN server remains available; loss of the local server is not.
8. `npm ci --no-audit --no-fund` could not be completed in this review environment (command timed out while fetching dependencies). No `node_modules` were available afterward. The .NET SDK, Docker, and PowerShell are also unavailable here, so no .NET, PostgreSQL, Windows, or backup/restore runtime tests were independently executed.

## Verification status

| Area | Result |
|---|---|
| Source archive inspection | PASS — files inspected read-only |
| Windows Service API integration present | PASS — source presence only |
| Windows least-privilege service identity/ACL | FAIL — absent from installer |
| Frontend output path consistency | PASS — config/script paths agree |
| Reproducible CI install | FAIL — uses `npm install`; empty `bun.lock` retained |
| Runtime-vs-migration DB identity | FAIL — runtime still calls `MigrateAsync()` |
| Audit trigger includes TRUNCATE | PASS — migration source contains it |
| Actual role privilege enforcement tests | NOT EXECUTED / NOT IMPLEMENTED in CI |
| Data Protection DPAPI config | PASS — Windows code path present |
| Data Protection key backup/restore | FAIL — key directory not archived/restored |
| Full stored-file hash + size check (Windows) | PASS — source loops all DB rows and checks both |
| Full stored-file hash + size check (Linux) | FAIL — size check absent |
| Session metadata clamping | FAIL — raw assignment remains |
| Path traversal containment | FAIL — `StartsWith` remains |
| Exactly-one-admin DB enforcement | FAIL — only “at most one” index found |
| .NET build / PostgreSQL integration / Windows service / PowerShell execution | NOT EXECUTED in this review environment |

## Release gate

**Milestone 1 remains NOT APPROVED.** Do not start Milestone 2 and do not install this archive in a live organization until all P0/P1 items above are fixed and the following are demonstrated:

1. Fresh database provisioning with separate owner/runtime credentials.
2. Migration executed as migration identity, followed by application startup as `promogest_app` without DDL privileges.
3. Employee role change and core CRUD operations succeed with narrowly granted runtime permissions.
4. Windows service starts under a restricted service identity with verified ACLs.
5. Backup and restore succeeds using a separate maintenance identity and checks every file's size and hash.
6. Direct-SQL attempts to break audit immutability and the single-admin invariant are rejected under the runtime role.
7. CI passes from a clean checkout using `npm ci`, real PostgreSQL 18, and .NET 10.
