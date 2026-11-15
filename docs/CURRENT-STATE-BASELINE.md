# PROMO GEST — Current State Baseline

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Last Application Runtime Source Commit:** `23f019de7c787c0f93b5b7f0b5cec69992ff087a` (PR #48 merge; central HTTP no-store policy for API/health responses).  
**Latest Source/Test Commit:** `c26194dce5124d5d5e8d67fc5a04708346b1d5e4` (PR #50 added real HTTP-pipeline cache-policy integration assertions; no runtime, schema, or business-data changes).  
**Main Commit Inspected at Audit Start:** `432e6f8ea76bb540dd5bc69d3314c0d658805ba7` (PR #51 documentation merge).  
**Latest Green CI at Audit Start:** GitHub Actions Run **#546** / `43768228052`, on main SHA `432e6f8ea76bb540dd5bc69d3314c0d658805ba7`; all three jobs passed.  
**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited baseline. A green pipeline does not certify untested browser UX, preview parity, production installation, or legal/accounting correctness.

---

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | CI #544: **27/27** Domain tests passed. | Additional coverage is added with each domain change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | CI #544: **14/14** Application tests passed, including Party denial auditing and identity-mirror synchronization coverage. | Browser-level workflows are outside this test suite. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | CI #544: solution build and PostgreSQL 18 integration suite passed (**24/24**), including real WebApplicationFactory assertions for no-store on successful health/API, fallback 404, and CSRF 403 responses; the database, storage, and Data Protection restore drill passed. | CI evidence is not a substitute for a customer-site installation drill or manual browser acceptance. |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | CI #546 re-ran all three required jobs successfully; frontend checks remain green (TypeScript strict check, **38/38** pure tests, production/static-host builds, and preview-leak checks). The Product Owner has owner-attested Arabic RTL / French LTR acceptance across desktop/mobile and the listed real workflows. | `P0-A01` first-run setup and `P0-A04` logout/revocation remain unconfirmed; browser/version and per-case sanitized artifacts were not attached. The Vite fallback simulator is intentionally not the production API and remains incomplete. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 merged; Application and PostgreSQL 18 tests cover concurrency stamps, denial audit, cross-project Party reuse, identity-collision rejection, and synchronization of linked customer mirrors. | Duplicate identity columns remain transitional mirrors until the Phase 1 migration retires them. |
| Organization profile editing | `PARTIALLY_IMPLEMENTED` | Organization profile view is read-only; `org.manage` is seeded. | `PUT /api/organization` is not implemented. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture and legal/accounting prerequisites are documented. | No production business implementation; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download and SHA-256 checks are implemented and exercised by PostgreSQL 18 E2E. | Metadata lifecycle, structured links, and K-Full archival remain future work. |

## 2. Verified CI Evidence

### GitHub Actions Run #544 — 15 November 2026
- **Frontend job:** passed. `npm run lint` (`tsc --noEmit`), `npm test` (**38/38**), SPA build, ASP.NET Core `wwwroot` build, static-hosting checks, and preview-leak checks all completed successfully.
- **.NET 10 / PostgreSQL 18 job:** passed. Solution build with warnings as errors succeeded; Domain **27/27**, Application **14/14**, PostgreSQL 18 integration tests passed, and the full database/storage/Data Protection restore drill passed.
- **Windows publish job:** passed. Windows x64 publish, machine-scoped Data Protection recovery verification, and PowerShell validation all succeeded.
- **Overall result:** all three CI jobs completed with `success` on main commit `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`.

[Open CI Run #544](https://github.com/younestech31/PROMO-GEST/actions/runs/43767110822)

### GitHub Actions Run #546 — 15 November 2026 (current main audit anchor)
- **Commit:** `432e6f8ea76bb540dd5bc69d3314c0d658805ba7` (documentation-only refresh after PR #50).
- **Frontend job:** passed.
- **.NET 10 / PostgreSQL 18 job:** passed.
- **Windows publish job:** passed.
- **Overall:** all three jobs completed with `success`. This run revalidated the unchanged application/test source baseline; it did not execute manual browser tests.

[Open CI Run #546](https://github.com/younestech31/PROMO-GEST/actions/runs/43768228052)

### C2 Party / Customer changes merged and verified
- **PR #35:** fixed `CS7036` by passing the actual `PartyConcurrencyStamp` returned by the customer-details response. No synthetic token or weakened concurrency check was introduced.
- **PR #36:** captures `previousKind` before Party mutation and writes `ACCESS_DENIED` security audit events for unauthorized Party directory reads/identity changes.
- **PR #37:** applies the same denial-audit and previous-identity guarantees in project-customer workflows.
- **PR #38:** synchronizes canonical Party name/kind changes into every linked `project_customers` transitional mirror; rejects cross-project identity collisions before mutation; updates concurrency stamps; verifies these behaviors in PostgreSQL 18 integration tests.

The former `CS7036` compilation blocker is **resolved**, not an active blocker. Earlier failing CI runs remain historical records only.

### PR #48 — Sensitive API / health response cache hardening
- **Change:** `SecurityHeadersMiddleware` now assigns `Cache-Control: no-store` to every `/api` and `/health` path segment, case-insensitively. The policy covers successful, authorization/error, and unknown-endpoint responses passing through the middleware.
- **Cache boundary:** the middleware does not apply this policy to SPA routes, `/index.html`, `/assets/*`, or the web manifest. Existing static asset caching behavior is therefore unchanged. The Service Worker continues to bypass API and health requests; that is separate from the browser's normal HTTP cache.
- **Regression tests:** `SecurityHeadersMiddlewareTests.cs` checks API/health paths, uppercase prefixes, unknown API paths, static paths, and near misses such as `/apiary` and `/healthcare`.
- **Verification:** PR #48 Run #538 passed all three CI jobs; post-merge main Run #539 also passed all three jobs. No database schema, migration, business data, credential, permission, or cloud-runtime changes were made.

### PR #50 — Response-cache policy verified through the real HTTP pipeline
- **Gap closed:** PR #48's middleware unit tests verified path matching, but did not independently prove that the policy reached actual HTTP responses after the full ASP.NET Core middleware pipeline.
- **Integration coverage:** `PostgresEndToEndTests` now asserts the parsed `Cache-Control` `NoStore` directive on successful `GET /api/auth/csrf`, `GET /health/live`, `GET /health/ready`, API and health fallback 404s, and a CSRF rejection 403. The assertions allow additional directives such as `no-cache` while still requiring `no-store`.
- **Verification:** PR #50 Run #543 passed all three jobs; PostgreSQL 18 integration tests passed **24/24**. Post-merge main Run #544 passed all three jobs on `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`.
- **Boundary:** No runtime middleware, API contract, authentication, CSRF rule, permission, schema, migration, business data, or Cloud SQL setting changed in PR #50.

### Current UI implementation snapshot

The screen-by-screen source inventory is maintained in [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md), and the execution steps/evidence rules for the outstanding manual checks are in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md). The current React shell exposes five route states: overview, projects, users, audit, and organization. The project directory contains working project, structure, customer, internal-hold, and document operations, but those project operations are opened from the directory as modals. A dedicated project switcher and active project workspace are not implemented. The matrix separates source/API presence from manual browser acceptance. The Product Owner has now owner-attested the principal Arabic RTL / French LTR desktop/mobile workflows; the detailed mapping and remaining unconfirmed first-run/logout cases are recorded in `PHASE-0-MANUAL-ACCEPTANCE.md`.

## 3. Phase 0 — Remaining Work

Phase 0 remains `IN_PROGRESS`. Main CI #546 is green. In addition to the earlier targeted AI Studio smoke confirmation, the Product Owner explicitly attested on 15 November 2026 that the principal bilingual desktop/mobile workflows listed in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) passed: login/session/CSRF, projects, structure, customers/interactions, internal holds, documents/SHA-256, authorization/audit/concurrency/safe errors, and persistence after reload. The result register records those groups as owner-attested `PASS`, not CI-verified browser evidence.

Remaining Phase 0 work is bounded:

1. **P0-A01 first-run acceptance:** execute first-run initialization against a separate empty disposable database and verify that a second initialization is rejected. This was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
2. **P0-A04 logout acceptance:** verify logout revocation and that reopening a protected route does not restore access. Logout was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
3. **Supplementary audit artifacts:** browser/version metadata and sanitized per-case screenshots or redacted API trace evidence were not attached; the owner attestation is recorded, and no unprovided artifacts are claimed.
4. **Navigation decision:** D-009 records the bounded deferral of project-navigation proposal approval/implementation to the Phase 1 design review; do not start a broad UI redesign.
4. **Preview separation:** keep the Vite-only in-memory simulator clearly separate from real API evidence; it intentionally lacks full parity.
5. **Phase 1 boundary:** organization profile editing, structure authorization alignment, retirement of transitional Party mirrors, and the versioned 69-Wilaya / commune reference catalogue remain Phase 1 work. Later legal, collection, SCF, and tax modules retain their practitioner gates.

## 4. Preview Boundary (Do Not Confuse with Production)

- `apps/local-web/dev-api-middleware.ts` is loaded only when no real ASP.NET Core proxy target is selected or when `PROMOGEST_VITE_ONLY=1` explicitly selects the in-memory simulator. It is not a full implementation of the ASP.NET Core API.
- When `ASPNETCORE_URL` is configured, Vite proxies `/api` and `/health` to that ASP.NET Core host. The default `npm run dev` launcher verifies prerequisites, waits for the configured Cloud SQL socket, applies pending EF Core migrations with the separate migration identity, reapplies least-privilege runtime grants, verifies API readiness, and only then starts Vite. Both real-API launchers provision .NET 10 per-user through Microsoft's official installer when the SDK is missing.
- The Vite-only simulator still lacks parity for Party, Customers, Reservations and Documents, does not model all 18 permissions, and retains a setup Wilaya validation range of 01–58. These are preview limitations; they must not be mistaken for production API behavior.
- Production builds serve the static React bundle from ASP.NET Core and do not bundle the Vite development middleware.

### Connectivity UX policy — 15 November 2026

- The global “local server disconnected” indicator and red banner are removed from the login and authenticated application shells. A failed background health probe no longer changes the interface into a global disconnected state.
- The readiness probe remains diagnostic and includes PostgreSQL connectivity. It refreshes once per minute only while the tab is visible; overlapping health requests are prevented. A failed probe clears the dashboard's diagnostic snapshot instead of presenting a false connection alarm.
- Login and first-run network failures use a neutral, operation-level retry message. Actual API errors and validation failures continue to be shown; this change does not suppress transaction errors or claim offline write capability.
- The Service Worker does not cache API or health responses. Independently, the server now sets `Cache-Control: no-store` on all `/api` and `/health` responses through PR #48. No customer or business data is made available for offline transactions.

## 5. AI Studio API startup incident — 15 November 2026

Backend logs showed Vite ready on port 3000 while requests to the configured loopback API target `127.0.0.1:5055` failed with `ECONNREFUSED`. This proves that no process was listening on the API target at those moments; it is not a PostgreSQL authentication or frontend rendering error.

The root launcher defect was confirmed in `scripts/dev-with-local-api.sh`: it could skip starting ASP.NET Core when Cloud SQL variables, the .NET SDK, or the Cloud SQL socket were unavailable, but still start Vite. When Vite had an inherited `ASPNETCORE_URL` proxy target, the UI then served on port 3000 while its API routes were guaranteed to fail. The launcher also did not always export the actual default API target to Vite after starting the child process.

The fix makes the launcher fail closed for real-API mode: it resolves the effective target, verifies `/health/ready`, waits for a configured Cloud SQL socket, starts .NET 10 when needed, exports the exact verified API URL, and refuses to start Vite if the API never becomes ready. If a launcher-owned API child exits while Vite is running, it terminates Vite too so the host supervisor can restart the complete stack. A separate explicit `PROMOGEST_VITE_ONLY=1` mode deliberately bypasses the proxy and uses the in-memory simulator for frontend-only work.

The later AI Studio log at **17:09:56** identified the next prerequisite exactly: `ASPNETCORE_URL targets a local API, but the .NET 10 SDK is unavailable`. This was an environment toolchain prerequisite, not a PostgreSQL or credential failure.

PR #42 adds the shared `scripts/ensure-dotnet10.sh` bootstrap to both `npm run dev` and `npm run dev:cloudsql`. It checks for a compatible SDK, downloads Microsoft's official `dotnet-install.sh` over HTTPS only when needed, installs the .NET 10 SDK in `$HOME/.dotnet` without root permissions, and verifies the selected version before proceeding. A newly recreated preview container may need to download the SDK again. The first startup requires outbound HTTPS access to `dot.net` and sufficient free disk space.

CI #544 verifies the development launcher, frontend checks, PostgreSQL 18 integration, the new response-cache middleware tests, Linux/Windows release checks, and restore drill. These automated tests verify source and build contracts; they do not replace live-preview checks, which the product owner has smoke-tested successfully in Google AI Studio.

## 6. AI Studio Runtime Incident — 15 November 2026

A browser HAR captured a same-origin customer-create request at **13:48:49 UTC**:
- First `POST /api/projects/{projectId}/customers`: `403`, `text/html`, returned by Google Frontend.
- The client code retries one non-JSON `403` for a mutating request after obtaining a fresh CSRF token. This explains the second POST; it is a retry, not a separate user submission.
- Retry: `500`, `application/json`, with the API security headers. This reached the ASP.NET Core response pipeline and was handled by `ExceptionHandlingMiddleware` as a generic internal error.
- **Before retrying the create request:** `ProjectCustomerService.CreateAsync` persists the Party, project-customer row, and audit event before reloading the customer response. A `500` can therefore occur after persistence; inspect `GET /api/projects/{projectId}/customers` for the submitted customer before repeating the POST.
- The HAR did not record a `Cookie` request header or an `Authorization` header on either POST. Because `ProjectCustomersController` is `[Authorize]`, this must be checked against the browser cookie store and `GET /api/auth/me`; the HAR alone does not establish whether authentication was actually absent or simply omitted by the export.
- The second response includes a `traceparent` correlation value. The application logs the exception and request path as `Unhandled exception while processing POST .../customers`, but the HAR does not contain the server stack trace.

**Disposition:** The previously reported customer/prospect registry and reservation page errors were confirmed by the product owner as resolved in the live AI Studio development preview after PR #44. PR #44 makes the default development launcher apply pending Cloud SQL migrations and refresh least-privilege runtime grants before API readiness. The earlier HAR's individual POST exception still cannot be attributed conclusively without its matching server stack trace; do not claim that the HAR alone proves a specific exception cause. Never disable CSRF, remove `[Authorize]`, or broaden PostgreSQL permissions speculatively.

The `GET /health/ready` endpoint only checks `Database.CanConnectAsync` and whether `organization_settings` is initialized. It does **not** verify that EF Core migrations are current. Therefore `databaseConnected: true` and `isInitialized: true` do not prove that the `parties` and current `project_customers` schema is present.

### PR #44 — Cloud SQL startup schema/grant preparation

PR #44 (`6bbd97f`) changes the normal AI Studio `npm run dev` path so a configured loopback ASP.NET Core API is not launched against an unprepared Cloud SQL schema. The launcher requires both the runtime and migration identities, waits for the SQL socket, runs the API migration command using the migration identity, reapplies least-privilege runtime grants, then checks API readiness and starts Vite. The dedicated `dev:cloudsql` runner marks its completed migration pass to avoid running it twice.

The owner subsequently confirmed that the preview server is working and the project customer/prospect and reservation pages no longer show the reported generic internal error. No production database, credentials, or customer deployment was changed by this development fix.

## 7. Other Recorded Findings

- `OrganizationProfileView.tsx` remains read-only; `PUT /api/organization` is not present.
- The screenshot `public/assets/aistudio/Screenshot_2026-11-15-12-54-54-202-edit_com.android.chrome_743cf16d.jpg` is a development-debugging artifact added before this baseline. It should be removed in a separately scoped asset-cleanup PR after confirming no product reference uses it; it was not changed in the C2 fixes.
- No Cloud SQL production-data migration or customer deployment is implied by CI #544. The Cloud SQL environment remains a non-production development integration.
