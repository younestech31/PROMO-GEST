# PROMO GEST — Quality & Release Acceptance Gates

**Rule:** No module, refactor, or Phase transition is accepted unless **all 10 gates below** pass with objective command output, verified artifacts, and strict adherence to [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md).

---

## 1. Per-Module Engineering Gates (Mandatory for All PRs & Phases)

| Gate | Requirement | Concrete Verification Evidence |
|---|---|---|
| **G1. Domain Invariants** | Pure business rules, state transitions, DZD/Wilaya/fiscal validations live in `PromoGest.Domain`. | Unit tests in `PromoGest.Domain.Tests` covering valid boundaries AND rejection paths. |
| **G2. Relational & DB Integrity** | Critical uniqueness, check constraints, FKs, and append-only triggers enforced in EF migration + PostgreSQL 18. | Fresh `dotnet ef migrations` + `AppDbContextModelSnapshot.cs` parity + PG18 constraint trigger tests. |
| **G3. Authorization & Scope** | Every endpoint enforces `[Authorize]`, required global role permission, **and** explicit `ProjectMember` + capability scope (`ADR-0006`). | Tests for: (a) unauthenticated `401`, (b) missing global permission `403`, (c) non-member with global role `403`, (d) revoked member immediate `403`, (e) positive authorized member `200`/`201`. |
| **G4. CSRF & Error Contract** | Unsafe `/api/*` methods validate `X-CSRF-TOKEN`; errors map cleanly to `ApiErrorResponse` (`400/401/403/404/409`) without stack traces. | API integration assertions on CSRF missing/invalid (`403` `CSRF_TOKEN_INVALID`) & structured error JSON codes. |
| **G5. Optimistic Concurrency** | Mutable aggregates reject stale `ConcurrencyStamp` / `ExpectedConcurrencyStamp` with `409` before applying edits. | Stale-token test + dual-request race test yielding single winner (`ADR-0008`). |
| **G6. Immutable Audit Logging** | Sensitive reads (directory search, audit view), mutations, and authorization denials write `AuditLog`; failed audit aborts operation. | Test verifying audit row creation + failure propagation when audit write throws. |
| **G7. PostgreSQL 18 E2E Integration** | Real `WebApplicationFactory` + PostgreSQL 18 migrations running under least-privilege `promogest_app`. | `PromoGest.IntegrationTests` passing cleanly in CI (`postgres:18-alpine`) and local Docker PG18 where available. |
| **G8. Frontend TypeScript, Preview & Pure Tests** | Zero `tsc --noEmit` errors, bilingual `ar` (RTL) + `fr` (LTR) UI validation, preview middleware parity, zero dev-preview leaks in production `wwwroot`. | `npm run lint`, `npm test`, `npm run build`, `npm run build:aspnetcore`, plus browser RTL/LTR inspection. |
| **G9. Regression Shield** | Existing Setup, Auth, Lockout, Single-SysAdmin, Projects, Structure, Docs, Customers, Reservations suites remain 100% green. | Full `dotnet test` solution run without skipped security assertions. |
| **G10. Packaging, Backup & OS Compatibility** | Production static bundle (`wwwroot`), Linux systemd / Windows Service publish, DPAPI/PKCS#12 Data Protection, and backup/restore round-trip verify cleanly. | CI Linux/Windows publish jobs + `scripts/verify-backup-restore.sh` + Windows PowerShell validation. |

---

## 2. Current Gate Status Against Baseline (Last Code-Changing Source Commit `6bbd97f70ed0fb63cf226a1117cf6e83c359d2be`; current main `4d025ca19a7711df1d4df327b05ee4846cac3267`)

### GitHub Actions Run #529 — 15 November 2026
- **Frontend job — passed:** `npm run lint` (`tsc --noEmit`), `npm test` (**38/38**), SPA build, ASP.NET Core `wwwroot` build, static-hosting checks, and dev-preview leakage checks.
- **.NET 10 / PostgreSQL 18 job — passed:** solution build with warnings as errors; Domain **27/27**, Application **14/14**, and PostgreSQL 18 Integration **9/9** tests passed.
- **Windows publish job — passed:** Windows x64 publish, machine-scoped Data Protection recovery verification, and PowerShell validation passed.
- **Overall:** all three required CI jobs completed with `success` on commit `4d025ca19a7711df1d4df327b05ee4846cac3267`. [Run #529](https://github.com/younestech31/PROMO-GEST/actions/runs/43746793430).

### Phase 0 Defect Disposition
- **Resolved — PR #35:** `CS7036` in `PostgresEndToEndTests.cs` fixed by passing the real `PartyConcurrencyStamp` from loaded customer details.
- **Resolved — PR #36:** Party Directory records `ACCESS_DENIED` as a Security audit event and captures `previousKind` before canonical identity mutation.
- **Resolved — PR #37:** project-customer Party reuse and identity-change denials are security-audited; authorized identity changes record previous and new kinds.
- **Resolved — PR #38:** canonical Party identity updates synchronize every linked project-customer transitional mirror, advance relationship concurrency stamps, and reject cross-project name/phone collisions before mutation. PostgreSQL 18 E2E exercises shared Party linkage, collision rejection, both update routes, mirror synchronization and stale-token rejection.
- **Resolved — PR #41:** the AI Studio development launcher verifies API readiness before starting Vite and stops Vite if its owned API process exits; this prevents serving an interface with a dead loopback proxy.
- **Resolved — PR #42:** both AI Studio real-API launchers bootstrap .NET 10 per-user through Microsoft's official installer if missing. The SDK version is checked before API build/start; a mocked clean-container bootstrap regression test is included.

### Gate Interpretation
- **G1–G7 and G9:** automated build, domain/application suites, CSRF/auth/authorization paths, concurrency checks, audit protections, and PostgreSQL 18 integration execution passed in Run #529 for the tested requirements.
- **G8:** the automated portion passed: strict TypeScript check, **38/38** frontend tests, SPA build, ASP.NET Core static-hosting output, and preview-leak checks. The product owner previously confirmed a targeted real Google AI Studio server/API/PostgreSQL development smoke check and that the customer/prospect and reservation pages no longer showed the reported generic error after PR #44. That smoke check is not full CRUD/persistence/authorization acceptance. Manual Arabic RTL / French LTR browser verification across desktop and mobile, real cookie/CSRF interaction, and the named business workflows remain outstanding. The Vite-only fallback simulator is not full API parity and must never be treated as production/API evidence.
- **G10:** Windows x64 publish, DPAPI recovery and PowerShell validation passed. Customer-site installation and a restore drill remain separate release-acceptance activities.

**Release Implication:** The previous `CS7036` blocker is closed and current main CI (#529) is green. Phase 0 remains `IN_PROGRESS` until manual bilingual browser workflows and focused real-API CRUD/persistence/authorization acceptance are evidenced. Phase 1 and statutory/practitioner sign-offs remain prerequisites for production release and downstream legal/financial modules.

---

## 3. Statutory / Practitioner Sign-Off Gates (Mandatory Before Phases 2, 3A, 4)

Engineering tests alone cannot certify Algerian legal or tax correctness. Before implementing code for Contracts, VSP Schedules, or SCF Accounting:

1. **Notarial & Law 11-04 Legal Sign-Off:** Distinction & conversion rules among Internal Holds, Statutory Reservation Contracts, VSP Contracts, and *Actes Notariés*; FGCMPI guarantee prerequisites (Art. 42, 54–55), 15% cancellation retention (Art. 32), Art. 36 loan restriction interpretation, late-payment judicial notice rules (`Decree 13-431`).
2. **Territorial Reference Data Sign-Off:** Official verified 69-Wilaya / 1,541-commune dataset with effective dates and Decree 26-208 transitional authority separation (`ADR-0010`).
3. **Qualified Algerian CPA / Tax Sign-Off:** SCF chart of accounts mapping for real estate (*stocks en-cours* / *avances clients* / revenue recognition at transfer vs completion), Finance Law 2025 Art. 59 VAT collection trigger (and treatment of FGCMPI escrow advances), Finance Law 2026 Art. 53 9% vs 19% VAT separation, IBS/TAP/IRG withholdings.
