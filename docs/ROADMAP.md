# PROMO GEST — Product Milestones & Delivery Roadmap

> **Canonical Reference Notice:** For the consolidated dependency-ordered phases, Phase 0 stabilization blockers, and release gates, see [MASTER-ROADMAP.md](MASTER-ROADMAP.md) and [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md).

This is the working delivery sequence for the local-first Algerian real-estate promotion ERP. Milestone status is based on code and automated verification in the repository; a green CI run is not, by itself, proof of production readiness or user acceptance.

## Product boundaries

- One self-hosted installation and PostgreSQL 18 database per organization.
- Business records and uploaded documents stay on the organization's local server.
- Cloud services are limited to optional development tooling and, in a future licensing design, activation/updates. They must not become a repository for customer or company business data.
- Arabic is the default interface language; French remains fully supported.
- No external hosting/deployment or production database change is implied by completing a development milestone.
- The target is a modular ERP with organization-wide business modules and a contextual project workspace, not a project-only application. See [ERP Module Architecture](ERP-MODULE-ARCHITECTURE.md) for the accepted target structure, shared master-data ownership, navigation, security model and workflow boundaries.

## Foundation hardening gate — before expanding the module surface

**Status: COMPLETED.** Gate A (PR #25) and Gate B (PR #27) are merged into `main`. Gate B adds project master-data concurrency through the existing EF `ConcurrencyStamp`, with PostgreSQL and preview coverage for stale and competing updates. PR/branch CI passed all three jobs; production acceptance remains separate.

The November 2026 source review identified project-scope authorization bypasses, missing creator membership, project-ID existence disclosure on project-scoped routes, and the outdated Wilaya code range. These were remediated and merged through PR #25. See [Foundation Audit](FOUNDATION-AUDIT-2026-11.md) and the linked accepted security/localization ADRs.

This gate is a prerequisite across the existing milestones, not a new business module. It includes:
- Explicit project membership plus action permission for every project-owned API operation.
- Same authorization semantics in ASP.NET Core and the in-memory development preview.
- Creator membership and protection against removing/demoting the last Project Manager.
- Consistent non-member denial before loading protected project details.
- Official Algeria Wilaya codes 01–69, bilingual labels, and regression tests.
- A verified baseline CI run on the remediation branch.

Gates A and B are green and closed. Gate C is now the next implementation gate. Its design baseline is documented in [Party & Master-Data Design](PARTY-MASTER-DATA.md), [Administrative Reference-Data Governance](REFERENCE-DATA-GOVERNANCE.md), and [Algerian Real-Estate Legal Domain](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md). These documents do not mark Gate C implementation complete.

## Gate C — Canonical master data and reference data

**Status: initial C1 Party-identity foundation merged into `main` via PR #31 at `a33b2eec52d8ab430521699e79b7efa821d2ccad`; all three CI jobs passed. Gate C remains open because reusable cross-project Party relationships, Party roles, contact points, Employee, duplicate reconciliation and full reference data are not yet implemented.**

The first slice adds the `Party` aggregate, required `project_customers.party_id`, deterministic one-to-one backfill preserving legacy customer UUIDs, Party-backed CRM identity reads/updates, and migration/domain/integration coverage. It does not yet provide organization-wide Party selection, reusable multi-project Party relationships, full `ProjectPartyRole`, contact-point/identifier management, Employee records, or duplicate reconciliation. No migration has been applied to Cloud SQL or an organization installation.

Gate C is split into controlled deliverables:

1. **C1 — Party identity and project roles:** introduce one organization-wide Party identity for each person/legal entity; model Prospect, Customer, Supplier, Contractor and other roles through explicit relationships; keep project status/interactions project-scoped; separate Employee from User login accounts.
2. **C2 — Compatibility and safe CRM migration:** preserve every existing ProjectCustomer, CustomerInteraction and reservation UUID; add explicit mappings; backfill one Party per legacy customer row initially; generate duplicate candidates for human reconciliation; never auto-merge by name/phone.
3. **C3 — Administrative reference data:** introduce a versioned, server-owned, bilingual Wilaya/commune catalogue only after the complete 69-Wilaya/1,541-commune source dataset is checked and reviewed; add effective dates and preserve historic location snapshots.
4. **C4 — Documents and identity evidence:** review the existing project-scoped StoredFile permissions before any identity document is made organization-wide; do not copy files or broaden access silently.
5. **C5 — Acceptance:** additive migrations, PostgreSQL 18 backfill/restore tests, project-isolation tests, concurrency checks, reconciliation reports and local installation rehearsal.

The Party foundation code includes an additive EF migration and PostgreSQL 18 integration coverage. PR #31 and all CI jobs passed after merge. A representative backup/restore rehearsal against an anonymized pre-Party database and local installation acceptance are still required before applying this migration to any organization installation. No schema migration has been applied to Cloud SQL, no customer/organization data has been changed, and no hosted deployment is authorized.

Before implementing M5b/M5c, use [Algerian Real-Estate Legal Domain](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md) to model statutory reservation separately from VSP, stage-linked instalments, notarial evidence and the distinction between VAT taxable event and VAT rate. Professional legal, tax and accounting review remains mandatory.

## Milestone 1 — Secure local platform foundation

**Status: core platform implementation delivered; foundation Gates A and B are merged and CI-verified; production acceptance remains separate.**

Delivered foundation includes first-run organization setup, a single System Administrator, password hashing and lockout, opaque sessions, CSRF protection, role/permission seeding, project-scoped access, immutable audit records, local PostgreSQL persistence, local filesystem storage primitives, explicit owner-only migrations, installation scripts, and database/storage/Data Protection backup and restore workflows.

Automated CI exercises frontend checks, .NET 10 builds, PostgreSQL 18 integration tests with separate provisioner/owner/runtime identities, a restore drill, and Windows self-contained publishing/DPAPI tests.

Production acceptance still requires a real local Windows/Linux installation rehearsal, operational review of effective PostgreSQL privileges (including inherited role memberships), and a verified organization restore rehearsal.

## Milestone 2 — Portfolio, project master data and real-estate structure

**Status: core implementation delivered; continue user acceptance and edge-case hardening.**

Implemented capabilities:
- Project master data in Arabic/French, Wilaya/commune, legal land/permit references, status, budget, and planning targets.
- Optimistic concurrency for project master-data edits: API/UI version-token round-trip, stale-write rejection, and concurrent-save conflict handling.
- Project members and role-scoped access.
- Buildings, floors, and property units stored in PostgreSQL.
- Version-aware editing for buildings, floors, and units.
- Unit lifecycle validation and audited changes.
- Actual registered building/unit counts displayed separately from planned targets.
- Project and structure permissions tested against unauthorized users.

Acceptance work still includes exercising the current preview/runtime against the latest code, verifying project summaries after creating records, and expanding operational tests for realistic project sizes and concurrent edits. Destructive deletion remains deliberately unavailable until archival, dependency, audit, and recovery rules are defined.

## Milestone 3 — Document & records management foundation

**Status: project-scoped document registry implemented and CI-verified; organization-wide repository evolution remains planned.**

Delivered capabilities:
- Project-scoped list, upload, and download endpoints backed by the existing `stored_files` metadata table and local filesystem storage.
- Category and optional description metadata, with migration `20261114180000_ProjectDocumentMetadata`.
- A 25 MiB per-file limit enforced by request and streaming storage checks; empty files and unsupported extensions are rejected.
- Server-selected content types, generated storage names, filename normalization, path containment checks, and cleanup of partial files on storage or metadata failures.
- SHA-256 calculated at write time and verified with stored byte length before download; tampered or missing content is rejected and audited.
- Server-side active-account, project membership, `files.read`, `files.write`, and per-project `CanManageDocuments` checks.
- Upload, download, denied access, and integrity failures are recorded in the append-only audit log.
- Arabic/French document registry in the project workspace. Document bytes remain on the local server; no cloud bucket or hosted file service is used.

CI coverage includes document upload/list/download, metadata and SHA-256 checks, unsupported-extension rejection, project membership and read-only upload enforcement, PostgreSQL migration/least-privilege tests, database-plus-local-files backup/restore drill, frontend checks/build, and Windows publishing/script validation.

Production acceptance remains separate: test the full upload/download and restore cycle on a real local Windows/Linux installation, verify local storage ACLs and backup retention, and complete a cross-project IDOR/tampering drill using non-production test files.

## Milestone 4 — CRM and customer / prospect master data

**Status: project-scoped customer registry implemented and CI-verified; organization-wide Party/CRM model is a planned architecture evolution.**

Delivered capabilities:
- Project-scoped register for individuals and legal entities with Arabic/French preferred language, primary contact, contact person, source, and lifecycle status.
- Per-project duplicate prevention using normalized display name and phone, enforced by a unique PostgreSQL index.
- Customer details, optimistic-concurrency updates, and append-only communication/follow-up history for calls, emails, meetings, visits, and notes.
- Optional reference to a document already stored under the same project. Identity-document numbers are not copied into separate text fields.
- `customers.read` / `customers.manage` permissions combined with project membership. Customer mutations additionally require project sales capability or Project Manager role; legal read access remains read-only.
- Audit entries identify record IDs and operations without copying names, telephone numbers, email addresses, or interaction content.
- Arabic/French customer registry UI in the project workspace. Records remain in local PostgreSQL.

CI coverage includes the additive PostgreSQL migration, customer creation/list/detail/update, duplicate prevention, linked-document project scope, communication history, optimistic concurrency, audit privacy, project membership, read-only role enforcement, revocation, frontend checks/build, and Windows publishing.

Target evolution: introduce one canonical organization-wide Party/Customer/Prospect identity with explicit project relationships. This requires a reviewed duplicate-reconciliation and migration plan; do not duplicate or discard existing records.

## Milestone 5 — Commercialization, reservations, contracts and collections

### M5a — Reservation lifecycle

**Status: implemented on main through PR #22; PR CI passed; real local-installation acceptance remains separate.**

**Scope boundary:** the current M5a record is an internal, project-scoped unit-availability hold. It is not the statutory reservation contract under Law 11-04 Article 27 and must not be presented as an executed notarial contract. See [Algerian Real-Estate Legal Domain](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md).

Delivered scope:
- Project-scoped reservation records link an available property unit to a non-archived customer registered in the same project.
- Reservation creation persists the reservation, `Reserved` unit state, and audit event together; PostgreSQL's partial unique index prevents two active reservations for the same unit.
- Cancellation requires a reason and returns the unit to `AvailableForSale` atomically.
- A background worker expires overdue reservations and releases only units still in the expected `Reserved` state. State mismatches are recorded as warnings and do not overwrite the unit.
- Explicit `sales.reservations.read` / `sales.reservations.manage` permissions are combined with project scope and the `CanManageSales` capability (or Project Manager role).
- Reservation audit metadata stores identifiers only, not customer names or contact information.
- Arabic/French project reservation workspace supports listing, creation, and reasoned cancellation.

### M5b — Contract lifecycle

Build separate workflows for the internal unit hold, statutory reservation contract, VSP contract and completed-property sale deed. Model authenticated/notarized evidence, versioned terms, amendments, approval, statutory cancellation/notice evidence, promotion-guarantee prerequisites, possession and delivery. VSP instalments must be linked to the legally specified construction stages, not only calendar dates. Enforce VSP signature/payment prerequisites and certificate-of-conformity evidence as reviewed legal gates. See [Algerian Real-Estate Legal Domain](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md). Legal clauses, model forms and execution rules require qualified Algerian notarial/legal review before any generated or stored document is treated as legally valid.

A reservation or draft contract must never mark a unit as sold.

### M5c — Payment schedules and collections

Define contractual instalments, stage-triggered VSP due events, escrow/FGCMPI custody, actual promoter receipts, allocations, overdue balances, refunds, cancellation retention, reversals and collections as separate records. Keep VAT taxable-event timing separate from VAT-rate eligibility. Do not recognize escrow-held advances as unrestricted promoter cash or trigger tax/accounting postings without a reviewed rule. Validate the complete flow with an Algerian tax practitioner and accountant before implementation.

## Milestone 6 — Finance, treasury and Algerian SCF accounting

Build controlled financial workflows after the business events in Milestone 5 have stable definitions. Scope includes cash/bank, receivables/payables, budgets, cost centers, project cost control, journals, chart of accounts, fiscal periods and general ledger.

Validate chart of accounts, journals, posting rules, VAT/tax treatment, invoice/receipt formats, fiscal periods, corrections/reversals and export requirements with a qualified Algerian accounting practitioner using current applicable sources. The Finance Law 2025 collection-based VAT taxable event and Finance Law 2026 reduced-rate scope must be represented as separate, effective-dated rules. No automatic accounting entries should be enabled on assumptions alone. Enforce maker-checker approval and period controls where required.

## Milestone 7 — Construction and site execution

Add work breakdown structures, work packages, baseline schedules, contractors' work, progress measurements, site diaries, quality/inspection records, change orders, variations, handover readiness and budget variance controls. Link evidence to project documents. VSP-linked milestones require formal submission, review, evidence and acceptance history; accepted milestones feed contractual due events, while possession remains gated by the required certificate of conformity. Define how measured progress and commitments feed cost control without double-counting financial transactions.

## Milestone 8 — Procurement, suppliers and inventory

Add the organization-wide supplier/contractor party master, supplier qualification, purchase requests, RFQs/tenders, comparative offers, approval limits, purchase orders, commitments, goods receipts, returns, warehouses, material catalogue, stock movements and issue/return to projects. Define valuation and accounting integration with Finance before enabling stock valuation or automatic postings.

## Milestone 9 — Human resources and validated extensions

Add employee records, organizational assignments, attendance, leave and payroll only after Algerian employment, social-security and payroll requirements have been reviewed by qualified practitioners. Keep employee identity separate from login accounts; an employee does not automatically need application access. Further modules such as equipment/fleet, quality, handover and after-sales are prioritized by customer demand and validated business scope.

## Milestone 10 — Reporting, operations and production release

Complete cross-module reporting with inherited authorization, management indicators, operational diagnostics, retention policies, backup scheduling, restore rehearsals, upgrade/rollback procedures, local network hardening, performance testing, and documented administrator training. Production approval requires a real installation and restore exercise, not only CI.

## Working rules for every milestone

1. Work on an isolated branch; merge only after source review and required CI checks pass.
2. Fix security, data-integrity, and build blockers before adding new features.
3. Do not change an existing Cloud SQL or production database, apply migrations, delete records, or deploy a hosted build without a separate explicit operational need and backup/verification plan.
4. Add tests for authorization boundaries, invalid inputs, concurrency, persistence, audit behavior, and cross-module workflow contracts as relevant.
5. Every module must have a clear business owner, master-data ownership, API/application contracts, lifecycle rules, audit evidence, and user acceptance scenario.
6. Update this roadmap and the affected architecture/database/operational documentation when scope or implementation changes.
