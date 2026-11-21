## Latest verified implementation baseline — 21 November 2026

- **Latest code-bearing merge:** PR #186 at `07cba896eec07bb28878d948a6cfb905313a2b22`; this is the implementation baseline for the Project aggregate-root concurrency fix. Subsequent PRs #187 and #188 were documentation-only and did not change executable code, tests, migrations, or schema.
- **PR #186 exact-head verification:** CI #44909430011 and #44909433367 passed all three jobs; CodeQL #44909433309 passed C# and JavaScript/TypeScript on PR head `405cd8c3f8169043ce18315391cc4dfbcb1b2f11`.
- **Latest recorded main-tree verification snapshot:** CI #44912565314 passed all three jobs and CodeQL #44912565267 passed C# and JavaScript/TypeScript on exact snapshot SHA `e6290cab7e784d7e83ef3c0108a2d74468ec3487`. This is dated verification evidence, not a claim that this SHA remains the live `main` branch tip.
- **Branch-tip rule:** this document intentionally does not pin a “current main” SHA. Before branching, merging, or reporting repository state, resolve the live `main` ref directly in GitHub. Documentation-only merges can advance that ref without changing the code-bearing baseline.
- **P1-15:** implementation and deterministic PostgreSQL 18 race coverage are merged. Keep capability `IMPLEMENTED_NOT_VERIFIED` and task In Review / Pending until the required manual Arabic RTL / French LTR acceptance is recorded; CI does not replace practitioner/operator acceptance.
- **P1-01 remains the Phase 1 gate:** all 1,541 practitioner sign-offs remain PENDING; decision book remains 1,540 PENDING + W30-R007 NEEDS_EVIDENCE; no commune records imported (`communesCount = 0`); P1-01 In Progress / Pending and P1-02 Blocked. No phase advancement or legal approval is inferred from CI.
- **Security boundary:** GitHub `main` branch protection and required status checks were observed disabled; this was not changed. No production data, live database, authorization policy, roles, permissions, or Cloud SQL business data were changed.
---

# PROMO GEST — Quality & Release Acceptance Gates

**Rule:** No module, refactor, or Phase transition is accepted unless **all 10 gates below** pass with objective command output, verified artifacts, and strict adherence to [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md).

---

## 1. Per-Module Engineering Gates (Mandatory for All PRs & Phases)

| Gate | Requirement | Concrete Verification Evidence |
|---|---|---|
| **G1. Domain Invariants** | Pure business rules, state transitions, DZD/Wilaya/fiscal validations live in `PromoGest.Domain`. | Unit tests in `PromoGest.Domain.Tests` covering valid boundaries AND rejection paths. |
| **G2. Relational & DB Integrity** | Critical uniqueness, check constraints, FKs, and append-only triggers enforced in EF migration + PostgreSQL 18. | Fresh `dotnet ef migrations` + `AppDbContextModelSnapshot.cs` parity + PG18 constraint trigger tests. |
| **G3. Authorization & Scope** | Every endpoint enforces `[Authorize]`, required global role permission, **and** explicit `ProjectMember` + capability scope (`ADR-0006`). | Tests for: (a) unauthenticated `401`, (b) missing global permission `403`, (c) non-member with global role `403`, (d) revoked member immediate `403`, (e) positive authorized member `200`/`201`. |
| **G4. CSRF, Error Contract & Response Privacy** | Unsafe `/api/*` methods validate `X-CSRF-TOKEN`; errors map cleanly to `ApiErrorResponse` (`400/401/403/404/409`) without stack traces; all `/api` and `/health` responses carry `Cache-Control: no-store`. | API integration assertions on CSRF missing/invalid (`403` `CSRF_TOKEN_INVALID`) and structured error JSON; direct middleware tests for path matching/static exclusions/near misses; PostgreSQL 18 `WebApplicationFactory` assertions that successful API/health, fallback 404, and CSRF 403 responses contain the parsed `NoStore` directive. |
| **G5. Optimistic Concurrency** | Mutable aggregates reject stale `ConcurrencyStamp` / `ExpectedConcurrencyStamp` with `409` before applying edits. | Stale-token test + dual-request race test yielding single winner (`ADR-0008`). |
| **G6. Immutable Audit Logging** | Sensitive reads (directory search, audit view), mutations, and authorization denials write `AuditLog`; failed audit aborts operation. | Test verifying audit row creation + failure propagation when audit write throws. |
| **G7. PostgreSQL 18 E2E Integration** | Real `WebApplicationFactory` + PostgreSQL 18 migrations running under least-privilege `promogest_app`. | `PromoGest.IntegrationTests` passing cleanly in CI (`postgres:18-alpine`) and local Docker PG18 where available. |
| **G8. Frontend TypeScript, Preview & Pure Tests** | Zero `tsc --noEmit` errors, bilingual `ar` (RTL) + `fr` (LTR) UI validation, preview middleware parity, zero dev-preview leaks in production `wwwroot`. | `npm run lint`, `npm test`, `npm run build`, `npm run build:aspnetcore`, plus browser RTL/LTR inspection. |
| **G9. Regression Shield** | Existing Setup, Auth, Lockout, Single-SysAdmin, Projects, Structure, Docs, Customers, Reservations suites remain 100% green. | Full `dotnet test` solution run without skipped security assertions. |
| **G10. Packaging, Backup & OS Compatibility** | Production static bundle (`wwwroot`), Linux systemd / Windows Service publish, DPAPI/PKCS#12 Data Protection, and backup/restore round-trip verify cleanly. | CI Linux/Windows publish jobs + `scripts/verify-backup-restore.sh` + Windows PowerShell validation. |

---

## 2. Current Gate Status Against the Audited Main Baseline

**Historical implementation and documentation checkpoints:** latest code-bearing merge at that point was PR #186 (`07cba896eec07bb28878d948a6cfb905313a2b22`); PR #187 was a documentation-only merge (`ecc3e52ec990bcd8ef3dc7f8c68f82e1632e1901`). Neither SHA is asserted to be the live branch tip now; post-merge CI #44911252345 and CodeQL #44911252403 passed on that exact SHA. [Main CI #44840514137](https://github.com/younestech31/PROMO-GEST/actions/runs/44840514137) and [CodeQL #44840514142](https://github.com/younestech31/PROMO-GEST/actions/runs/44840514142) passed on this exact SHA: frontend (28/28 CI steps), .NET 10 + PostgreSQL 18 (26/26 job steps; Domain 48/48, Application 24/24, Integration 37/37), and Windows (14/14). P1-11 Migration #15 was tested on disposable PG18 databases only; no existing organization database migration is verified by CI. Keep the capability `IMPLEMENTED_NOT_VERIFIED` until local operator acceptance evidence is attached.

**P1-25 backup freshness gate:** PR #173 provides Linux systemd and PowerShell freshness checks; PR #179 registers the Windows monitor daily at 06:00 as SYSTEM with `StartWhenAvailable`, overlap suppression and explicit local/offsite roots. Windows CI checks: freshness 9/9, Task Scheduler registration 9/9, encrypted backup/restore 22/22. PR-head CI #1128 and post-merge main CI #1129 passed; CodeQL #30/#31 passed on their exact heads. Capability remains `IMPLEMENTED_NOT_VERIFIED` until an authorized local administrator installs the monitor on a disposable on-premises Windows host, confirms SYSTEM can read the actual offsite target, inspects `LastTaskResult`, and demonstrates a deliberately stale/missing/mismatched artifact. No email/SMS or alert-forwarding channel is implemented.

**P1-01 work-status distinction:** the decision book has 1,540 `PENDING` work statuses and one `NEEDS_EVIDENCE` row (`W30-R007` El Borma); the master ledger still has all 1,541 practitioner sign-offs `PENDING`. The proposed El Borma code remains `3021`, with no `valid_from` or review outcome. No commune data are imported; `communesCount = 0`; P1-01 remains In Progress / Pending and P1-02 remains Blocked.

**P1-18 authentication verification:** Done / Verified for its automated acceptance slice. PR #176 restores the temporary-password session on SPA reload without widening the temporary-session API allowlist. PR #177 adds test-only deadline-boundary/session-token and existing-user migration-upgrade coverage. Historical P1-18 evidence: PR-head CI #1108 and post-merge main CI #1109 passed on PR #177 baseline `875f4a1`; CodeQL #25 passed on that historical main SHA. That historical main baseline was independently re-run and passed post-merge CI #1129 and CodeQL #31 on `5010a31`. Human Arabic RTL/French LTR user-management acceptance remains outstanding.



**Previous audited baseline (19 November 2026):** Main CI #992 passed on SHA `84408377c8de7a3995b82dfba55eda15ab2806dd`; this is retained as historical evidence and is superseded by the 20 November main checkpoint above.



**P1-14 preview-boundary correction (PR #140 merged):** PR #140 removed `0.0.0.0`, `::`, and `[::]` from the loopback-host allowlist and added regression tests proving these wildcard/unspecified bind addresses require the explicit external-preview opt-in. The listener remains loopback by default; external binding still requires explicit opt-in plus exact non-wildcard host and origin allowlists. This fixes the classification regression, but P1-14 remains In Review / Verification Blocked until the exact Google AI Studio preview hostname, browser origin and restrictive platform-ingress controls are independently accepted. Do not relax production API/authentication/CSRF controls; allowlists/CORS are not authentication.


**Runtime/schema distinction:** the latest ASP.NET Core API/Application runtime source is PR #163 / `711a05282869b8ebfe6965921045c9225dcecb17`; the latest password-lifecycle EF/schema source is PR #161 / `03d1288a391ba72e49faf2cf8aa82d604e1ddc6e`. PR #161 adds mandatory temporary-password columns/backfill; PR #163 adds voluntary rotation plus configurable session/credential lifetime rules. PR #176 is a SPA bootstrap fix; PR #177 is tests-only. PRs #80–#82 remain historical implementation evidence.

**Outstanding manual and practitioner gates:** Arabic RTL / French LTR desktop/mobile workflows, budget value redaction/editor visibility, dirty-form Back/Forward/reload/tab-close and project switch/revocation remain unverified in a real browser. P0-A01 and P0-A04 remain `NOT_RUN` for manual first-run/second-initialization and logout/session-revocation. The full official 1,541-commune bilingual crosswalk and qualified review remain pending; Phase 1 stays `IN_PROGRESS` and Phase 2 remains blocked by dependencies.

PR-head CI #1128 recorded Domain 42/42, Application 24/24 and PostgreSQL 18 Integration 35/35; post-merge main CI #1129 passed all three required jobs on exact main SHA `5010a31`. CodeQL #30 passed on PR-head `eb2022e`; CodeQL #31 passed on main `5010a31`. Historical runs below remain evidence for their earlier source baselines only; none certifies legal data, page-image review or practitioner acceptance.

Historical runs below are retained as evidence for earlier source baselines;

### Main CI #573 — 16 November 2026
- **Frontend/static hosting:** passed; strict TypeScript/lint, **39/39** frontend tests, SPA and ASP.NET Core static-host builds, and preview-leak checks.
- **.NET 10 / PostgreSQL 18:** solution build with warnings as errors succeeded; Domain **34/34**, Application **20/20**, PostgreSQL 18 Integration **29/29**.
- **Migration lifecycle tests:** direct Down, fail-closed preflight (without deleting ProjectCustomer rows), and successful Up after test-data reconciliation passed.
- **Windows:** x64 publish, machine-scoped Data Protection recovery, and PowerShell validation passed.
- **Overall:** all three required jobs completed with `success` on main SHA `065d54cff4e08ed868e676d4cf3d04c715898782`. [Run #573](https://github.com/younestech31/PROMO-GEST/actions/runs/43865150034).

### Main CI #581 — 16 November 2026
- **Frontend/static hosting:** strict TypeScript, **40/40** frontend tests, Vite production build, ASP.NET Core static-host build and preview-leak checks passed.
- **.NET 10:** solution build passed; Domain **34/34**, Application **20/20**.
- **PostgreSQL 18:** Integration **30/30**, including the anonymous 69-Wilaya reference API contract test; full database/storage/Data Protection restore drill passed.
- **Windows:** x64 publish, machine-scoped Data Protection recovery and PowerShell validation passed.
- **Overall:** all three jobs passed on main SHA `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`. [Run #581](https://github.com/younestech31/PROMO-GEST/actions/runs/43881240365).

### PR #59 — Server-owned Wilaya reference
- Setup, organization profile and project create/update selectors consume `GET /api/reference/administrative-units` and submit server-provided canonical bilingual names.
- PostgreSQL 18 verifies anonymous access, the 69 ordered Wilaya codes, metadata and `Cache-Control: no-store`; frontend verifies the Vite preview contract.
- Commune dataset remains explicitly pending: `communesCount = 0`; municipality is still free text.

### Phase 1 — Party / ProjectCustomer integrity
- **PR #55 — merged:** aligned tests with the distinct Party/ProjectCustomer IDs and correct identity-document request field; PR CI #562 and post-merge main CI #563 passed.
- **PR #56 — merged:** Migration #13 adds deferred PostgreSQL triggers for customer relationship writes and canonical Party identity changes; advisory locks serialize identical project/name/phone tuples. PostgreSQL 18 verifies concurrent duplicate rejection and Party-rename collision rejection. PR CI #570 and main CI #571 passed; integration **28/28**.
- **PR #57 — merged:** PostgreSQL 18 directly tests guard migration Down, fail-closed preflight with legacy duplicate data, preservation of customer records, and successful reapplication after reconciliation. PR CI #572 passed; integration **29/29**.
- **Production boundary:** these migrations and tests have run only in disposable CI databases. No customer production DB or Google AI Studio Cloud SQL database was migrated.

### Gate Interpretation
- **G1:** Domain **34/34** and Application **20/20** pass in main CI #581 for covered requirements.
- **G2:** PostgreSQL 18 verifies migration Up/Down, fail-closed preflight, relationship uniqueness, concurrent duplicate rejection, Party-update collision rejection, data preservation, and model-snapshot parity. Migration #13 adds provider-specific SQL triggers without changing EF entity mapping; the model snapshot therefore has no synthetic model delta.
- **G3–G7 and G9:** covered authorization, project scope, CSRF, structured errors, concurrency, audit immutability, and regression paths pass in the tested CI baseline.
- **G8:** automated checks passed (**40/40** frontend tests, TypeScript strict check, builds and preview-leak checks) in main CI #581. Arabic RTL / French LTR browser acceptance remains Product Owner-attested from the prior Phase 0 record, not re-performed by this CI run. P0-A01 first-run/second-initialization and P0-A04 logout/session revocation remain `NOT_RUN`. Arabic RTL / French LTR browser acceptance remains Product Owner-attested from the prior Phase 0 record, not re-performed by this CI run. P0-A01 first-run/second-initialization and P0-A04 logout/session revocation remain `NOT_RUN`.
- **G10:** Linux/Windows packaging and database/storage/Data Protection restore checks passed. Customer-site installation and production migration rehearsal remain separate.

**Phase status:** Phase 0 remains `COMPLETE` by D-010 with P0-A01 and P0-A04 as accepted `NOT_RUN` exceptions. Phase 1 remains `IN_PROGRESS`: Party identity mirror retirement, database duplicate guard, migration lifecycle tests and 69-Wilaya API-to-UI integration are verified. The complete 1,541-commune hierarchy is not loaded; official source reconciliation/import and bounded navigation design remain. No Phase 2–5 business coding begins before applicable G1–G10 gates, Phase 1 dependencies, and legal/accounting approvals pass.

## 3. Statutory / Practitioner Sign-Off Gates (Mandatory Before Phases 2, 3A, 4)

Engineering tests alone cannot certify Algerian legal or tax correctness. Before implementing code for Contracts, VSP Schedules, or SCF Accounting:

1. **Notarial & Law 11-04 Legal Sign-Off:** Distinction & conversion rules among Internal Holds, Statutory Reservation Contracts, VSP Contracts, and *Actes Notariés*; FGCMPI guarantee prerequisites (Art. 42, 54–55), 15% cancellation retention (Art. 32), Art. 36 loan restriction interpretation, late-payment judicial notice rules (`Decree 13-431`).
2. **Territorial Reference Data Sign-Off:** Official verified 69-Wilaya / 1,541-commune dataset with effective dates and Decree 26-208 transitional authority separation (`ADR-0010`).
3. **Qualified Algerian CPA / Tax Sign-Off:** SCF chart of accounts mapping for real estate (*stocks en-cours* / *avances clients* / revenue recognition at transfer vs completion), Finance Law 2025 Art. 59 VAT collection trigger (and treatment of FGCMPI escrow advances), Finance Law 2026 Art. 53 9% vs 19% VAT separation, IBS/TAP/IRG withholdings.


**JO44 Arabic image-map boundary:** The current P1-01 image-map validator checks 29 page PNGs and blob hashes, 1,541 page-level assertion locators, 48/48 printed Wilaya count controls and preserved source exceptions. This is evidence availability/mapping only; it does not replace row-level Arabic transcription, legal identity adjudication, qualified sign-off or manual product/browser acceptance.

---

## 4. Frontend Resilience, Bundle Budget and Supply-Chain Gates (added 2026-11-20)

These gates were added after the 20 November review (`AUD-05`, `AUD-06`, `AUD-07`). They are enforced by CI on every pull request:

| Gate | Requirement | Evidence |
|---|---|---|
| **S1. Route-level code splitting** | Authenticated workspace modules are loaded through dynamic imports; the entry bundle must stay below **500 KiB** uncompressed. | `apps/local-web/src/app/App.tsx`, `npm run build`, and the CI step *Enforce entry bundle budget*. |
| **S2. Render containment** | The routed workspace and the first-run wizard render inside an `ErrorBoundary` that resets on navigation, logs locally, and shows no stack trace or record data. | `apps/local-web/src/shared/components/ErrorBoundary.tsx`, `apps/local-web/src/utils/uiResilience.test.ts`. |
| **S3. Production dependency audit** | `npm audit --omit=dev --audit-level=high` must report zero high/critical advisories. | CI step *Audit production dependencies for known vulnerabilities*. |
| **S4. Dependency review cadence** | npm, NuGet and GitHub Actions updates are proposed weekly, grouped for minor/patch, and never merged automatically. | `.github/dependabot.yml`. |
| **S5. NuGet vulnerability report** | `dotnet list src/PromoGest.sln package --vulnerable --include-transitive` runs on every CI build and its output is part of the build log. | CI step *Report vulnerable NuGet packages*. |
| **S6. Backup parity (Windows)** | Windows backups are sealed, CMS-encrypted to a public recipient certificate, replicated to an independent offsite target, verified, and pruned; the restore script consumes the encrypted artefact. Encryption and offsite are fail-closed. | `scripts/backup-promogest.ps1`, `scripts/restore-promogest.ps1`, CI step *Verify Windows encrypted-backup and restore contract* (`scripts/test-backup-crypto.ps1`). |
| **S8. Security static analysis** | CodeQL analyses the SPA (JavaScript/TypeScript) and the ASP.NET Core solution (C#) on every pull request, every push to `main`, and weekly. Findings are triaged in the Security tab; the workflow fails only on analysis errors. | `.github/workflows/codeql.yml`. |
| **S9. Committed-credential scan** | Every CI run scans all tracked files for private-key blocks, cloud/provider tokens, JWTs, and password-bearing connection strings, with narrowly scoped, commented allowlist entries and unit tests for the rules themselves. | `scripts/scan-secrets.py`, `scripts/test_scan_secrets.py`, `scripts/secret-scan-allowlist.txt`, CI step *Scan tracked files for committed credentials*, `npm run scan:secrets`. |
| **S13. Backup freshness monitoring** | A scheduled check fails when the newest backup artefact is older than the configured window, when its SHA-256 sidecar no longer matches, or when the required offsite copy is missing. Linux uses the systemd service/timer; Windows installer registers `PromoGestBackupFreshnessMonitor` daily at 06:00 as SYSTEM against configured local/offsite roots. Non-zero Windows results are visible via Task Scheduler history / `LastTaskResult`; email/SMS forwarding is not included. | `scripts/check-backup-freshness.sh`, `scripts/check-backup-freshness.ps1`, `scripts/register-backup-freshness-task.ps1`, `deploy/linux/promogest-backup-verify.*`, platform test scripts, `scripts/test-register-backup-freshness-task.ps1`, CI #1128/#1129. |
| **S12. Server-rendered accessibility audit** | The sign-in screen, forced password-change screen, workspace header, and the shared state/dialog components are rendered in both Arabic (RTL) and French (LTR) and audited with axe-core for labels, control names, image alternatives, ARIA validity and duplicate ids. | `apps/local-web/src/utils/accessibility.test.ts`, `npm test`. |
| **S11. SPA lint ratchet** | Biome lints every SPA source file for correctness, suspicious patterns and accessibility. Errors must stay at zero; warning/info counts may only shrink against `biome-baseline.json`, so new code is clean while existing debt is paid down deliberately. | `biome.json`, `scripts/check-biome-ratchet.mjs`, `biome-baseline.json`, CI step *Lint the SPA with the debt ratchet*, `npm run lint:js:guard`. |
| **S10. Documented security settings** | Every server-enforced security setting (HTTPS cookies, session absolute lifetime, idle timeout, touch interval, temporary-password window, login rate limit) exists with the same default in `appsettings.json` and in both production templates, and is documented with its enforced bound in `.env.example` and the Linux environment template. | `scripts/validate-security-config-docs.py`, CI step *Validate documented security settings against the shipped defaults*. |
| **S7. Backup parity (Linux)** | The systemd job produces `promogest_backup_<UTC>.tar.gz.cms` plus a sidecar, verifies the offsite copy, prunes by retention, and never deletes a sealed snapshot after a later-stage failure. | `scripts/backup-promogest.sh`, `scripts/verify-backup-restore.sh`, CI restore drill. |

**Measured effect:** the entry bundle fell from 667 kB to ~440 kB (gzip ~121 kB), with `module-b-projects` (156 kB) and `module-l-reporting` (6 kB) loaded on demand.

**Known limitation (tracked, not claimed as fixed):** `module-a-organization`, `module-d-customers-parties` and `technical-admin` are statically imported by pages of other modules, so the bundler emits `INEFFECTIVE_DYNAMIC_IMPORT` warnings and keeps those pages in a shared chunk. Removing that limitation requires decoupling shared page components between modules; the current split already removes the warning-generating single-chunk build and the >500 kB entry.

**Linting scope:** `npm run lint` remains the strict TypeScript gate; `npm run lint:js:guard` adds Biome's correctness/suspicious/a11y rules with a ratchet. TypeScript-syntax ESLint is deliberately not used: this repository compiles with the TypeScript 7 native compiler, which does not expose the JS compiler API that typescript-eslint requires. Formatting is intentionally out of scope so the gate does not force a whitespace-only rewrite of the whole SPA. Accessibility is covered structurally by the axe-core audit of the authentication and shared components; colour contrast, focus order, keyboard trapping and screen-reader output still require a manual browser pass.

**Repository settings that are not versioned:** GitHub secret scanning with push protection and Dependabot alerts/security updates are enabled per repository, not in source. An owner must confirm them in *Settings → Code security* (`gh api repos/<owner>/<repo> --jq .security_and_analysis`); the in-repo scan (S9) is a complement, not a replacement, and it cannot block a push.

**Residual backup gaps (declared, not fixed):** no point-in-time recovery (WAL archiving), so the recovery point objective remains the last nightly artefact; no cross-platform decrypt drill in CI (the Windows and Linux artefacts use the same CMS/AES-256-CBC format, but decrypting a Windows artefact on Linux has not been exercised); and the quarterly restore drill remains a manual operator obligation.
