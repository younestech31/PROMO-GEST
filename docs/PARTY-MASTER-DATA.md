# PROMO GEST — Organization-Wide Party & Master-Data Design

**Status:** Gate C architecture baseline; the first Party-identity slice is implemented on `feat/gate-c-party-identity-foundation` and is awaiting CI/PR acceptance. Gate C as a whole is not complete.  
**Baseline reviewed:** `main` at `e051f1b60b2babfc2dba91fe9a7d512cd8357b3a` (15 November 2026).  
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

## 2. Initial C1 implementation slice

The current feature branch introduces the first executable Party identity layer:

- `Party` stores canonical party kind (person/legal entity), display name, normalized name, timestamps and an optimistic-concurrency stamp.
- `project_customers.party_id` is required and references `parties.id`. Existing rows are backfilled one-to-one, reusing each existing `project_customers.id` as its initial Party ID. This preserves legacy customer UUIDs and does not merge similar names or phone numbers.
- Customer create/update workflows create and update Party identity in the same database unit of work. Customer API responses expose `partyId`; customer display names and types are read from Party.
- Phone, email, address, contact person, preferred language, source, status, identity-document reference and interactions remain project-relationship data. They are not promoted to organization-wide contact points in this slice.
- Reservation summaries resolve the customer display name through Party while reservation IDs and customer foreign keys remain unchanged.

This slice deliberately does **not** yet implement organization-wide Party search/selection, sharing one Party across multiple project relationships through the API, the full `ProjectPartyRole` model, general Party contact points/identifiers, Employee records, or reconciliation/merge tooling. The schema permits later expansion, but no cross-project Party attachment or data disclosure route is exposed. The application continues to create one Party for each newly created project-customer record until the next reviewed CRM workflow is delivered.

The migration is additive and reversible only while Party remains in the documented one-to-one compatibility state; its `Down` path refuses rollback if Party relationships or identity values have advanced beyond that safe boundary. It has not been applied to Cloud SQL or any organization database.

## 3. Legacy project-scoped CRM baseline

The current relational model contains:
- `project_customers`, keyed by its own UUID and required to reference one `project_id`;
- customer type, display name and normalized name, a required phone and normalized phone, optional contact person, email, address, preferred language, source, status and optional identity-document file reference;
- a unique index on `(project_id, normalized_display_name, normalized_phone)`, which prevents a duplicate only within the same project;
- `customer_interactions`, each linked to a project customer and a creator user;
- reservations linked to a project customer and a property unit;
- `users`, which currently combines login credentials, security state, username, full name and account contact/profile fields;
- project membership and role assignments which are separate from the customer record.

There is no organization-wide Party entity and no Employee master entity at this baseline. The existing project customer ID is therefore a business reference in use, not a disposable CRM row.

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

The current `ProjectCustomer` record must remain addressable while reservations and interactions depend on it.

Recommended transition:
1. introduce canonical Party identity and a project relationship;
2. add an explicit one-to-one or mapping association from each existing ProjectCustomer UUID to its Party and project relationship;
3. retain ProjectCustomer UUIDs and reservation foreign keys during the compatibility period;
4. move canonical identity/contact ownership to Party through reviewed API contracts;
5. keep customer lifecycle/source and project-specific sales history in the project relationship;
6. retire duplicate legacy columns and old routes only in a later, separately tested migration after all consumers have moved.

The transition must not create two competing writable masters. Once a field is migrated, designate one owner and make compatibility fields read-only or derived. Do not leave Party and ProjectCustomer name/phone values independently editable.

CustomerInteraction history remains project-contextual. Each existing interaction must retain its UUID, timestamp, actor, content and project context; moving identity must not turn a project sales conversation into an organization-wide conversation visible to every project member.

### 3.7 Employee and User are separate concepts

**Employee** is an organization-owned HR/employment profile. It references a natural-person Party and owns employment data such as employee number, employment status, organizational assignment, job/position history, start/end dates and approved project assignments.

**User** is an authentication and authorization principal. It owns username, password hash, security stamp, sessions, failed-login/lockout state, active-account state and application permissions.

The relationship is optional in both practical directions:
- an employee may have no login account;
- a technical system administrator or service/support identity may exist without an Employee record;
- when an employee has a login, the association must be explicit and one-to-one unless a separately justified identity model is approved.

A UserRole is not an employment position. A ProjectMember assignment is not an employment record. Do not overload either to represent HR data.

Existing User.FullName and account contact fields must continue to work during the transition. Their future ownership, display fallback and synchronization rules must be specified before introducing Employee; do not create an uncontrolled two-way synchronization loop between User and Party.

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

### Phase 1 — additive schema

Add Party and its minimum supporting tables. Add a nullable, indexed Party association or explicit mapping table for legacy ProjectCustomer records. Add new FKs with restrictive delete behavior. Do not drop or rename existing tables or columns.

### Phase 2 — deterministic backfill

Create one Party per legacy ProjectCustomer row by default. This preserves data without guessing that two similar rows refer to the same person. Keep the original ProjectCustomer UUID unchanged. Record the mapping and migration batch/version.

A separate reconciliation report may identify likely duplicates, but it must not merge them automatically.

### Phase 3 — controlled CRM transition

Introduce organization-wide Party search and authorized Party detail operations. Creating or attaching a customer to a project must require both:
- permission to manage the organization-wide Party record; and
- permission and explicit project membership to create or manage that project's relationship.

A Party search result must never reveal another project's restricted customer interactions, reservations, documents or relationship status.

Keep existing project customer endpoints as compatibility adapters until reservations, interactions and the UI have migrated. Preserve current API behavior where possible and version any intentionally changed contract.

### Phase 4 — Employee and User separation

Implement Employee only after Party is stable. Add optional User linkage, migrate employee profile data only from verified sources, and preserve account credentials/security/session IDs. HR data receives separate permissions and must not become visible through general CRM Party search.

### Phase 5 — retirement

Only after all references and installations are accounted for may legacy duplicate columns/routes be deprecated. Any table/column removal requires a separate release, backup, migration and restore plan.

## 6. Required acceptance tests

- One Party can be linked to multiple projects without duplicating the Party identity.
- One Party can hold more than one approved role.
- Project role/status/source/interactions remain project-scoped.
- A user cannot infer another project's relationship, reservation or interaction data from Party search.
- A global Party edit is authorized independently from a project relationship edit.
- Employees without login accounts and technical Users without Employee records are supported.
- No global unique constraint rejects shared phone/email values.
- Same-name or same-phone records are not auto-merged.
- Existing ProjectCustomer, CustomerInteraction and reservation UUIDs remain valid throughout the compatibility migration.
- Counts and relationship checks reconcile before/after backfill.
- No PII values appear in audit metadata, application logs or CI fixtures.
- Stale Party and project-relationship writes produce explicit concurrency conflicts.

## 7. Implementation gate

Gate C is not complete when the ER diagram or documents exist. It is complete only after:
- the physical schema and migration have been reviewed;
- migration and rollback have been rehearsed against a representative, anonymized database;
- authorization tests cover organization-wide and project-scoped access;
- all legacy references reconcile;
- the CRM UI and API use the new model without dual-write ambiguity;
- PostgreSQL 18 CI and Windows publishing checks pass;
- local installation and restore acceptance remain separately documented.

See [ADR 0009 — Organization-wide Party identity](ADR/0009-organization-wide-party-and-employee-separation.md).
