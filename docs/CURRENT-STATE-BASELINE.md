# PROMO GEST — Current State Baseline

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Last Application Runtime / Schema Source Commit:** `2fb58c5b8c9ab632b17f9785c1eebce86c885c92` (PR #56 merge; PostgreSQL project-customer identity uniqueness guard).  
**Latest Test Source Commit:** `065d54cff4e08ed868e676d4cf3d04c715898782` (PR #57 merge; migration rollback and fail-closed preflight regression coverage).  
**Main Commit Inspected:** `065d54cff4e08ed868e676d4cf3d04c715898782`.  
**Latest Green Main CI:** Run **#573** / `43865150034` passed all three jobs on main SHA `065d54cff4e08ed868e676d4cf3d04c715898782`.  
**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited baseline. A green pipeline does not certify untested browser UX, preview parity, production installation, or legal/accounting correctness.

---

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | CI #572: **34/34** Domain tests passed. | Additional coverage is added with each domain change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | CI #572: **20/20** Application tests passed, including Party audit/permissions and project-customer identity behavior. | Browser-level workflows are outside this test suite. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | CI #572 passed **29/29** against PostgreSQL 18 using separate provisioning, migration-owner, and least-privilege runtime identities. Includes concurrent duplicate rejection, Party identity update rejection, guard migration Down, fail-closed preflight on pre-existing duplicates, data preservation, and successful reapplication after reconciliation. | CI evidence does not replace a representative customer-site backup/restore and migration rehearsal or manual browser acceptance. |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | Strict TypeScript check (`tsc --noEmit`), **39/39** frontend tests, production/static-host builds, and preview-leak checks pass. The Product Owner has owner-attested Arabic RTL / French LTR acceptance across desktop/mobile and the listed real workflows. | P0-A01 and P0-A04 remain `NOT_RUN` as owner-accepted Phase 0 residual exceptions; browser/version and per-case sanitized artifacts were not attached. The Vite fallback simulator is intentionally not the production API and remains incomplete. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 and Phase 1 PRs #55–#57 merged. ProjectCustomer identity mirrors are retired; PostgreSQL deferred triggers enforce `(project_id, Party.normalized_display_name, project_customer.normalized_phone)` across relationship writes and Party identity updates. Main CI #573 verifies concurrent duplicate rejection, Party-rename collision rejection, migration rollback, fail-closed preflight, and recovery. | Employee, Party contact-point/identifier/representative models, full PartyRole lifecycle, and human-reviewed merge tooling remain unimplemented. No production or Cloud SQL database was migrated. |
| Organization profile editing | `IMPLEMENTED_AND_VERIFIED` | `PUT /api/organization` (`OrganizationController`, `OrganizationProfileService`), `OrganizationProfileView.tsx` edit form, `org.manage` enforcement, `ACCESS_DENIED` / update audit events, and `ExpectedConcurrencyStamp` conflict handling are implemented and verified in `OrganizationProfileUpdate_EnforcesPermission_AuditsDenial_AndRejectsStaleConcurrency`. | Non-PG18 environments cannot execute the PG18 test directly; Phase 1 territorial commune catalogue remains separate work. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture and legal/accounting prerequisites are documented. | No production business implementation; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download, SHA-256 checks, `ProjectMember`-capability category scoping, and `customers.read` isolation for customer identity documents are implemented. | Metadata lifecycle, structured links, and K-Full archival remain future work. |

### GitHub Actions Run #550 — 15 November 2026 (main Phase 0 closure anchor)
- **Commit:** `5a5196d75abcdf608e708844983fad25b600e5a4` (PR #52 owner-attested Phase 0 acceptance documentation).
- **Frontend, .NET 10 / PostgreSQL 18, and Windows publish jobs:** all three passed.
- **Overall:** success; this run revalidated the automated baseline but did not execute manual browser acceptance. P0-A01 and P0-A04 were subsequently accepted as explicit unrun exceptions in D-010.

[Open CI Run #550](https://github.com/younestech31/PROMO-GEST/actions/runs/43772604996)

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

### Phase 1 Party / ProjectCustomer integrity remediation
- **PR #55 — merged:** aligned PostgreSQL integration assertions with the actual separation of organization-wide `Party` identity and project-scoped `ProjectCustomer` records. Replaced an outdated positional request with named fields so the uploaded identity document ID binds to `IdentityDocumentStoredFileId`. PR CI #562 and post-merge main CI #563 passed all three jobs.
- **PR #56 — merged:** added migration `20261116120000_EnforceProjectCustomerIdentityUniqueness`. The migration fails closed if duplicate project/Party-name/phone tuples already exist, then installs deferred PostgreSQL constraint triggers for customer relationship writes and Party identity updates. Transaction-scoped advisory locks serialize the same project/name/phone key. The API maps the database conflict to `CUSTOMER_DUPLICATE`. PR CI #570 and main CI #571 passed all three jobs; PostgreSQL Integration passed **28/28**.
- **PR #57 — merged:** adds direct PostgreSQL 18 regression coverage for the guard migration Down path, duplicate-data preflight rejection without data loss, and successful migration reapplication after explicit test reconciliation. PR CI #572 passed all three jobs; PostgreSQL Integration passed **29/29**.
- **Data boundary:** PRs #55–#57 changed source/tests/docs only. They did not migrate production or Google AI Studio Cloud SQL data, alter credentials, or change runtime authorization/CSRF policy.

### GitHub Actions Run #573 — 16 November 2026 (post-merge main verification)
- **Main SHA:** `065d54cff4e08ed868e676d4cf3d04c715898782`; all three jobs passed. PR CI #572 passed the same migration lifecycle regression suite before merge.
- **Domain / Application / PostgreSQL 18:** Domain **34/34**, Application **20/20**, Integration **29/29**.
- **Additional PostgreSQL 18 coverage:** Migration #13 Down removes the two triggers; the Up preflight rejects pre-existing duplicate Party-name/phone tuples without deleting ProjectCustomer records; after explicit test reconciliation, the migration reapplies and recreates both triggers.
- **Boundary:** the test uses a disposable database and separate provisioning, migration-owner, and runtime identities. It does not prove a migration against a real organization installation or authorize any Cloud SQL/production change.

[Open CI Run #573](https://github.com/younestech31/PROMO-GEST/actions/runs/43865150034)
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

Phase 0 is `COMPLETE` by the Product Owner's explicit direction on 16 November 2026 (D-010); Main CI #550 is green. This is an owner-approved administrative closure with two explicit test exceptions, not a claim that every original exit criterion was evidenced. In addition to the earlier targeted AI Studio smoke confirmation, the Product Owner explicitly attested on 15 November 2026 that the principal bilingual desktop/mobile workflows listed in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) passed: login/session/CSRF, projects, structure, customers/interactions, internal holds, documents/SHA-256, authorization/audit/concurrency/safe errors, and persistence after reload. The result register records those groups as owner-attested `PASS`, not CI-verified browser evidence.

Accepted Phase 0 residual exceptions (still tracked; not represented as PASS):

1. **P0-A01 first-run acceptance:** execute first-run initialization against a separate empty disposable database and verify that a second initialization is rejected. This was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
2. **P0-A04 logout acceptance:** verify logout revocation and that reopening a protected route does not restore access. Logout was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
3. **Supplementary audit artifacts:** browser/version metadata and sanitized per-case screenshots or redacted API trace evidence were not attached; the owner attestation is recorded, and no unprovided artifacts are claimed.
4. **Navigation decision:** D-009 records the bounded deferral of project-navigation proposal approval/implementation to the Phase 1 design review; do not start a broad UI redesign.
5. **Preview separation:** keep the Vite-only in-memory simulator clearly separate from real API evidence; it intentionally lacks full parity.
6. **Phase 1 progress:** Phase 1 remains `IN_PROGRESS`. Organization profile editing, `projects.structure.manage` alignment, Party canonical identity, Party directory access/audit, retirement of duplicate ProjectCustomer identity columns, and the PostgreSQL duplicate-identity guard are implemented and verified. PR #57 verifies migration rollback and fail-closed preflight behavior in PostgreSQL 18 CI. Remaining Phase 1 work includes the official versioned 69-Wilaya / 1,541-commune catalogue under ADR-0010 and the bounded organization-workspace/project-switcher/active-project-workspace design review. P0-A01 and P0-A04 remain `NOT_RUN`; no Phase 2–5 business implementation is authorized until applicable gates and practitioner approvals pass.

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

## 7. Other Recorded Findings & Audit Remediations

- Organization profile editing (`PUT /api/organization`, `OrganizationProfileService`, `OrganizationProfileView.tsx`) is implemented and enforces `org.manage`, `ExpectedConcurrencyStamp`, and immutable `singleton_guard`.
- `projects.structure.manage` is granted to `SITE_ENGINEER` (alongside `SYSTEM_ADMIN` and `PROJECT_DIRECTOR`) and enforced alongside `ProjectMember` construction/manager flags in `ProjectStructureService`, `permissions.ts`, and `devPreviewProjectStore.ts`.
- `VIEWER` no longer holds `files.read`, and `ProjectDocumentService` restricts document categories by `ProjectMember` capabilities while isolating `ProjectCustomer.IdentityDocumentStoredFileId` files behind `customers.read`.
- `POST /api/setup/initialize` requires a loopback client IP or matching `X-PROMOGEST-SETUP-TOKEN` when configured (`Security:SetupBootstrapToken` / `PROMOGEST_SETUP_TOKEN`), and `GET /api/setup/status` omits `initializedAtUtc` and exposes `requiresBootstrapToken`.
- Passwords are bounded to `128` characters (`PasswordPolicyValidator.MaximumLength = 128`) including pre-hash checks in `AuthService.LoginAsync`, and `User.RecordFailedLogin` resets stale counters after lockout expiry.
- `/api/auth/me` withholds organization fiscal/contact fields without `org.read`/`org.manage` and `ConcurrencyStamp` without `org.manage`, while `/health/live` and `/health/ready` return `environmentMode: null` outside Development.
- The temporary debugging screenshot `public/assets/aistudio/Screenshot_2026-11-15-12-54-54-202-edit_com.android.chrome_743cf16d.jpg` and unused `{ auto_https disable_redirects }` Caddy global directives were removed.
- No Cloud SQL production-data migration or customer deployment is implied by CI #544. The Cloud SQL environment remains a non-production development integration.
