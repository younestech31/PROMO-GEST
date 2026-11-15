# PROMO GEST — Quality & Release Acceptance Gates

**Rule:** No module, refactor, or Phase transition is accepted unless **all 10 gates below** pass with objective command output, verified artifacts, and strict adherence to [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md).

---

## 1. Per-Module Engineering Gates (Mandatory for All PRs & Phases)

| Gate | Requirement | Concrete Verification Evidence |
|---|---|---|
| **G1. Domain Invariants** | Pure business rules, state transitions, DZD/Wilaya/fiscal validations live in `PromoGest.Domain`. | Unit tests in `PromoGest.Domain.Tests` covering valid boundaries AND rejection paths. |
| **G2. Relational & DB Integrity** | Critical uniqueness, check constraints, FKs, and append-only triggers enforced in EF migration + PostgreSQL 18. | Fresh `dotnet ef migrations` + `AppDbContextModelSnapshot.cs` parity + PG18 constraint trigger tests. |
| **G3. Authorization & Scope** | Every endpoint enforces `[Authorize]`, required global role permission, **and** explicit `ProjectMember` + capability scope (`ADR-0006`). | Tests for: (a) unauthenticated `401`, (b) missing global permission `403`, (c) non-member with global role `403`, (d) revoked member immediate `403`, (e) positive authorized member `200`/`201`. |
| **G4. CSRF, Error Contract & Response Privacy** | Unsafe `/api/*` methods validate `X-CSRF-TOKEN`; errors map cleanly to `ApiErrorResponse` (`400/401/403/404/409`) without stack traces; all `/api` and `/health` responses carry `Cache-Control: no-store`. | API integration assertions on CSRF missing/invalid (`403` `CSRF_TOKEN_INVALID`) and structured error JSON; middleware tests for no-store path matching, static-asset exclusion, and near-miss paths. |
| **G5. Optimistic Concurrency** | Mutable aggregates reject stale `ConcurrencyStamp` / `ExpectedConcurrencyStamp` with `409` before applying edits. | Stale-token test + dual-request race test yielding single winner (`ADR-0008`). |
| **G6. Immutable Audit Logging** | Sensitive reads (directory search, audit view), mutations, and authorization denials write `AuditLog`; failed audit aborts operation. | Test verifying audit row creation + failure propagation when audit write throws. |
| **G7. PostgreSQL 18 E2E Integration** | Real `WebApplicationFactory` + PostgreSQL 18 migrations running under least-privilege `promogest_app`. | `PromoGest.IntegrationTests` passing cleanly in CI (`postgres:18-alpine`) and local Docker PG18 where available. |
| **G8. Frontend TypeScript, Preview & Pure Tests** | Zero `tsc --noEmit` errors, bilingual `ar` (RTL) + `fr` (LTR) UI validation, preview middleware parity, zero dev-preview leaks in production `wwwroot`. | `npm run lint`, `npm test`, `npm run build`, `npm run build:aspnetcore`, plus browser RTL/LTR inspection. |
| **G9. Regression Shield** | Existing Setup, Auth, Lockout, Single-SysAdmin, Projects, Structure, Docs, Customers, Reservations suites remain 100% green. | Full `dotnet test` solution run without skipped security assertions. |
| **G10. Packaging, Backup & OS Compatibility** | Production static bundle (`wwwroot`), Linux systemd / Windows Service publish, DPAPI/PKCS#12 Data Protection, and backup/restore round-trip verify cleanly. | CI Linux/Windows publish jobs + `scripts/verify-backup-restore.sh` + Windows PowerShell validation. |

---

## 2. Current Gate Status Against Baseline (Last Code-Changing Source Commit `23f019de7c787c0f93b5b7f0b5cec69992ff087a`; latest test-source commit and main commit inspected at audit start `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`)

### GitHub Actions Run #544 — 15 November 2026
- **Frontend job — passed:** `npm run lint` (`tsc --noEmit`), `npm test` (**38/38**), SPA build, ASP.NET Core `wwwroot` build, static-hosting checks, and dev-preview leakage checks.
- **.NET 10 / PostgreSQL 18 job — passed:** solution build with warnings as errors; Domain **27/27**, Application **14/14**, PostgreSQL 18 integration tests (including `SecurityHeadersMiddlewareTests`) and the database/storage/Data Protection restore drill all passed.
- **Windows publish job — passed:** Windows x64 publish, machine-scoped Data Protection recovery verification, and PowerShell validation passed.
- **Overall:** all three required CI jobs completed with `success` on main commit `14428830eb0b81beedecc2136ba65fdf68a23266`. [Run #544](https://github.com/younestech31/PROMO-GEST/actions/runs/43767110822).

### Phase 0 Defect Disposition
- **Resolved — PR #35:** `CS7036` in `PostgresEndToEndTests.cs` fixed by passing the real `PartyConcurrencyStamp` from loaded customer details.
- **Resolved — PR #36:** Party Directory records `ACCESS_DENIED` as a Security audit event and captures `previousKind` before canonical identity mutation.
- **Resolved — PR #37:** project-customer Party reuse and identity-change denials are security-audited; authorized identity changes record previous and new kinds.
- **Resolved — PR #38:** canonical Party identity updates synchronize every linked project-customer transitional mirror, advance relationship concurrency stamps, and reject cross-project name/phone collisions before mutation. PostgreSQL 18 E2E exercises shared Party linkage, collision rejection, both update routes, mirror synchronization and stale-token rejection.
- **Resolved — PR #41:** the AI Studio development launcher verifies API readiness before starting Vite and stops Vite if its owned API process exits; this prevents serving an interface with a dead loopback proxy.
- **Resolved — PR #42:** both AI Studio real-API launchers bootstrap .NET 10 per-user through Microsoft's official installer if missing. The SDK version is checked before API build/start; a mocked clean-container bootstrap regression test is included.
- **Resolved — PR #48:** all `/api` and `/health` responses receive `Cache-Control: no-store` in `SecurityHeadersMiddleware`; regression tests verify API/health coverage and exclude SPA/static paths and near-miss routes. PR CI #538 and post-merge main CI #539 passed all three jobs.
- **Resolved — PR #50:** added PostgreSQL 18 / `WebApplicationFactory` assertions confirming the parsed `Cache-Control: no-store` directive on real API/health success, fallback 404, and CSRF 403 responses. This supplements the direct middleware tests and permits additional `no-cache` directives. PR CI #543 passed all three jobs; post-merge main CI #544 passed all three jobs, with PostgreSQL 18 Integration **24/24**.

### Gate Interpretation
- **G1–G7 and G9:** automated build, domain/application suites, CSRF/auth/authorization paths, concurrency checks, audit protections, PostgreSQL 18 integration execution, and actual HTTP-pipeline API/health response-cache assertions passed in Run #544 for the tested requirements.
- **G8:** the automated portion passed: strict TypeScript check, **38/38** frontend tests, SPA build, ASP.NET Core static-hosting output, and preview-leak checks. The product owner previously confirmed a targeted real Google AI Studio server/API/PostgreSQL development smoke check and that the customer/prospect and reservation pages no longer showed the reported generic error after PR #44. That smoke check is not full CRUD/persistence/authorization acceptance. Manual Arabic RTL / French LTR browser verification across desktop and mobile, real cookie/CSRF interaction, and the named business workflows remain outstanding. Execute and record them using [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md); that protocol is prepared but its test cases are not executed or passed by this CI run. The Vite-only fallback simulator is not full API parity and must never be treated as production/API evidence.
- **G10:** Windows x64 publish, DPAPI recovery, PowerShell validation, and CI database/storage/Data Protection restore drill passed. Customer-site installation remains a separate release-acceptance activity.

**Release Implication:** PR #48 implements the HTTP response-cache policy; PR #50 verifies it through the real HTTP pipeline; main CI #544 is green. Phase 0 remains `IN_PROGRESS` until manual bilingual browser workflows and focused real-API CRUD/persistence/authorization acceptance are evidenced. Phase 1 and statutory/practitioner sign-offs remain prerequisites for production release and downstream legal/financial modules.

---

## 3. Statutory / Practitioner Sign-Off Gates (Mandatory Before Phases 2, 3A, 4)

Engineering tests alone cannot certify Algerian legal or tax correctness. Before implementing code for Contracts, VSP Schedules, or SCF Accounting:

1. **Notarial & Law 11-04 Legal Sign-Off:** Distinction & conversion rules among Internal Holds, Statutory Reservation Contracts, VSP Contracts, and *Actes Notariés*; FGCMPI guarantee prerequisites (Art. 42, 54–55), 15% cancellation retention (Art. 32), Art. 36 loan restriction interpretation, late-payment judicial notice rules (`Decree 13-431`).
2. **Territorial Reference Data Sign-Off:** Official verified 69-Wilaya / 1,541-commune dataset with effective dates and Decree 26-208 transitional authority separation (`ADR-0010`).
3. **Qualified Algerian CPA / Tax Sign-Off:** SCF chart of accounts mapping for real estate (*stocks en-cours* / *avances clients* / revenue recognition at transfer vs completion), Finance Law 2025 Art. 59 VAT collection trigger (and treatment of FGCMPI escrow advances), Finance Law 2026 Art. 53 9% vs 19% VAT separation, IBS/TAP/IRG withholdings.
