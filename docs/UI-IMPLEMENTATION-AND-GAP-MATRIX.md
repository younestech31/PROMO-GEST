## Module E functional follow-up — existing reservation request reliability

Create/cancel/review share a synchronous write lock and frozen submitted controls;
language changes preserve draft/pending state. Project/scope-owned editors ignore
obsolete completions. Acknowledged success survives a failed list refresh, with
read-only recovery. Existing 409 recovery and review-not-approval rules unchanged.
Local183/183 PASS; new head remote checks pending. [Scope and limits](P1-06-RESERVATION-REQUEST-RELIABILITY.md).
No financial, contract, endpoint/schema or permission-policy expansion.

## Module C functional follow-up — current editor recovery

The current structure editor has read failure/retry states, project-scoped async
lifetimes, stable drafts on language change, synchronous write locking and frozen
context/form controls while saving. Failed writes retain draft/stamp; obsolete
completions cannot affect the next project. Local draft transitions use Stay/Discard
with one active editor. PR299/300 exact-head checks passed before merge; PR299
independent-main checks PASS, PR300 independent-main pending. No manual visual acceptance claimed. [Scope and limits](P1-06-STRUCTURE-WORKFLOW-COMPLETION.md).
No delete, bulk generation, pricing or unified property-file feature is added.

## Module K functional follow-up — existing document workflow

Upload intent is protected while pending; known upload success remains distinct
from subsequent list-read failure and read-only retry. Authorized loaded documents
can be searched by filename/description and filtered by category without discarding
an upload draft. Obsolete project reads/uploads/downloads cannot publish into the
next view. Language change does not unlock an in-flight upload. See
[implementation and limits](P1-06-DOCUMENT-WORKFLOW-COMPLETION.md).
This batch is on the active branch and awaits its own PR checks/merge. Metadata,
soft-archive, DocumentLink, retention and authorization policies are unchanged.

## Module D functional follow-up — CRM workflow completion

Customer registry internal transitions now share Stay/Discard protection; details,
Party lookups and central Party searches reject stale responses. Successful
customer/interaction writes remain explicitly acknowledged even if subsequent
reads fail, with dedicated read retries. Loaded customer name/contact/phone/email
search and status filters preserve the selected draft. Identity edits retain
original stamps/drafts on failure. See [scope and verification](P1-06-CRM-WORKFLOW-COMPLETION.md).
Merged in PR #295 after eight exact-head checks passed; independent-main CI is
pending at the current canonical checkpoint. No planned pipeline, Party master-data
expansion or new manual acceptance is claimed.

## Current implementation addendum — PR #258 / P1-09 real-browser automation — 26 November 2026

- Current live main: `a7560ec71519ad1252406874ef7a0910a246ce6d`, merged PR #258.
- The existing real ASP.NET Core + PostgreSQL 18 Playwright suite now covers the organization profile in four Chrome profiles (Arabic RTL/French LTR × desktop/mobile): SYSTEM_ADMIN edit/save; non-admin without `org.manage` read-only and API 403; temporary `org.manage` grant only in the fresh CI disposable database; fresh non-admin login, edit/save and API persistence.
- PR-head CI [45774500389](https://github.com/younestech31/PROMO-GEST/actions/runs/45774500389) 4/4 and CodeQL [45774500333](https://github.com/younestech31/PROMO-GEST/actions/runs/45774500333) 2/2; exact-main CI [45775053024](https://github.com/younestech31/PROMO-GEST/actions/runs/45775053024) 4/4 and CodeQL [45775052955](https://github.com/younestech31/PROMO-GEST/actions/runs/45775052955) 2/2. Domain 78/78, Application 24/24, PG18 integration 50/50, restore drill 8/8.
- This is automated acceptance evidence only. P1-09 stays In Review/Pending and `IMPLEMENTED_NOT_VERIFIED` until human SYSTEM_ADMIN/Staging verification is recorded. P1-10 remains dependent. No UI or authorization runtime behavior was changed in PR #258.

---

---

## Current implementation addendum — PR #255 / P1-49 — 25 November 2026

- Re-audited against live main `c8d09c09fcaeb1a6474574066dba22b69b5701b5`. The project directory now has server-side API pagination, stable ordering, bounded page sizes, membership-scoped counts, and SQL-side search/status filtering. See [PR #255](https://github.com/younestech31/PROMO-GEST/pull/255).
- Automated CI and CodeQL passed on exact main: [CI 45695770684](https://github.com/younestech31/PROMO-GEST/actions/runs/45695770684), [CodeQL 45695770751](https://github.com/younestech31/PROMO-GEST/actions/runs/45695770751).
- P1-49 remains In Review / Pending and `IMPLEMENTED_NOT_VERIFIED` until the requested human Arabic RTL / French LTR browser acceptance is completed. This addendum is a source inventory, not a browser-acceptance claim.

---

# PROMO GEST — UI Implementation & Gap Matrix

**Document role:** Source-audited inventory of the current React user interface, its API-backed actions, module ownership, and the gap between today's interface and the product interaction model. This is a current-state record, not a redesign specification or browser-acceptance certificate.  
**Main inspected (point-in-time, not the live tip):** `cd57a5912ccb3631a6e9581d48d1aab2600180d2` (18 November 2026; frontend runtime/language/session-state update and the P1-01 evidence checkpoint of that date). This commit is not associated with a GitHub PR; record the process deviation separately. The verified live `main` as of 23 November 2026 is `690471236b1af36323e2e7ea89aa0cbc0e76a0c8` ([PR #230](https://github.com/younestech31/PROMO-GEST/pull/230)); the interface inventory below has not been re-audited against it.  
**Last ASP.NET Core API/Application runtime source:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87); the latest EF/schema source remains `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59). The current frontend navigation consolidation is PR #90.  
**Latest frontend/test evidence:** Main CI [#825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822) passed on exact SHA `cd57a5912ccb3631a6e9581d48d1aab2600180d2`: TypeScript strict check, Frontend **82/82**, Domain **34/34**, Application **21/21**, PostgreSQL 18 Integration **32/32**, production SPA/static-host builds, restore drill, and Windows publish/PowerShell.  
**Manual acceptance:** Arabic RTL / French LTR desktop/mobile, direct-route history, dirty-form navigation, switcher keyboard/focus and membership revocation still require separate browser evidence; CI does not certify them.

## 1. Reading this matrix correctly

The matrix distinguishes three things that must not be conflated:

1. **Source presence:** a screen/component and its corresponding API call are present in the current repository.
2. **Automated verification:** the relevant code is covered by successful TypeScript, Domain, Application, or PostgreSQL 18 tests in CI. Module status follows the six-state taxonomy in MASTER-BLUEPRINT.md and MODULE-CATALOG.md.
3. **Manual user acceptance:** Arabic RTL / French LTR layout, real browser navigation, forms, errors, cookie/CSRF behavior, persistence/reload, and authorization require manual browser evidence separate from CI. On 15 November 2026, the Product Owner owner-attested successful execution of the principal desktop/mobile workflows listed in `PHASE-0-MANUAL-ACCEPTANCE.md`; the attestation is not a substitute for independently attached sanitized artifacts. P0-A01 first-run setup and P0-A04 logout/session-revocation remain unconfirmed.

This matrix was prepared from `app/App.tsx`, `app/routeRegistry.ts`, `core/api/`, `core/permissions/`, `core/modules/`, `core/localization/`, module-owned screens/public indexes, `shared/components/`, tested legacy adapters, API controllers, application services, and canonical module/security documentation at current main SHA `cd57a5912ccb3631a6e9581d48d1aab2600180d2`.

## 2. Current application shell and navigation

| Area | Current implementation | What is not implemented yet |
|---|---|---|
| First-run setup | FirstRunSetupWizard.tsx collects legal identity, Algerian legal form, Wilaya, address/contact details, default language, optional setup bootstrap token (`X-PROMOGEST-SETUP-TOKEN` when required), and initial SYSTEM_ADMIN; calls GET /api/setup/status and POST /api/setup/initialize. Its Wilaya selector consumes the server-owned `GET /api/reference/administrative-units` contract through `useAdministrativeReference`; the Vite preview exposes only a development contract mirror. | The 1,541-commune hierarchy remains unloaded and pending official verification. P0-A01 (empty disposable database and second-initialization rejection) remains `NOT_RUN`. |
| Authentication | LoginScreen.tsx performs username/email + password login; App.tsx restores a session and loads authorized projects. API client handles CSRF tokens and session cookies. | Manual real-browser cookie/CSRF and bilingual acceptance remains a Phase 0 gate. |
| Organization & technical admin shell | `app/routeRegistry.ts` owns route parsing/metadata/access policy; `core/modules/routeTypes.ts` owns route types. `AppContentRouter` checks access before protected views mount. The app dirty guard covers route/project switching, Back/Forward, reload/tab close and logout; `SystemDiagnosticsView` is owned by technical administration. The 18 November frontend update also derives preview affordance from health metadata, syncs document `lang`/`dir`/title and applies immutable organization session updates. | PRs #81/#82 and current frontend changes are merged; main CI #825 passed. P1-14 preview isolation is not complete, and RTL/LTR desktop/mobile browser acceptance and real navigation evidence remain outstanding (`IMPLEMENTED_NOT_VERIFIED`). |
| Overview & Reports | `OverviewView.tsx`, `ReportsWorkspaceView.tsx` display live authorized project/organization metrics without fabricating unavailable KPIs. | Cross-module commercial, arrears, construction variance, and SCF exports remain `PLANNED`. |
| Organization profile | `OrganizationProfileView.tsx` renders legal/fiscal and location/contact details (gated by `org.read` / `org.manage`) and permits authorized `org.manage` edits via `PUT /api/organization` with `ExpectedConcurrencyStamp` CAS conflict handling, consuming the 69-Wilaya API, plus dirty-form / save-and-continue protection. | The complete 1,541-commune hierarchy is not loaded (`TerritorialReferenceView.tsx` documents `69` active Wilayas vs `0` loaded communes). |
| User administration | `UsersManagementView.tsx` supports user-account creation, edit, role assignment, activation/deactivation, and password reset with unsaved modal confirmation. | No complete HR/Employee master, attendance, payroll, or HR workflow. |
| Audit administration | `AuditLogView.tsx` lists a bounded recent audit result (currently requests up to 100 rows) and permits refresh under `audit.read` route gating. | No broader security investigation, export, or retention-management UX. |

The shell routes through URL paths managed cleanly per browser tab, enforces `canAccessRoute` prior to mounting gated routes, and clears stale state cleanly upon project-access revocation (`revokeProjectAccessFromState`).

## 3. Project directory and project-scoped views

| Module | Current screen/component | Source-backed actions and API paths | Current status | Gap against target |
|---|---|---|---|---|
| **B — Real Estate Projects** | `modules/module-b-projects/pages/ProjectsAccessView.tsx`, `ProjectWorkspaceView.tsx`, `components/ProjectSwitcherModal.tsx` | Directory search and status filters call the server; `/projects/:id/*` addresses each project context; one persistent global-header switcher opens the server-backed, authorized search dialog; the identity strip preserves project identity and directory/pin actions; the active-project sidebar is the only project-section navigation surface (PR #90 / D-015). Revocation cleanup and dirty navigation guards remain in place. | `IMPLEMENTED_NOT_VERIFIED` *(PRs #81/#82/#90 and main CI #825; manual desktop/mobile RTL/LTR acceptance remains pending)*. | Municipality remains free text until verified commune import. Server-side pagination/sort views are not implemented; browser acceptance of search, pins, switching and revocation remains open. |
| **C — Physical Structure & Units** | `ProjectStructureModal.tsx` | Embedded or modal view: read structure; create/update buildings, floors, and units; change unit status; tracks per-form dirty flags across tabs/close. Enforces `projects.structure.manage` alongside `ProjectMember` capabilities. | `PARTIALLY_IMPLEMENTED` | No delete/bulk generation, unit base price/orientation, or unified property file. |
| **D — Customers & CRM** | `ProjectCustomerRegistryModal.tsx`, `PartiesDirectoryView.tsx` | Project customer CRUD, interaction logging, KYC document link, canonical `Party` search & authorized update (`/api/parties`), dirty-form close/sub-tab guards. `PartiesDirectoryView.tsx` is route-gated by `parties.directory.read`. | `PARTIALLY_IMPLEMENTED` | No standalone HR/Employee master, `PartyContactPoint`, protected `PartyIdentifier`, representative model, or human-reviewed Party merge. |
| **E — Internal Unit Holds** | `ProjectSalesReservationsModal.tsx` | List/create/cancel internal holds with expiry and cancellation reason + dirty-form close guard; dev preview simulator also enforces write/read/expiry/cancel parity. | `IMPLEMENTED_AND_VERIFIED` *(modal hold workflow & PostgreSQL 18 E2E)* / `IMPLEMENTED_NOT_VERIFIED` *(workspace shell wrapper)*. | Strictly an internal hold; not a statutory contract and collects zero cash. |
| **K — Project Documents / K-Min base** | `ProjectDocumentsModal.tsx` | Upload (`POST`), list (`GET`), and download (`GET .../download`) with SHA-256 verification, capability category scoping, `customers.read` KYC isolation, and dirty upload/sub-tab close guard. | `PARTIALLY_IMPLEMENTED` *(active upload/list/download verified; metadata editing, soft-archive, `DocumentLink`, and K-Full retention `PLANNED`)*. | Metadata updates, soft-archive, structured `DocumentLink` entity links, and K-Full retention remain unimplemented. |

### Project context behavior today

Users navigate between the organization workspace, project directory, explicit project switcher (`Ctrl/Cmd+K` outside editable controls), and URL-addressed `ProjectWorkspaceView`. The app guard covers internal route changes, project switches, Back/Forward, reload/tab close and logout. Project settings and organization profile register save callbacks; other dirty surfaces can explicitly discard or stay while their screen-level confirmation behavior remains active. Revoked project IDs are removed from cache and recent/pinned preferences before returning to organization workspace. CI tests cover route parsing/authorization, navigation-guard decisions and revocation-state cleanup; they do not replace manual browser testing of each embedded form.

## 4. Module coverage and planned sub-screens

| Module | Target business workflow | Current UI status |
|---|---|---|
| **F — Contracts & Legal Deeds** | 7 planned sub-screens; module page and workflow presentation metadata live in `module-f-contracts/pages/` and `presentation/workflows.ts`. | `PLANNED`; API methods reject explicitly as unavailable; no contract business capability is implemented. Legal/notarial interface content awaits qualified Algerian practitioner review. |
| **G — Installments, Collections & Treasury** | 7 planned sub-screens; DZD schedules, receipts, FGCMPI escrow vs promoter cash, refunds and buyer ledger. | `PLANNED`; API methods reject explicitly as unavailable; no treasury capability is implemented. |
| **H — Construction & Site** | 7 planned sub-screens; work lots, contractor agreements, attachements, situations and milestone evidence. | `PLANNED`; API methods reject explicitly as unavailable; no construction workflow capability is implemented. |
| **I — Procurement & Inventory** | 6 planned sub-screens; suppliers, purchase orders, receipts, stock ledger and invoices. | `PLANNED`; API methods reject explicitly as unavailable; no procurement/inventory capability is implemented. |
| **J — SCF & Tax** | 6 planned sub-screens; SCF chart Classes 1–7, balanced journals, periods and tax preparation. | `PLANNED`; API methods reject explicitly as unavailable; accountant sign-off remains mandatory; no statutory rates are hardcoded. |
| **L — Reporting & Control** | `ReportsWorkspaceView.tsx`, `OverviewView.tsx`, and `AuditLogView.tsx` expose live portfolio & audit views plus planned commercial/arrears/variance/SCF columns. | `PARTIALLY_IMPLEMENTED`. |

## 5. Three-level product interaction model — comparison

| Target context | Current implementation | Gap |
|---|---|---|
| **1. Organization workspace** | Organization-oriented Overview with identity, technical diagnostics, and quick links. | Role-aware tasks, approvals, alerts, and real authorized portfolio indicators do not exist yet; technical diagnostics should move to technical administration. |
| **2. Project selection/switching** | Project directory plus explicit `ProjectSwitcherModal`, including search, recent/pinned project preferences, and `Ctrl/Cmd+K` outside editable controls. | Manual browser verification of search, recent/pinned behavior and keyboard accessibility remains outstanding; directory remains the deliberate browse/manage destination. |
| **3. Active project workspace** | `ProjectWorkspaceView` is route-addressable at `/projects/:projectId/*` and displays a persistent identity strip, section PageHeader and breadcrumb. Project sections are navigated from the active-project sidebar; the global header is the only project-switch entry point (PR #90 / D-015). | Manual RTL/LTR desktop/mobile verification of route history, dirty-form workflows, switcher focus/keyboard behavior and revocation remains outstanding; the complete role-aware task workspace is not implemented. |
| **Separate technical administration** | User management, audit and diagnostics now have an owning `modules/technical-admin/` implementation directory and `/admin/*` routes. The pages still use the shared application shell. | Full separation of technical administration from the daily-work navigation/context and the broader backup/restore/security workbench remains outstanding. |

**Current main evidence (18 November 2026):** [CI #825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822) passed all three jobs on `cd57a5912ccb3631a6e9581d48d1aab2600180d2`: Frontend 82/82, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32, Linux/Windows publishing and restore checks. This does not replace RTL/LTR browser acceptance.

**P1-14 preview security boundary:** the helper now reads `health.previewMode`, but preview isolation is not complete: Vite can mount the in-memory middleware without explicit `PROMOGEST_VITE_ONLY=1`, development scripts bind `0.0.0.0`, and preview Bearer-token/endpoint code remains in the shared API client. Do not describe preview as production-isolated until explicit opt-in, loopback default, and production bundle/source-boundary tests are merged.

## 6. Earlier PR #81 verification evidence (historical checkpoint)

The following records the PR #81-era evidence, not the latest main verification (see the current main evidence directly above):

- The main baseline used for PR #81 was `9af8324dc516c7536eda33c2a487275c30e792d3`; PR #81 merged to main at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`.
- Post-merge main GitHub Actions Run #730 / [44091044674](https://github.com/younestech31/PROMO-GEST/actions/runs/44091044674) passed all three jobs: strict frontend TypeScript, **68/68** frontend tests, Vite production build, ASP.NET Core static-host output, .NET 10/PostgreSQL 18 build/integration/restore checks, and Windows x64 publish/PowerShell validation.
- Backend/schema source remains `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`; PR #81 did not change backend, database, migration, security-policy or production configuration files. Run #730 is post-merge CI evidence, not production/customer-site acceptance.
- The PR adds route registry parsing/metadata and authorization tests, project revocation state cleanup, navigation-guard decisions, canonical module registry/public interfaces, single implementation checks for API/CSRF/localization/shared UI, active module import boundaries/acyclic dependency checks, F–J presentation/API separation, and explicit planned endpoint rejection. Browser automation of dirty forms and manual desktop/mobile RTL/LTR walkthroughs were not performed.
- The Product Owner's earlier Arabic RTL / French LTR desktop/mobile acceptance remains owner-attested only for the workflows listed in `PHASE-0-MANUAL-ACCEPTANCE.md`; no new browser acceptance is claimed for PR #81. P0-A01 and P0-A04 remain `NOT_RUN`.

**Owner-attested as passed:** Arabic RTL / French LTR desktop/mobile review for the listed real workflows; login/session/CSRF; projects and structure; customers/interactions; internal holds including cancellation/expiry; document upload/download/SHA-256; authorization/audit/concurrency/safe errors; and persistence after reload. See the owner-attested result register in `PHASE-0-MANUAL-ACCEPTANCE.md`.

**Still not evidenced:** P0-A01 first-run setup against a separate empty disposable database and rejection of a second initialization; and P0-A04 logout followed by protected-route/session-revocation verification. Browser/version metadata and sanitized per-case artifacts were not attached. P1-04 navigation design review is now recorded in D-013 as approved with modifications; the full three-level UX and browser acceptance remain separately gated; PR #81 implements route/dirty-state safeguards only, not the complete product interaction model.

## 7. Next work by dependency order

1. **Phase 0 residual exceptions:** execute P0-A01 against a separate empty disposable database and verify safe rejection of a second initialization; execute P0-A04 by signing out and proving session revocation and protected-route denial. Keep both recorded as `NOT_RUN` until real evidence exists; they remain accepted residual exceptions, not passes.
2. **P1-01 — official commune source audit:** reconcile Law 26-06, Decrees 26-206/26-208 and authoritative government datasets for all 69 Wilaya–commune relationships. The ONS 2021 58-Wilaya reference alone is insufficient.
3. **P1-02 — commune catalogue implementation:** remains `BLOCKED` until P1-01 is reviewed and accepted. Do not invent codes, labels, parent assignments or effective dates, and preserve historical free-text snapshots.
4. **P1-03 — Party and Employee master-data scope:** decision D-012 is recorded and merged in PR #68 (main CI #602); REQ-D04 is `IMPLEMENTED_AND_VERIFIED`, REQ-D05/REQ-D06 remain `PLANNED`, and Module D remains `PARTIALLY_IMPLEMENTED`.
5. **P1-04 — bounded navigation review:** D-013 approves the three-level organization workspace → explicit project switcher → active project workspace model with modifications, as a design decision only. PR #81 / P1-06 adds separate route and dirty-state safety and module ownership corrections; it does not implement the complete D-013 product model. Any remaining P1-04 work must follow the independent, authorized vertical slices defined in D-013. D-013 also flags the current `EstimatedBudgetDzd` project-summary exposure for product/security classification before adding broader financial indicators.
6. **P1-05 — Phase 1 closure:** keep `BLOCKED` until P1-01/P1-02 dependencies, P1-03/P1-04 accepted evidence, P0-A01/P0-A04 residuals, latest CI, and applicable professional review evidence are reconciled in Notion.
7. **Later phases:** do not start Phase 2–5 business implementation before Phase 1 closure, K-Min prerequisites, and qualified Algerian practitioner sign-offs.

## 7A. Historical Phase 1 navigation review — D-013 (16 November 2026)

D-013 approves the three-level organization workspace → explicit project selection/switcher → active project workspace model **with modifications**, as a design decision only. It does not upgrade missing UI capabilities to implemented states.

The following source facts describe the repository at the D-013 decision date (16 November 2026); do not read them as the current implementation:
- `App.tsx` maintains five in-memory route states only; no router or stable project route exists. On login it loads `GET /api/projects` and lands on `overview`.
- `ErpShellLayout.tsx` shows organization identity and language; it links to overview/projects and conditionally users/audit. No persistent project switcher or active-project identity strip exists.
- `OverviewView.tsx` shows PG18/API/environment readiness diagnostics, project count and shortcuts; no real task, approval, alert or operational KPI feed exists.
- `ProjectsAccessView.tsx` at the D-013 decision date was a full accessible-project table with code, localized name, location, status, capability-redacted estimated budget, member and structure counts. PR #80 / D-014 makes `EstimatedBudgetDzd` visible only to an explicit project member with `CanViewFinancials`; writes additionally require `projects.manage` and ProjectManager membership. An unauthorized general update sends `null` and preserves the stored value; unauthorized numeric attempts are rejected and audited. The budget editor is hidden unless the current actor can write the value. It launches project-specific structure/customer/reservation/document/access modals whose headers show project code and localized name. At that snapshot, no search/filter/pagination was rendered.
- `GET /api/projects` supports `q` and `status`; `ProjectService.ListAccessibleProjectsAsync` returns all projects only for `SYSTEM_ADMIN`, otherwise uses the repository's membership-filtered query. PostgreSQL filters search across code, Arabic/French names, Wilaya and municipality. `GET /api/projects/{id}` separately checks explicit membership for non-admins. The current main directory now sends the search query (`q`) and status filter (`status`) to the server; server-side pagination is still not implemented. **Resolved security review item (PR #80 / D-014 / ADR-0011):** `EstimatedBudgetDzd` is restricted project financial data. API list/detail/create/update/member responses redact the value to `null` without explicit `ProjectMember.CanViewFinancials`; a write additionally requires `projects.manage` and ProjectManager membership. Null general updates preserve the stored budget, unauthorized numeric writes are rejected and audited, and the UI hides the editor or displays a dash. PR CI #707, post-merge main CI #708 and current main CI #825 passed; manual bilingual browser acceptance remains outstanding.
- UI permission helpers hide/disable affordances, but project services/controllers enforce server authorization. The current `org.manage` profile-edit flow uses expected-concurrency protection; the old claim that the organization profile is read-only has been corrected in `PROJECT-NAVIGATION-UX.md`.

**Approved constraints:** Do not fabricate tasks/approvals/alerts/KPIs. Keep organization profile management separate from technical diagnostics. Add server-backed search/pass-through and server-side pagination before scaling project directory access. Project context shall be route-per-tab and visibly identified; it is not an authorization token. Each API request revalidates permissions, ProjectMember membership, capabilities and record/project ownership. Do not rely on localStorage/currentProjectId for authorization. Preserve unsaved edits with explicit switch confirmation. Recents/favorites are preferences only. Do not enable cross-project writes/bulk mutations in first release. Keep current modal workflows until replacement routes pass acceptance. Maintain Arabic RTL / French LTR and accessible keyboard/mobile patterns.

**Next implementation order recorded at the D-013 decision date (historical):** (1) URL route foundation and per-tab isolation, (2) persistent active-project identity/breadcrumb and explicit switcher backed by the authorized API, (3) server-side query pass-through/search/filter/pagination, (4) separately gated technical administration, (5) real organization work center only when underlying modules own real task/approval data, (6) optional preference-only recents/favorites, and (7) an independent workstream/milestone domain review. PR #90 later implemented the single header switcher/sidebar-only project navigation; the current gaps are tracked in the project matrix and roadmap. No UI implementation, route library, API/permission/schema/migration or business data change was included in D-013.

## 8. Change policy for this document

Update this matrix whenever a screen, API-backed user action, route, permission, module status, or acceptance test changes. Record actual source paths and verification evidence. Never mark manual RTL/LTR browser acceptance or a full business workflow verified solely from CI green or component presence.
