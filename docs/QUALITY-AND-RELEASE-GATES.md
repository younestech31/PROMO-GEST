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

## 2. Current Gate Status Against Baseline (`ec8769a5f778429cad0fec8f35d59f84f93b049d` / PR #34)

- **GitHub Actions CI Run `43710844749` (2026-11-15):**
  - **Passed (`frontend` job):** `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run build:aspnetcore`, and dev-preview leakage checks succeeded.
  - **Started cleanly (`postgres:18-alpine`):** PostgreSQL 18 service container initialized and passed health checks in CI.
  - **Failed during Build (`backend-and-postgres` & `windows-publish-and-powershell`):** Solution build failed with **`CS7036` at `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs:1072`** (`PartyConcurrencyStamp` missing). **Because build failed, `PromoGest.IntegrationTests` did NOT run in CI.** *(Local container runs also lack a Docker daemon for `Testcontainers`, whereas CI has full PG18 support once `CS7036` is fixed.)*
- **Workspace Test Snapshot:** `PromoGest.Domain.Tests` (**27/27** pass), `PromoGest.Application.Tests` (**10/10** pass), `npm run lint` (`0` errors), `npm test` (**24/24** pass).
- **Review Defects Blocking G3/G6/G8:** `PartyDirectoryService` (`previousKind` audit bug + missing `ACCESS_DENIED` audit log), dual `Party`/`ProjectCustomer` name columns, and `dev-api-middleware.ts` drift (6 missing permissions, Wilaya `59–69` regex in setup).
- **Release Implication:** **No feature is marked `IMPLEMENTED_AND_VERIFIED`, and no Phase 2 work or release may be signed off until Phase 0 restores `G1–G10` to green.**

---

## 3. Statutory / Practitioner Sign-Off Gates (Mandatory Before Phases 2, 3A, 4)

Engineering tests alone cannot certify Algerian legal or tax correctness. Before implementing code for Contracts, VSP Schedules, or SCF Accounting:

1. **Notarial & Law 11-04 Legal Sign-Off:** Distinction & conversion rules among Internal Holds, Statutory Reservation Contracts, VSP Contracts, and *Actes Notariés*; FGCMPI guarantee prerequisites (Art. 42, 54–55), 15% cancellation retention (Art. 32), Art. 36 loan restriction interpretation, late-payment judicial notice rules (`Decree 13-431`).
2. **Territorial Reference Data Sign-Off:** Official verified 69-Wilaya / 1,541-commune dataset with effective dates and Decree 26-208 transitional authority separation (`ADR-0010`).
3. **Qualified Algerian CPA / Tax Sign-Off:** SCF chart of accounts mapping for real estate (*stocks en-cours* / *avances clients* / revenue recognition at transfer vs completion), Finance Law 2025 Art. 59 VAT collection trigger (and treatment of FGCMPI escrow advances), Finance Law 2026 Art. 53 9% vs 19% VAT separation, IBS/TAP/IRG withholdings.
