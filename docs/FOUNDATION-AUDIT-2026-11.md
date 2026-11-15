# PROMO GEST — Repository Foundation Audit

**Audit date:** 15 November 2026  
**Original audited baseline:** `main` at `a431b6a567a24eef9df97549c7f8f1f39051b1a9`  
**Latest merged foundation state:** `main` at `57a4e5a3c1521b9173898d4009fb8c05991237e4`  
**Status:** Gates A and B are merged and CI-verified through PRs #25 and #27. Canonical reference data, CRM master-data design, navigation and production acceptance remain open.  
**Purpose:** establish a traceable engineering baseline before adding further ERP modules.

> This is an engineering audit, not a security certification, statutory accounting opinion, legal opinion, or production acceptance sign-off. Repository source and CI evidence do not replace a real local-installation, backup and restore rehearsal.

## 1. Executive result

PROMO GEST has a credible technical foundation: a local-first single-organization deployment, layered .NET architecture, React frontend, PostgreSQL 18, separate database provisioner/owner/runtime identities, explicit migrations, append-only audit controls, local document storage, and automated CI that exercises PostgreSQL and Windows/Linux artifacts.

The repository is **not yet a complete ERP product or production-accepted installation**. The current user interface is still a small foundation shell with a project-centred workflow. The target enterprise module catalogue and active-project navigation are now documented, but those modules and navigation patterns are not yet implemented.

The most important source-level defect found in this review was an authorization boundary mismatch: organization-level project permissions were sometimes used as a substitute for explicit project membership. That contradicted the required security model and could allow a Project Director to read or change a project they had not been assigned to. The remediation branch removes that bypass across the server services, frontend permission helpers and in-memory Vite preview, and replaces the old test expectation with member/non-member regression tests.

The same review found that a non-administrator could create a project without becoming a project member. Because normal project lists are member-scoped, the creator could be unable to see the project they had just created. The remediation branch explicitly assigns the creator as its initial Project Manager.

The Algerian reference-data review found a second clear foundation mismatch: the application accepted only 58 Wilaya codes even though Official Journal No. 40 (3 June 2026) publishes the new Wilaya codes 59–69. The remediation branch updates the code range, frontend catalogue, preview/setup validation and regression tests.

## 2. Repository inventory and review coverage

The recursive Git tree at the audited `main` baseline contained **194 tracked files and 66 directories**. The inventory included application code, infrastructure, tests, documentation, build/deployment scripts, migrations, and public assets.

The following functional boundaries were reviewed in depth:

- **Frontend shell and app flow:** `App.tsx`, `ErpShellLayout.tsx`, `OverviewView.tsx`, project and setup screens, auth screens, organization/users/audit screens, project modals, API client, types, permission utilities, validation, localization, formatting, CSRF and service-worker fallback.
- **API boundary:** `Program.cs`, authentication/session handling, middleware, health/setup/auth/user/project/structure/customer/document/reservation controllers and the project reservation hosted worker.
- **Application layer:** project, structure, customer, document and reservation services, user management, authentication, setup, audit and local administrator recovery flows.
- **Domain model:** organization settings, user/role/project/member/structure/customer/reservation entities, enums, validation invariants and concurrency stamps.
- **Persistence:** `AppDbContext`, EF configurations, database initializer and role seeds, repository implementations, PostgreSQL migrations, migration snapshots and runtime database permission logic.
- **Storage and operations:** local file storage, backup/restore scripts, Linux systemd units, Windows service installation, PostgreSQL provisioning, Caddy reverse-proxy configuration, production build scripts and Cloud SQL preview tooling.
- **Verification:** frontend tests, domain/application tests, PostgreSQL end-to-end tests and CI workflow jobs.
- **Documentation:** architecture, ADRs, database design, security, installation, offline behavior, backup/restore, module architecture, project navigation and roadmap.

Generated migration Designer files were checked for presence, naming, snapshot continuity and relationship to the migration set; they were not treated as independent business-logic files. The review concentrated line-by-line effort on executable authorization, lifecycle, persistence and operational paths rather than claiming that every generated line is hand-authored source.

## 3. Verified strengths to preserve

### 3.1 Local-first trust boundary

- One local API, one PostgreSQL database and local filesystem storage per organization.
- Browser assets and fonts are bundled locally; normal ERP operations do not require a cloud runtime or CDN.
- Google AI Studio Cloud SQL is documented as development/test infrastructure, not the production customer-data architecture.
- Public website/portal hosting is explicitly separated from the local ERP runtime and database.

### 3.2 Database and migration ownership

- Provisioning, migration-owner and runtime identities are separated.
- The running API does not silently apply EF migrations on startup.
- Migrations are an explicit maintenance operation.
- PostgreSQL tests apply migrations as the owner and exercise the application using the restricted runtime identity.
- Audit-log immutability is protected at the application and PostgreSQL layers, with restricted runtime table privileges.

### 3.3 Security foundations

- Passwords are PBKDF2-SHA512 hashed with per-password salt.
- Authentication uses opaque sessions, server-side active-account/security-stamp checks, cookie protection and CSRF checks for state-changing API requests.
- Login failure responses are generic to reduce account enumeration.
- Audit events include denied access and sensitive business actions without intentionally copying unnecessary customer PII into event metadata.
- Project-owned operations are intended to be protected by service-level server authorization, not frontend visibility alone.

### 3.4 Documents, backups and runtime

- Document uploads use generated storage names, normalized file names, path containment checks, allowed extension/content-type mapping, size checks and SHA-256 integrity verification.
- Backup documentation and scripts cover PostgreSQL, local file storage and Data Protection keys; the restore drill checks stored-file existence, byte length and checksum.
- Windows/Linux self-contained publishing and service configuration exist.
- The service worker is designed for a cached static shell only; it does not promise offline business transactions.

These strengths should be extended, not replaced by a rewrite.

## 4. Findings confirmed at the audited baseline

| ID | Severity | Finding at baseline | Remediation / disposition |
|---|---|---|---|
| FND-001 | **High** | `projects.manage` and related organization-level permission codes were treated as project scope in parts of structure, customer, document, reservation and project-management services. | Merged remediation in `main` now requires explicit project membership plus action permission/capability. System Administrator remains a distinct technical override. |
| FND-002 | **High** | A newly created project did not automatically create a membership for its non-admin creator, despite member-filtered project discovery. | Merged remediation assigns the creator as initial Project Manager; PostgreSQL integration coverage proves the creator can list/open the project. |
| FND-003 | **High** | Some project-scoped service helpers loaded project details before checking membership, allowing a non-member to distinguish a known project (403) from an unknown identifier (404). | Merged remediation checks membership before protected project data is loaded for project structure, customer, document and reservation routes; regression tests cover unknown and unassigned project IDs. |
| FND-004 | **High** | The organization/project location validators and frontend catalogue stopped at Wilaya 58. | Merged remediation supports codes 01–69; official new names are added with tests and an ADR/reference-data note. Commune/authority remapping is deliberately not inferred. |
| FND-005 | **Medium** | Project create/update status parsing could silently fall back to Planning or accept an undefined enum value in the domain path. | Merged remediation rejects unknown/undefined status values explicitly. |
| FND-006 | **Medium** | The setup legal-form list did not match all backend-accepted codes; new `SPAS` and `OTHER` values also displayed raw codes. | Merged remediation aligns codes and provides Arabic/French labels for the two added choices. |
| FND-007 | **Medium** | README verification instructions did not consistently describe the root npm lockfile and root CI/build entry points. | Merged remediation makes root commands canonical and distinguishes preview API from DB-backed API testing. |
| FND-008 | **Medium** | Historical audit reports were stored under `public/assets/aistudio/`, a path included in the public SPA assets. They described older snapshots and were easy to mistake for current status. | Merged remediation moves the original report bodies under `docs/archive/audits/`, marks them historical and removes the public copies. |

### Authorization decision

The required policy is now recorded in [ADR 0006](ADR/0006-project-access-requires-explicit-membership.md):

`active identity + action permission + explicit resource membership/scope`

An organization role grants a set of possible actions; it does not grant implicit access to every project. Team membership, project favorites, recent items, route IDs and frontend controls are not security credentials.

### Algeria reference-data decision

The new Wilaya codes and names are documented in [Algerian Reference Data](ALGERIAN-REFERENCE-DATA.md) and [ADR 0007](ADR/0007-69-wilaya-reference-data.md). The source is Official Journal No. 40, Decree 26-206, Article 1. Decree 26-208 sets transfer deadlines extending through 31 December 2026 for specified property/asset operations and the end of fiscal year 2026 for financial operations. Supporting new codes must not be confused with a completed commune/administrative-office transfer.

## 5. Gate A remediation — merged and CI-verified

The changes in branch `fix/foundation-project-scope-and-localization` were merged through [PR #25](https://github.com/younestech31/PROMO-GEST/pull/25) into `main` at commit [`1935ad182b28ac67ee0ed734ae14b3f108197c7c`](https://github.com/younestech31/PROMO-GEST/commit/1935ad182b28ac67ee0ed734ae14b3f108197c7c):

1. Project detail updates, structure, customers, documents and reservations now require explicit membership for non-administrators.
2. Organization-wide project permissions are no longer accepted as substitutes for project membership.
3. The non-admin creator is explicitly assigned as Project Manager at project creation.
4. Ordinary team-management operations cannot demote or remove the last Project Manager.
5. Unknown project identifiers produce the same 403 outcome as known-but-unassigned identifiers for the audited project routes.
6. Frontend permission helpers and Vite's in-memory preview authorization mirror the server rule.
7. Invalid project statuses, project role enum values and several project field limits are checked in the domain/service layer.
8. Setup and project Wilaya validation accepts 01–69; the frontend catalogue includes the official names for codes 59–69.
9. Frontend, domain and PostgreSQL integration regression tests were expanded for these rules.
10. README, historical audit archive and reference/ADR documents were updated.

**No schema migration is needed for the 69-Wilaya code-range change.** No existing database, Cloud SQL record or project record has been modified by this source branch.

The PR CI run [43656609523](https://github.com/younestech31/PROMO-GEST/actions/runs/43656609523) passed all three jobs. The post-merge `main` run [43656863873](https://github.com/younestech31/PROMO-GEST/actions/runs/43656863873) also passed all three jobs, including PostgreSQL 18 least-privilege integration/restore tests and Windows publishing/PowerShell validation. This verifies the CI path for the merged commit; it does not replace a real local installation acceptance or production authorization.

### Gate B — Project master-data optimistic concurrency (merged and CI-verified)

Implemented through [PR #27](https://github.com/younestech31/PROMO-GEST/pull/27), merged to `main` at [commit `57a4e5a`](https://github.com/younestech31/PROMO-GEST/commit/57a4e5a3c1521b9173898d4009fb8c05991237e4):

1. `ProjectDto` returns the current `ConcurrencyStamp`; `UpdateProjectRequest` requires `ExpectedConcurrencyStamp`.
2. The application rejects a stale version before applying submitted fields with HTTP 409 and code `PROJECT_CONCURRENCY_CONFLICT`.
3. EF Core's database concurrency-token check remains active for the race where two requests load the same version before either commits; the losing write returns HTTP 409 rather than overwriting the winner.
4. The Arabic/French edit form sends the version it loaded and explains a conflict without automatic retry or silent replacement of the user's unsaved values.
5. The Vite in-memory preview follows the same contract and rotates the version on successful project edits and project membership add/remove.
6. Application, PostgreSQL end-to-end and preview tests cover stale submissions, two simultaneous updates (one winner/one conflict), and no lost update.

CI evidence: PR run [43692616371](https://github.com/younestech31/PROMO-GEST/actions/runs/43692616371) and branch run [43692610919](https://github.com/younestech31/PROMO-GEST/actions/runs/43692610919) each passed all three jobs, including PostgreSQL 18 integration/restore and Windows publishing/PowerShell validation.

**No schema migration was required.** The `projects.concurrency_stamp` column and EF concurrency-token mapping already existed. No Cloud SQL, organization records or business data were modified.

## 6. Important gaps that remain

These are not silently included in the remediation branch. Each needs a separate scoped change and test plan.

### P1 — Canonical Algerian administrative reference data

The current code validates Wilaya code ranges but does not yet resolve the canonical bilingual Wilaya name from the code on the server. Municipality is currently free text. A complete, versioned and officially sourced commune mapping is not yet in the repository.

Required follow-up:
- Use one server-owned, versioned catalogue for Wilaya codes and Arabic/French names.
- Add commune references only when authoritative source datasets and the 2026 transition status are verified.
- Preserve historical location strings and never silently rewrite existing project locations.
- Define an additive migration/reconciliation strategy for future canonical IDs.

### P1 — Shared Party / CRM master data

The current customer registry is project-scoped. The target ERP design calls for an organization-wide Party/Customer/Prospect/Supplier identity with explicit project relationships. This is not safe as a blind schema rename.

Before implementation:
- Define person vs legal entity, contact, prospect, customer, supplier and contractor relationships.
- Define duplicate detection, assisted merge, stable identifier preservation and cross-module ownership.
- Preserve communication history, documents, references and audit events.
- Build additive migration, rollback, backup and reconciliation tests.
- Do not copy identity-document numbers into duplicate free-text fields.

### P1 — Project workflows are not yet parallel workstreams

The current Project overall status is a single enum. Real development projects can perform design, permits, construction, sales, contracting, collections and handover concurrently. The target model separates overall portfolio status from configurable project workstreams and milestones.

Do not add a large schema prematurely. First map real project types, dependencies, approval gates, milestone ownership, cancellation/reversal and reporting requirements. Then introduce workstream templates with project-specific activation and history.

### P1 — Project navigation is a specification, not yet a UI capability

The target design in [Project Navigation & Active Context UX](PROJECT-NAVIGATION-UX.md) calls for My Workspace, a quick project switcher, recent/favorite projects, a deliberate Project Directory and an active project context visible in every project-scoped screen.

The current frontend still uses local `activeRoute` state and has no route-based project context. Required implementation work:
- Add URL-based routes with a project ID per tab.
- Keep project code/name/location visibly pinned in the project shell and relevant forms.
- Server-filter switcher/search/recents; never download unauthorized project lists for client-side filtering.
- Protect unsaved forms on project switching.
- Never use a single global `localStorage.currentProjectId` as the authoritative context.

### P2 — No database row-level security policy is documented

Current API security is enforced through authenticated application services and scoped repository queries. The current design documents do not establish PostgreSQL Row-Level Security as a second enforcement boundary. Consider RLS as a defense-in-depth option only after session/connection identity, pooling, tenant and maintenance behavior are designed and tested. Do not assume frontend filtering or an unreviewed RLS policy is equivalent to service-level authorization.

### P2 — Real local installation acceptance

A green CI run does not verify the user's actual office hardware, Windows service configuration, LAN TLS trust, filesystem ACLs, backup destination, restore procedure or service restart behavior. Before production use, complete a fictional-data local rehearsal on a supported Windows/Linux server, then perform a full restore to a separate target and document the measured result.

### P2 — Backup retention and off-site disaster recovery

The current backup documentation correctly states that automatic pruning and off-host replication are not implemented. Customer deployment requires an explicit retention policy, encrypted secondary copy, monitoring of free space, and periodic restore tests. Do not add automatic deletion until policy and safety boundaries are approved.

### P2 — Employee account vs employee master

User login accounts and HR employee records must eventually be separate concepts. An employee may not need a login, and a login account is not a payroll/HR record. Implement this with the HR/Party master design, not by overloading the current `users` table.

## 7. Environment and testing truth

### Vite in-memory preview

When Vite runs without `ASPNETCORE_URL`, the development middleware supplies an in-memory API for frontend previews. It reports preview mode and does not prove PostgreSQL persistence, production authentication, migration behavior or runtime database grants. It is not Cloud SQL.

### Database-backed development

The Cloud SQL development script sets the ASP.NET Core API URL for the Vite proxy and is a separate testing path. It can test real API/database integration when configured and run correctly. Do not infer success merely from a page rendering in Vite preview.

### CI evidence at audited baseline

The GitHub Actions run for baseline `main` commit `a431b6a567a24eef9df97549c7f8f1f39051b1a9` completed successfully:

- Frontend install, strict type check, frontend tests, build and static hosting verification.
- .NET 10 build/tests and PostgreSQL 18 least-privilege integration/restore tests.
- Windows publish and PowerShell validation.

Run: https://github.com/younestech31/PROMO-GEST/actions/runs/43652221573

This is evidence about the pre-remediation baseline. The remediation branch and post-merge `main` are separately verified by the runs recorded in Section 5.

## 8. Delivery sequence — foundation first

1. **Gate A — Security and data integrity: COMPLETED.** Explicit project membership, non-member denial, creator membership, manager continuity, 69-Wilaya validation and regression tests are merged in PR #25; branch and post-merge CI passed.
2. **Gate B — Optimistic concurrency: COMPLETED.** PR #27 exposes the project version through API/UI, rejects stale updates with 409, and verifies both stale and simultaneous writes in PostgreSQL and preview tests. Branch and PR CI passed all three jobs.
3. **Gate C — Reference/master data:** canonical Party, Employee/User separation, Wilaya/commune reference ownership and document references; plan additive migrations and rollback.
4. **Gate D — Navigation foundation:** URL route model, active project context, project switcher, recent/favorites and unsaved-work protection.
5. **Gate E — Project operational model:** distinguish overall project status from project-specific workstreams and milestones.
6. **Gate F — CRM and Sales:** evolve customer registry safely, then complete contract drafts/review/execution, payment schedules and collections. Legal clauses and fiscal receipts require current Algerian professional review.
7. **Gate G — Construction and supply chain:** work packages, suppliers, procurement, inventory and stock issue/return with project/cost-center allocation.
8. **Gate H — Finance and SCF:** chart of accounts, journals, VAT/tax, cash/bank, receivables/payables, fiscal periods, project cost control and reversals after review by qualified Algerian accountants.
9. **Gate I — HR and reporting:** employee administration and authorized cross-module reporting.
10. **Gate J — Production acceptance:** local installation, LAN security, full backup/restore, performance, support and upgrade/rollback rehearsal.

Every gate needs a business owner, explicit data ownership, lifecycle/approval rules, server-side authorization, audit coverage, automated tests and a realistic acceptance scenario.

## 9. Engineering rules from this audit onward

- Do not push directly to `main`; use focused feature branches and pull requests.
- Do not merge until required CI succeeds and the diff has been reviewed against this baseline.
- Do not run migrations on the existing Cloud SQL preview, restore into an existing database, modify customer/test records, or deploy hosted artifacts as part of source review.
- Prefer additive migrations and backward-compatible contracts. Every migration needs an upgrade/rollback and backup plan.
- Do not declare a feature complete because a UI screen exists. The service, domain rules, persistence, authorization, audit, tests and operations must be complete together.
- Do not claim legal, accounting, ISO or security certification. Validate Algerian statutory/SCF rules against current official sources and qualified professionals.
- Keep internal audit reports and architecture documents in `docs/`, never in the public SPA assets directory.

## 10. External reference standards and sources

These references guide the engineering controls; they do not certify PROMO GEST:

- OWASP Authorization Cheat Sheet — deny by default, least privilege and per-request permission validation: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- NIST Role-Based Access Control project: https://csrc.nist.gov/projects/role-based-access-control
- Official Journal of Algeria No. 40 (Arabic), Decree 26-206 and 26-208: https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf
- Official Journal of Algeria No. 40 (French), Decree 26-206 and 26-208: https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf
