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

**Current main:** `04654851ed7ac790dc600833aa2e8d2d4f6e3b3a`. [Main CI #1006](https://github.com/younestech31/PROMO-GEST/actions/runs/44646491919) passed all three required jobs on this exact SHA: frontend validators/build/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration/restore, and Windows publish/PowerShell. PR #146 merged the separate 1,541-row practitioner decision book, four source-backed prompts, 51-row JO44 bilingual image-reading supplement and 21-row Ouargla/Touggourt comparison. The frontend job reported 1,541 decision records checked and six decision-book tests passed. These checks prove workpaper consistency only; they do not prove legal correctness, row-by-row bilingual coverage, effective date or practitioner sign-off.

**P1-01 work-status distinction:** the decision book has 1,540 `PENDING` work statuses and one `NEEDS_EVIDENCE` row (`W30-R007` El Borma); the master ledger still has all 1,541 practitioner sign-offs `PENDING`. The proposed El Borma code remains `3021`, with no `valid_from` or review outcome. No commune data are imported; `communesCount = 0`; P1-01 remains In Progress / Pending and P1-02 remains Blocked.



**Previous audited baseline (19 November 2026):** Main CI #992 passed on SHA `84408377c8de7a3995b82dfba55eda15ab2806dd`; this is retained as historical evidence and is superseded by the 20 November main checkpoint above.



**P1-14 preview-boundary correction (PR #140 merged):** PR #140 removed `0.0.0.0`, `::`, and `[::]` from the loopback-host allowlist and added regression tests proving these wildcard/unspecified bind addresses require the explicit external-preview opt-in. The listener remains loopback by default; external binding still requires explicit opt-in plus exact non-wildcard host and origin allowlists. This fixes the classification regression, but P1-14 remains In Review / Verification Blocked until the exact Google AI Studio preview hostname, browser origin and restrictive platform-ingress controls are independently accepted. Do not relax production API/authentication/CSRF controls; allowlists/CORS are not authentication.


**Runtime/schema distinction:** PR #80 / D-014 changed ASP.NET Core application/API behavior and merged at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; it introduced no EF migration. The current EF/schema source remains PR #59 / `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`. PR #80 CI #707 and post-merge main CI #708 passed. PR #81 navigation and PR #82 module-boundary checks are also merged and their CI is green.

**Outstanding manual and practitioner gates:** Arabic RTL / French LTR desktop/mobile workflows, budget value redaction/editor visibility, dirty-form Back/Forward/reload/tab-close and project switch/revocation remain unverified in a real browser. P0-A01 and P0-A04 remain `NOT_RUN` for manual first-run/second-initialization and logout/session-revocation. The full official 1,541-commune bilingual crosswalk and qualified review remain pending; Phase 1 stays `IN_PROGRESS` and Phase 2 remains blocked by dependencies.

Run #795 detailed frontend/.NET/PostgreSQL test totals remain the last recorded individual test counts; Run #814 is the latest full CI evidence for the audited main snapshot. PRs #99–#103 are documentation-only and do not certify legal data, page-image review or practitioner acceptance.

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
