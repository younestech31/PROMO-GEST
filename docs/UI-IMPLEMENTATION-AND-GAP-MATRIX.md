# PROMO GEST — UI Implementation & Gap Matrix

**Document role:** Source-audited inventory of the current React user interface, its API-backed actions, module ownership, and the gap between today's interface and the product interaction model. This is a current-state record, not a redesign specification or browser-acceptance certificate.  
**Main commit inspected at audit start:** 5415f0e668a55f902ac2802e1669af58ad7ec410.  
**Last code-changing source commit:** 6bbd97f70ed0fb63cf226a1117cf6e83c359d2be (PR #44).  
**Latest green CI:** Run #531 / 43752672569; all three jobs passed on 15 November 2026.

## 1. Reading this matrix correctly

The matrix distinguishes three things that must not be conflated:

1. **Source presence:** a screen/component and its corresponding API call are present in the current repository.
2. **Automated verification:** the relevant code is covered by successful TypeScript, Domain, Application, or PostgreSQL 18 tests in CI. Module status follows the six-state taxonomy in MASTER-BLUEPRINT.md and MODULE-CATALOG.md.
3. **Manual user acceptance:** Arabic RTL / French LTR layout, real browser navigation, forms, errors, cookie/CSRF behavior, persistence/reload, and authorization must still be inspected in the real API development preview. CI and source inspection do not prove these.

This matrix was prepared from App.tsx, ErpShellLayout.tsx, the listed feature components, apiClient.ts, API controllers, application services, permission helpers, and the current canonical module/security documentation.

## 2. Current application shell and navigation

| Area | Current implementation | What is not implemented yet |
|---|---|---|
| First-run setup | FirstRunSetupWizard.tsx collects legal identity, Algerian legal form, Wilaya, address/contact details, default language, and initial SYSTEM_ADMIN; calls GET /api/setup/status and POST /api/setup/initialize. | Post-install organization profile editing; versioned commune catalogue is still Phase 1. |
| Authentication | LoginScreen.tsx performs username/email + password login; App.tsx restores a session and loads authorized projects. API client handles CSRF tokens and session cookies. | Manual real-browser cookie/CSRF and bilingual acceptance remains a Phase 0 gate. |
| Organization shell | ErpShellLayout.tsx shows organization identity, user/role, language switcher, and navigation for Overview, Projects, Users, Audit, and Organization. | No distinct technical-administration workspace and no separate daily task/work queue. |
| Overview | OverviewView.tsx shows organization identity, database/API readiness diagnostics, accessible-project count, session identity, and shortcuts to Projects/Users/Audit; it lists a small static description of future domains. | No real task inbox, approval queue, operational alerts, sales/arrears/construction KPIs, or executive portfolio reporting. System-health diagnostics are mixed into daily Overview. |
| Organization profile | OrganizationProfileView.tsx renders legal/fiscal and location/contact details read-only. | No edit form and no PUT /api/organization API endpoint. |
| User administration | UsersManagementView.tsx supports user-account creation, edit, role assignment, activation/deactivation, and password reset. | No complete HR/Employee master, attendance, payroll, or HR workflow. |
| Audit administration | AuditLogView.tsx lists a bounded recent audit result (currently requests up to 100 rows) and permits refresh. | No broader security investigation, export, or retention-management UX. |

The current shell has five in-memory route values: overview, projects, users, audit, and organization. It does not yet have a stable route-addressable project context.

## 3. Project directory and project-scoped views

| Module | Current screen/component | Source-backed actions and API paths | Current status | Gap against target |
|---|---|---|---|---|
| **B — Real Estate Projects** | ProjectsAccessView.tsx | List projects visible to the current user; create/update project; assign/remove project members. Uses GET /api/projects, POST /api/projects, PUT /api/projects/{id}, PUT /api/projects/{id}/members, and DELETE /api/projects/{id}/members/{userId}. Table shows code, name, location, status, estimated DZD budget, and member count. | IMPLEMENTED_AND_VERIFIED (module catalog). | Directory is the primary place to access project tools. There is no dedicated project switcher, recent/favorite access, project landing page, or route-addressable active project workspace. |
| **C — Physical Structure & Units** | ProjectStructureModal.tsx | Read structure; create/update buildings and floors; create/update property units; change unit status. Uses GET /api/projects/{id}/structure and POST/PUT project structure routes. | IMPLEMENTED_AND_VERIFIED with documented gaps. | No delete/bulk generation, unit base price/orientation, or unified property file connecting legal, sales, finance, and construction records. Authorization alignment for projects.structure.manage remains a Phase 1 issue recorded in security docs. |
| **D — Customers & CRM** | ProjectCustomerRegistryModal.tsx | Project customer list/details/create/update; canonical Party search and selection; customer interaction/follow-up entry; linked identity-document download. Uses /api/parties, /api/projects/{id}/customers, /interactions, and authorized document download. | PARTIALLY_IMPLEMENTED. | No standalone organization-wide Party workspace, full sales pipeline, lead assignment/qualification funnel, campaigns, representative/contact-point management, or complete post-sale service workflow. Transitional identity mirror columns remain scheduled for Phase 1 retirement. |
| **E — Internal Unit Holds** | ProjectSalesReservationsModal.tsx | List/create/cancel project holds; choose a currently available unit and project customer; set expiry; enter cancellation reason. Uses GET/POST /api/projects/{id}/reservations and POST .../{reservationId}/cancel. Expiry is handled by backend service/worker. | IMPLEMENTED_NOT_VERIFIED (automated PostgreSQL 18 E2E exists; full user-facing browser acceptance is not recorded). | Strictly an internal hold. It is not a statutory reservation contract, does not collect promoter cash, and does not generate installments or tax events. Legal conversion belongs to Phase 2 after K-Min and practitioner sign-off. |
| **K — Project Documents / K-Min base** | ProjectDocumentsModal.tsx | Upload a project file with category/description, list files, and download files. Uses GET/POST /api/projects/{id}/documents and GET .../{fileId}/download. | PARTIALLY_IMPLEMENTED. | Metadata update, soft-archive, structured DocumentLink references to business records, retention/legal holds, and K-Full are not implemented. Full user-facing browser review remains outstanding. |

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

- Main commit inspected at audit start is 5415f0e668a55f902ac2802e1669af58ad7ec410; last application-code change is 6bbd97f70ed0fb63cf226a1117cf6e83c359d2be.
- GitHub Actions Run #531 / [43752672569](https://github.com/younestech31/PROMO-GEST/actions/runs/43752672569) passed all three jobs: Frontend, .NET 10 + PostgreSQL 18, and Windows publish.
- Frontend strict TypeScript check, **38/38** frontend tests, production SPA build, ASP.NET Core static-host build, and preview-leak checks passed.
- Domain tests **27/27**, Application tests **14/14**, and PostgreSQL 18 integration tests **9/9** passed. Linux publish/shell validation and the database, storage, and Data Protection restore drill passed. Windows x64 publish, DPAPI key-ring recovery, and PowerShell validation passed.
- The product owner previously confirmed a targeted real Google AI Studio development server/API and PostgreSQL connection smoke check and that the previously failing customer/prospect and reservation pages no longer showed the generic internal error after PR #44. This does not certify the full user-facing workflows.

**Still not evidenced:** Manual Arabic RTL / French LTR review on desktop and mobile; full read/create/update/cancel workflow execution in the real API; persistence/reload checks for all operations; browser cookie/CSRF review; authorization boundary review through the browser; and product-owner approval of the navigation proposal.

## 7. Next work by dependency order

1. **Phase 0:** complete manual bilingual browser and real-API workflow acceptance using fictional development records only. Do not use Vite-only simulator results as API or persistence evidence.
2. **Phase 0:** review and approve (or return for revision) the proposed three-level navigation model in PROJECT-NAVIGATION-UX.md. Keep this bounded to organization workspace, explicit project switching, active project workspace, and separate technical administration.
3. **Phase 1, only after Phase 0 gates pass:** organization profile editing; structure authorization alignment; reviewed Party/ProjectCustomer transitional mirror retirement migration/backfill/rollback; and versioned official Wilaya/commune reference data under ADR-0010.
4. **Later phases:** proceed strictly through Phase 2–5, with K-Min and qualified Algerian legal/accounting review before legal/financial/statutory code.

## 8. Change policy for this document

Update this matrix whenever a screen, API-backed user action, route, permission, module status, or acceptance test changes. Record actual source paths and verification evidence. Never mark manual RTL/LTR browser acceptance or a full business workflow verified solely from CI green or component presence.
