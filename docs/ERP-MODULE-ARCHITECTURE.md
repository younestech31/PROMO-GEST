# PROMO GEST — Enterprise ERP Module Architecture

> **Canonical Reference Notice:** For the complete 12-domain module catalog (A–L) mapped using the strict 6-state taxonomy, see [MODULE-CATALOG.md](MODULE-CATALOG.md) and [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md).

**Status:** Accepted product architecture; implementation is staged through the roadmap  
**Applies to:** The single-organization, local-first PROMO GEST installation

## 1. Purpose and product boundary

PROMO GEST is an enterprise resource planning system for Algerian real-estate development organizations (*promoteurs immobiliers*). It must not become a project-list application in which every business capability is buried inside an individual project.

Projects are a major business dimension, but the organization also needs company-wide customer and supplier masters, finance, procurement, inventory, workforce administration, document governance, reporting, and system administration. Employees should enter through the business module relevant to their job and work with the projects or records they are authorized to access.

There is no single worldwide ERP menu or module list mandated by one standard. This architecture adopts established enterprise design principles: clear business-module boundaries, controlled master data, role-based access combined with resource scope, separation of duties, traceable workflows, and reliable reporting.

## 2. Architectural decision

### 2.1 Modular monolith first

Keep one deployable local application (ASP.NET Core API + React SPA), one PostgreSQL database per organization, and local document storage. Organize the application into explicit business modules / bounded contexts with clear ownership and application contracts.

This is a **modular monolith**, not a collection of microservices. It gives the product module boundaries and independent evolution without introducing premature distributed deployment, network dependencies, service discovery, message brokers, and operational burden on an organization's local server.

A future service extraction is an option only when a proven scale, availability, isolation, or integration requirement justifies it. A module boundary must not automatically become a separately deployed service.

### 2.2 Business ownership and module contracts

Each business fact has one owning module. Other modules reference its stable identifier and use an explicit application contract or approved read model; they must not maintain competing copies or directly mutate another module's tables/entities.

Within the current single-database deployment, synchronous application-level orchestration and database transactions are preferred for workflows requiring atomic consistency. Domain/integration events may be introduced where useful; a durable outbox is required before relying on asynchronous cross-module side effects. A message broker is not a prerequisite for the initial modular monolith.

## 3. Target business module catalogue

The following is the target product structure. It describes the intended product, not a claim that every module is already implemented.

| Module | Owns / delivers | Typical project relationship |
|---|---|---|
| **Organization & Administration** | Organization profile, branches/departments, cost centers, business settings, numbering series, reference data, users, roles, security policies, backups and system administration | Organization-wide; may define defaults and project membership |
| **Portfolio & Real Estate Projects** | Development portfolio, project master data, land/property references, permits, buildings, floors, units, project lifecycle and project team | Project is the core business object; access is scoped |
| **CRM & Party Management** | Canonical customer/prospect/contact records, communication history, leads, opportunities, qualification and customer relationships | Parties are organization-wide; lead/opportunity and customer-project relationships are project-linked where applicable |
| **Sales & Contracts** | Offers, pricing rules, availability, reservations, contract drafts/reviews/execution, installment schedules, receipts, collections, cancellations and refunds | Transactions reference a project and a property unit; cross-project visibility requires explicit authorization |
| **Construction & Site Operations** | Work breakdown, work packages, execution plans, contractors' work, progress measurements, site diaries, quality/inspection records, change orders and handover | Primarily project-scoped, with organization-wide contractor and performance reporting |
| **Procurement & Supplier Management** | Supplier qualification, purchase requests, RFQs/tenders, comparative offers, purchase orders, commitments, goods receipts and supplier invoice hand-off | Supplier master is shared; requisitions, orders and commitments are linked to projects/cost centers |
| **Inventory & Materials** | Item/material catalogue, units of measure, warehouses, stock balances, reservations, transfers, issues/returns and stock valuation inputs | Organization-owned stock locations; movements can be allocated to projects and work packages |
| **Finance & Algerian SCF Accounting** | General ledger, chart of accounts, journals, fiscal periods, accounts receivable/payable, cash/bank, budgets, cost accounting, fixed assets and approved accounting postings | Company-wide books with project/cost-center dimensions and controlled project-level access |
| **Human Resources** | Employee master, contracts, organizational assignments, attendance, leave, payroll and employee-related administration | Organization-wide; project assignments and labor-cost allocation are references, not duplicate employee records |
| **Document & Records Management** | Company and project repositories, metadata, categories, versioning, retention, access and evidence links | Both organization-wide and project-scoped; the owning business module controls the related record permission |
| **Reporting & Management Control** | Operational dashboards, sales/collection, project cost and progress, procurement, stock, cash, financial statements and management indicators | Aggregates only data the requesting user is authorized to see |
| **Quality, Handover & After-Sales (later extension)** | Defect lists, handover reservations, customer claims, warranties and post-delivery service | Linked to delivered units, customers and projects |

The first delivery focus remains the real-estate development lifecycle. HR, advanced inventory valuation, quality/after-sales and other extensions must be introduced only after their business rules and customer value are validated.

## 4. Navigation and user experience

The primary application shell is organization- and role-oriented, not project-only. The detailed project selection, active-context, switching, directory, cross-project queue, and context-safety specification is maintained in [Project Navigation & Active Context UX](PROJECT-NAVIGATION-UX.md).

The intended navigation groups are:

1. **Workspace:** Dashboard and task/approval inbox.
2. **Commercial:** CRM / Customers, Sales, Reservations and Contracts.
3. **Projects & Delivery:** Project portfolio, Construction / Site Operations, Handover.
4. **Supply Chain:** Suppliers, Procurement, Inventory / Materials.
5. **Finance:** Finance, Cash & Banks, Accounting, Budgets and Project Cost Control.
6. **People:** Human Resources.
7. **Information:** Document & Records Management, Reports and Analytics.
8. **Administration:** Organization, Users & Roles, Audit, System Settings, Backup / Restore.

The exact labels and visibility are permission-driven and bilingual (Arabic RTL / French LTR). A user must not see an actionable menu item they cannot use, but hiding a menu item is only a user-experience measure, never an authorization control.

### Project workspace is a context, not the whole ERP

A project workspace remains valuable for users who manage a particular development. It should provide a project overview, structure, team/access, key milestones, and contextual links into the relevant modules.

Examples:
- “Customers” opens CRM filtered to the project; it does not create a separate duplicate customer universe.
- “Reservations” opens Sales filtered to the project.
- “Project documents” opens the document module with the project scope applied.
- “Project costs” opens Finance / Cost Control filtered to that project.
- “Site progress” opens Construction with that project selected.

The destination module must still authorize every record and action on the server. A project filter in the URL, selected project context, or navigation path is not proof of access.

## 5. Shared master data and ownership

The system must avoid duplicate master records and repeated data entry.

| Master / record | Owning context | Other modules should |
|---|---|---|
| Organization, branch, department, cost center | Organization & Administration | Reference stable IDs |
| User identity, role and permissions | Identity & Security | Reference authenticated user ID; do not maintain module-local passwords |
| Employee profile | Human Resources | Link to user account when one exists; an employee need not have a login |
| Customer, prospect, contact / legal party | CRM & Party Management | Reference party ID; record project-specific relationship separately |
| Supplier / contractor party | Supplier Management (using the shared party identity) | Reference party ID and keep project-specific qualification/contract data separate |
| Project, building, floor, property unit | Portfolio & Real Estate Projects | Reference project/unit IDs; do not recreate structure in Sales or Finance |
| Item / material and unit of measure | Inventory & Materials | Reference catalogue IDs |
| Accounts, journals, fiscal periods | Finance & Accounting | Post through approved finance application contracts |
| Documents and file bytes | Document & Records Management | Store document references and business ownership metadata; keep bytes on the local server |
| Audit events | Security & Audit | Append through the central audit pipeline; no module may rewrite history |

### Customer registry evolution

The target Party model, Employee/User boundary and safe migration sequence are specified in [Party & Master-Data Design](PARTY-MASTER-DATA.md) and [ADR 0009](ADR/0009-organization-wide-party-and-employee-separation.md). The existing project-scoped customer rows and their IDs remain compatibility references until an additive migration and all dependent reservation/interaction paths have been verified.



The current implementation has a project-scoped customer registry. The target model is a canonical organization-wide party/customer record with explicit project relationships, leads/opportunities, and project-specific interactions or roles where needed.

This is a staged evolution, not permission to rewrite or discard existing records. Before migration, define duplicate detection, human-assisted merge/reconciliation, stable ID preservation, foreign-key updates, audit preservation, rollback, and backup/restore tests. Existing project data must remain readable throughout the transition.

## 6. Authorization model: role + module + resource scope

Use a hybrid **RBAC + resource-attribute** model:

- **Identity:** the authenticated active user and session.
- **Role:** the employee's organizational function (for example Sales Agent, Accountant, Site Engineer, Project Manager).
- **Permission:** a narrow action on a resource (for example `sales.reservations.read`, `finance.journals.approve`).
- **Scope:** organization, module, project, record, department, warehouse, or another justified business boundary.
- **Attributes / assignment:** project membership, assigned department, cost center, document classification, transaction state, and other trusted server-side facts.

A request is allowed only when all applicable conditions are satisfied. Role membership alone does not grant access to every project or every record. Organization-wide or cross-project access must be an explicit permission/scope, granted for a defined job need and audited.

Mandatory controls:
1. Deny by default; grant only the least privilege required.
2. Enforce permission and record scope on the server for every API request, including reads, list filters, exports, downloads, background jobs, and indirect references.
3. Query only authorized records; do not retrieve unrestricted records and depend on frontend filtering.
4. Re-check authorization when project membership or user status is revoked; stale UI state must not preserve access.
5. Keep audit records for sensitive operations and access denials without copying unnecessary personal or financial data into metadata.
6. Apply separation of duties to approval-sensitive operations (for example, prevent a requester from approving their own purchase/payment/journal when policy requires independent approval).
7. Treat technical system administration separately from business approval. A system administrator is not automatically an accounting, sales, or procurement approver. Any emergency support access to business records must be explicit, time-bound where feasible, and audited.

The existing explicit project-membership rule remains: project-owned records require project membership or an explicitly granted organization-wide scope. The UI may improve discoverability, but may not weaken this rule.

## 7. Cross-module business workflows

Modules cooperate through documented use cases, never through UI-to-table shortcuts.

Illustrative end-to-end lifecycle:

1. **Portfolio** registers the project, land, buildings and saleable units.
2. **Construction** tracks authorized work packages, progress, quality evidence and delivery readiness.
3. **CRM** maintains the party/customer master and sales opportunities.
4. **Sales** creates a reservation against an available unit and a qualified customer; reservation expiry/cancellation releases the unit under explicit domain rules.
5. **Sales & Contracts** prepares and approves a contract under reviewed business/legal rules. A draft or reservation alone must never mark a unit as sold.
6. **Finance** records approved receivables, receipts, refunds and accounting entries under controlled posting rules.
7. **Procurement & Inventory** processes approved requests, purchase orders, receipts and material issues against projects/cost centers.
8. **Finance / Cost Control** reconciles commitments, invoices, payroll allocations and actual costs to produce project financial results.
9. **Handover / After-Sales** records acceptance, defects and customer service after delivery.

Every workflow must define its owner, permitted state transitions, approval roles, cancellation/reversal process, audit evidence, concurrency policy, and accounting impact before implementation.

## 8. Finance and Algerian localization gate

Do not infer Algerian statutory accounting, tax or contract rules from generic ERP patterns. Before enabling production posting, validate the chart of accounts, journal model, fiscal periods, tax/VAT treatment, invoice and receipt content, retention, exports, and correction/reversal rules with qualified Algerian accounting/legal practitioners and current applicable sources.

The product must support DZD, Algerian administrative geography, Arabic/French names and documents, RTL/LTR layouts, configurable numbering, date/number formats, and local operation without a permanent internet dependency. Statutory rates, codes, templates and legal clauses must be maintained as versioned, reviewable configuration—not silently hard-coded as timeless facts.

## 9. Reporting, controls and operational requirements

- Reports and dashboards must inherit the same organization/project/record authorization as source data.
- Financial and stock reports must reconcile to their originating transactions and expose drill-through only when the user is authorized.
- Sensitive state changes require audit evidence and, where appropriate, maker-checker approval.
- Documents and database backups must be recoverable together; local file metadata and file bytes must remain consistent.
- No module may send company, customer, employee, contract, payment or project business data to a hosted cloud service.
- Public marketing or buyer portals remain separate deployments and must never connect directly to the ERP database.

## 10. Incremental implementation sequence

1. **Architecture baseline:** establish module boundaries, shared master-data ownership, permission vocabulary, navigation groups and workflow contracts. No destructive data changes.
2. **Organization-wide master data:** design Party (customer/prospect/supplier/contact), employee-vs-user separation, organizational units, reference data and document ownership. Migrate existing project customer data only with reconciliation and rollback.
3. **Portfolio & project workspace:** retain the existing project/structure capabilities but make the workspace contextual, with links into the ERP modules.
4. **CRM and Sales:** promote customer relationships and sales workflows to first-class modules; continue reservations, then contracts and collections after business/legal review.
5. **Construction & Procurement / Inventory:** deliver site execution and supply-chain flows with project/cost-center allocation and approvals.
6. **Finance & SCF:** implement controlled subledgers and accounting integration only after transaction and Algerian accounting rules are validated.
7. **HR and later extensions:** add employee administration and validated optional modules.
8. **Reporting and release readiness:** cross-module controls, authorized reporting, local deployment, restore and operating acceptance.

For each step, use an isolated branch, additive migrations where possible, explicit compatibility/rollback planning, tests for permissions and business invariants, and CI before merging. Never run a migration against the user's existing Cloud SQL preview or deploy a hosted build merely because a development PR is complete.

## 11. Acceptance gates for every module

A module is not considered delivered merely because its screen exists. It must have:
- A written owner and clear responsibility boundary.
- Stable master-data references and documented cross-module contracts.
- Server-side authorization for every API operation and object scope.
- Defined lifecycle, validation, approval, cancellation and reversal rules.
- Audit evidence and privacy-aware metadata.
- Unit, integration, concurrency and authorization tests appropriate to its risks.
- Arabic/French support, keyboard/accessibility and responsive behavior.
- Local-first storage, backup and restore coverage.
- Updated user/administrator documentation and a realistic local acceptance scenario.

## 12. Design references

These references inform specific principles; they do not constitute a claim of certification or legal compliance:

- NIST CSRC, **Role-Based Access Control (RBAC)**: roles group authorizations and simplify management and review of access — https://csrc.nist.gov/glossary/term/role_based_access_control and https://csrc.nist.gov/projects/role-based-access-control/faqs
- OWASP Cheat Sheet Series, **Authorization**: deny by default, least privilege, server-side authorization and permission checks on every request — https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Microsoft Learn, **Architectural principles / bounded contexts**: separate business concepts into coherent modules with explicit boundaries — https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles
- Odoo 19 Developer Documentation, **Building a Module / Security**: illustrates mature ERP module grouping, group access, and record-level controls — https://www.odoo.com/documentation/19.0/developer/tutorials/backend.html
