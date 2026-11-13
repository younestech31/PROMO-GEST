# PROMO GEST — Independent Milestone 1 Source Audit

**Audit date:** 13 November 2026  
**Input reviewed:** `promo-gest.zip` (130 files)  
**Scope:** Source-level inspection of frontend/build configuration, ASP.NET Core startup and security, EF Core/PostgreSQL model and migrations, Windows deployment, storage, and backup/restore scripts.

## Executive decision

**Milestone 1 is not yet approved for production deployment, and Milestone 2 should not start yet.** The architecture is directionally sound and the source contains substantial implementation work. However, the uploaded archive still has concrete deployment, backup, and security-hardening defects. The .NET/PostgreSQL runtime was not executable in this audit environment, so no C# build, migration, PostgreSQL integration test, Windows service test, or restore drill is claimed as passed.

## Findings

### P0 — Windows Service deployment is not correctly configured

**Evidence**
- `src/PromoGest.Api/PromoGest.Api.csproj` does not reference `Microsoft.Extensions.Hosting.WindowsServices`.
- `src/PromoGest.Api/Program.cs` uses `WebApplication.CreateBuilder(args)` but does not call `builder.Host.UseWindowsService()` or `builder.Services.AddWindowsService()`.
- `deploy/windows/install-service.ps1` registers the EXE directly with `sc.exe create`.

**Impact**
The project has not configured the ASP.NET Core host for Windows Service lifetime. The service host also needs a reliable content root when launched by SCM; Windows Services commonly start with a working directory such as `C:\Windows\System32`, so relative settings and `wwwroot` resolution can break. The current installation instructions therefore describe a deployment path that is not proven and is likely not to start correctly as a service.

**Required correction**
Add the supported Windows Services hosting package, configure Windows Service lifetime, set the service content root to `AppContext.BaseDirectory`, configure Event Log logging, and test install/start/stop/restart on a real Windows Server/Windows 11 host. Official Microsoft guidance: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/windows-service?view=aspnetcore-10.0

### P1 — Frontend output directory mismatch breaks the production build script

**Evidence**
- Root `vite.config.ts` sets `root` to `apps/local-web`, but `build.outDir` to the repository-root `dist` (`vite.config.ts`, lines 15–26).
- Root `package.json` runs `vite build` for `npm run build`.
- `scripts/build-production.sh` and `.ps1` copy from `apps/local-web/dist` after running the root build (`scripts/build-production.sh`, lines 9–18; analogous lines in `.ps1`).
- CI scans `apps/local-web/dist` (`.github/workflows/ci.yml`, lines 21–27), not the actual root `dist`.

**Impact**
The production script builds to `<repo>/dist` and then tries to copy from `<repo>/apps/local-web/dist`. On a clean checkout that source directory does not exist, so the production artifact build fails at the copy step. The CI leak-check also scans the wrong location; because the `grep` command is inside an `if`, a missing directory can result in the check being silently skipped rather than failing.

**Required correction**
Choose one output directory and use it consistently. Either build with `apps/local-web/vite.config.ts` so output is `apps/local-web/dist`, or copy from root `dist`. Make CI assert the directory exists before scanning it, and verify the actual compiled assets are copied to `src/PromoGest.Api/wwwroot` before `dotnet publish`.

### P1 — Audit log immutability is not complete at the database privilege boundary

**Evidence**
- Migration `20261113000002_HardeningConstraintsAndAuditImmutability.cs` creates a trigger only for `BEFORE UPDATE OR DELETE`.
- It does not create a `BEFORE TRUNCATE` trigger.
- `deploy/postgresql/00-init-db.sql` creates the application login as database owner (`OWNER = promogest_app`) and grants it all privileges on the database and schema.
- The application runs EF migrations at startup in `src/PromoGest.Api/Program.cs`, using the same configured connection.

**Impact**
The trigger blocks ordinary UPDATE/DELETE statements, but not TRUNCATE. More importantly, the runtime database identity owns the database/schema and can alter or disable its own trigger. This is not a strong append-only boundary against compromise of the application's database credentials.

**Required correction**
Separate migration/owner credentials from the runtime application role. Runtime should have only the DML permissions it needs, and no schema ownership, DDL, trigger-management, or TRUNCATE privileges. Add a TRUNCATE-protection mechanism where appropriate and test using the actual restricted runtime role, not the owner role.

### P1 — Data Protection key ring is persisted without at-rest encryption

**Evidence**
- `src/PromoGest.Api/Program.cs` calls `PersistKeysToFileSystem(...)` but does not configure `ProtectKeysWithDpapi`, certificate protection, or another at-rest key-encryption mechanism.
- The Windows installer creates a dedicated key folder but does not set an explicit restrictive ACL.
- The backup script does not include the Data Protection key directory.

**Impact**
Microsoft documents that explicitly choosing a key persistence location disables the automatic key-at-rest protection mechanism unless an explicit protector is configured. The keys are part of the trust boundary for antiforgery protection and other future Data Protection payloads.

**Required correction**
Configure platform-appropriate key encryption (for Windows, DPAPI or a controlled X.509 certificate; for Linux, a protected certificate/key mechanism), restrict folder ACLs to the service identity and administrators, and document secure key backup/restore and machine-recovery behavior. Official guidance: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-encryption-at-rest?view=aspnetcore-10.0

### P2 — Windows restore verifies only 20 stored files

**Evidence**
- `scripts/restore-promogest.ps1`, lines 62–76, uses `SELECT ... FROM stored_files LIMIT 20` before checking restored file hashes.
- `docs/BACKUP-AND-RESTORE.md` states that restore verifies files referenced in `stored_files`, without noting a 20-file limit.

**Impact**
A backup containing hundreds or thousands of contracts and attachments can pass the Windows restore verification while later files are missing or corrupted.

**Required correction**
Remove the `LIMIT 20`, check every row, compare the number of restored files with the expected file count, fail on missing files or checksum mismatch, and ensure the script handles zero files safely.

### P2 — Successful login still stores an unbounded User-Agent in a 300-character column

**Evidence**
- `AuditLog.Record` truncates User-Agent to 300 characters (`src/PromoGest.Domain/Entities/SystemEntities.cs`, lines 42–50).
- `UserSession.Create` stores the raw `userAgent` without truncation (`SystemEntities.cs`, lines 175–195).
- EF config limits `user_sessions.user_agent` to 300 (`src/PromoGest.Infrastructure/Persistence/Configurations/SystemConfigurations.cs`, lines 90–105).
- `AuthService.LoginAsync` passes the raw request User-Agent into `UserSession.Create`.

**Impact**
A login request with a User-Agent longer than 300 characters can still fail persistence with a PostgreSQL string-length error, despite the report claiming that oversized User-Agent values were clamped.

**Required correction**
Normalize and clamp request metadata once before it reaches either audit or session entities; add an integration test using a User-Agent longer than 300 characters.

### P2 — The database guarantees at most one System Administrator, not exactly one active administrator

**Evidence**
- `ux_users_single_system_admin` is a partial unique index for `is_system_administrator = true`.
- `User.SetActiveStatus` prevents application-level deactivation of the System Administrator.
- There is no database-level check/trigger in the inspected migrations preventing direct SQL deactivation or deletion of the only System Administrator.

**Impact**
The partial index prevents a second flagged administrator, but does not by itself guarantee at least one exists or that the one present is active. The report's wording “exactly one active System Administrator” overstates what the database currently enforces.

**Required correction**
Keep the application invariant and add database-level protection against deleting or deactivating the flagged administrator after initialization. Add tests that attempt direct SQL deletion/deactivation. Document the emergency recovery path and ensure it can recover an inactive or locked account safely.

### P2 — File path containment check is vulnerable to sibling-prefix paths

**Evidence**
- `LocalFileStorageService.SaveAsync` and `ResolveSafeFullPath` use `combined.StartsWith(_rootDirectory, StringComparison.OrdinalIgnoreCase)`.

**Impact**
A root such as `C:\PromoGest\storage` is a string prefix of `C:\PromoGest\storage-escape`; a path that resolves to a sibling with the same prefix may pass this check. Current stored relative paths are generated internally, but resolution should remain safe even if a persisted path is malformed or tampered with.

**Required correction**
Use `Path.GetRelativePath` and reject rooted paths, `..` traversal segments, and any result that escapes the root. Add cross-platform tests for sibling-prefix and traversal cases.

### P2 — Service Worker does not actually cache the HTML shell used by its offline fallback

**Evidence**
- `apps/local-web/public/sw.js` pre-caches only `/manifest.webmanifest`.
- Navigation fallback attempts `caches.match('/index.html')`, but this file is not added to the cache and navigation responses are not stored.

**Impact**
The documented offline shell fallback can return no cached response when the server is unreachable. Normal operation without internet is still possible while the organization's local server and LAN are running; this finding concerns the stated PWA fallback, not the local-first database architecture.

**Required correction**
Either implement a tested precache/update strategy for the HTML shell and its referenced assets, or remove the claim that the service worker can serve the shell while offline. Do not cache `/api/*` or `/health/*` responses.

### P2 — Frontend dependency resolution is not reproducible in CI

**Evidence**
- `bun.lock` exists.
- `package-lock.json` does not exist in the archive.
- CI uses `npm install`, which does not use `bun.lock` as its npm lockfile.

**Impact**
The CI build can resolve different package versions over time within semver ranges, making rebuilds non-reproducible.

**Required correction**
Choose one package manager. If npm, commit `package-lock.json` and use `npm ci`. If Bun, pin Bun in CI and use `bun install --frozen-lockfile` consistently.

### P3 — AI Studio template environment example remains in the repository

**Evidence**
- `.env.example` still describes `GEMINI_API_KEY` and an `APP_URL` associated with a Cloud Run URL.
- No actual source-code references to Firebase, Firestore, Supabase, Gemini API, or Cloud Run were found in the application code inspected.

**Impact**
This appears to be unused AI Studio starter-template residue and may confuse operators about production secrets or imply a cloud runtime dependency.

**Required correction**
Remove the unused template variables or replace the file with only the local deployment variables actually consumed by PROMO GEST.

## Verification performed in this audit

- ZIP extracted successfully; 130 files were present.
- Source-level inspection completed for the areas listed above.
- The output-directory mismatch was verified by comparing the Vite `outDir` with the build scripts and CI target paths.
- The CI shell check was tested against a missing directory; the `if grep ...; then` construct can silently skip the check.
- The local audit environment did not contain the .NET SDK or Docker.
- `npm install` was attempted but did not complete within the available command timeout; no frontend tests or builds are claimed as independently executed here.

## Required gate before Milestone 2

1. Fix all P0 and P1 findings.
2. Fix P2 findings affecting integrity, deployment, and security.
3. Run .NET 10 build and all unit tests.
4. Run migrations and integration tests against a real PostgreSQL 18 instance.
5. Run CI and verify its logs and exit statuses.
6. Publish and install the self-contained Windows service on a Windows test host.
7. Execute a full backup and restore drill covering every stored file and Data Protection key recovery.
8. Only then approve Milestone 1 and begin the next business module.
