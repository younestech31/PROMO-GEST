# PROMO GEST — Current State Baseline

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Operational Roadmap:** [Notion Master Roadmap](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f) · [Notion Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46). Notion governs work sequencing and task tracking; this file and the current repository remain the source of implementation and verification truth.  
**Last ASP.NET Core API/Application runtime source:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87 merge; P1-07 Financial document read authorization and list-denial audit). PR #87 added no EF Core migration; the last EF/schema source remains PR #59 / `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`.  
**Frontend main source baseline:** `69a3fa625e4b2a11b4a778d42f452c3894a0173b` (PR #86 merge; includes the modular architecture from PRs #81/#82 and subsequent setup/logout frontend corrections).  
**Latest test-source commit:** PR #87 final head `8dc81b0bc74629d125c01f2549caec1370bd2ec1`; PR CI [#766](https://github.com/younestech31/PROMO-GEST/actions/runs/44123351434) passed all three jobs. It reported Domain 34/34, Application 21/21 and PostgreSQL 18 Integration 32/32. Main CI [#767](https://github.com/younestech31/PROMO-GEST/actions/runs/44123972890) passed all three jobs on merge SHA `b41d34aae03e1549ca1963a23d92643ff91bf393`.  
**Most recent code-bearing Main commit inspected:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87 merge; PRs #91–#100 after it were documentation-only and changed no application code or EF schema).
**Latest main CI:** Run [#809](https://github.com/younestech31/PROMO-GEST/actions/runs/44195620196) passed all three required jobs on current main SHA `0135712ab766f1e19283f3f2fee36fb61edfa85c` (Frontend checks/static hosting; .NET 10 + PostgreSQL 18; Windows publish/PowerShell). Detailed test totals remain in code-bearing Run #795; PRs #96–#101 are documentation-only and did not change application code or schema.
**Recent delivery evidence:** PR #80/#81/#82/#87 remain the latest relevant code-bearing deliveries; PR #87 is the last API/Application runtime source (`b41d34aae03e1549ca1963a23d92643ff91bf393`) and PR #59 remains the EF/schema source (`53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`). PRs #92–#100 are documentation-only source/baseline audits. PR #99 adds six row-level territorial/name assertions; PR #100 adds eight code-lineage cross-check assertions and records the Decree 85-20 code semantics. PR CI #804/#806 and post-merge main CI #805/#807 passed all three jobs on their exact SHAs.
**Manual acceptance boundary:** Arabic RTL / French LTR browser acceptance, desktop/mobile navigation, dirty-form Back/Forward/reload/tab-close, project switching/revocation, and budget redaction UI remain pending independent browser evidence. P0-A01 and P0-A04 remain `NOT_RUN` for manual first-run and logout/session-revocation acceptance.
**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited repository baseline. A green pipeline does not certify untested browser UX, preview parity, production installation, or legal/accounting correctness.

---

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | Code-bearing Run #795 recorded **34/34** Domain tests; latest post-merge main CI #807 passed all three required jobs on current main. | Additional coverage is added with each domain change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | Code-bearing Run #795 recorded **21/21** Application tests; latest post-merge main CI #807 passed all three required jobs on current main. | Browser-level workflows are outside this test suite. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | Run #795 recorded **32/32** PostgreSQL 18 integration tests with separate provisioning, migration-owner, and least-privilege runtime identities, plus the full restore drill; post-merge main CI #807 passed all three required jobs. | CI evidence does not replace a representative customer-site backup/restore and migration rehearsal or manual browser acceptance. |
| Local React SPA (`apps/local-web`) | `IMPLEMENTED_NOT_VERIFIED` *(architecture checks merged; manual acceptance outstanding)* | Run #795 recorded frontend strict TypeScript and 79/79 unit tests plus Vite production and ASP.NET Core static-host jobs; latest post-merge main CI #807 passed all three required jobs. | Manual Arabic RTL / French LTR browser acceptance (desktop/mobile), direct-route journeys, dirty-form Back/Forward/reload/tab-close, project switching and revoked-project flows remain outstanding. CI is not browser acceptance. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 and Phase 1 PRs #55–#57 merged. ProjectCustomer identity mirrors are retired; PostgreSQL deferred triggers enforce `(project_id, Party.normalized_display_name, project_customer.normalized_phone)` across relationship writes and Party identity updates. Main CI #573 verifies concurrent duplicate rejection, Party-rename collision rejection, migration rollback, fail-closed preflight, and recovery. | Employee, Party contact-point/identifier/representative models, full PartyRole lifecycle, and human-reviewed merge tooling remain unimplemented. No production or Cloud SQL database was migrated. |
| Organization profile editing | `IMPLEMENTED_AND_VERIFIED` | `PUT /api/organization`, `org.manage` enforcement, audit events and `ExpectedConcurrencyStamp` conflict handling are verified. PR #59 also connects its Wilaya selector to the server-owned reference API. | Commune/municipality remains free text pending a verified commune catalogue. |
| Project estimated-budget financial capability | `IMPLEMENTED_NOT_VERIFIED` | PR #80 / D-014 / ADR-0011 merged at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; PR CI #707, post-merge main CI #708 and post-merge main CI #807 passed on exact current main SHA `29771173c2be3f803535461066625cc97e1dd61a`. Server redaction, write capability and auditing are automated. | Manual Arabic RTL / French LTR browser proof for redaction, authorized visibility and editor hiding/showing remains outstanding. |
| Algerian administrative reference — Wilaya subset | `IMPLEMENTED_AND_VERIFIED` | Versioned bilingual 69-Wilaya reference in `AlgerianAdministrativeReference`; public `GET /api/reference/administrative-units`; first-run setup, organization profile and project create/update selectors consume the API. Post-merge main CI #807 passed all three required jobs on exact current main SHA `29771173c2be3f803535461066625cc97e1dd61a`. | API reports `communesCount = 0` and `PendingOfficialVerification`; the full 1,541-commune hierarchy is not loaded. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture, legal/accounting prerequisites, and tailored bilingual column-preview workspaces (`PlannedProjectModuleView.tsx` + `moduleCatalog.ts`, with zero hardcoded statutory tax-rate literals) are documented. | No production business implementation, persistence, or active mutation endpoints; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download, SHA-256 checks, `ProjectMember`-capability category scoping, and `customers.read` isolation for customer identity documents are implemented in ASP.NET Core 10 and mirrored in `dev-api-middleware.ts`. | Metadata update, soft-archive, `DocumentLink`, and K-Full retention/archival remain `PLANNED`. |

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
- PR-head CI #707 passed all three jobs on the final head; post-merge main CI #708 passed all three jobs on merge SHA `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`. Post-merge main CI #809 passed all three required jobs on current main SHA `0135712ab766f1e19283f3f2fee36fb61edfa85c`.
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
6. **Phase 1 progress:** Phase 1 remains `IN_PROGRESS`. Party identity separation and the PostgreSQL duplicate guard are verified. PR #59 completes the server-owned 69-Wilaya API-to-UI integration. The 1,541-commune catalogue remains pending (`communesCount = 0`, `PendingOfficialVerification`); project municipality remains free text. P1-01 official commune-source reconciliation remains In Progress / Pending. PRs #92–#100 expanded the candidate-source and legal-source audit. PR #99 adds six source-traceable territorial/name assertions; PR #100 records Decree 85-20 Articles 3–4 and eight code-lineage cross-checks, including ONS W./C. values and the unresolved 1985/1998 Chabet conflict. These are evidence supplements, not the full 1,541-row concordance; no commune rows were imported. P1-02 catalogue implementation remains Blocked until the full crosswalk, visual source review, effective-date reconciliation, and qualified review are accepted. P1-04 / D-013 remains an approved design decision only. PR #81 / P1-06 is merged at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; post-merge Run #730 passed. It adds route/dirty-state safeguards, canonical shared-platform sources, module ownership/public-interface boundaries and regression tests. Manual browser acceptance remains pending; this does not relabel D-013 as a fully implemented product model. P1-05 / D-014 estimated-budget capability is merged in PR #80 at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; PR CI #707 and post-merge main CI #708 passed, and current main CI #807 passed all three required jobs on exact main SHA `29771173c2be3f803535461066625cc97e1dd61a`. Manual bilingual browser acceptance remains outstanding, so the capability stays `IMPLEMENTED_NOT_VERIFIED` and the Notion task remains In Review / Pending. P0-A01 and P0-A04 remain `NOT_RUN`; no Phase 2–5 business implementation is authorized until applicable gates and practitioner approvals pass.

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
