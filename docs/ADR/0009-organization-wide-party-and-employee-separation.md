# ADR 0009 — Organization-wide Party identity and Employee/User separation

- **Status:** Accepted; initial Party/ProjectCustomer schema, deterministic backfill, identity-mirror retirement, and database duplicate guard are implemented. Gate C remains open for Employee and broader master-data capabilities plus representative migration/restore evidence.
- **Date:** 15 November 2026
- **Scope:** organization-wide identity, project-specific business roles, CRM continuity and login-account separation.

## Context

Before the Party foundation, PROMO GEST stored customer identity and contact details in the project-scoped `project_customers` table. The current schema now stores canonical kind/name on `parties`; `project_customers` retains project-specific contact/relationship data and its own UUID. PostgreSQL triggers preserve the project-level normalized Party-name/phone duplicate rule after removal of the transitional identity mirror columns.

The current `users` table is an authentication principal with security fields and profile fields. There is no Employee master entity. The target ERP requires organization-wide customers, prospects, suppliers, contractors and employee profiles without losing project scope or exposing data across projects.

A direct rename of `project_customers`, global merge by name/phone, or reuse of `users` as an Employee table would risk data loss, broken reservations and authorization regressions.

## Decision

1. Introduce a canonical Party identity for one natural person or one legal entity.
2. Treat Customer, Prospect, Supplier, Contractor and similar concepts as business roles/relationships, not mutually exclusive Party kinds.
3. Represent project-specific role, status, sales ownership and interactions through an explicit project relationship.
4. Keep the existing ProjectCustomer UUID as a compatibility reference while reservations, interactions and current API clients depend on it.
5. Add an explicit, auditable mapping from each legacy ProjectCustomer to the canonical Party. Default backfill is one Party per legacy row; similarity is only a duplicate-review signal.
6. Do not merge records automatically. Human-approved merges must preserve all former IDs, relationships, interactions, documents and audit references.
7. Model Employee as an organization-owned employment profile linked to a Person Party.
8. Keep User as the authentication/authorization principal. The User–Employee link is optional; employee records do not require accounts and technical accounts do not require employee records.
9. Keep global Party permissions separate from project-membership and project-role permissions. A global Party search is not permission to read project interactions, reservations or files.
10. Make schema changes additive first. No destructive rename/drop is part of the initial Party migration.

## Phase 1 implementation status (16 November 2026)

- Migrations `20261115100000_OrganizationWidePartyFoundation` and `20261115120000_UniqueProjectPartyCustomerLink` established Party identity and project association.
- Migration `20261116100000_RetireProjectCustomerIdentityMirrors` retired duplicate ProjectCustomer identity columns while retaining ProjectCustomer UUIDs and relationship foreign keys.
- Migration `20261116120000_EnforceProjectCustomerIdentityUniqueness` protects the project/name/normalized-phone rule with deferred PostgreSQL triggers, advisory locks, and a fail-closed duplicate preflight.
- PRs #55–#57 passed PostgreSQL 18 CI; main CI #573 passed all three jobs. The implementation has not been applied to Cloud SQL or any production organization database.
- Gate C remains open: Employee, richer Party roles/contact points/identifiers/representatives, human-reviewed merge tooling, and representative anonymized backup/restore migration rehearsal remain unimplemented or unverified.

## Consequences

- CRM can represent one counterparty across multiple developments.
- A single Party may be both a customer in one project and a supplier/contractor in another, subject to approved roles.
- Legacy reservation/customer foreign keys can remain intact during the transition.
- A compatibility period is required; it must not create two independently writable sources of truth.
- Employee/User separation can be delivered later without changing authentication security semantics.

## Rejected alternatives

- **Keep one customer row per project forever:** duplicates identity and prevents a true organization-wide CRM.
- **Globally deduplicate by normalized name and phone:** can merge family members, shared company numbers or unrelated people.
- **Replace ProjectCustomer directly with Party:** breaks project-specific status/permissions and risks reservations/interactions.
- **Turn User into Employee:** incorrectly requires every employee to have a login and mixes HR lifecycle with security lifecycle.
- **Migrate and delete old data in one release:** prevents safe reconciliation and rollback.

## Required evidence before production migration

Follow the migration sequence and acceptance tests in [Party & Master-Data Design](../PARTY-MASTER-DATA.md). The first code PR must include:
- additive Party migration, a separately reviewed mirror-retirement migration, and the database-only uniqueness-guard migration; EF model-snapshot parity for entity mapping changes;
- backfill of one Party per legacy ProjectCustomer with stable UUID mapping;
- PostgreSQL integration and restore tests;
- authorization tests proving cross-project isolation;
- duplicate-candidate report without automatic merging;
- no changes to Cloud SQL or real organization records.

