# PROMO GEST — Current State Baseline

**Document Role:** Honest, evidence-backed evaluation of the repository state.  
**Latest Source-Code Baseline Commit:** `2eee4771f2e5de23809e1b5fcf5a559c6ad48994` (PR #34 merge remains historical context).  
**Current Documentation Revision Commit:** `d34eba606e5e2473898deed5e31a73eef2e7374d`.  
**Latest CI Verification Runs:** GitHub Actions Run `43710844749` & Run `43713215866`.  
**Governing Rule:** A feature is never reported as `IMPLEMENTED_AND_VERIFIED` unless code exists **and** automated tests execute successfully in the audited baseline.

---

## 1. Executive Status Summary Across Layers

| Layer / Subsystem | Status | Concrete Evidence & Test Results | Active Blockers / Notes |
|---|---|---|---|
| **Domain Core (`PromoGest.Domain`)** | `IMPLEMENTED_AND_VERIFIED` | 27/27 unit tests pass cleanly (`DomainInvariantTests`, `PartyDomainTests`, `ProjectCustomerDomainTests`). | None. |
| **Application Services (`PromoGest.Application`)** | `IMPLEMENTED_AND_VERIFIED` | 10/10 application tests pass cleanly (`ApplicationSecurityAndFoundationTests`). | None. |
| **PostgreSQL 18 Integration Suite (`PromoGest.IntegrationTests`)** | `BLOCKED` | **Compile failure (`CS7036`)** at `PostgresEndToEndTests.cs:1072` (`PartyConcurrencyStamp` missing parameter). | **Blocks full E2E verification.** In CI Runs `43710844749` & `43713215866`, PostgreSQL 18 service containers started cleanly, but solution build failed before tests ran. |
| **Local React SPA (`apps/local-web`)** | `IMPLEMENTED_AND_VERIFIED` (Frontend) | CI `frontend` job succeeded (`tsc --noEmit` 0 errors, 24/24 pure TS unit tests pass, production bundle and leak check clean). | `dev-api-middleware.ts` simulator lacks 6 permissions and endpoints for Docs/Customers/Reservations/Parties. |
| **C2 Party & Customer Foundation** | `IMPLEMENTED_NOT_VERIFIED` | Committed in `2eee4771...` (`PartiesController`, `PartyDirectoryService`, migrations #10 & #11). | Lacks dedicated Application and PG18 test coverage due to `CS7036` compilation block. |

---

## 2. Detailed Verification Evidence (CI & Local Baseline)

### GitHub Actions CI Runs (`43710844749` & `43713215866`)
- **`frontend` Job:** Passed successfully. Compiled React SPA, ran `npm test` (**24/24** pure TypeScript unit tests passed), ran TypeScript type check (`tsc --noEmit` with 0 errors), built static bundle, and verified zero dev-preview leakage into `wwwroot`.
- **`postgres:18-alpine` Service Container:** Started cleanly and passed health checks in CI.
- **`backend-and-postgres` & `windows-publish-and-powershell` Jobs:** Failed during solution build (`dotnet build`) because of **`CS7036`** in `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs:1072` (`PartyConcurrencyStamp` missing argument). Consequently, `PromoGest.IntegrationTests` did **not** execute.

### Local Test Suite Snapshot (Commit `2eee4771...`)
- `PromoGest.Domain.Tests`: **27/27** passed.
- `PromoGest.Application.Tests`: **10/10** passed.
- `npm --prefix apps/local-web test`: **24/24** passed.
- `npm --prefix apps/local-web run lint`: `0` errors.

---

## 3. Active Technical & Architecture Defects (Phase 0 Stabilization Backlog)

1. **Integration Test Compilation (`CS7036`):**
   - *File:* `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs:1072`.
   - *Cause:* Recent C2 Party entity constructor/factory updates added a required `concurrencyStamp` or property parameter, leaving test code out of sync.
   - *Impact:* Blocks PostgreSQL 18 integration test execution in CI and local test runner.
2. **C2 Party Directory Service Gaps:**
   - `PartyDirectoryService` contains a `previousKind` audit bug and lacks an `ACCESS_DENIED` audit log entry when unauthorized actors attempt edits.
3. **Dual Party / ProjectCustomer Name Storage:**
   - `project_customers` retains redundant name/phone columns alongside the new organization-wide `parties` table (`ADR-0009`). Scheduled for Phase 1 cleanup via tested migration.
4. **Organization Profile Update Endpoint:**
   - `OrganizationProfileView.tsx` is read-only; `org.manage` is seeded but no `PUT /api/organization` controller endpoint exists.
5. **Preview Middleware Drift:**
   - `apps/local-web/dev-api-middleware.ts` does not implement handlers for Parties, Project Documents, Sales Reservations, or Customer Registry, nor does it enforce the full 18 permissions.

---

## 4. Public Asset Review Finding

- **File:** `/public/assets/aistudio/Screenshot_2026-11-15-12-54-54-202-edit_com.android.chrome_743cf16d.jpg` (added in commit `2eee4771f2e5de23809e1b5fcf5a559c6ad48994`).
- **Nature & Disposition:** This is a mobile browser screenshot uploaded by a tester during UI debugging in AI Studio (showing a mobile login screen error toast). It is an ephemeral testing artifact and **not** an intentional product asset. In accordance with the documentation-only instruction, it is reported here as an unpolished testing asset left in the workspace and should be excluded or cleaned up in future asset curation sweeps, without modifying source files in this documentation turn.
