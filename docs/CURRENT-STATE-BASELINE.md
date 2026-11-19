# PROMO GEST — Current State Baseline

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Operational Roadmap:** [Notion Master Roadmap](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f) · [Notion Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46). Notion governs work sequencing and task tracking; this file and the current repository remain the source of implementation and verification truth.  
**Last ASP.NET Core API/Application runtime source:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87 merge; P1-07 Financial-document read authorization and list-denial audit). PR #87 added no EF Core migration; the latest EF/schema source remains PR #59 / `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`.  
**Current main SHA:** `ddb700fd4881246b91d24264a99db155f45a2760` (19 November 2026; PR #130 merged W19 Sétif and W26 Médéa into the JO44/1985 French searchable-text evidence. Main now records 36/48 section tables and 1,139 numbered French text-layer rows; 12 section tables remain. All 48/48 declared heading counts total 1,541. This remains historical text-layer coverage and aggregate count reconciliation only. Arabic row pairing, visual page review for the newer sections, later amendments, current identity/effective-date lineage and qualified practitioner review remain open. W36 El Tarf's duplicate French code 3624 for Chihani and Raml Souk remains in conflict with the previously reviewed Arabic reading شهاني | 3614; no canonical correction is approved. W37 preserves the French searchable-text heading literal TINDOUE against the section display label Tindouf. W16 1600 Ville d'Alger remains a separate historical special assertion excluded from commune totals. No commune records are imported or approved. Latest code-bearing frontend/security source remains PR #112 `293476cbdbf3c4c3fbcae87d7c9b682a493ca436`; Vite preview remains a disposable local/demo path, not production API.
**Latest main workflow:** [Run #941](https://github.com/younestech31/PROMO-GEST/actions/runs/44425104462) passed all three required jobs on exact main SHA `ddb700fd4881246b91d24264a99db155f45a2760`, the PR #130 merge SHA. PR #130 final-head CI #940 / run `44424758438` passed all three jobs on head `41dd851347a43b737a7bbb06efd9dfcf7c6d9b85`. PR #129 final-head CI #938 and post-merge main CI #939 passed 3/3; PR #128 CI #936 / main #937, PR #127 CI #934 / main #935, PR #126 CI #932 / main #933, PR #125 CI #930 / main #931 and PR #124 CI #928 / main #929 also passed all three. Detailed per-suite test counts remain evidenced by main CI #873 on code-bearing SHA `293476cb` (Frontend 88/88, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32; restore 1/1).
**Latest main commit inspected:** `ddb700fd4881246b91d24264a99db155f45a2760`; PR #130 merge commit. API/Application runtime remains PR #87 and EF/schema remains PR #59.
**P1-01 delivery status:** In Progress / Pending. Main has 36/48 JO44 sections and 1,139 numbered French text-layer rows (W01–W27, W31–W33, W35–W38, W45 and W47); all 48/48 declared heading counts total 1,541 and 12 source tables remain. W19 Sétif adds 60 rows (1901–1960), W26 Médéa adds 64 (2601–2664); both are searchable-text-only, without fresh page-image or Arabic row-level verification. W17/W18, W20/W23/W25, W21/W22/W24/W27, W32/W33/W37/W38/W45/W47 extracts likewise remain historical text-layer assertions; their page-image/Arabic pairing, later amendment history, candidate joins and current parent/effective-date lineage remain outstanding. W35's visual evidence remains limited to the heading and first three rows on printed p.1068. W36 El Tarf retains the French duplicate 3624 for Chihani/Raml Souk against the previously reviewed Arabic 3614 reading for شهاني; W37 retains the source-heading literal TINDOUE. W16 1600 Ville d'Alger remains a separate historical special assertion excluded from the commune total. All 1,541 candidates remain `PENDING` / `CANDIDATE_ONLY_NOT_APPROVED`; no commune imports; `communesCount=0`; P1-02 blocked. JO79 Arabic exception workpaper remains pending direct primary-source transcription.
**Manual acceptance boundary:** Arabic RTL / French LTR browser acceptance, desktop/mobile navigation, dirty-form Back/Forward/reload/tab-close, project switching/revocation, and budget-redaction UI still require independent browser evidence. P0-A01 and P0-A04 remain `NOT_RUN` for manual first-run and logout/session-revocation acceptance.  
**Governance finding:** the repository currently reports `main` as unprotected and no active rulesets; no branch-policy change was made in this audit. Future code and docs changes must use focused branches and PRs.
**Governing Rule:**
**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited repository baseline. A green pipeline does not certify untested browser UX, preview parity, production installation, or legal/accounting correctness.

---

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #873 on `293476c` executed **34/34** Domain tests successfully (0 failed, 0 skipped); all three CI jobs passed. | Additional coverage is added with each domain change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #873 on `293476c` executed **21/21** Application tests successfully (0 failed, 0 skipped); all three CI jobs passed. | Browser-level workflows are outside this test suite. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #873 on `293476c` executed **32/32** PostgreSQL 18 integration tests successfully (0 failed, 0 skipped), including least-privilege identities, migration checks, and the full database/storage/Data Protection restore drill. | CI evidence does not replace a representative customer-site backup/restore and migration rehearsal or manual browser acceptance. |
| Local React SPA (`apps/local-web`) | `IMPLEMENTED_NOT_VERIFIED` *(automated checks pass; manual UX acceptance outstanding)* | Main CI #873 on `293476c`: strict TypeScript passed, **88/88** frontend unit tests passed, and Vite production plus ASP.NET Core `wwwroot` builds/static-host checks passed, including preview-identity/token/session-path exclusion. | Manual Arabic RTL / French LTR browser acceptance (desktop/mobile), direct-route journeys, dirty-form Back/Forward/reload/tab-close, project switching and revoked-project flows remain outstanding. CI is not browser acceptance. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 and Phase 1 PRs #55–#57 merged. ProjectCustomer identity mirrors are retired; PostgreSQL deferred triggers enforce `(project_id, Party.normalized_display_name, project_customer.normalized_phone)` across relationship writes and Party identity updates. Main CI #573 verifies concurrent duplicate rejection, Party-rename collision rejection, migration rollback, fail-closed preflight, and recovery. | Employee, Party contact-point/identifier/representative models, full PartyRole lifecycle, and human-reviewed merge tooling remain unimplemented. No production or Cloud SQL database was migrated. |
| Organization profile editing | `IMPLEMENTED_AND_VERIFIED` | `PUT /api/organization`, `org.manage` enforcement, audit events and `ExpectedConcurrencyStamp` conflict handling are verified. PR #59 also connects its Wilaya selector to the server-owned reference API. | Commune/municipality remains free text pending a verified commune catalogue. |
| Project estimated-budget financial capability | `IMPLEMENTED_NOT_VERIFIED` | PR #80 / D-014 / ADR-0011 is merged; API redaction, explicit `CanViewFinancials`, null-preserving updates, denied-write audit and regression tests remain in the verified code path. Current main CI #862 passed all three jobs on `293476c`. | Manual Arabic RTL / French LTR browser proof for redaction, authorized visibility and editor hiding/showing remains outstanding. |
| Algerian administrative reference — Wilaya subset | `IMPLEMENTED_AND_VERIFIED` | Versioned bilingual 69-Wilaya API is consumed by setup, organization-profile and project selectors; current main CI #862 passed all three jobs on `293476c`. | API remains at `communesCount = 0` and `PendingOfficialVerification`; the complete 1,541-commune legal hierarchy is not loaded. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture, legal/accounting prerequisites, and tailored bilingual column-preview workspaces (`PlannedProjectModuleView.tsx` + `moduleCatalog.ts`, with zero hardcoded statutory tax-rate literals) are documented. | No production business implementation, persistence, or active mutation endpoints; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download, SHA-256 checks, `ProjectMember`-capability category scoping, and `customers.read` isolation for customer identity documents are implemented in ASP.NET Core 10 and mirrored in `dev-api-middleware.ts`. | Metadata update, soft-archive, `DocumentLink`, and K-Full retention/archival remain `PLANNED`. |
| Vite development preview isolation | `IMPLEMENTED_NOT_VERIFIED` | PR #112 merged at `293476cbdbf3c4c3fbcae87d7c9b682a493ca436`; Vite-only middleware requires explicit `PROMOGEST_VITE_ONLY=1`, rejects Cloud SQL environment variables, is separated from the real API/Cloud SQL path, uses loopback by default, and requires exact non-wildcard host/origin allowlists for temporary external preview. Main CI #873 on that exact code-bearing SHA verifies TypeScript, 88/88 frontend tests, and production SPA / ASP.NET Core `wwwroot` preview-identity, session-route, token, and Cloud SQL environment guardrails. | Manual Google AI Studio smoke test with the actual preview hostname/origin and restrictive platform ingress remains outstanding. Allowlists/CORS are not authentication; the disposable in-memory preview is not API/PG18/production evidence. |

### GitHub Actions Run #550 — 15 November 2026 (main Phase 0 closure anchor)
- **Commit:** `5a5196d75abcdf608e708844983fad25b600e5a4` (PR #52 owner-attested Phase 0 acceptance documentation).
- **Frontend, .NET 10 / PostgreSQL 18, and Windows publish jobs:** all three passed.
- **Overall:** success; this run revalidated the automated baseline but did not execute manual browser acceptance. P0-A01 and P0-A04 were subsequently accepted as explicit unrun exceptions in D-010.

[Open CI Run #550](https://github.com/younestech31/PROMO-GEST/actions/runs/43772604996)

### PR #66 — Phase 0 evidence baseline synchronization (documentation only)
- PR #66 head `f00a661e7083196e9bbee54f37a5084e4d569be4`; PR CI Run **#594** / `43907160572` passed all three required jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration and full restore drill, Windows x64 publish/PowerShell validation).
- Merge commit `f8f812890e6001d0560a0af1730559152b1cb8e3`; main push CI Run **#596** / `43907721028` passed all three jobs.
- The change refreshed this baseline and the Phase 0 manual register only. P0-A01 and P0-A04 remain `NOT_RUN` for manual browser acceptance; no runtime, schema, migration, organization data, production database, Cloud SQL data, credentials, or deployment was changed.

### PR #68 — Phase 1 Party / Employee master-data scope decision (documentation only)
- PR #68 head `f98a21125cc45c567bb3de49e6516a085734480e`; PR CI #601 / `43909506105` passed all 3 jobs.
- Merge SHA `7d1b14e4a5783731d3531f199eec0a08dcc6238c`; main CI #602 / `43909915570` passed all 3 jobs.
- D-012 records the Party / ProjectCustomer / User / ProjectMember boundary; REQ-D04 is aligned to the verified PR #56/#57 PostgreSQL migration evidence; REQ-D05/D06 remain planned and Module D remains partially implemented. No runtime, schema, permissions or data changed.

### PR #69 — D-012 documentation correction (one-line)
- PR #69 head `e6345ae4d3f3b9497ca7d16824b10a8cb5a6cd60`; PR CI #603 / `43911049988` passed all 3 jobs.
- Merge SHA `4fdfcb2679231ff81b8756a8da6ba3045bea5288`; main CI #604 / `43911498773` passed all 3 jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege integration and restore drill, Windows x64/PowerShell).
- The one-line change removed a duplicated D-012 bullet only. No runtime, schema, migrations, permissions, business records, production/Cloud SQL data, credentials or deployment changed.

### PR #72 — Territorial register code lineage (documentation only)
- PR #72 head `2ebf4be8f4080a8c104ca57dadbeaae3f4f989ba`; PR CI Run **#612** / `43928612284` passed all three required jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration and restore drill, Windows x64 publish/PowerShell validation).
- Merge SHA `c920876c2d9c3233d468601e3636cf347a875924`; post-merge main CI for this SHA is not confirmed in this audit.
- Updated `REFERENCE-DATA-GOVERNANCE.md` and ADR-0010 with Decree 85-20's code lifecycle rule, and the confirmed 1985, 1986, 1998, 2021 and 2026 register instruments. The amendment inventory remains explicitly non-exhaustive; the full 1,541-row bilingual crosswalk and qualified review remain outstanding.
- Stable internal UUID versus effective-dated official code is an application integrity decision, not a rule attributed to Decree 85-20.
- Documentation only: no runtime, API, UI, router, schema, migration, permissions, security policy, business data, production database, Google AI Studio Cloud SQL, credentials, or deployment changed.

### PR #73 — Baseline synchronization after PR #72 (documentation only)
- PR #73 head `55237adc69793aae3d919935892eb8e697572b42`; CI #614 / `43930654793` passed all three jobs on the PR head.
- Merge SHA `873107f1792fb1f5ba2e7d29f1e6f84f68ac4312`; post-merge main CI was not confirmed in the subsequent audit.
- Synchronized the five canonical baseline documents and corrected the ADR-0010 summary to distinguish the statutory 1,541 count from the 0 loaded commune records. No runtime/schema changes.

### PR #67 — Integration-test analyzer correction (test only)
- PR #67 head `6e37abf8eb170f2c4dfc136dc481bdf7a11f22d2`; CI #595 / `43907255613` passed all three jobs.
- Merge SHA `165540afce1ca4df0c933950b1cb7b303f9285fc`; post-merge main CI was not confirmed.
- Replaced a LINQ-filtered `Assert.Single` with the predicate overload to remove xUnit2031 without changing assertion intent or runtime behavior. No application runtime/schema change.

### PR #74 — Corrections to official territorial-source details (documentation only)
- PR #74 head `a1c9b6f4b850736f7f8c9b25d980a161626e1f15`; CI #617 / `43951981746` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18, Windows publish/PowerShell).
- Merge SHA `27a65b613132953204201d885ca1939c4d856db6`; post-merge main CI was not confirmed in this audit.
- Corrected the 8 February 1986 annex to all four commune/code/seat rows, corrected the official seat spelling `Zoudj El Beida`, and refined the 1998 order's territorial scope. The amendment inventory remains non-exhaustive.
- No runtime, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.

### PR #76 — 1998 territorial-register source conflict (documentation audit)
- PR #76 head `ffec106689409ec519757ae0dbb8901a7c897582`; CI #621 / `43957935892` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege integration/restore, Windows publish/PowerShell).
- Merge SHA `d30e9854c20bcf8068d49d16bb42b670de8ae22d`; post-merge main CI on this SHA is not confirmed in this audit.
- JO No. 23/1998 (printed p. 11) shows `3614` under Boumerdès code 35; JO No. 44/1985 (p. 1069), JO No. 49/1996 (p. 15), and ONS *Armature urbaine 2008* Table 52 show `3514`. The Decree 85-20 prefix rule makes the 1998 printed value anomalous, but this audit does not determine legal precedence.
- Record the exact raw values, source provenance, PDF-image verification limitation and qualified-adjudication requirement. No canonical value is selected and no commune row is imported.
- No runtime, API, UI, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.

### PR #78 — 1996 school-directory evidence classification (documentation only)
- PR #78 head `93ff92286014ee875f3292617015c84ed7f1749c`; CI #626 / `43970006006` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration/restore, Windows publish/PowerShell).
- Merge SHA `ec69f6d7e89cdbb78c849fe795b2a972744dd954`; post-merge main CI is not confirmed.
- Clarified that JO No. 49/1996, p. 15 is Annex I (continued) to Executive Decree No. 96-273 of 20 August 1996 on creation/suppression of fundamental schools. The Chabet El Ameur `3514` row is a school-location cross-check, not a territorial-register amendment; it does not resolve the 1998 JO23 `3614` conflict.
- The conflict remains unresolved pending PDF page-image verification and qualified legal/practitioner adjudication. No commune record is imported.
- No runtime, API, UI, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.


### PR #80 — Project estimated-budget financial capability (Phase 1 / D-014; merged)
- PR #80 merged on 17 November 2026 at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; final PR head `4a160c164db12ba01cb83a4f857d1b8d8fc0c921`.
- Implements D-014 / ADR-0011: budget read requires explicit `ProjectMember.CanViewFinancials`; budget write additionally requires `projects.manage` and ProjectManager membership; neither SYSTEM_ADMIN nor ProjectManager bypasses the capability. Null general updates preserve the stored amount; denied numeric updates are rejected and audited.
- API, nullable DTO, React redaction/editor visibility, Vite preview parity, and Application / PostgreSQL 18 / Vite unit and HTTP-CSRF regression tests are merged. No EF migration, production data, or Google AI Studio Cloud SQL change.
- PR-head CI #707 passed all three jobs on the final head; post-merge main CI #708 passed all three jobs on merge SHA `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`. Post-merge main CI #814 passed all three required jobs on audited main SHA `1c068dcaa1dc23c3ec3804abf903a10a8540dc76`.
- Capability state remains `IMPLEMENTED_NOT_VERIFIED` until independent manual Arabic RTL / French LTR browser acceptance verifies financial-value redaction, authorized visibility, and editor hiding/showing. The Notion task remains In Review / Verification Pending; not Done.

### Phase 1 design review — P1-04 / D-013 (PR #70 merged; design approved)
- PR #70 head `e1c183f0d2a4a9ab06abf72a955a6169634b73e6` passed PR CI #605 / `43912825520` (all three jobs); merge SHA `24d1d57bbe19102c9bbbd63bb31ca2793720d807` passed main CI #606 / `43913437191` (all three jobs).
- D-013 approves the organization workspace → explicit authorized project switcher → active project workspace model for design only. PR #70 did not implement navigation UI or change API, routes, schema, permissions or runtime behavior. Future UI slices remain separately scoped.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked pending complete source reconciliation and qualified review. No commune records were imported. P0-A01 and P0-A04 remain `NOT_RUN`; this decision does not certify browser acceptance.

## 1A. Phase 0 residual regression coverage — PR #63

PR #63 is merged. Its test-only change adds two PostgreSQL 18 end-to-end cases without changing runtime behavior:

- `FirstRunSetup_OnEmptyPostgreSql18Database_InitializesExactlyOnce`: verifies a fresh isolated database begins empty/uninitialized, first initialization succeeds, second initialization returns `409 SETUP_ALREADY_INITIALIZED`, exactly one organization and one `SYSTEM_ADMIN` user exist, one role assignment exists, and one `SETUP_INITIALIZED` audit event is recorded.
- `Logout_RevokesServerSession_AndRejectsCurrentAndReplayedCookies`: verifies missing-CSRF logout is rejected without revoking the session; valid logout clears the browser cookie; protected `/api/auth/me` and `/api/audit` return 401; replaying the original cookie from another client is rejected; the database session is revoked and one `AUTH_LOGOUT` audit event exists.

**PR CI #589:** all three jobs passed on PR head `58dde79719db5949033363dfed1e4e9cb8b66f29`. Exact .NET results: Domain **34/34**, Application **20/20**, PostgreSQL 18 Integration **32/32**. The full database/storage/Data Protection restore drill passed, as did frontend strict TypeScript/tests/build/static-host checks and Windows x64 publish/PowerShell validation.

**Boundary:** these are automated PostgreSQL/API integration tests. They do not change the manual browser result register: P0-A01 and P0-A04 remain `NOT_RUN` pending real-preview/local browser execution and sanitized evidence. No production database, Google AI Studio Cloud SQL data, credentials, or deployment was changed.

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

### GitHub Actions Run #581 — 16 November 2026 (post-PR #59 main verification)
- **Main SHA:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`; all three required jobs passed.
- **Frontend/static hosting:** TypeScript strict check, **40/40** frontend tests, SPA build, ASP.NET Core `wwwroot` build and preview-leak checks passed.
- **.NET 10 / PostgreSQL 18:** Domain **34/34**, Application **20/20**, Integration **30/30**; solution build passed.
- **Reference endpoint regression:** anonymous `GET /api/reference/administrative-units` returns the ordered 69 Wilaya codes, bilingual labels and version/source metadata; it reports `communesCount = 0` and `PendingOfficialVerification`; `Cache-Control: no-store` is asserted.
- **Operations:** full database/storage/Data Protection restore drill passed; Windows x64 publish, machine-scoped Data Protection recovery and PowerShell validation passed.
- **Boundary:** no commune records were imported; this CI does not represent a manual browser RTL/LTR rerun or a customer-site production migration rehearsal.

[Open CI Run #581](https://github.com/younestech31/PROMO-GEST/actions/runs/43881240365)

### PR #59 — Server-owned 69-Wilaya reference integration (merged)
- Typed frontend contract and API client consume `GET /api/reference/administrative-units`.
- A shared hook validates all 69 records and fails closed when the reference is unavailable or incomplete.
- First-run setup, organization profile edit and project create/update use the API-owned choices and submit the canonical bilingual label.
- Vite-only preview mirrors the response contract; production remains ASP.NET Core-owned.
- PostgreSQL 18 E2E verifies anonymous read, ordered codes 01–69, bilingual labels, version metadata and `no-store`; frontend tests verify the preview contract.
- No schema/migration, security policy, production data or Cloud SQL changes.

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

The screen-by-screen source inventory is maintained in [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md), and the execution steps/evidence rules for the outstanding manual checks are in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md).

**Frontend architecture stabilization — PR #81 (merged):** Main baseline before work: `9af8324dc516c7536eda33c2a487275c30e792d3`. PR #81 merged at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; post-merge Run #730 passed all three CI jobs. It established canonical API/CSRF, permission, module registry, route and localization sources; explicit legacy adapters; module-owned screens; shared UI ownership; public module entry points and acyclic-boundary regression checks; F–J planned presentation/API separation; and route/dirty-state safeguards. Login and first-run setup now have module-owned screen implementations. PR #81 changed no ASP.NET Core, Domain, Application, Infrastructure, EF Core, PostgreSQL, security policy, production configuration, credentials, or deployment files.
- `AppContentRouter` now supplies the actual `ProjectWorkspaceViewProps`; route authorization is decided before protected views are mounted, with actual `app/routeRegistry.ts` tests for direct admin/Party paths.
- The app now owns shared dirty state and protects internal navigation, project changes, browser Back/Forward, reload/tab close, and logout. Save is offered only when a real save callback is registered; otherwise the user can explicitly discard or stay. Project access revocation removes cached/recent/pinned state and returns to the organization workspace.
- The platform has one canonical API client, CSRF implementation, permission policy, module registry/state taxonomy, route parser/types, and bilingual localization source. Legacy paths are explicit compatibility adapters. Remaining UI-component consolidation is transitional; not every older component import has been migrated to `shared/components` yet.
- Existing screen implementations for organization, projects, structure, parties/customers, reservations, documents, technical administration, and reporting now live under their owning module directories; former feature paths are compatibility facades. F–J workflow display metadata is under module `presentation/` rather than `api/`; the business capabilities remain `PLANNED`.
- Reporting's planned API no longer returns fabricated empty success; Contracts → K-Min navigation is wired, and legal/notarial interface copy is marked pending qualified Algerian practitioner review. Four one-off Applet repair scripts were removed.
- Automated evidence: `npm ci --no-audit --no-fund`, `npm run lint`, `npm test` (**66/66**), `npm run build`, `npm run build:aspnetcore`, plus the .NET 10/PostgreSQL 18 and Windows CI jobs all passed in Run #716. Tests cover actual route registry parsing/authorization, project revocation state, navigation guard decisions, registry completeness/uniqueness, single API/CSRF/route/localization implementations, module API boundaries, and planned endpoint rejection.

**Acceptance boundary:** PR #81 is merged and post-merge CI passed. No new Arabic RTL / French LTR browser walkthrough, mobile/desktop manual acceptance, or real interactive dirty-form journey was executed for this merge. Navigation therefore remains `IMPLEMENTED_NOT_VERIFIED` for manual UX acceptance. P1-04 / D-013 remains a design decision; P1-06 implements technical foundations and safeguards but does not claim the complete approved product interaction model.

## 3. Phase 0 — Remaining Work

Phase 0 is `COMPLETE` by the Product Owner's explicit direction on 16 November 2026 (D-010); Main CI #550 is green. This is an owner-approved administrative closure with two explicit test exceptions, not a claim that every original exit criterion was evidenced. In addition to the earlier targeted AI Studio smoke confirmation, the Product Owner explicitly attested on 15 November 2026 that the principal bilingual desktop/mobile workflows listed in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) passed: login/session/CSRF, projects, structure, customers/interactions, internal holds, documents/SHA-256, authorization/audit/concurrency/safe errors, and persistence after reload. The result register records those groups as owner-attested `PASS`, not CI-verified browser evidence.

Accepted Phase 0 residual exceptions (still tracked; not represented as PASS):

1. **P0-A01 first-run acceptance:** execute first-run initialization against a separate empty disposable database and verify that a second initialization is rejected. This was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
2. **P0-A04 logout acceptance:** verify logout revocation and that reopening a protected route does not restore access. Logout was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
3. **Supplementary audit artifacts:** browser/version metadata and sanitized per-case screenshots or redacted API trace evidence were not attached; the owner attestation is recorded, and no unprovided artifacts are claimed.
4. **Navigation decision:** D-009 records the bounded deferral of project-navigation proposal approval/implementation to the Phase 1 design review; do not start a broad UI redesign.
5. **Preview separation:** keep the Vite-only in-memory simulator clearly separate from real API evidence; it intentionally lacks full parity.
6. **Phase 1 progress:** Phase 1 remains `IN_PROGRESS`. Party identity separation and the PostgreSQL duplicate guard are verified. PR #59 completes the server-owned 69-Wilaya API-to-UI integration. The 1,541-commune catalogue remains pending (`communesCount = 0`, `PendingOfficialVerification`); project municipality remains free text. P1-01 official commune-source reconciliation remains In Progress / Pending. PRs #92–#103 expanded the candidate-source and legal-source audit. PR #99 adds six source-traceable territorial/name assertions; PR #100 records Decree 85-20 Articles 3–4 and eight code-lineage cross-checks; PR #103 adds three ONS 2008 W./C. source assertions (11 total code-lineage evidence rows) while preserving the 1985/1998 Chabet conflict and source-specific Arabic variants. These are evidence supplements, not the full 1,541-row concordance; no commune rows were imported. P1-02 catalogue implementation remains Blocked until the full crosswalk, visual source review, effective-date reconciliation, and qualified review are accepted. P1-04 / D-013 remains an approved design decision only. PR #81 / P1-06 is merged at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; post-merge Run #730 passed. It adds route/dirty-state safeguards, canonical shared-platform sources, module ownership/public-interface boundaries and regression tests. Manual browser acceptance remains pending; this does not relabel D-013 as a fully implemented product model. P1-05 / D-014 estimated-budget capability is merged in PR #80 at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; PR CI #707 and post-merge main CI #708 passed, and current audited main CI #814 passed all three required jobs on exact main SHA `1c068dcaa1dc23c3ec3804abf903a10a8540dc76`. Manual bilingual browser acceptance remains outstanding, so the capability stays `IMPLEMENTED_NOT_VERIFIED` and the Notion task remains In Review / Pending. P0-A01 and P0-A04 remain `NOT_RUN`; no Phase 2–5 business implementation is authorized until applicable gates and practitioner approvals pass.

## 4. Preview Boundary (Do Not Confuse with Production)

- `apps/local-web/dev-api-middleware.ts` (`createPromoGestDevMiddleware`) is loaded only when no real ASP.NET Core proxy target is selected or when `PROMOGEST_VITE_ONLY=1` explicitly selects the in-memory simulator. It is not a full implementation of the ASP.NET Core API.
- When `ASPNETCORE_URL` is configured, Vite proxies `/api` and `/health` to that ASP.NET Core host. The default `npm run dev` launcher verifies prerequisites, waits for the configured Cloud SQL socket, applies pending EF Core migrations with the separate migration identity, reapplies least-privilege runtime grants, verifies API readiness, and only then starts Vite. Both real-API launchers provision .NET 10 per-user through Microsoft's official installer when the SDK is missing.
- `dev-api-middleware.ts` enforces authorization/KYC-isolation/multipart-SHA256/concurrency parity for `/api/parties`, `/api/projects/:id/customers`, `/api/projects/:id/reservations`, and `/api/projects/:id/documents` (verified by HTTP integration tests in `devPreviewAuthorizationParity.test.ts`), while remaining an in-memory development simulator (retaining, e.g., setup Wilaya validation range `01–58`). Preview behavior must never be mistaken for production PostgreSQL 18 persistence or ASP.NET Core 10 security.
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


## P1-07 — Financial project-document read guard checkpoint (17 November 2026)

Base snapshot before this change: `main` SHA `69a3fa625e4b2a11b4a778d42f452c3894a0173b`; main CI [#759](https://github.com/younestech31/PROMO-GEST/actions/runs/44116903350) passed 3/3 jobs. The focused implementation and regression tests were delivered in [PR #87](https://github.com/younestech31/PROMO-GEST/pull/87), merged at `b41d34aae03e1549ca1963a23d92643ff91bf393`.

The change makes `Financial` `ListAsync`/download authorization depend on explicit `ProjectMember.CanViewFinancials` even when `RoleInProject = ProjectManager`. It records `ACCESS_DENIED` when a list hides an existing Financial document, keeps download denial auditing, and mirrors the policy in the Vite-only preview. Existing Financial upload behavior, `SYSTEM_ADMIN` behavior, project scoping, and KYC isolation are non-goals and remain unchanged.

Application, PostgreSQL 18 integration, and Vite preview regressions cover ProjectManager with and without the capability, Finance membership, non-member denial, cross-project document IDOR, list/download denial audit, and unchanged ProjectManager Financial-upload behavior.

Implementation/test commit `4b04bd9dcf0dec806def7780a9d0b22d52d21878` is in PR #87. The final PR head `8dc81b0bc74629d125c01f2549caec1370bd2ec1` passed push CI [#765](https://github.com/younestech31/PROMO-GEST/actions/runs/44123331977) and PR CI [#766](https://github.com/younestech31/PROMO-GEST/actions/runs/44123351434), all 3 jobs. CI #766 reported solution build with 0 errors, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32, full restore drill (1/1 stored files verified), frontend strict TypeScript/unit/build/static hosting, and Windows x64 publish/PowerShell checks. Post-merge main CI [#767](https://github.com/younestech31/PROMO-GEST/actions/runs/44123972890) passed all 3 jobs on merge SHA `b41d34aae03e1549ca1963a23d92643ff91bf393`.

Automated acceptance is verified. Manual browser/practitioner and production-installation checks remain separate and pending; this change does not imply production deployment or business-data/Cloud SQL changes.


## P1-01 — Territorial assertion and code-lineage evidence checkpoint (17 November 2026)

- [PR #99](https://github.com/younestech31/PROMO-GEST/pull/99) merged at `ec038a1137335c36c523469bce4e4884d45ab215`; its six-row CSV separates locality/mechta parent transfers and a commune rename from four-digit register codes. PR CI #804 and post-merge main CI #805 passed all three jobs.
- [PR #100](https://github.com/younestech31/PROMO-GEST/pull/100) merged at main SHA `29771173c2be3f803535461066625cc97e1dd61a`; its eight-row CSV preserves raw JO44/1985, JO49/1996 and JO23/1998 assertions and ONS W./C. cross-checks. PR CI #806 and post-merge main CI #807 passed all three jobs.
- The code-bearing runtime/schema baseline is unchanged: PR #87 remains the latest API/Application runtime source and PR #59 the latest EF/schema source. No application, API, migration, commune seed, production database or Cloud SQL data changed.
- The server-owned administrative reference still exposes 69 Wilayas, legal baseline 1,541 communes, `communesCount = 0`, and `PendingOfficialVerification`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.
- Open items remain the full 1,541-row legal crosswalk, exhaustive instrument chain, bilingual primary-source reconciliation, visual inspection of unresolved official PDF pages, immutable source bytes/SHA-256, full duplicate/omission/effective-date checks, and qualified Algerian practitioner sign-off.


## P1-01 historical source reconciliation — 18 November 2026 (pre-PR #107 checkpoint; superseded below)

- At this pre-PR #107 checkpoint, main was `94b4dcd8b78ad87ccc1435220475001f26190a94`; the historical branch had not yet merged. This record is retained as a dated checkpoint, not current repository state.


## P1-01 post-PR #107 source and CI checkpoint — 18 November 2026

- Current main SHA is `8b40120aaf2f649bb123cd654f88f62250ce02d9`, merge commit for [PR #107](https://github.com/younestech31/PROMO-GEST/pull/107). PR #107 CI [#821](https://github.com/younestech31/PROMO-GEST/actions/runs/44289319182) and post-merge main CI [#822](https://github.com/younestech31/PROMO-GEST/actions/runs/44289721946) both passed all three required jobs: frontend/static hosting, .NET 10 + PostgreSQL 18 least privilege, and Windows publish/PowerShell.
- PRs #105–#107 are documentation/reference-data only. The last code-bearing API/Application main source remains PR #87 (`b41d34aae03e1549ca1963a23d92643ff91bf393`); the last EF/schema source remains PR #59 (`53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`). No application, API, migration, commune seed, production DB or Cloud SQL data changed.
- Main now contains the 1,541-row working candidate crosswalk, the 404-row JO58/2026 French text-layer delta, the JO11/1986 four-row update, the JO79/2021 59-row new-Wilaya extract, the 103-row existing-Wilaya extract, and the related parent/code/label exception controls. The 59 new-Wilaya JO79 rows on printed pages 17–19 have now been visually checked against the French PDF; the 103 existing-Wilaya rows on pages 13–16 remain text-layer only. Arabic row pairing and exact source-PDF SHA-256 remain pending.
- JO79 confirms Tabelbala in W52/code 5206 while the candidate assigns the name under W08; preserve this as an unresolved parent conflict. Historical exceptions and four W07→W61 code transitions remain versioned, not overwritten.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. No canonical 1,541-row legal concordance, effective-date approval, bilingual practitioner sign-off or import authorization exists.


## Local Workspace Stabilization & P1-01 Bilingual Visual Review Checkpoint — 18 November 2026

- **Frontend runtime fixes:** replaced hardcoded `isPreviewMode={true}` in `apps/local-web/src/app/App.tsx` with `isVitePreviewRuntime(health)` (`apps/local-web/src/shared/utils/appRuntime.ts`), added `document.documentElement.lang`/`dir`/`title` synchronization via `getDocumentPresentation`, replaced in-place `session.organization` mutation with an immutable callback, and added regression tests in `apps/local-web/src/utils/appRuntime.test.ts`.
- **P1-01 bilingual PNG & SHA-256 evidence refresh:** retrieved and SHA-256 hashed 29 official JORADP and ONS PDFs, and visually PNG-inspected JO58/2026 (pp. 9–25 FR/AR), JO79/2021 (pp. 13–19 FR / 15–22 AR), JO11/1986 (pp. 280–281 FR / 401–402 AR), JO23/1998 (Boumerdès FR p. 11 vs AR p. 13), and disputed JO44/1985 sections (FR pp. 1065–1070 / AR pp. 1631–1635). Corrected 78 off-by-one JO58 page references and all 5 JO58 transcription variants (`404/404` French JO58 rows join under label normalization while preserving source variants). Proved intra-issue JO23/1998 (`A1998023.PDF` p. 13 `3514` vs `F1998023.PDF` p. 11 `3614`) and JO44/1985 Chihani (`A1985044.PDF` p. 1635 `3614` vs `F1985044.PDF` p. 1069 `3624`) bilingual divergences verbatim.
- **Boundaries unchanged:** no commune records imported (`communesCount = 0`, `PendingOfficialVerification`); P1-01 remains `In Progress / Pending` (975-row JO44 concordance and practitioner sign-off still open); P1-02 remains `Blocked`; external GitHub PR/CI (`#107` / Run `#822`) and Notion backlog trackers were not mutated from this offline workspace snapshot.


## Current main evidence checkpoint — 18 November 2026 (CI #825)

- Main SHA: `cd57a5912ccb3631a6e9581d48d1aab2600180d2`; current CI [#825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822) passed all three required jobs on this exact SHA. CI logs confirm Frontend 82/82, Domain 34/34, Application 21/21, and PostgreSQL 18 Integration 32/32; zero failed or skipped tests. The frontend job ran `npm run lint`, `npm test`, Vite build, static-output checks, and ASP.NET Core `wwwroot` build. The .NET job ran warnings-as-errors build, Linux publish, PG18 migrations/integration, and the full restore drill; the Windows publish/PowerShell job also passed.
- Frontend checkpoint `cd57a591` updates preview detection from the health response, root `lang`/`dir`/title and immutable organization-session updates. It does not close P1-14: preview middleware opt-in, loopback-by-default binding and production bundle exclusion still need a focused security slice.
- P1-01 reference work now has a 1,541-row *candidate* workpaper, 404-row JO58 extract, 59-row and 103-row JO79 extracts, and a sign-off pack recording 29 unique official PDF filenames with 29 distinct SHA-256 values. The documented bilingual PNG review covers JO58 pp. 9–25 (both editions), JO79 pp. 13–19 FR / 15–22 AR, JO11/1986, JO23/1998 disputed Boumerdès pages, and disputed JO44/1985 sections. It does not complete the 975-row remaining JO44 concordance or practitioner/legal adjudication.
- No commune rows were imported: `communesCount = 0`, `PendingOfficialVerification`. P1-01 remains In Progress / Pending and P1-02 remains Blocked. The unresolved Chabet El Ameur and Chihani source discrepancies, parent-transfer exceptions, effective-date chain and qualified Algerian reviewer decision remain explicit.
- The latest main commit `cd57a591` is not associated with a GitHub PR; this is a contribution-process deviation. This documentation sync itself is being delivered through a focused branch/PR. No API/Application runtime, EF migration, production data, Cloud SQL business data, credential or deployment change is included.
- Manual browser acceptance remains outstanding for RTL/LTR navigation, project switch/revocation, dirty forms, budget visibility, first-run and logout. Green CI does not upgrade these to passed.
 
 ### PR #110 — Vite development preview isolation (merged)
 - PR #110 merged on 18 November 2026 at main SHA `23ff17bb11123877470af38273e9e6f1ac9bbe53`; final PR head `33900b4b44910afe5cacb9fa2dd1dcdcee0de474`.
 - PR CI #861 / [run 44323665534](https://github.com/younestech31/PROMO-GEST/actions/runs/44323665534) passed all three jobs on the exact PR head. Post-merge main CI #862 / [run 44324616474](https://github.com/younestech31/PROMO-GEST/actions/runs/44324616474) passed all three jobs on the exact merge SHA.
 - Exact post-merge results: Frontend 88/88, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32; full restore drill 1/1 stored file verified; Windows machine-scope Data Protection test 1/1 plus publish/PowerShell validation passed.
 - The change requires explicit Vite-only opt-in, separates the in-memory simulator from real API/Cloud SQL targets, defaults Vite to loopback, requires exact host/origin allowlists for temporary external preview, and checks that demo identity, preview endpoint/token/UI and Bearer-token paths do not enter production SPA or ASP.NET Core static output.
 - **Still unverified manually:** Google AI Studio preview with the actual host/origin and platform network ingress restrictions. CORS/allowlists do not authenticate users. Keep P1-14 In Review / Verification Pending; no merge/CI result is a substitute for this manual check.
 - No production PostgreSQL database, Cloud SQL business data, credentials, deployment, production authentication, or production security policy was changed.

## Current main and P1-01 extraction checkpoint — 18 November 2026

- Main is `293476cbdbf3c4c3fbcae87d7c9b682a493ca436` (PR #112 merge). Main CI [#873](https://github.com/younestech31/PROMO-GEST/actions/runs/44330071074) passed 3/3 jobs on that exact SHA: Frontend 88/88, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32; restore drill 1/1; Windows machine-scoped Data Protection, publish and PowerShell validation passed. Four xUnit analyzer warnings remain; zero build errors.
- P1-01 gained a raw 26-row JO44/1985 French text-layer extraction for W31 Oran, printed p. 1068. The codes are unique 3101–3126; commune labels, code strings and seats are separate. The extract is not image-verified, not Arabic-paired, not joined to candidate rows, not effective-date adjudicated and not practitioner-approved. The JO44 planning tranche now records 26/975 extracted with 949 outstanding.
- P1-01 remains In Progress / Pending, P1-02 remains Blocked, and no commune rows are imported. No API/runtime, schema/migration, production database, Google AI Studio Cloud SQL data, credentials, deployment or security policy changed.

## P1-01 source work and main-branch checkpoint — 18 November 2026

- Main tip: `e19456f54602e184ce80087e1a8e97916b8fe471` (PR #113 documentation-only merge). PR CI #874 passed 3/3 jobs on exact PR head `e37102856ca8a9239fadd450955f99d648a4bd0f`; a post-merge run for the merge SHA is not independently confirmed here. The latest verified main CI remains #873 on parent SHA `293476cbdbf3c4c3fbcae87d7c9b682a493ca436`.
- JO44/1985 now has two independent French searchable-text source tranches: W31 Oran, 26 rows (printed p. 1068), and W06 Bejaia, 52 rows (49 on printed p. 1055 and 3 on p. 1056). Total transcribed: 78/975 planned JO44 rows; 897 remain, subject to the national completeness audit.
- Neither tranche is visually page-verified or Arabic-paired in this session. The source checksum is reused from the repository inventory, not recalculated. Candidate-row matching, valid-time and parent lineage, amendment completeness and qualified Algerian practitioner approval remain pending.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. No commune row is imported. No API/runtime, schema/migration, database data, Cloud SQL business data, credentials, deployment or security policy changed.

## P1-01 JO44 extraction checkpoint — 18 November 2026

- Main tip is `0c90e5f21c50f846711f3c2d042c2b4557850838` (PR #114 documentation-only merge). PR #114 CI [#877](https://github.com/younestech31/PROMO-GEST/actions/runs/44335040451) passed all three jobs on exact PR head `79f898041c796425d5de06a97470ee61221fc6e7`; a separate post-merge main CI result on `0c90e5f...` is not independently confirmed. Latest verified code-bearing main CI remains #873 on `293476cb...`.
- JO44/1985 now has five bounded French searchable-text extracts: W31 Oran 26 rows, W06 Bejaia 52, W02 Chlef 35, W04 Oum El Bouaghi 29, and W10 Bouira 45. Combined 187/975 planned original-register rows transcribed; 788 remain, subject to final national row-count reconciliation.
- The 109 latest rows have unique four-digit code sequences 0201–0235, 0401–0429 and 1001–1045, with commune, code and seat kept separate. Source anomalies `Labi od Medjadja`, `Tirmzrit`, and seat `T rouna` remain verbatim pending image/bilingual review.
- None of the five JO44 tranches is visually verified or Arabic-paired in the current extraction passes. The source PDF SHA is referenced from the existing repository inventory, not recomputed. No candidate join, current effective date, parent lineage, or practitioner approval is asserted.
- P1-01 stays In Progress / Pending; P1-02 stays Blocked; no commune rows are imported. No API/runtime, schema/migration, database, production, or Cloud SQL business data changed.
## P1-01 JO44 extraction checkpoint — 18 November 2026

- Main tip: `89881cff5754e2a494054fc90fa76bcdb1d8126f` (PR #115 documentation-only merge). PR CI #879 passed 3/3 jobs on exact PR head `a8799a1dada92af811142f1ec49e9dacd071a377`; separate post-merge push CI on the current main SHA is not independently confirmed. The latest verified code-bearing main CI remains #873 on `293476cb...`.
- Five previously merged JO44 extracts contain 187 rows: W31 Oran 26, W06 Bejaia 52, W02 Chlef 35, W04 Oum El Bouaghi 29 and W10 Bouira 45. This branch adds W03 Laghouat 24, W05 Batna 61 and W08 Bechar 21. Combined proposed coverage is **293/975** planned rows; **682 remain**, subject to final national row-count reconciliation.
- All eight bounded sections are text-layer-only in their extraction passes, not visually page-verified or Arabic-row-paired. Preserve `Labi od Medjadja`, `Tirmzrit`, `T rouna`, `Legride t`, `Boulh...iat` and `Boulh...at` verbatim pending source-image/bilingual review. No candidate joins, current dates, parent lineage or legal approval are inferred.
- P1-01 stays In Progress / Pending; P1-02 stays Blocked. No commune rows are imported; no runtime, schema/migration, database, production or Cloud SQL business data changed.
## P1-01 JO44 source progress — PR #117 proposed tranche (18 November 2026)

- Current main is `4c97783c1654c2ca6a1336fcf0c7e21e520c0cdd` (PR #116 merge). PR #116 CI #881 passed all three required jobs on exact PR head `7bfc75b393cbc8018e5ec9d38708607231b84c8d`; separate post-merge push CI on the main merge SHA is not independently verified.
- Eight bounded JO44/1985 French searchable-text source sections are merged: W31 Oran26, W06 Bejaia52, W02 Chlef35, W04 Oum El Bouaghi29, W10 Bouira45, W03 Laghouat24, W05 Batna61 and W08 Bechar21; 293 rows total.
- Open proposed PR #117 adds W09 Blida29, W11 Tamanghasset10 and W12 Tebessa28. If accepted, total bounded extraction becomes 360/975 planned rows; 615 remain, subject to final national row-count reconciliation.
- All current JO44 tranches are French searchable-text extraction only: no page-image visual verification or Arabic row pairing is claimed. PDF SHA-256 is reused from the repository source inventory, not recomputed in this pass. Preserve `Tirmzrit`, `T rouna`, `Labi od Medjadja`, `Legride t`, `Boulh...iat` and `Boulh...at` literally pending source-page review; do not infer current code, parent, effective date, or canonical name.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. The 1,541 candidate rows are not approved, no commune records are imported, and no runtime/API/schema/migration/production/Cloud SQL data changed.