# PROMO GEST — Quality & Release Acceptance Gates

**Rule:** No module, refactor, or Phase transition is accepted unless **all 10 gates below** pass with objective command output and zero silent bypasses.

---

## 1. Per-Module Engineering Gates (Mandatory for All PRs & Phases)

| Gate | Requirement | Concrete Verification Evidence |
|---|---|---|
| **G1. Domain Invariants** | Pure business rules, state transitions, DZD/Wilaya/fiscal validations live in `PromoGest.Domain`. | Unit tests in `PromoGest.Domain.Tests` covering valid boundaries AND rejection paths. |
| **G2. Relational & DB Integrity** | Critical uniqueness, check constraints, FKs, and append-only triggers enforced in EF migration + PostgreSQL 18. | Fresh `dotnet ef migrations` + `AppDbContextModelSnapshot` parity + PG18 constraint trigger tests. |
| **G3. Authorization & Scope** | Every endpoint enforces `[Authorize]`, role permission, **and** explicit `ProjectMember` + capability scope (`ADR-0006`). | Tests for: (a) unauthenticated 401, (b) missing global permission 403, (c) non-member with global role 403, (d) revoked member immediate 403, (e) positive authorized member 200/201. |
| **G4. CSRF & Error Contract** | Unsafe methods validate `X-CSRF-Token`; errors map cleanly to `ApiErrorResponse` (`400/401/403/404/409`) without stack traces. | API integration assertions on CSRF missing/invalid (`403`) & structured error JSON codes. |
| **G5. Optimistic Concurrency** | Mutable aggregates reject stale `ConcurrencyStamp` / `ExpectedConcurrencyStamp` with `409` before applying edits. | Stale-token test + dual-request race test yielding single winner (`ADR-0008`). |
| **G6. Immutable Audit Logging** | Sensitive reads (directory search, audit view), mutations, and authorization denials write `AuditLog`; failed audit aborts operation. | Test verifying audit row creation + failure propagation when audit write throws. |
| **G7. PostgreSQL 18 E2E Integration** | Real `WebApplicationFactory` + PostgreSQL 18 migrations running under least-privilege `promogest_app`. | `PromoGest.IntegrationTests` passing cleanly (currently **BLOCKED** by `CS7036` at `PostgresEndToEndTests.cs:1072`). |
| **G8. Frontend TypeScript, Preview & Pure Tests** | Zero `tsc --noEmit` errors, bilingual `ar` (RTL) + `fr` (LTR) UI validation, preview middleware parity when applicable. | `npm run lint`, `npm test`, `npm run build`, plus browser RTL/LTR inspection. |
| **G9. Regression Shield** | Existing Setup, Auth, Lockout, Single-SysAdmin, Projects, Structure, Docs, Customers, Reservations suites remain 100% green. | Full `dotnet test` solution run without skipped security assertions. |
| **G10. Packaging, Backup & OS Compatibility** | Production static bundle (`wwwroot`), Linux systemd / Windows Service publish, DPAPI/cert Data Protection, and backup/restore round-trip verify cleanly. | `scripts/build-production.*` + `scripts/verify-backup-restore.sh` + Windows PowerShell validation. |

---

## 2. Current Gate Status Against Baseline (`2026-11-15`)

- **Blocking Failure Today:** **G7 (`PromoGest.IntegrationTests`)** fails to compile (`CS7036` in `PostgresEndToEndTests.cs:1072`) and Docker is unavailable in the local container. **G6 & G3** are partially failing review for C2 `PartyDirectoryService` (`previousKind` audit bug + missing `ACCESS_DENIED` audit log). **G8** passes compilation/pure unit tests (`0` TS errors, `22/22` unit tests), while `dev-api-middleware.ts` fails parity on 6 permissions and Wilaya `59–69` setup validation.
- **Release Implication:** **No release or downstream Phase 2 work may be signed off until Phase 0 clears G1–G10 back to green.**

---

## 3. Statutory / Practitioner Sign-Off Gates (Mandatory Before Phases 2, 3A, 4)

Engineering tests alone cannot certify Algerian legal or tax correctness. Before implementing code for Contracts, VSP Schedules, or SCF Accounting:

1. **Notarial & Law 11-04 Legal Sign-Off:** VSP vs *Acte Notarié* workflow, FGCMPI 20% guarantee boundaries, 15% cancellation retention, late-payment judicial notice rules (`Decree 13-431`).
2. **Territorial Reference Data Sign-Off:** Official verified 69-Wilaya / 1,541-commune dataset with effective dates and Decree 26-208 transitional authority separation (`ADR-0010`).
3. **Qualified Algerian CPA / Tax Sign-Off:** SCF chart of accounts mapping for real estate (*stocks en-cours* / *avances clients* / revenue recognition at transfer vs completion), Finance Law 2025 Art. 59 VAT collection trigger, Finance Law 2026 Art. 53 9% vs 19% VAT separation, IBS/TAP/IRG withholdings.
