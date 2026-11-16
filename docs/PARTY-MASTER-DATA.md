# PROMO GEST — Organization-Wide Party & Master-Data Design

> **Current Implementation Status (16 November 2026):** Party directory, canonical Party identity, project-customer Party association, identity-mirror retirement, and the PostgreSQL project/name/phone duplicate guard are implemented in `main` (PRs #35–#38, #55–#57; main CI #573). This document retains the broader target design; it does not claim Employee, Party contact-point/identifier/representative, or human-approved merge workflows are implemented.

**Status:** C1/C2 Party identity and the Phase 1 identity-mirror retirement are implemented and verified; Gate C remains open for broader master-data capabilities and representative installation migration/restore evidence.  
**Baseline reviewed:** `main` at `065d54cff4e08ed868e676d4cf3d04c715898782` (16 November 2026).  
**Scope:** party identity, project relationships, CRM continuity, employee identity and login-account separation.

## 1. Purpose and non-negotiable constraints

PROMO GEST must have one canonical identity for a real person or legal entity across the organization. Customer, prospect, supplier, contractor and subcontractor are business roles that a party may hold; they are not mutually exclusive identity types.

The design must:
- preserve the current project-scoped CRM, reservation, interaction and document references;
- allow the same party to participate in several projects without duplicating the party's identity;
- keep project-specific status, source, sales ownership and interactions attached to the relevant project relationship;
- separate a person's identity, employment relationship and application login;
- avoid automatic identity merges based on a name, telephone number or email address;
- preserve audit history and existing UUIDs;
- keep business records and identity documents on the organization's local server;
- use additive migrations with a tested rollback/recovery plan.

This is a design decision, not authorization to migrate a live organization database. No Cloud SQL or customer data is to be changed by this design work.

## 2. Implemented Party / ProjectCustomer slice (source verified 16 November 2026)

- `Party` stores canonical party kind (person/legal entity), display name, normalized display name, timestamps, and an optimistic-concurrency stamp.
- `project_customers.party_id` is required and references `parties.id`. The initial deterministic backfill reused each legacy ProjectCustomer UUID as its initial Party UUID; no fuzzy matching or automatic merge was performed.
- `ProjectCustomer` retains its own project-relationship UUID. For newly created records after the Party split, `ProjectCustomer.Id` and `PartyId` are separate IDs. Reservations and interactions continue to reference the project-scoped ProjectCustomer ID.
- Party directory search and identity updates are implemented. Reusing an existing Party in a project is permission-gated and remains separate from permission to read that project's interactions, reservations, or files.
- Phone, email, address, contact person, preferred language, source, status, identity-document reference, and interactions remain project-relationship data; these were not promoted into global Party contact points.
- Migration #12 (`20261116100000_RetireProjectCustomerIdentityMirrors`) removed `project_customers.customer_type`, `display_name`, and `normalized_display_name`. `parties` is now the sole kind/name source.
- Migration #13 (`20261116120000_EnforceProjectCustomerIdentityUniqueness`) enforces the project duplicate-prevention invariant through deferred PostgreSQL constraint triggers. It protects customer relationship writes and Party identity updates, uses transaction-scoped advisory locks, and maps the named conflict to `CUSTOMER_DUPLICATE`.
- PR #57 adds direct PostgreSQL 18 coverage for the Down path, fail-closed preflight, data preservation, and successful reapplication after test-data reconciliation. Main CI #573 passed all three jobs with PostgreSQL Integration **29/29**.
- No production organization database or Cloud SQL data was migrated by these PRs. CI used disposable PostgreSQL 18 databases with separate provisioning, migration-owner, and runtime identities.

The current slice does **not** yet implement the full `ProjectPartyRole` model, global contact-point records, protected Party identifiers, Party representatives, Employee records, Supplier/Subcontractor role lifecycles, or human-reviewed merge/recovery tooling. Gate C therefore remains open.

## 3. Historical pre-Party project-scoped CRM baseline

The following describes the **historical pre-Party schema**, not the current database schema:
- `project_customers`, keyed by its own UUID and required to reference one `project_id`;
- customer type, display name and normalized name, a required phone and normalized phone, optional contact person, email, address, preferred language, source, status and optional identity-document file reference;
- at that historical baseline, a unique index on `(project_id, normalized_display_name, normalized_phone)` prevented duplicates only within one project. Migration #12 removed the legacy identity columns/index; Migration #13 now enforces this business rule against canonical `Party.normalized_display_name` plus relationship `normalized_phone` using deferred PostgreSQL triggers;
- `customer_interactions`, each linked to a project customer and a creator user;
- reservations linked to a project customer and a property unit;
- `users`, which currently combines login credentials, security state, username, full name and account contact/profile fields;
- project membership and role assignments which are separate from the customer record.

At that historical baseline, no organization-wide Party entity existed. Party is now implemented; no Employee master entity exists yet. The ProjectCustomer ID remains a business relationship reference, not a disposable CRM row.

## 3. Target logical model

The following is the target conceptual model. Physical table names and exact EF entities are implementation work and must be confirmed during the schema design review.

### 3.1 Party — canonical identity

A Party represents exactly one natural person or one legal entity.

Core attributes:
- stable UUID;
- party kind: Person or LegalEntity;
- Arabic and French legal/display names where applicable;
- optional commercial/trade name for a legal entity;
- lifecycle state (active, inactive, deceased/dissolved where applicable, or merged/redirected);
- created/updated timestamps and an optimistic-concurrency token;
- provenance and verification state for identity data.

A Party must not be intrinsically classified as only a Customer or only a Supplier. Role records express business context.

For people, keep name components and preferred display forms where the product needs them; do not infer a person's official legal identity from a contact name or email address. For legal entities, retain registered identity separately from trade name.

### 3.2 Party contact points

Phone numbers, email addresses, websites and other communication channels belong to contact-point records associated with a Party. Each contact point should support:
- type and normalized value;
- purpose (business, personal, billing, correspondence, emergency, etc.);
- primary/preferred marker;
- verification state and verification date;
- effective-from/effective-to dates;
- provenance and optional project-specific override.

A phone number or email address must not be globally unique. Families, reception desks, legal representatives and shared company contacts can legitimately share contact details. Normalization is for search and duplicate-candidate generation, not proof of identity.

If a project uses a different contact channel from the organization's canonical contact channel, model it as an explicit contextual override with its own dates and provenance. Do not silently overwrite the Party's shared contact point.

### 3.3 Party identifiers and evidence

Government identity numbers, tax identifiers, commercial-register references and other external identifiers must be typed by issuing authority and jurisdiction. Store only identifiers required for a defined business or legal purpose.

Before implementing such storage:
- document the lawful business purpose and required fields;
- apply field-level protection/encryption where appropriate;
- mask values in ordinary list/detail views;
- restrict read/write permissions separately from general CRM access;
- exclude raw values from logs, audit metadata, search indexes and exception messages;
- define retention and correction procedures.

Identity-document bytes remain in the existing local document-storage boundary. Do not copy an identity document into a new repository or make it organization-wide by default. The current document reference is project-scoped and governed by file permissions; changing that ownership boundary requires its own authorization and storage review.

### 3.4 Party relationships and representatives

A natural person who represents a legal entity is a separate Party. The relationship should record the represented entity, relationship type, effective dates, status and supporting authority document/reference where required.

Do not preserve a legal representative only as a free-text ContactPerson field once the structured relationship is available. During migration, preserve the old text as a legacy snapshot until an authorized user validates the relationship.

### 3.5 ProjectPartyRole — the project relationship

A Party can be linked to a project through a project-scoped relationship. Typical roles include:
- Prospect;
- Customer / Buyer;
- Supplier;
- Contractor / Subcontractor;
- Consultant / Architect / Engineer;
- Other explicitly governed project participant.

The relationship, not the Party, owns project-specific facts such as:
- qualification or commercial status within this project;
- acquisition/source channel;
- assigned commercial owner;
- project-specific contact preference or override;
- project interaction/follow-up history;
- project-specific documents and evidence links;
- relationship start/end, suspension and closure reasons.

One Party may have several roles in the same project and in several projects. The schema must therefore not use a single mutually exclusive role column on Party.

Uniqueness must be role- and lifecycle-aware. Do not impose a blanket uniqueness rule that prevents a legitimate Party from holding more than one role or returning to a project in a later, separately recorded relationship.

### 3.6 Customer compatibility profile

The project-scoped `ProjectCustomer` record remains addressable because reservations, interactions, and customer workflows depend on its UUID.

**Implemented transition state:**
1. `Party` is the canonical person/legal-entity identity; `ProjectCustomer` is the project-scoped commercial relationship.
2. Existing ProjectCustomer UUIDs and reservation/interaction references remain intact. The initial Party backfill reused each legacy UUID once, but newly created Party and ProjectCustomer records receive separate IDs.
3. Project-specific contact details, status/source/language, identity-document links, and sales interactions stay on ProjectCustomer.
4. Migration #12 retired the duplicate identity columns. Do not reintroduce `customer_type`, `display_name`, or `normalized_display_name` on `project_customers`.
5. PostgreSQL Migration #13 enforces project/name/normalized-phone uniqueness against canonical Party names, including concurrent relationship writes and Party identity changes. The migration fails closed if pre-existing duplicates are found.

CustomerInteraction history remains project-contextual. Each existing interaction retains its UUID, timestamp, actor, content, and project context; moving identity does not make project-specific sales conversations visible to every project member.

### 3.7 Employee and User are separate concepts

**Employee** is an organization-owned HR/employment profile. It references a natural-person Party and owns employment data such as employee number, employment status, organizational assignment, job/position history, start/end dates and approved project assignments.

**User** is an authentication and authorization principal. It owns username, password hash, security stamp, sessions, failed-login/lockout state, active-account state and application permissions.

The relationship is optional in both practical directions:
- an employee may have no login account;
- a technical system administrator or service/support identity may exist without an Employee record;
- when an employee has a login, the association must be explicit and one-to-one unless a separately justified identity model is approved.

A UserRole is not an employment position. A ProjectMember assignment is not an employment record. Do not overload either to represent HR data.

Existing User.FullName and account contact fields must continue to work during the transition. Their future ownership, display fallback and synchronization rules must be specified before introducing Employee; do not create an uncontrolled two-way synchronization loop between User and Party.

### 3.8 Phase 1 scope decision — D-012 (16 November 2026)

The current Phase 1 deliverable is deliberately limited to the existing canonical Party identity and project relationship boundary:
- `Party` owns only canonical person/legal-entity kind, display name, normalized display name, timestamps and concurrency. It does not own global contact points, government identifiers, representatives or employment data today.
- `ProjectCustomer` remains the project-scoped Customer/Prospect relationship and keeps its stable UUID, current contact fields, commercial status/source/language, identity-document reference and interactions. These are not copied to `Party` or synchronized across projects.
- `User` remains the authentication/authorization principal; `ProjectMember` remains project access. Neither is an Employee record or an HR position.

**Explicitly outside Phase 1:**
1. `PartyContactPoint` — defer until a real cross-project contact use case, ownership/provenance/verification/effective-date rules and project-override policy are approved. Do not globally unique-constrain shared phones or email addresses.
2. `PartyIdentifier` — defer all sensitive national/fiscal/registration identifier storage until lawful purpose and qualified Algerian review, encryption/key recovery, masking, separate access permissions, audit/log/search redaction, retention/correction and PG18 integrity rules are approved.
3. `PartyRepresentative` — defer until legal/notarial workflows define authority type, represented Party, dates/status, evidence and permitted acts, with practitioner review.
4. Human-reviewed Party merge (`PartyMergeRecord`) — defer until a full survivor/duplicate impact preview, former-ID mapping, per-field conflict decisions, preservation of every project/customer/reservation/interaction/document/audit reference, append-only audit and a tested recovery/undo strategy are specified. Similarity signals never trigger automatic merge.
5. Generic `ProjectPartyRole` lifecycle — retain `ProjectCustomer` as the compatibility customer relationship. Do not model it as the complete supplier/contractor/consultant role system; add role-aware history only with those later business workflows.
5. `Employee` — defer HR profile, organization/job history, employment lifecycle and optional one-to-one User link until an HR outcome, data ownership, PII boundary and dedicated permissions are specified. User may exist without Employee and Employee may exist without a login.

This scope fence does not change the Party schema, ProjectCustomer contact ownership, permissions, APIs, migrations or existing data. Existing `CreateEmployeeRequest`/`UpdateEmployeeRequest` and `UserManagementService.CreateEmployeeAsync`/`UpdateEmployeeAsync` names refer to User account operations in the present code; they are not evidence of an Employee entity. No automatic identity merge, contact synchronization or Party/User linking is permitted by this decision. See D-012 in `DECISION-LOG.md`.

## 4. Matching and duplicate resolution

Candidate matching can use several signals, including:
- exact verified external identifier of the same type and issuing jurisdiction;
- normalized name and party kind;
- normalized phone/email;
- legal-entity registration identifiers;
- address or representative overlap as secondary evidence only.

No candidate score may automatically merge records. Names and phone numbers are not unique identity proofs.

The CRM must provide a human-reviewed reconciliation operation with:
- selected surviving Party;
- records proposed for consolidation;
- a preview of conflicting names, contacts, identifiers and project roles;
- explicit decisions for conflicting fields;
- complete mapping from former Party IDs to the survivor;
- preservation of project relationships, interactions, documents, reservations and audit references;
- append-only audit evidence and an undo/recovery strategy before the merge is committed.

A merge must never physically delete the source history. Where an identity match is uncertain, retain separate Party records and allow an authorized user to resolve them later.

## 5. Safe migration sequence

### Phase 0 — baseline and backup

Before schema work, capture table counts, key relationships, duplicate-candidate counts and migration version on a sanitized, local test copy. Verify a database-plus-local-file backup and restore. Do not use real customer data in a hosted preview or external test fixture.

### Phase 1 — Party schema and association (`IMPLEMENTED_AND_VERIFIED` for the delivered slice)

Migrations #10 and #11 added Party, deterministically backfilled the required `project_customers.party_id` association, and enforced one Party relationship per project. Migration #12 later retired the duplicate identity mirrors after consumers read canonical values from Party. The ProjectCustomer table and UUID were retained.

### Phase 2 — deterministic backfill (`IMPLEMENTED_AND_VERIFIED` in disposable CI)

The initial migration creates one Party per legacy ProjectCustomer row by default, reusing the legacy UUID as the first Party UUID. Similar names/phones were not merged. The ProjectCustomer UUID remains unchanged. This migration has passed PostgreSQL 18 CI but has not been rehearsed against a representative organization database.

A separate reconciliation report may identify likely duplicates, but it must not merge them automatically.

### Phase 3 — controlled CRM transition (`PARTIALLY_IMPLEMENTED`)

Party directory search/update and optional association of a Party with a project-customer relationship are implemented. Reuse of an existing Party is permission-gated, while project membership and customer-management capabilities remain enforced independently. Party search does not grant access to another project's interactions, reservations, documents, or relationship status.

Project-customer endpoints remain active business workflows with their existing relationship UUIDs. The full ProjectPartyRole model and richer role/contact/representative lifecycle are future work.

### Phase 4 — Employee and User separation

Implement Employee only after Party is stable. Add optional User linkage, migrate employee profile data only from verified sources, and preserve account credentials/security/session IDs. HR data receives separate permissions and must not become visible through general CRM Party search.

### Phase 5 — identity mirror retirement (`IMPLEMENTED_AND_VERIFIED` in disposable PostgreSQL 18 CI)

Migration #12 removed the redundant ProjectCustomer identity columns after canonical Party ownership was established. Migration #13 added the database-level project/name/phone uniqueness guard. The API and ProjectCustomer table remain; this was not a wholesale CRM-table retirement. Applying these migrations to an existing organization installation still requires a verified backup, duplicate review, explicit operator approval, and restore rehearsal.

## 6. Required acceptance tests

- One Party can be linked to multiple projects without duplicating the Party identity.
- One Party can hold more than one approved role.
- Project role/status/source/interactions remain project-scoped.
- A user cannot infer another project's relationship, reservation or interaction data from Party search.
- A global Party edit is authorized independently from a project relationship edit.
- Employees without login accounts and technical Users without Employee records are supported.
- No global unique constraint rejects shared phone/email values.
- Within a project, duplicate canonical Party name and normalized phone pairs are rejected by the PostgreSQL guard; the same phone/name may exist in another project where it represents a separate project relationship and no automatic Party merge occurs.
- Same-name or same-phone records are not auto-merged.
- Existing ProjectCustomer, CustomerInteraction and reservation UUIDs remain valid throughout the compatibility migration.
- Counts and relationship checks reconcile before/after backfill.
- No PII values appear in audit metadata, application logs or CI fixtures.
- Stale Party and project-relationship writes produce explicit concurrency conflicts.

## 7. Implementation gate

Gate C is not complete when the ER diagram or documents exist. It is complete only after:
- the physical schema and migrations have been reviewed and PostgreSQL 18 CI covers fresh Up application, concurrent guard behavior, Party identity changes, Down, fail-closed preflight, and test-data recovery;
- the full production migration/backfill and rollback sequence has been rehearsed against a representative, anonymized database;
- authorization tests cover organization-wide and project-scoped access;
- all legacy references reconcile;
- the CRM UI and API use the new model without dual-write ambiguity;
- PostgreSQL 18 CI and Windows publishing checks pass;
- local installation and restore acceptance remain separately documented.

See [ADR 0009 — Organization-wide Party identity](ADR/0009-organization-wide-party-and-employee-separation.md).
