# PROMO GEST — Product Milestones & Delivery Roadmap

This is the working delivery sequence for the local-first Algerian real-estate promotion ERP. Milestone status is based on code and automated verification in the repository; a green CI run is not, by itself, proof of production readiness or user acceptance.

## Product boundaries

- One self-hosted installation and PostgreSQL 18 database per organization.
- Business records and uploaded documents stay on the organization's local server.
- Cloud services are limited to optional development tooling and, in a future licensing design, activation/updates. They must not become a repository for customer or company business data.
- Arabic is the default interface language; French remains fully supported.
- No external hosting/deployment or production database change is implied by completing a development milestone.

## Milestone 1 — Secure local platform foundation

**Status: implemented; production acceptance remains separate.**

Delivered foundation includes first-run organization setup, a single System Administrator, password hashing and lockout, opaque sessions, CSRF protection, role/permission seeding, project-scoped access, immutable audit records, local PostgreSQL persistence, local filesystem storage primitives, explicit owner-only migrations, installation scripts, and database/storage/Data Protection backup and restore workflows.

Automated CI currently exercises frontend checks, .NET 10 builds, PostgreSQL 18 integration tests with separate provisioner/owner/runtime identities, a restore drill, and Windows self-contained publishing/DPAPI tests.

Production acceptance still requires a real local Windows/Linux installation rehearsal, operational review of effective PostgreSQL privileges (including inherited role memberships), and a verified organization restore rehearsal.

## Milestone 2 — Project master data and real-estate structure

**Status: core implementation delivered; continue user acceptance and edge-case hardening.**

Implemented capabilities:
- Project master data in Arabic/French, Wilaya/commune, legal land/permit references, status, budget, and planning targets.
- Project members and role-scoped access.
- Buildings, floors, and property units stored in PostgreSQL.
- Version-aware editing for buildings, floors, and units.
- Unit lifecycle validation and audited changes.
- Actual registered building/unit counts displayed separately from planned targets.
- Project and structure permissions tested against unauthorized users.

Acceptance work still includes exercising the current preview/runtime against the latest code, verifying project summaries after creating records, and expanding operational tests for realistic project sizes and concurrent edits. Destructive deletion remains deliberately unavailable until archival, dependency, audit, and recovery rules are defined.

## Milestone 3 — Project document registry

**Status: core implementation and CI verification delivered; real local-installation acceptance remains separate.**

Delivered capabilities:
- Project-scoped list, upload, and download endpoints backed by the existing `stored_files` metadata table and local filesystem storage.
- Category and optional description metadata, with the additive migration `20261114180000_ProjectDocumentMetadata`.
- A 25 MiB per-file limit enforced by request and streaming storage checks; empty files and unsupported extensions are rejected.
- Server-selected content types, generated storage names, filename normalization, path containment checks, and cleanup of partial files on storage or metadata failures.
- SHA-256 calculated at write time and verified with stored byte length before download; tampered or missing content is rejected and audited.
- Server-side active-account, project membership, `files.read`, `files.write`, and per-project `CanManageDocuments` checks.
- Upload, download, denied access, and integrity failures are recorded in the append-only audit log.
- A bilingual Arabic/French document registry in the project workspace. Document bytes remain on the local server; no cloud bucket or hosted file service is used.

CI coverage includes document upload/list/download, metadata and SHA-256 checks, unsupported-extension rejection, project membership and read-only upload enforcement, PostgreSQL migration/least-privilege tests, the database-plus-local-files backup/restore drill, frontend checks/build, and Windows publishing/script validation.

Production acceptance remains separate: test the full upload/download and restore cycle on a real local Windows/Linux installation, verify local storage ACLs and backup retention, and complete a cross-project IDOR/tampering drill using non-production test files. Do not apply the migration to an existing Cloud SQL or production database as part of preview troubleshooting.

## Milestone 4 — Customer and prospect registry

**Next development milestone.**

Create a deduplicated local register for individuals and legal entities with contact details, communication history, identity/document references, privacy boundaries, and project interest. Define field validation and access by commercial/legal role before introducing sales or payment mutations.

## Milestone 5 — Commercialization, reservations, contracts, and collections

Introduce unit availability workflows, customer-unit links, reservation lifecycle, contract records, payment schedules, receipts, and collection tracking. Define legal states, cancellation/refund handling, numbering, approvals, and audit requirements before implementing transitions. A unit must never be marked Reserved/Sold/Delivered by a shortcut outside the validated sales workflow.

## Milestone 6 — Finance and Algerian SCF accounting

Build controlled accounting workflows only after the business events in Milestone 5 have stable definitions. Validate chart of accounts, journals, posting rules, VAT/tax treatment, invoice/receipt formats, fiscal periods, and export requirements with a qualified Algerian accounting practitioner. No automatic accounting entries should be enabled on assumptions alone.

## Milestone 7 — Construction execution and procurement

Add work packages, contractors/suppliers, purchase requests, commitments, progress measurements, site reports, change orders, and budget variance controls. Keep approvals and evidence linked to project documents and audit records.

## Milestone 8 — Reporting, operations, and production release

Complete cross-module reporting, operational diagnostics, retention policies, backup scheduling, restore rehearsals, upgrade/rollback procedures, local network hardening, performance testing, and documented administrator training. Production approval requires a real installation and restore exercise, not only CI.

## Working rules for every milestone

1. Work on an isolated branch; merge only after source review and required CI checks pass.
2. Fix security, data-integrity, and build blockers before adding new features.
3. Do not change an existing Cloud SQL or production database, apply migrations, delete records, or deploy a hosted build without a separate explicit operational need and backup/verification plan.
4. Add tests for authorization boundaries, invalid inputs, concurrency, persistence, and audit behavior as relevant to each feature.
5. Update this roadmap and the affected architecture/database/operational documentation when scope or implementation changes.
