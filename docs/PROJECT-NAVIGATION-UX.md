## Current implementation addendum — PR #258 / P1-09 real-browser automation — 26 November 2026

- Current live main: `a7560ec71519ad1252406874ef7a0910a246ce6d`, merged PR #258.
- The existing real ASP.NET Core + PostgreSQL 18 Playwright suite now covers the organization profile in four Chrome profiles (Arabic RTL/French LTR × desktop/mobile): SYSTEM_ADMIN edit/save; non-admin without `org.manage` read-only and API 403; temporary `org.manage` grant only in the fresh CI disposable database; fresh non-admin login, edit/save and API persistence.
- PR-head CI [45774500389](https://github.com/younestech31/PROMO-GEST/actions/runs/45774500389) 4/4 and CodeQL [45774500333](https://github.com/younestech31/PROMO-GEST/actions/runs/45774500333) 2/2; exact-main CI [45775053024](https://github.com/younestech31/PROMO-GEST/actions/runs/45775053024) 4/4 and CodeQL [45775052955](https://github.com/younestech31/PROMO-GEST/actions/runs/45775052955) 2/2. Domain 78/78, Application 24/24, PG18 integration 50/50, restore drill 8/8.
- This is automated acceptance evidence only. P1-09 stays In Review/Pending and `IMPLEMENTED_NOT_VERIFIED` until human SYSTEM_ADMIN/Staging verification is recorded. P1-10 remains dependent. No UI or authorization runtime behavior was changed in PR #258.

---

---

## Implementation status update — P1-49 — 25 November 2026

The Project Directory pagination slice is implemented on main `c8d09c09fcaeb1a6474574066dba22b69b5701b5` through [PR #255](https://github.com/younestech31/PROMO-GEST/pull/255). It adds a dedicated paginated endpoint with membership-scoped counts, stable ordering, SQL-side search/status filtering and bilingual page controls while preserving the existing `GET /api/projects` contract for the compact switcher. Exact-main CI [45695770684](https://github.com/younestech31/PROMO-GEST/actions/runs/45695770684) and CodeQL [45695770751](https://github.com/younestech31/PROMO-GEST/actions/runs/45695770751) passed. Human Arabic RTL / French LTR acceptance remains pending; this implementation is not marked verified.

---

# PROMO GEST — Project Navigation & Active Context UX

**Status:** Design approved (D-013); single-switcher / sidebar-only refinement D-015 is implemented in PR #90 (merge SHA `16ed3fdd93a4a2685d37433b0eed5cdf256f953d`). Main at the last inspection `cd57a5912ccb3631a6e9581d48d1aab2600180d2` passed all three jobs in [CI #825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822). The UX remains `IMPLEMENTED_NOT_VERIFIED` pending manual browser acceptance.  
**Scope:** Project selection, switching, multi-project work, and project-specific navigation  
**Currency note (23 November 2026):** this design document's last source inspection predates the current baseline; the verified live `main` and Phase 1 gate state are maintained in [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md). No re-inspection of the navigation code is claimed here.  
**Applies to:** The local-first organization-wide ERP shell and project workspace

## D-015 implementation refinement — one switch point and one project menu (17 November 2026)

The approved D-013 model is refined to remove competing controls:

- **Single project switcher:** the global ERP header is the only place that opens the project switcher, whether the user is in the organization workspace or inside an active project. Do not add separate switch buttons to the project identity strip or the active-project sidebar heading.
- **Identity strip:** retain the project code, localized name, location and status so the active context remains visible. Keep pin/unpin and the explicit Project Directory action; neither is a project switch control.
- **Single project menu:** keep the active-project navigation list in the persistent sidebar. Do not render a second horizontal project tab bar in the workspace content. The active route, section heading and breadcrumb remain unchanged.
- **Unchanged safety:** URL-per-tab context, global shortcut, server-authorized switcher search, Project Directory, pinned/recent preference revalidation, unsaved-change confirmation and revoked-membership handling remain in force. The browser cannot grant itself project access.
- **Implementation boundary:** the change is limited to React navigation presentation. No API, backend, schema, migrations, permission logic, business workflow, production, Cloud SQL, credentials or deployment changes.

The code change is tracked by Notion P1-20. Automated CI is evidence for compilation and regression tests; Arabic RTL / French LTR, desktop/mobile, keyboard/focus and dirty-switch journeys require separate browser acceptance.

## Current repository implementation check — 18 November 2026

Source inspected at main SHA `cd57a5912ccb3631a6e9581d48d1aab2600180d2`. The latest API/Application runtime source remains PR #87 (`b41d34aae03e1549ca1963a23d92643ff91bf393`); EF/schema remains PR #59 (`53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`). PR #90 supplies the single-switcher/sidebar-navigation refinement. Main CI [#825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822) passed all three jobs, including 82/82 frontend tests. No independent browser walkthrough for Arabic RTL / French LTR, desktop/mobile or keyboard/focus has been executed for this current source baseline.

The React application now has the foundational three-context, URL-routed shell (`app/App.tsx`, `app/routeRegistry.ts`, `app/ErpShellLayout.tsx`, `modules/module-b-projects/components/ProjectSwitcherModal.tsx`, and module-owned workspace pages) plus a canonical shared platform and navigation safeguards:
- Direct URL access to `/admin/users`, `/admin/audit`, `/admin/diagnostics`, and `/organization/parties` checks `canAccessRoute` prior to mounting any restricted view and redirects unauthorized actors to `/projects` with a bilingual notice.
- The app-level dirty guard protects route changes, project switching, browser Back/Forward, reload/tab close and logout. Save is offered only when a real save callback is registered; otherwise Discard and Stay remain explicit. Individual embedded forms/dialogs retain their own confirmation safeguards where implemented; each real form journey still requires browser verification.
- Project-access revocation clears cached stale state and `recentProjectIds`/`pinnedProjectIds` (`revokeProjectAccessFromState`), returns to `/projects` with notice, and `ProjectWorkspaceView` stabilizes callbacks so project fetches run only when `projectId` changes.
- `Ctrl/Cmd+K` for the project switcher ignores editable inputs (`INPUT`, `TEXTAREA`, `SELECT`, `contentEditable`).
- Login and first-run setup have module-owned implementations. Root `components/`, `layouts/`, `features/` and duplicate utility paths are compatibility facades; reusable UI is owned by `shared/components/`.
- Architecture regression tests inspect static/type-only/re-export/side-effect/dynamic imports, public module indexes, the acyclic dependency graph, no active legacy-feature imports and single owners for shared components.

PR #81 is merged and post-merge main CI #730 passed. This is not manual acceptance against the live ASP.NET Core 10 + PostgreSQL 18 stack. Browser testing of Arabic RTL / French LTR, desktop/mobile, real dirty-form navigation, direct unauthorized routes and access revocation remains outstanding. Backend permissions, API scoping, and PostgreSQL membership checks remain untouched and authoritative.

## D-013 review outcome — approved with modifications (design only)

The proposed model is approved subject to the binding constraints below:

- **Organization workspace:** Keep the post-login organization-level landing view, but show only authorized, real workflow data. Organization-level actions must be gated by effective organization permissions; project queues must be scoped by ProjectMember membership and action-specific capabilities, not role labels alone. There is no current task inbox, approval queue, alert engine or real portfolio KPI feed. Do not fill these gaps with static/mock metrics. Move system readiness, database, backup/restore, security and audit diagnostics into a separately gated technical-administration area. Organization legal-profile editing remains an organization-management workflow requiring `org.manage` and concurrency handling.
- **Project selection:** Preserve the full Project Directory as a deliberate browse/manage destination, and keep the compact explicit project switcher as a separate quick-access surface. The switcher performs server-side search through `GET /api/projects?q=...`; non-admin results remain filtered by PostgreSQL `ProjectMember`, while `SYSTEM_ADMIN` can list all. The directory's server-side search/status filtering and API-backed pagination are implemented in PR #255; the human Arabic RTL / French LTR browser acceptance remains pending under P1-49. Do not fetch unrestricted company project data into the browser.
- **Financial indicator boundary — resolved by D-014 / ADR-0011:** `EstimatedBudgetDzd` is restricted project financial data. The server returns a non-null value only when the current actor has an explicit membership on that project with `CanViewFinancials == true`; the same applies to `SYSTEM_ADMIN`, with no automatic `ProjectManager` or administrator bypass. Updating the amount also requires `projects.manage` and `ProjectManager` membership. A manager without financial access may update other master data by sending `null`, which preserves the stored amount; sending a numeric amount is rejected and audited. The UI hides the budget editor and renders a dash for redacted values. The Vite-only preview middleware mirrors the API behavior. Runtime was merged in PR #80. Current agent-led Production HTTPS AR/FR desktop/mobile budget matrix passed on source b86760f (CI46061768797 PASS5/5, CodeQL46061768800 PASS2/2); four actual revoked-manager settings JPEGs were imported and visually reviewed. Final task/PR/main reconciliation remains pending, not a request for a separate device or institution-local signature. [Current seven-criterion assessment and image scope](P1-05-BUDGET-BROWSER-ACCEPTANCE.md). No additional financial indicators or portfolio totals are authorized by this decision.
- **Project context:** Use a stable URL per browser tab (for example `/projects/{projectId}/...`) as navigation context, not as authorization. Every request must re-check active user, global permission, project membership, specific capability, record ownership and lifecycle on the server. A local preference, recents/favorites list or URL must never grant access. Preserve project code, localized name, location and status visibly in the project header, breadcrumb, forms and high-impact confirmations. Current modal workflows already show code and localized name and remain until replacements pass acceptance.
- **Switch safety:** Prompt save/discard/cancel when leaving a dirty form; handle revoked membership through API denial and clear stale route state. Avoid cross-project write/bulk operations in the first release. Each browser tab may use a different authorized project.
- **Scope sequence:** Build route foundation first, then active-project identity shell and switcher, then server search/pagination, then separately gated technical administration; deliver a real work center only after owning modules expose actual task/approval data. Recent/favorite preferences and workstream/milestone models are later independent slices.
- **Localization and accessibility:** Test keyboard navigation/focus, dialog and switcher semantics, mobile presentation, empty/loading/error states and mixed-direction project IDs in Arabic RTL and French LTR. Existing root direction handling is present; it is not proof of the not-yet-built navigation being accepted.

D-013 does not authorize UI/API/schema/permission changes, router adoption, new storage, production or Cloud SQL data changes, or a broad redesign. See `DECISION-LOG.md` D-013 and `UI-IMPLEMENTATION-AND-GAP-MATRIX.md` for the source-audited boundary.

## 1. Product decision

PROMO GEST must support companies that operate several developments at once, where each development may have a different operational history, team, permissions, and stage.

The product must **not** make an employee scan a wall of project cards every time they log in or move between tasks. It must also not hide the fact that a project is selected or allow a stale selection to silently direct a transaction to the wrong project.

Adopt a three-level interaction model:

1. **Organization workspace:** cross-company work that the signed-in employee is authorized to perform.
2. **Project selection and switching:** a compact, searchable way to open one authorized project.
3. **Active project workspace:** a focused environment where project-specific information, modules, and actions are visibly scoped to that project.

The active project is a navigation context and user-experience aid. It is never an authorization token or a substitute for server-side project membership checks.

## 2. The three interaction levels

### 2.1 Organization workspace — default landing

Default after login should be a role-aware **My Workspace** / **Work Center**, not a directory of every project.

It may show:
- My tasks and pending approvals.
- Overdue or blocked work assigned to the user.
- Recent activity relevant to the user's permissions.
- A small "Continue with" area for a few recent or pinned projects.
- A portfolio health summary for authorized managers, expressed as exceptions and high-level indicators rather than a wall of project cards.

Each project reference shown in this workspace must include a recognizable project code and name. The project identity must remain visible in task rows and activity items.

The default view should not auto-open a project merely because one was last active. Instead, offer an explicit "Continue in [project]" action with the project's code and name. A user preference may remember the last context, but the choice must be visible and explicit.

### 2.2 Project switcher — quick access without a full directory

Add a persistent project-context control in the global header. When no project is active, label it "Choose project" / localized equivalent. When inside a project, show its code and short name.

Opening the switcher should reveal, in this order:
1. The current project (clearly marked and not selectable as a duplicate).
2. A short list of pinned/favorite projects.
3. A short list of recently visited projects.
4. A type-to-search field that searches only projects the current user is authorized to access.
5. A "Browse projects" action for the full project directory.

Requirements:
- Show code, bilingual name where available, Wilaya/municipality, and overall status in search results so similarly named developments can be distinguished.
- Show only a small number of recent/favorite items in the switcher; the full directory remains a deliberate secondary action.
- Do not present inaccessible projects, hidden projects, or unauthorized project details in results or autocomplete.
- Use server-side filtering for search results; do not download the full organization's project list and filter only in the browser.
- Search must support project code and Arabic/French project names.
- Favorites and recents improve navigation only; they do not grant or imply access.
- The picker must be keyboard accessible, support Arabic RTL and French LTR, and work on mobile with a full-height accessible selection sheet if needed.

The exact recent-item count is a design default and may be tuned through usability testing; it should remain small enough to avoid turning the switcher into a second project directory.

### 2.3 Project directory — deliberate discovery and administration

Keep a dedicated **Project Directory** for users who need to browse, manage, or administer a larger set of developments.

Default view:
- A compact table/list, not large promotional cards.
- Default filter: "Projects assigned to me" and active projects.
- Search by code/name/location.
- Filters for status, operational streams, Wilaya/municipality, project manager, and archived/completed state where authorized.
- Sorting by recent activity, next milestone, overdue work, project code, or name.
- Pagination or virtualized rows for larger organizations.
- Saved personal views may be added later.

Do not load all project records and all related KPIs on initial page load. Fetch list summaries and retrieve detailed information only when a project is opened or expanded.

The directory is a discovery/management screen, not the normal daily workspace. Administrators and portfolio managers may receive broader filters, but only within their server-authorized scope.

## 3. Active project workspace

After selection, enter a distinct project workspace.

### Persistent project identity strip

The project identity must be visible on every project-scoped page, including modal-driven workflows where practical. The strip should include:
- Project code (for example, `PRJ-16-001`).
- Project name in the current interface language, with the alternate name available where useful.
- Wilaya / municipality.
- Overall project status.
- Current operational stage/health summary where available.
- Project switching is performed only by the single persistent global-header control; the identity strip does not repeat the switch action (refined by D-015).

Do not identify a project by color alone. Never rely only on the project name if it may be duplicated. The unique code is essential.

A breadcrumb should show the hierarchy, for example:

`PROMO GEST / Projects / PRJ-16-001 — إقامة الرمال الذهبية / Sales / Reservations`

### Project navigation

Within the workspace, use a predictable project menu:
- Overview
- Project structure (buildings, floors, property units)
- Project team and access
- Project milestones / workstreams
- Contextual links to CRM, Sales, Construction, Finance, Procurement, and Documents, shown only when useful and permitted

These are contextual entry points into the owning ERP module, not duplicate project-specific versions of the module. For example, project reservations open the Sales module with the project scope applied; project costs open Finance / Cost Control with the same scope.

Do not hide historical records or whole modules simply because the project has moved to another stage. Use lifecycle state to control which actions are available and which work is recommended.

## 4. Projects have individual, often parallel, workflows

Do not model every project as one mandatory linear status enum.

Keep a simple overall project status for portfolio-level filtering (for example Planning, Active, Suspended, Completed, Archived), but model operational progress as configurable workstreams and milestones. A property development can be constructing buildings while marketing units, collecting installments, handling permits, or preparing delivery in parallel.

Candidate workstreams include:
- Land, title and legal readiness.
- Design and engineering.
- Permits and administrative approvals.
- Construction and site execution.
- Commercialization and sales.
- Contracting and collections.
- Procurement and materials.
- Delivery, handover and after-sales.

Each project may enable only the workstreams relevant to its scope. Workstreams may have their own states, owners, dates, dependencies, and approval gates. A standard project template can provide a starting plan, but a project manager must be able to adapt approved milestones without altering the global rules or silently rewriting historical events.

The project overview should emphasize:
- Current milestone and next expected milestone.
- Blocked, overdue, or awaiting-approval work.
- Progress by relevant workstream.
- Important financial/commercial exceptions where the viewer has access.
- A concise "next actions" list.

Overall status is a portfolio summary, not a replacement for the individual workstream states.

## 5. Cross-project work without losing project identity

Some roles genuinely work across developments. Do not force them to open and close a project for every task. Provide authorized cross-project queues inside the owning modules.

Examples:
- A commercial manager can see permitted reservations requiring review across assigned projects.
- An accountant can review authorized project receivables or cost exceptions across projects.
- A procurement officer can review purchase requests across authorized projects.
- A director can see portfolio health and pending approvals across all permitted projects.

Every row in a cross-project queue must display the project code and name clearly. Selecting a row opens the underlying record inside its project's context. A mutation performed from a cross-project queue must still resolve and authorize the specific project and record on the server.

Rules:
- An "All projects" filter is an explicit read/reporting scope, not an implicit write context.
- Avoid bulk financial, legal, reservation, or destructive actions across multiple projects in the first release.
- Any future bulk action must show the exact selected projects and record count, enforce authorization independently for each record, and provide an auditable result.
- Cross-project totals and charts must aggregate only records the user is allowed to access.

## 6. Context safety and error prevention

The most important goal is to prevent a user from performing a correct action on the wrong project.

Required controls:
1. **URL is the active context:** project-scoped routes include the stable project ID, for example `/projects/{projectId}/sales/reservations`. The page derives its selected project from the route and verifies it with the API.
2. **No hidden global mutable context:** do not rely on a single localStorage `currentProjectId` as the source of truth. Multiple browser tabs may legitimately work on different projects. Store only non-authoritative preferences such as pinned and recent projects.
3. **Visible identity in forms:** creation/edit forms show the project code and name near the form title or submit action. Do not make the user infer the project from a previous screen.
4. **Server authorization on every request:** project IDs in URLs, filters, form payloads, and browser state are untrusted input. The server checks the user, permission, membership/scope, record ownership, and state for every read and mutation.
5. **Authorized query boundaries:** lists, counts, exports, downloads, and autocomplete must be scoped in the database query, not filtered after unrestricted retrieval.
6. **Switch warning for unsaved work:** before changing project context, preserve drafts or ask the user to save/discard/cancel. Do not silently discard entered data.
7. **Revocation handling:** if project access is removed, API calls must return the appropriate denial; the UI clears the stale context and returns to a safe workspace with a clear explanation.
8. **High-impact action review:** contract execution, cancellation, refunds, financial posting, stock issue, and other high-impact actions display the project code/name and target record before confirmation.
9. **No color-only distinction:** status and context labels always contain text; visual colors are supplemental.
10. **Audit:** record context-sensitive high-impact actions and denied access without placing unnecessary customer or employee PII in audit metadata.

A remembered project or favorite must never bypass reauthorization after login, refresh, role change, membership revocation, or direct URL navigation.

## 7. State and persistence rules

- The route is the source of truth for the active project in each browser tab.
- Recent and favorite project lists are user preferences, stored server-side in the user's local organization database only if persistence across devices is required; otherwise local browser preference storage is acceptable.
- Do not persist sensitive record contents or authorization decisions in local preferences.
- Each tab can maintain a separate project route. Changing project in one tab must not silently change the context in another tab.
- On login, open the role-aware My Workspace. Offer an explicit resume action for the last project rather than silently entering it.
- If a user has access to exactly one project, the workspace may present a prominent one-click open affordance, but still make the project code/name explicit before the first project-scoped mutation.

## 8. Suggested Arabic labels

- Organization workspace: **مساحة عملي**
- My work: **مهامي**
- Project directory: **دليل المشاريع**
- Project switcher: **تبديل المشروع**
- No active project: **لم يتم اختيار مشروع**
- Active project: **المشروع الحالي**
- Recent projects: **المشاريع الأخيرة**
- Favorite projects: **المشاريع المثبتة**
- Continue working: **متابعة العمل في المشروع**
- All projects (read/report scope): **كل المشاريع المصرح بها**
- Current project path: **مساحة المشروع**

French equivalents should be concise and professional, with full RTL/LTR support and no mixed-direction identifier ambiguity.

## 9. Adoption plan for the current codebase

The current application uses a small set of top-level React route states and a Project Directory screen that lists accessible projects. Introduce this design incrementally:

1. **Navigation foundation:** add a stable route model for project workspace and project-scoped destinations; keep the current Projects Directory available as a deliberate destination.
2. **Active context shell:** add the persistent project identity strip, breadcrumb, and switcher shell without changing domain records or database schema.
3. **Recent/favorite access:** initially store recent/favorite IDs as user preferences; retrieve each item through authorized API endpoints. Do not trust client-side IDs as permission.
4. **Focused directory:** make "assigned to me / active" the default view and add server-side search/filter/pagination as the API supports it.
5. **Project-specific workstreams:** design the workstream/milestone model separately from the current single project status. Do not force a schema change until project workflow variants have been mapped.
6. **Cross-project queues:** add inside each owning module when workflows exist, with project identity visible on every row.
7. **Usability validation:** test with realistic fictional scenarios: a user with one project, a user with five projects in different stages, a user with many projects, a user with read-only access, a manager with cross-project scope, and a user whose access is revoked while a project is open.

No current customer/project records should be migrated, rewritten, or deleted as part of the navigation foundation.

## 10. Acceptance criteria

The project navigation design is accepted only when:
- A normal employee can resume work without seeing a full directory of every project by default.
- A user with several projects can open a recent/favorite project in a small number of deliberate actions.
- The selected project code/name remains visible throughout project-scoped navigation and forms.
- Similar project names can be reliably distinguished by code and location.
- Two browser tabs may safely operate in two different projects without shared-context leakage.
- Search, recents, favorites, direct URLs, counts, exports and downloads never reveal unauthorized projects or records.
- A project switch cannot silently discard unsaved work.
- Cross-project queues clearly identify each project's records and enforce per-record authorization.
- Projects can have distinct and parallel workstreams without falsifying their overall status.
- Arabic and French navigation work correctly on desktop and mobile.

## 11. Research references

These references informed the interaction decisions; they are design evidence, not a claim that PROMO GEST is certified or that one vendor's UI should be copied verbatim.

- Atlassian Support, **Navigate projects with the sidebar** — separates global/application navigation from project navigation and offers recently viewed projects for quick switching: https://confluence.atlassian.com/jiracore/navigate-projects-with-the-sidebar-1528201628.html
- Atlassian, **Introduction to Jira's Navigation** — documents persistent global navigation, Recent/Starred, and project-specific navigation: https://www.atlassian.com/software/jira/guides/navigation/overview
- Oracle Primavera P6, **My Preferences / View tab** — distinguishes portfolio-level analysis from project navigation and supports opening selected projects / filtered project views: https://docs.oracle.com/en/industries/construction-engineering/primavera-p6-project/26/p6-help/5929.html
- Oracle Primavera Cloud, **Add a Project to a Portfolio** — uses saved filter criteria to define portfolio membership rather than requiring every portfolio view to display every project: https://docs.oracle.com/cd/E80480_01/English/user_guides/portfolio_management_user_guide/81707.htm
- Nielsen Norman Group, Megan Chan, **Designing for Serial Task Switching** (May 23, 2025) — recommends orientation cues such as breadcrumbs and section headers, and error-prevention/recovery support for task switching: https://www.nngroup.com/articles/serial-task-switching/
- Nielsen Norman Group, Kate Kaplan, **8 Design Guidelines for Complex Applications** (November 8, 2020) — covers reducing clutter without reducing capability and making important information salient: https://www.nngroup.com/articles/complex-application-design/


## 18 November 2026 — source-audited navigation facts

- `ErpShellLayout` exposes one project-switch action in the global header in both organization and project contexts. `ProjectIdentityStrip` retains identity, pin/unpin and Project Directory actions but does not expose a second switch action.
- `ProjectWorkspaceView` renders the active section PageHeader and breadcrumb; project sections are selected from the active-project sidebar. No second horizontal project tab bar is intended.
- `ProjectSwitcherModal` performs authorized server-backed search through the project list endpoint; saved recent/pinned IDs are filtered against currently authorized results. The project directory separately sends server-backed `q` and `status` filters. Server-side directory pagination/sort remains a gap.
- The current UI implementation and PR #90 are technically merged, but P1-20 remains In Review / Pending until real browser evidence covers desktop/mobile RTL/LTR, keyboard/focus, unsaved-form switching and membership revocation.