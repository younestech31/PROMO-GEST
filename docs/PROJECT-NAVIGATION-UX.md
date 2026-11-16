# PROMO GEST — Project Navigation & Active Context UX

**Status:** Reviewed and approved with modifications by D-013 (design only; not implementation)  
**Scope:** Project selection, switching, multi-project work, and project-specific navigation  
**Applies to:** The local-first organization-wide ERP shell and project workspace

## Current repository implementation check — 16 November 2026

Source inspected: latest application runtime/schema source remains PR #59 commit `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`; documentation-only main base inspected for D-013 is PR #69 merge `4fdfcb2679231ff81b8756a8da6ba3045bea5288` (PR #69 CI #603 passed; post-merge main CI #604 verifies this base).

The current React application has five top-level in-memory route states: `overview`, `projects`, `users`, `audit`, and `organization`. The authenticated shell keeps organization identity visible and exposes a project directory. `ProjectsAccessView.tsx` opens structure, customer registry, internal-hold, and document workflows in project-specific modals from each directory row. The modal headers show project code and name.

The source does **not** yet implement a dedicated persistent project switcher, a route-addressable active project workspace, or a persistent project identity strip across project pages. User/role management, audit viewing, and system-health diagnostics are currently reachable in the same application shell/overview as operational project work; a distinct technical-administration workspace is not present. Organization profile supports authorized updates through `org.manage` with `ExpectedConcurrencyStamp` concurrency handling; it is not read-only.

This is a source-code inspection, not manual browser acceptance. For the exact screen/API/module mapping and implementation boundaries, see [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md). D-013 approves the three-level model with explicit modifications and guardrails. Approval is for the design only: no project switcher, route-addressable active workspace, new API, or navigation UI implementation is claimed. Each implementation slice requires its own Notion task, focused PR, relevant G1–G10 checks and real browser acceptance.

## D-013 review outcome — approved with modifications (design only)

The proposed model is approved subject to the binding constraints below:

- **Organization workspace:** Keep the post-login organization-level landing view, but show only authorized, real workflow data. There is no current task inbox, approval queue, alert engine or real portfolio KPI feed. Do not fill these gaps with static/mock metrics. Move system readiness, database, backup/restore, security and audit diagnostics into a separately gated technical-administration area. Organization legal-profile editing remains an organization-management workflow requiring `org.manage` and concurrency handling.
- **Project selection:** Preserve the full Project Directory as a deliberate browse/manage destination, and add a compact explicit project switcher as a later vertical slice. Current `GET /api/projects` already accepts `q` and `status`; non-admin results are filtered in PostgreSQL by `ProjectMember`, while `SYSTEM_ADMIN` can list all. Current client `listProjects()` does not pass query parameters and the directory has no search/filter/pagination UI. Future search must call the server; pagination must be server-side. Do not fetch unrestricted company project data into the browser.
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
- An obvious switch-project control.

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
