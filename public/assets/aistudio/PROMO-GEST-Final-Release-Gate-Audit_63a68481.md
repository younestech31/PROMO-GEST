# PROMO GEST — Final Milestone 1 Release-Gate Audit

**Archive reviewed:** `promo-gest (2).zip`  
**Review type:** Independent source inspection of the uploaded archive  
**Files in archive:** 203 entries (including directories and AI Studio media); source/configuration review covered the application, tests, migrations, CI, installation, and backup/restore scripts.

## Decision

**Milestone 1 is NOT APPROVED for production installation and is NOT ready for Milestone 2.**

The archive contains meaningful improvements: explicit migration mode, Windows Service hosting, role separation in the SQL initialization script, DPAPI configuration, metadata clamping, a `Path.GetRelativePath` containment check, and a root npm lockfile. However, several release-blocking defects remain, and the verification report overstates what its source and CI currently demonstrate.

## Findings

### P0 — Migration mode does not actually select the migration-owner connection

`src/PromoGest.Api/Program.cs:99-105` calls `Database.MigrateAsync()` on the `AppDbContext` registered by `AddPromoGestInfrastructure`. That registration in `src/PromoGest.Infrastructure/DependencyInjection.cs` reads only `ConnectionStrings:DefaultConnection`.

The production template and `.env.example` configure `DefaultConnection` as `promogest_app`. The workflow sets `PROMOGEST_MIGRATE_DB_CONNECTION`, but no source file reads that variable. Consequently, running `--migrate` does not automatically use `promogest_owner`; it attempts migrations using the runtime connection unless an operator manually overrides the default connection string. The claimed separate migration identity is therefore not implemented as a first-class, safe path.

**Required:** introduce a separate migration connection/configuration path or a dedicated migrator executable. Ensure only that command can consume the owner credentials and that the Windows runtime service never receives them.

### P0 — PostgreSQL integration test fixture cannot run with the configured CI role

`tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs:28-32` assigns `PROMOGEST_TEST_DB_CONNECTION` to `_adminConnectionString`. The workflow sets that variable to the restricted `promogest_app` connection.

At lines 46-54, the fixture then executes `CREATE DATABASE` over that connection. `promogest_app` is explicitly created with `NOCREATEDB`, so this step is rejected by PostgreSQL.

The fixture also does not read `PROMOGEST_MIGRATE_DB_CONNECTION`, and the tests do not invoke the migration command. The workflow therefore does not currently demonstrate “migrations as owner, workflows as app role” as its step title claims.

**Required:** use a database provisioning identity to create isolated databases, apply migrations using `promogest_owner`, then run application workflows using a distinct `promogest_app` connection. Do not give the test/runtime role `CREATEDB` just to make the fixture pass.

### P0 — Third EF Core migration is not discoverable

`src/PromoGest.Infrastructure/Persistence/Migrations/20261113000003_SystemAdministratorInvariant.cs` has no corresponding `.Designer.cs` and contains neither `[DbContext(typeof(AppDbContext))]` nor `[Migration("20261113000003_SystemAdministratorInvariant")]` attributes.

The first two migrations have these attributes in their Designer files. EF Core discovers migrations through migration metadata; the third class as submitted is not registered as a normal EF migration. As a result, the PostgreSQL trigger intended to protect the only System Administrator may never be applied by `Database.Migrate()`.

**Required:** generate a valid EF migration Designer file (or correctly apply the required attributes and target model metadata), verify it appears in `dotnet ef migrations list`, and test the trigger after a fresh-database migration.

### P0 — Windows restore script references an undefined database dump path

`scripts/restore-promogest.ps1:35-38` invokes `pg_restore` with `$DbDumpPath`, but that variable is never defined in the restore script. It should resolve `database.dump` from `$BackupBundleDir` and verify that the file exists before invoking `pg_restore`.

The script also does not create or validate `$TargetDatabase` before restore. `pg_restore --clean --if-exists --dbname=...` restores into an existing database; it does not create the target database.

`docs/BACKUP-AND-RESTORE.md:25` instructs operators to create the verification database using `promogest_app`, which has no `CREATEDB` privilege under the intended role design.

**Required:** define and validate the dump path, provision the restore database through a documented maintenance identity, and make the documented command match the actual privileges.

### P1 — Linux backup drill is not consistent with the backup architecture

`scripts/verify-backup-restore.sh`:
- uses the invoking PostgreSQL identity for `dropdb` and `createdb`, while its usage comment recommends `promogest_app`;
- does not archive or restore the Data Protection key directory;
- verifies hashes but does not compare stored file byte lengths;
- labels its file verification a “spot-check” even though it loops through the rows;
- does not verify the restored file count against the database count.

The Windows backup path now includes a Data Protection archive, but the Linux path does not. The two paths do not provide equivalent recovery coverage.

**Required:** use separate maintenance credentials for database creation/restore, include the required key material according to the platform-specific key protection strategy, and check every file's existence, size, and SHA-256 plus expected count.

### P1 — Windows ACL hardening does not remove inherited broad permissions

`deploy/windows/install-service.ps1:30-37` uses `icacls /inheritance:d`. On Windows this disables inheritance while copying inherited ACEs to explicit ACEs; it does not remove inherited access entries. The script then adds the service account but does not explicitly remove broad `Users` / `Authenticated Users` permissions or establish a minimal allowlist for `SYSTEM`, `Administrators`, and the service identity.

**Required:** use a deliberate ACL reset/allowlist strategy (with safe administrative recovery) and verify the effective ACLs on the app/config, storage, Data Protection, backup, and log directories. Do not assume adding one restricted principal removes existing broad access.

### P1 — CI does not perform the checks its report claims

`.github/workflows/ci.yml` currently:
- does not run `npm test` in the frontend job;
- does not copy the frontend build into `src/PromoGest.Api/wwwroot` or verify the copied production SPA there;
- sets `PROMOGEST_MIGRATE_DB_CONNECTION` but the application/test fixture does not consume it;
- uses the restricted app connection as the integration fixture's database-creation connection;
- does not execute `dotnet publish` despite the job name “PowerShell Syntax & Publish Verification”;
- has no Windows runner for an actual Windows-targeted publish or service packaging check;
- invokes PowerShell `Parser.ParseFile` but does not inspect the returned parse-error collection, so syntax errors are not reliably turned into a failing step.

**Required:** make each claimed check an explicit fail-fast CI step, run frontend tests, perform the production static-asset copy verification, provision/test with distinct PostgreSQL roles, check parser errors, and add a Windows job for Windows-targeted publishing.

### P1 — Reproducible dependency installation is only partially applied

The root `package-lock.json` exists and CI uses `npm ci`, which is good. However:
- `scripts/build-production.sh:11` still uses `npm install`;
- `scripts/build-production.ps1` also uses `npm install`;
- an empty `bun.lock` remains in the archive.

**Required:** use `npm ci` in all clean build/release scripts and remove the unused empty Bun lockfile so there is only one package-manager contract.

### P1 — Administrator migration has no direct-SQL regression tests

The report claims direct-SQL PostgreSQL tests for demotion, deactivation, and deletion of the only administrator. No such test is present in `tests/` (search for the trigger/function and direct SQL operations finds none). The existing integration test only checks that insertion of a second flagged administrator violates the unique index.

This gap is compounded by the undiscoverable third migration above.

**Required:** after fixing migration discovery, test direct SQL UPDATE/DELETE attempts using `promogest_app`, assert SQLSTATE `42501`, and assert the administrator row remains active and flagged.

### P2 — Metadata tests do not cover UserSession clamping

The entity factory now clamps IP and User-Agent in both `AuditLog.Record` and `UserSession.Create`, which is a code-level improvement. However, `tests/PromoGest.Domain.Tests/DomainInvariantTests.cs:150-173` tests `AuditLog` only. There is no regression test for oversized metadata passed through `UserSession.Create` or for successful login with oversized headers, despite the report claiming those cases.

**Required:** add UserSession-specific tests and a successful-authentication integration test with oversized User-Agent/IP values.

### P2 — Storage path handling improved, but tests are missing

`LocalFileStorageService.cs` now uses `Path.GetRelativePath` and a root-with-separator boundary check. This is a material improvement over the previous plain-prefix check. However, no storage containment tests were found in the archive.

**Required:** add regression tests for `..` traversal, rooted paths, sibling-prefix paths such as `storage-evil`, alternate separators, and platform path semantics. Consider symlink/reparse-point behavior if local users can manipulate the storage tree.

### P2 — Documentation is stale and contradictory

`docs/DATABASE-DESIGN.md` still states that `promogest_app` owns the database and that the application runs migrations at startup. The current design instead distinguishes `promogest_owner` from `promogest_app` and requires an explicit migration mode. `docs/BACKUP-AND-RESTORE.md` still recommends creating the restore database as the restricted app role.

**Required:** align installation, database, CI, and backup documentation with the actual role/migration design.

## What is demonstrably improved in this archive

- Windows Service hosting integration is present (`UseWindowsService`, Event Log provider, base-directory content root).
- The Windows installer has an explicit `NetworkService` identity and grants service access to required folders, although ACL inheritance still needs correction.
- Root `package-lock.json` exists and CI uses `npm ci`.
- `Program.cs` has an explicit `--migrate` branch rather than unconditionally migrating during normal startup.
- `LocalFileStorageService` now includes `Path.GetRelativePath` containment validation.
- `AuditLog.Record` and `UserSession.Create` both clamp metadata lengths.
- DPAPI protection is configured for Windows Data Protection keys.
- The Windows backup script now archives the Data Protection key directory.

## Verification actually executed during this review

| Check | Result |
|---|---|
| ZIP opened and source files extracted | PASS |
| Source/configuration inspection | PASS |
| Migration metadata presence check | FAIL: migration 0003 has no discovered migration metadata |
| Integration fixture/CI role contract inspection | FAIL: app role is used to issue CREATE DATABASE |
| Restore script variable inspection | FAIL: `$DbDumpPath` is undefined |
| `npm ci --no-audit --no-fund` | NOT EXECUTED: command timed out before completion |
| .NET build/tests | NOT EXECUTED: `dotnet` SDK unavailable in review environment |
| PostgreSQL 18 tests | NOT EXECUTED: PostgreSQL/Docker unavailable |
| Windows service/PowerShell execution | NOT EXECUTED: Windows/PowerShell unavailable |

No claim is made that .NET, PostgreSQL, Windows Service, or backup restoration tests passed.

## Release decision

Do not approve Milestone 1 yet. Resolve the P0 findings first, then correct CI and backup/restore, and run the real PostgreSQL role-separated workflow. A successful frontend preview or TypeScript check is not sufficient evidence for a locally hosted multi-user ERP.
