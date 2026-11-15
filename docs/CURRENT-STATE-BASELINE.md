# PROMO GEST — Current State Baseline

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Audited Source Baseline:** `c890ba05e83831fb965d855d1e7c2d7ab1d8a643` (PR #38 merge).  
**Previous Canonical Documentation Snapshot:** `d34eba606e5e2473898deed5e31a73eef2e7374d` (superseded by this evidence refresh).  
**Latest Green CI:** GitHub Actions Run **#495** / `43720679970`, on the audited source commit above.  
**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited baseline. A green pipeline does not certify untested browser UX, preview parity, production installation, or legal/accounting correctness.

---

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: **27/27** Domain tests passed. | Additional coverage is added with each domain change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: **14/14** Application tests passed, including Party denial auditing and identity-mirror synchronization coverage. | Browser-level workflows are outside this test suite. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: solution build succeeded and **9/9** integration tests passed against PostgreSQL 18. | CI evidence is not a substitute for a customer-site installation drill. |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | CI #495: TypeScript strict check, **24/24** pure TypeScript tests, production build, ASP.NET Core static-hosting output, and preview-leak checks passed. | Manual Arabic RTL / French LTR browser review remains outstanding. The Vite fallback simulator is intentionally not the production API and remains incomplete. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 merged; Application and PostgreSQL 18 tests cover concurrency stamps, denial audit, cross-project Party reuse, identity-collision rejection, and synchronization of linked customer mirrors. | Duplicate identity columns remain transitional mirrors until the Phase 1 migration retires them. |
| Organization profile editing | `PARTIALLY_IMPLEMENTED` | Organization profile view is read-only; `org.manage` is seeded. | `PUT /api/organization` is not implemented. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture and legal/accounting prerequisites are documented. | No production business implementation; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download and SHA-256 checks are implemented and exercised by PostgreSQL 18 E2E. | Metadata lifecycle, structured links, and K-Full archival remain future work. |

## 2. Verified CI Evidence

### GitHub Actions Run #495 — 15 November 2026
- **Frontend job:** passed. `npm run lint` (`tsc --noEmit`), `npm test` (**24/24**), SPA build, ASP.NET Core `wwwroot` build, static-hosting checks, and preview-leak checks all completed successfully.
- **.NET 10 / PostgreSQL 18 job:** passed. Solution build with warnings as errors succeeded; Domain **27/27**, Application **14/14**, and PostgreSQL 18 Integration **9/9** tests passed.
- **Windows publish job:** passed. Windows x64 publish, machine-scoped Data Protection recovery verification, and PowerShell validation all succeeded.
- **Overall result:** all three CI jobs completed with `success` on commit `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`.

[Open CI Run #495](https://github.com/younestech31/PROMO-GEST/actions/runs/43720679970)

### C2 Party / Customer changes merged and verified
- **PR #35:** fixed `CS7036` by passing the actual `PartyConcurrencyStamp` returned by the customer-details response. No synthetic token or weakened concurrency check was introduced.
- **PR #36:** captures `previousKind` before Party mutation and writes `ACCESS_DENIED` security audit events for unauthorized Party directory reads/identity changes.
- **PR #37:** applies the same denial-audit and previous-identity guarantees in project-customer workflows.
- **PR #38:** synchronizes canonical Party name/kind changes into every linked `project_customers` transitional mirror; rejects cross-project identity collisions before mutation; updates concurrency stamps; verifies these behaviors in PostgreSQL 18 integration tests.

The former `CS7036` compilation blocker is **resolved**, not an active blocker. Earlier failing CI runs remain historical records only.

## 3. Phase 0 — Remaining Work

Phase 0 remains `IN_PROGRESS`, but its main-code CI and C2 synchronization gates are green. Remaining work is bounded:

1. **Real preview/API path:** verify that AI Studio is actually proxying to the ASP.NET Core API when `ASPNETCORE_URL` is configured, rather than silently exercising the Vite-only in-memory simulator. Validate the Cloud SQL development connection and cookie/CSRF flow in that real API path.
2. **Manual bilingual browser review:** inspect the principal workflows in Arabic RTL and French LTR; automated TypeScript tests do not prove visual/browser correctness.
3. **Transitional Party mirrors:** `Party` is canonical. `project_customers` identity columns are synchronized and collision-checked while retained for compatibility. Retiring those columns is Phase 1 work and requires a reviewed migration plus backfill/rollback tests.
4. **Scope boundary:** organization profile editing and the 69-Wilaya / commune reference-data integration remain Phase 1 items. Legal contracts, collections, SCF and tax modules remain gated by practitioner review.

## 4. Preview Boundary (Do Not Confuse with Production)

- `apps/local-web/dev-api-middleware.ts` is loaded only by the Vite development server when `ASPNETCORE_URL` is **not** configured. It is an in-memory development simulator, not a full implementation of the ASP.NET Core API.
- When `ASPNETCORE_URL` is configured, Vite proxies `/api` and `/health` to that ASP.NET Core host. The development launcher starts the API only when the required SQL socket/connection environment is available.
- The Vite-only simulator still lacks parity for Party, Customers, Reservations and Documents, does not model all 18 permissions, and retains a setup Wilaya validation range of 01–58. These are preview limitations; they must not be mistaken for production API behavior.
- Production builds serve the static React bundle from ASP.NET Core and do not bundle the Vite development middleware.

## 5. AI Studio Runtime Incident — 15 November 2026

A browser HAR captured a same-origin customer-create request at **13:48:49 UTC**:
- First `POST /api/projects/{projectId}/customers`: `403`, `text/html`, returned by Google Frontend.
- The client code retries one non-JSON `403` for a mutating request after obtaining a fresh CSRF token. This explains the second POST; it is a retry, not a separate user submission.
- Retry: `500`, `application/json`, with the API security headers. This reached the ASP.NET Core response pipeline and was handled by `ExceptionHandlingMiddleware` as a generic internal error.
- **Before retrying the create request:** `ProjectCustomerService.CreateAsync` persists the Party, project-customer row, and audit event before reloading the customer response. A `500` can therefore occur after persistence; inspect `GET /api/projects/{projectId}/customers` for the submitted customer before repeating the POST.
- The HAR did not record a `Cookie` request header or an `Authorization` header on either POST. Because `ProjectCustomersController` is `[Authorize]`, this must be checked against the browser cookie store and `GET /api/auth/me`; the HAR alone does not establish whether authentication was actually absent or simply omitted by the export.
- The second response includes a `traceparent` correlation value. The application logs the exception and request path as `Unhandled exception while processing POST .../customers`, but the HAR does not contain the server stack trace.

**Disposition:** Root cause is **NOT YET IDENTIFIED**. Do not disable CSRF, remove `[Authorize]`, or broaden PostgreSQL permissions as a speculative workaround. Obtain the matching ASP.NET Core exception log before changing application code or database grants.

The `GET /health/ready` endpoint only checks `Database.CanConnectAsync` and whether `organization_settings` is initialized. It does **not** verify that EF Core migrations are current. Therefore `databaseConnected: true` and `isInitialized: true` do not prove that the `parties` and current `project_customers` schema is present.

## 5. Other Recorded Findings

- `OrganizationProfileView.tsx` remains read-only; `PUT /api/organization` is not present.
- The screenshot `public/assets/aistudio/Screenshot_2026-11-15-12-54-54-202-edit_com.android.chrome_743cf16d.jpg` is a development-debugging artifact added before this baseline. It should be removed in a separately scoped asset-cleanup PR after confirming no product reference uses it; it was not changed in the C2 fixes.
- No Cloud SQL production-data migration or customer deployment is implied by CI #495. The Cloud SQL environment remains a non-production development integration.
