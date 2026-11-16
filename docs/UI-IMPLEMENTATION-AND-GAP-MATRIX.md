# PROMO GEST — UI Implementation & Gap Matrix

**Document role:** Source-audited inventory of the current React user interface, its API-backed actions, module ownership, and the gap between today's interface and the product interaction model. This is a current-state record, not a redesign specification or browser-acceptance certificate.  
**Main commit inspected:** `4fdfcb2679231ff81b8756a8da6ba3045bea5288` (documentation-only merge PR #69; PR CI #603 passed all 3 jobs, main CI #604 is the post-merge verification).  
**Last application runtime source commit:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59; no later application-source change was found on `main`).  
**Latest test-source commit:** `58dde79719db5949033363dfed1e4e9cb8b66f29` (PR #63 test-only PostgreSQL 18 first-run setup and logout/session-revocation regression tests).  
**Latest documentation PR CI:** PR #69 Run #603 / [43911049988](https://github.com/younestech31/PROMO-GEST/actions/runs/43911049988) passed all 3 jobs on PR head `e6345ae4d3f3b9497ca7d16824b10a8cb5a6cd60`; its main merge SHA `4fdfcb2679231ff81b8756a8da6ba3045bea5288` is checked by main Run #604 / [43911498773](https://github.com/younestech31/PROMO-GEST/actions/runs/43911498773).  
**Latest application-source CI:** Run #581 / [43881240365](https://github.com/younestech31/PROMO-GEST/actions/runs/43881240365) passed all three jobs on code SHA `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`.

## 1. Reading this matrix correctly

The matrix distinguishes three things that must not be conflated:

1. **Source presence:** a screen/component and its corresponding API call are present in the current repository.
2. **Automated verification:** the relevant code is covered by successful TypeScript, Domain, Application, or PostgreSQL 18 tests in CI. Module status follows the six-state taxonomy in MASTER-BLUEPRINT.md and MODULE-CATALOG.md.
3. **Manual user acceptance:** Arabic RTL / French LTR layout, real browser navigation, forms, errors, cookie/CSRF behavior, persistence/reload, and authorization require manual browser evidence separate from CI. On 15 November 2026, the Product Owner owner-attested successful execution of the principal desktop/mobile workflows listed in `PHASE-0-MANUAL-ACCEPTANCE.md`; the attestation is not a substitute for independently attached sanitized artifacts. P0-A01 first-run setup and P0-A04 logout/session-revocation remain unconfirmed.

This matrix was prepared from App.tsx, ErpShellLayout.tsx, the listed feature components, apiClient.ts, API controllers, application services, permission helpers, and the current canonical module/security documentation.

## 2. Current application shell and navigation

| Area | Current implementation | What is not implemented yet |
|---|---|---|
| First-run setup | FirstRunSetupWizard.tsx collects legal identity, Algerian legal form, Wilaya, address/contact details, default language, optional setup bootstrap token (`X-PROMOGEST-SETUP-TOKEN` when required), and initial SYSTEM_ADMIN; calls GET /api/setup/status and POST /api/setup/initialize. Its Wilaya selector consumes the server-owned `GET /api/reference/administrative-units` contract through `useAdministrativeReference`; the Vite preview exposes only a development contract mirror. | The 1,541-commune hierarchy remains unloaded and pending official verification. P0-A01 (empty disposable database and second-initialization rejection) remains `NOT_RUN`. |
| Authentication | LoginScreen.tsx performs username/email + password login; App.tsx restores a session and loads authorized projects. API client handles CSRF tokens and session cookies. | Manual real-browser cookie/CSRF and bilingual acceptance remains a Phase 0 gate. |
| Organization shell | ErpShellLayout.tsx shows organization identity, user/role, language switcher, and navigation for Overview, Projects, Users, Audit, and Organization. | No distinct technical-administration workspace and no separate daily task/work queue. |
| Overview | OverviewView.tsx shows organization identity, database/API readiness diagnostics, accessible-project count, session identity, and shortcuts to Projects/Users/Audit; it lists a small static description of future domains. | No real task inbox, approval queue, operational alerts, sales/arrears/construction KPIs, or executive portfolio reporting. System-health diagnostics are mixed into daily Overview. |
| Organization profile | OrganizationProfileView.tsx renders legal/fiscal and location/contact details (gated by `org.read` / `org.manage`) and permits authorized `org.manage` edits via `PUT /api/organization` with `ExpectedConcurrencyStamp` CAS conflict handling. Its Wilaya selector consumes the server-owned versioned 69-Wilaya API and submits the API's canonical bilingual label. | The complete 1,541-commune hierarchy is not loaded; municipality remains a free-text historical/current snapshot pending official reconciliation. |
| User administration | UsersManagementView.tsx supports user-account creation, edit, role assignment, activation/deactivation, and password reset. | No complete HR/Employee master, attendance, payroll, or HR workflow. |
| Audit administration | AuditLogView.tsx lists a bounded recent audit result (currently requests up to 100 rows) and permits refresh. | No broader security investigation, export, or retention-management UX. |

The current shell has five in-memory route values: overview, projects, users, audit, and organization. It does not yet have a stable route-addressable project context.

## 3. Project directory and project-scoped views

| Module | Current screen/component | Source-backed actions and API paths | Current status | Gap against target |
|---|---|---|---|---|
| **B — Real Estate Projects** | ProjectsAccessView.tsx | List projects visible to the current user; create/update project; assign/remove project members. Uses GET /api/projects, POST /api/projects, PUT /api/projects/{id}, PUT /api/projects/{id}/members, and DELETE /api/projects/{id}/members/{userId}. Project create/update Wilaya selectors consume `GET /api/reference/administrative-units` through `useAdministrativeReference` and submit the server's canonical bilingual name. Table shows code, name, location, status, estimated DZD budget, and member count. | IMPLEMENTED_AND_VERIFIED (module catalog). | Directory is the primary place to access project tools. There is no dedicated project switcher, recent/favorite access, project landing page, or route-addressable active project workspace. Municipality remains a free-text snapshot until the official commune hierarchy is verified and imported. |
| **C — Physical Structure & Units** | ProjectStructureModal.tsx | Read structure; create/update buildings and floors; create/update property units; change unit status. Uses GET /api/projects/{id}/structure and POST/PUT project structure routes. Enforces `projects.structure.manage` alongside `ProjectMember` capabilities. | IMPLEMENTED_AND_VERIFIED with documented gaps. | No delete/bulk generation, unit base price/orientation, or unified property file connecting legal, sales, finance, and construction records. |
| **D — Customers & CRM** | ProjectCustomerRegistryModal.tsx | Project customer list/details/create/update; canonical Party search and selection; customer interaction/follow-up entry; linked identity-document download. Uses /api/parties, /api/projects/{id}/customers, /interactions, and authorized document download. | PARTIALLY_IMPLEMENTED. | No standalone organization-wide Party workspace, full sales pipeline, lead assignment/qualification funnel, campaigns, complete representative/contact-point lifecycle, Party identifiers, or Employee master. Party identity mirrors on ProjectCustomer were retired by Migration #12; Migration #13 reinstates the project/name/normalized-phone duplicate invariant with PostgreSQL triggers. |
| **E — Internal Unit Holds** | ProjectSalesReservationsModal.tsx | List/create/cancel project holds; choose a currently available unit and project customer; set expiry; enter cancellation reason. Uses GET/POST /api/projects/{id}/reservations and POST .../{reservationId}/cancel. Expiry is handled by backend service/worker. | IMPLEMENTED_AND_VERIFIED (PostgreSQL 18 E2E plus Product Owner-attested real UI workflow). | Strictly an internal hold. It is not a statutory reservation contract, does not collect promoter cash, and does not generate installments or tax events. Legal conversion belongs to Phase 2 after K-Min and practitioner sign-off. |
| **K — Project Documents / K-Min base** | ProjectDocumentsModal.tsx | Upload a project file with category/description, list files, and download files. Uses GET/POST /api/projects/{id}/documents and GET .../{fileId}/download. Category capability checks and `customers.read` isolation for customer identity files are enforced server-side (`VIEWER` lacks `files.read`). | PARTIALLY_IMPLEMENTED overall; existing upload/list/download/SHA-256 slice is owner-attested verified. | Metadata update, soft-archive, structured DocumentLink references to business records, retention/legal holds, and K-Full are not implemented. |

### Project context behavior today

The project directory displays actions for Structure, Customers/Prospects, Reservations, Documents, project edit, and team access in each project row. Selecting one opens a modal with that project's code and name in the modal header. This is useful project-scoped functionality, but it is **not** the target active project workspace: there is no persistent project navigation, breadcrumb, explicit switcher, or URL project context. The active project is held in component state while a modal is open, not as a durable application route.

## 4. Module coverage not yet present as user-facing workflows

| Module | Target business workflow | Current UI status |
|---|---|---|
| **F — Contracts & Legal Deeds** | Statutory reservation, VSP contract, final notarial sale deed, immutable contract versions, buyer shares, legal documents. | PLANNED; no production screens/API workflow. |
| **G — Installments, Collections & Treasury** | Contractual obligations, DZD receipts, allocations, cashbox/bank, refunds/reversals, buyer statements, FGCMPI separation. | PLANNED; no production screens/API workflow. |
| **H — Construction & Site** | Work lots, site measurements, contractor situations, accepted milestone evidence. | PLANNED; no production screens/API workflow. |
| **I — Procurement & Inventory** | Suppliers, purchase requests/orders, delivery notes, warehouse/site stock movements. | PLANNED; no production screens/API workflow. |
| **J — SCF & Tax** | Double-entry SCF journals, fiscal periods, tax events, VAT/IBS/TAP/IRG treatment. | PLANNED; no production screens/API workflow. |
| **L — Reporting & Control** | Existing bounded Overview and Audit views; full commercial, arrears, construction variance, supplier and SCF reports remain planned. | PARTIALLY_IMPLEMENTED. |

## 5. Three-level product interaction model — comparison

| Target context | Current implementation | Gap |
|---|---|---|
| **1. Organization workspace** | Organization-oriented Overview with identity, technical diagnostics, and quick links. | Role-aware tasks, approvals, alerts, and real authorized portfolio indicators do not exist yet; technical diagnostics should move to technical administration. |
| **2. Project selection/switching** | Project directory and per-row project actions. | No persistent project switcher, search-first switching, recents/favorites, or explicit resume context. The project directory should remain as a deliberate browse/manage destination. |
| **3. Active project workspace** | Project-specific modal windows launched from the directory. | No project shell, project menu, route/breadcrumb, persistent project identity, or integrated modules. |
| **Separate technical administration** | Users, audit, and organization settings are reachable in the same shell; readiness diagnostics appear on Overview. | A dedicated admin area for system health, database, backup/restore, security, and users/settings is not implemented. |

## 6. Verification evidence and unverified boundaries

Latest repository evidence at the time of this audit:

- Current `main` is `62ebdcb725e0ab95059e7e4abe64581976898642` (documentation-only PR #61 merge). The last application runtime and test-source commit remains `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59).
- PR #61's documentation-only head `b1f36615f12c1186f481109431c8aa2edd0dc4ae` passed all three jobs in GitHub Actions Run #584 / [43888881047](https://github.com/younestech31/PROMO-GEST/actions/runs/43888881047). Run #583 / [43884047504](https://github.com/younestech31/PROMO-GEST/actions/runs/43884047504) also passed all three jobs on the prior documentation-only main SHA `20f2e043515bd5cb164ddb2ee3b4a195f0ab86ed`.
- Application-source CI Run #581 / [43881240365](https://github.com/younestech31/PROMO-GEST/actions/runs/43881240365) passed on `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`: frontend strict TypeScript, **40/40** frontend tests, production SPA and ASP.NET Core static-host builds, and preview-leak checks.
- The same application-source run passed Domain **34/34**, Application **20/20**, and PostgreSQL 18 Integration **30/30**, including the 69-Wilaya endpoint contract, least-privilege database identities, and the full database/storage/Data Protection restore drill. Linux and Windows publishing plus PowerShell validation passed.
- These CI results do not independently verify live Google AI Studio browser behavior or production installation. The Product Owner's Arabic RTL / French LTR desktop/mobile acceptance remains owner-attested in `PHASE-0-MANUAL-ACCEPTANCE.md`, not re-run by CI. P0-A01 and P0-A04 remain `NOT_RUN` and must not be described as passes.

**Owner-attested as passed:** Arabic RTL / French LTR desktop/mobile review for the listed real workflows; login/session/CSRF; projects and structure; customers/interactions; internal holds including cancellation/expiry; document upload/download/SHA-256; authorization/audit/concurrency/safe errors; and persistence after reload. See the owner-attested result register in `PHASE-0-MANUAL-ACCEPTANCE.md`.

**Still not evidenced:** P0-A01 first-run setup against a separate empty disposable database and rejection of a second initialization; and P0-A04 logout followed by protected-route/session-revocation verification. Browser/version metadata and sanitized per-case artifacts were not attached. P1-04 navigation design review is now recorded in D-013 as approved with modifications; implementation remains unbuilt and separately gated.

## 7. Next work by dependency order

1. **Phase 0 residual exceptions:** execute P0-A01 against a separate empty disposable database and verify safe rejection of a second initialization; execute P0-A04 by signing out and proving session revocation and protected-route denial. Keep both recorded as `NOT_RUN` until real evidence exists; they remain accepted residual exceptions, not passes.
2. **P1-01 — official commune source audit:** reconcile Law 26-06, Decrees 26-206/26-208 and authoritative government datasets for all 69 Wilaya–commune relationships. The ONS 2021 58-Wilaya reference alone is insufficient.
3. **P1-02 — commune catalogue implementation:** remains `BLOCKED` until P1-01 is reviewed and accepted. Do not invent codes, labels, parent assignments or effective dates, and preserve historical free-text snapshots.
4. **P1-03 — Party and Employee master-data scope:** decision D-012 is recorded and merged in PR #68 (main CI #602); REQ-D04 is `IMPLEMENTED_AND_VERIFIED`, REQ-D05/REQ-D06 remain `PLANNED`, and Module D remains `PARTIALLY_IMPLEMENTED`.
5. **P1-04 — bounded navigation review:** D-013 approves the three-level organization workspace → explicit project switcher → active project workspace model with modifications, as design only. The current UI remains unchanged; implement only through the independent, authorized vertical slices defined in D-013. D-013 also flags the current `EstimatedBudgetDzd` project-summary exposure for product/security classification before adding broader financial indicators.
6. **P1-05 — Phase 1 closure:** keep `BLOCKED` until P1-01/P1-02 dependencies, P1-03/P1-04 accepted evidence, P0-A01/P0-A04 residuals, latest CI, and applicable professional review evidence are reconciled in Notion.
7. **Later phases:** do not start Phase 2–5 business implementation before Phase 1 closure, K-Min prerequisites, and qualified Algerian practitioner sign-offs.

## 7A. Phase 1 bounded navigation review — D-013 (16 November 2026)

D-013 approves the three-level organization workspace → explicit project selection/switcher → active project workspace model **with modifications**, as a design decision only. It does not upgrade missing UI capabilities to implemented states.

Source facts verified against the current application code and API:
- `App.tsx` maintains five in-memory route states only; no router or stable project route exists. On login it loads `GET /api/projects` and lands on `overview`.
- `ErpShellLayout.tsx` shows organization identity and language; it links to overview/projects and conditionally users/audit. No persistent project switcher or active-project identity strip exists.
- `OverviewView.tsx` shows PG18/API/environment readiness diagnostics, project count and shortcuts; no real task, approval, alert or operational KPI feed exists.
- `ProjectsAccessView.tsx` is a full accessible-project table with code, localized name, location, status, budget, member and structure counts. It launches project-specific structure/customer/reservation/document/access modals whose headers show project code and localized name. No search/filter/pagination is rendered in this view.
- `GET /api/projects` supports `q` and `status`; `ProjectService.ListAccessibleProjectsAsync` returns all projects only for `SYSTEM_ADMIN`, otherwise uses the repository's membership-filtered query. PostgreSQL filters search across code, Arabic/French names, Wilaya and municipality. `GET /api/projects/{id}` separately checks explicit membership for non-admins. The current web API helper `listProjects()` does not yet pass `q` / `status`. **Review item:** `ProjectDto` currently includes `EstimatedBudgetDzd` for every project returned to any ProjectMember and the directory displays it; `SECURITY-AND-PERMISSIONS.md` applies `CanViewFinancials` to Financial document categories but does not explicitly classify this project-level estimate. Confirm its data classification before adding broader financial indicators; if restricted, add backend field/query scoping and tests rather than client-only hiding.
- UI permission helpers hide/disable affordances, but project services/controllers enforce server authorization. The current `org.manage` profile-edit flow uses expected-concurrency protection; the old claim that the organization profile is read-only has been corrected in `PROJECT-NAVIGATION-UX.md`.

**Approved constraints:** Do not fabricate tasks/approvals/alerts/KPIs. Keep organization profile management separate from technical diagnostics. Add server-backed search/pass-through and server-side pagination before scaling project directory access. Project context shall be route-per-tab and visibly identified; it is not an authorization token. Each API request revalidates permissions, ProjectMember membership, capabilities and record/project ownership. Do not rely on localStorage/currentProjectId for authorization. Preserve unsaved edits with explicit switch confirmation. Recents/favorites are preferences only. Do not enable cross-project writes/bulk mutations in first release. Keep current modal workflows until replacement routes pass acceptance. Maintain Arabic RTL / French LTR and accessible keyboard/mobile patterns.

**Next implementation order (separate tasks/PRs):** (1) URL route foundation and per-tab isolation, (2) persistent active-project identity/breadcrumb and explicit switcher backed by the authorized API, (3) server-side query pass-through/search/filter/pagination, (4) separately gated technical administration, (5) real organization work center only when underlying modules own real task/approval data, (6) optional preference-only recents/favorites, and (7) an independent workstream/milestone domain review. No UI implementation, route library, API/permission/schema/migration or business data change was included in D-013.

## 8. Change policy for this document

Update this matrix whenever a screen, API-backed user action, route, permission, module status, or acceptance test changes. Record actual source paths and verification evidence. Never mark manual RTL/LTR browser acceptance or a full business workflow verified solely from CI green or component presence.
