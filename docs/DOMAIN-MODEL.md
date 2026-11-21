## Latest verified repository checkpoint — 21 November 2026 (PR #187 post-merge)

- **Current GitHub main:** `ecc3e52ec990bcd8ef3dc7f8c68f82e1632e1901` (PR #187, documentation-only, squash-merged).
- **Latest code-bearing merge:** PR #186 at `07cba896eec07bb28878d948a6cfb905313a2b22`; its Project aggregate-root concurrency implementation remains the current executable code baseline.
- **Post-merge CI on exact current main SHA:** [CI #44911252345](https://github.com/younestech31/PROMO-GEST/actions/runs/44911252345) passed all three required jobs: Frontend install/checks/static hosting; .NET 10 + PostgreSQL 18 least-privilege/integration/restore; Windows publish and PowerShell validation.
- **Post-merge CodeQL on exact current main SHA:** [CodeQL #44911252403](https://github.com/younestech31/PROMO-GEST/actions/runs/44911252403) passed both C# and JavaScript/TypeScript analysis.
- **P1-15:** implementation and deterministic PostgreSQL 18 race coverage are merged; automated CI/CodeQL now pass on current main. Keep capability `IMPLEMENTED_NOT_VERIFIED` and task In Review / Pending until the required manual Arabic RTL / French LTR acceptance is recorded.
- **P1-01 remains the Phase 1 gate:** 1,541 practitioner sign-offs remain PENDING; decision book remains 1,540 PENDING + W30-R007 NEEDS_EVIDENCE; no commune records imported (`communesCount = 0`); P1-01 In Progress / Pending and P1-02 Blocked. No phase advancement or legal approval is inferred from CI.
- **Security boundary:** GitHub main branch protection and required status checks were observed disabled; this was not changed. No production data, live database, authorization policy, roles, permissions, or Cloud SQL business data were changed.

---

## P1-15 aggregate concurrency — verified implementation on main

PR #186 is merged at `07cba896eec07bb28878d948a6cfb905313a2b22`. ProjectMember membership mutations are aggregate operations: existing-member role/capability changes touch the owning Project root, ensuring the root ConcurrencyStamp participates in the same EF transaction as the child membership and audit event. The deterministic PostgreSQL 18 race test passed on the exact PR head and asserts one success/one 409 for simultaneous demotions and removals, at least one retained ProjectManager, and one committed audit event per race. Post-merge CI is not yet evidenced; retain capability state `IMPLEMENTED_NOT_VERIFIED` until that and manual bilingual acceptance are complete.

---

# PROMO GEST — Domain Model & Schema Specification

**Authoritative Source:** Verified directly against `src/PromoGest.Domain/Entities/`, `src/PromoGest.Infrastructure/Persistence/Configurations/`, `src/PromoGest.Infrastructure/Persistence/DbInitializer.cs`, and `src/PromoGest.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs` across all 15 migrations.

> **Strict Truth Boundary:** Sections 1–3 describe **only what physically exists** in Domain entities, EF Core configurations, and PostgreSQL 18 migrations today. Future entities and columns appear strictly in **Section 5 (Planned Domain Model)** and must never be treated as existing schema.

---

## 1. Entity & Relationship Map (Current Database Reality)

```text
  organization_settings (singleton_guard = 1)
  system_settings (key unique)

  users ──< user_roles >── roles ──< role_permissions >── permissions
    │
    ├──< user_sessions (token_hash SHA-256, security_stamp, is_revoked)
    ├──< audit_logs (immutable via PostgreSQL trigger; actor_user_id nullable)
    ├──< stored_files (optional project_id -> projects; scope Organization|Project)
    └──< project_members >── projects
                                │
                                ├──< buildings ──< building_floors ──< property_units
                                │                                           ▲
                                ├──< stored_files (Project scope)           │ (1 active hold
                                │                                           │  per unit via partial index)
  parties ──< project_customers ──────────< project_sales_reservations ─────┘
                    │              │
                    │              └──> stored_files (optional identity_document_stored_file_id)
                    └──< customer_interactions
```

---

## 2. Current Database Reality (Exact Columns, Keys & Constraints)

### 2.1 Core Governance, Auth & Audit

| Table | PK & Columns (Exact EF/PG Names) | Unique / Partial Indexes & DB Guards |
|---|---|---|
| `organization_settings` | `id` (`uuid`), `legal_name` (`200`), `trade_name` (`200?`), `legal_form` (`24`), `nif` (`32?`), `nis` (`32?`), `trade_register_number` (`64?`), `tax_article_number` (`64?`), `share_capital_dzd` (`numeric(18,2)?`), `wilaya_code` (`4`), `wilaya_name` (`100`), `address` (`300`), `phone` (`40?`), `email` (`160?`), `default_language` (`4`), `currency_code` (`3`), `is_initialized` (`bool`), `initialized_at_utc` (`timestamptz?`), `singleton_guard` (`int`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_organization_settings_singleton` (`UNIQUE (singleton_guard)`); `CHECK (singleton_guard = 1)`, `CHECK (currency_code = 'DZD')`, `CHECK (default_language IN ('ar', 'fr'))`, `CHECK (share_capital_dzd IS NULL OR share_capital_dzd >= 0)` |
| `users` | `id` (`uuid`), `username` (`64`), `normalized_username` (`64`), `full_name` (`150`), `email` (`160`), `normalized_email` (`160`), `phone` (`40?`), `password_hash` (`512` — **PBKDF2-SHA512**, format `PBKDF2-SHA512$310000$<salt>$<hash>`), `is_system_administrator` (`bool`), `is_active` (`bool`), `preferred_language` (`4`), `failed_login_attempts` (`int`), `lockout_end_utc`, `last_login_at_utc`, `must_change_password_at_next_login` (`bool NOT NULL DEFAULT false`), `password_change_required_until_utc` (`timestamptz?`), `security_stamp` (`uuid`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_users_normalized_username`, `ux_users_normalized_email`, **`ux_users_single_system_admin` (`UNIQUE (is_system_administrator) WHERE is_system_administrator = true`)**; `CHECK (failed_login_attempts >= 0)`, `CHECK (preferred_language IN ('ar', 'fr'))`, `CHECK (char_length(username) >= 3)`, and `ck_users_password_change_deadline_consistent` (forced-change marker and deadline must be both present or both absent) |
| `roles` | `id` (`uuid`), `code` (`64`), `name_ar` (`120`), `name_fr` (`120`), `description_ar` (`300`), `description_fr` (`300`), `is_system_role` (`bool`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_roles_code`; **Exact 7 seeded roles (`DbInitializer.cs`):** `SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `COMMERCIAL_MANAGER`, `FINANCE_OFFICER`, `SITE_ENGINEER`, `LEGAL_OFFICER`, `VIEWER` |
| `permissions` | `id` (`uuid`), `code` (`100`), `module` (`64`), `description_ar` (`300`), `description_fr` (`300`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_permissions_code`; 18 seeded permissions (see [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md)) |
| `role_permissions` | `(role_id, permission_id)` composite PK | FKs to `roles`, `permissions` (`Cascade`) |
| `user_roles` | `(user_id, role_id)` composite PK, `assigned_by_user_id` (`uuid?`), `assigned_at_utc` | FK `users` (`Cascade`), FK `roles` (`Restrict`) |
| `user_sessions` | `id` (`uuid`), `user_id`, `token_hash` (`64` hex SHA-256), `security_stamp` (`uuid`), `created_at_utc`, `expires_at_utc`, `last_seen_at_utc`, `ip_address` (`64?`), `user_agent` (`300?`), `is_revoked` (`bool`), `revoked_at_utc` | `ux_user_sessions_token_hash`, `ix_user_sessions_user_id`; FK `users` (`Cascade`) |
| `audit_logs` | `id` (`uuid`), `occurred_at_utc`, `actor_user_id` (`uuid?`), `actor_username` (`64?`), `event_type` (`64`), `severity` (`24`), `target_entity_type` (`64?`), `target_entity_id` (`64?`), `summary` (`500`), `metadata_json` (`jsonb?`), `ip_address` (`64?`), `user_agent` (`300?`) | `ix_audit_logs_event_type`, `ix_audit_logs_occurred_at_utc`; **PostgreSQL trigger `BEFORE UPDATE OR DELETE` (`prevent_audit_log_mutation`)** enforces append-only immutability |
| `system_settings` | `id` (`uuid`), `key` (`120`), `value` (`2000`), `category` (`64`), `is_encrypted` (`bool`), `description` (`300?`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_system_settings_key` |

### 2.2 Real Estate Projects, Physical Structure & Stored Files

| Table | PK & Columns (Exact EF/PG Names) | Key Constraints & Indexes |
|---|---|---|
| `projects` | `id` (`uuid`), `code` (`40`), `normalized_code` (`40`), `name_ar` (`200`), `name_fr` (`200`), `wilaya_code` (`4`), `wilaya_name` (`100`), `municipality` (`120`), `address` (`300?`), `land_title_reference` (`120?`), `building_permit_number` (`120?`), `building_permit_date` (`date?`), `planned_blocks_count` (`int`), `planned_units_count` (`int`), `estimated_budget_dzd` (`numeric(18,2)`), `status` (`32`), `created_by_user_id` (`Restrict`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_projects_normalized_code`, `ix_projects_wilaya_code`, `ix_projects_created_by_user_id`; `CHECK (planned_blocks_count >= 0)`, `CHECK (planned_units_count >= 0)`, `CHECK (estimated_budget_dzd >= 0)`; dynamic `actualBuildingsCount`/`actualUnitsCount` computed in queries |
| `project_members` | `id` (`uuid`), `project_id`, `user_id`, `role_in_project` (`40`), `can_view_financials`, `can_manage_sales`, `can_manage_construction`, `can_manage_documents`, `assigned_by_user_id`, `assigned_at_utc`, `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_project_members_project_user` (`UNIQUE (project_id, user_id)`), `ix_project_members_user_id`; FKs `projects`, `users` (`Cascade`) |
| `buildings` | `id` (`uuid`), `project_id`, `code` (`40`), `normalized_code` (`40`), `name_ar` (`200`), `name_fr` (`200`), `status` (`24`: `Planned`, `UnderConstruction`, `Completed`, `Suspended`), `created_by_user_id` (`Restrict`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_buildings_project_code` (`UNIQUE (project_id, normalized_code)`); `CHECK (length(btrim(code)) > 0)`, `CHECK (status IN (...))`; FK `projects` (`Restrict`) |
| `building_floors` | `id` (`uuid`), `building_id`, `floor_number` (`int`), `name_ar` (`100`), `name_fr` (`100`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_building_floors_building_number` (`UNIQUE (building_id, floor_number)`); `CHECK (floor_number BETWEEN -10 AND 200)`; FK `buildings` (`Cascade`) |
| `property_units` | `id` (`uuid`), `floor_id`, `unit_number` (`40`), `normalized_unit_number` (`40`), `unit_type` (`24`: `Apartment`, `Shop`, `ParkingSpace`, `Office`, `Storage`), `status` (`32`: `Planned`, `UnderConstruction`, `AvailableForSale`, `Reserved`, `Sold`, `Delivered`, `Withdrawn`), `gross_area_square_meters` (`numeric(10,2)?`), `net_area_square_meters` (`numeric(10,2)?`), `rooms_count` (`int?`), `created_by_user_id` (`Restrict`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_property_units_floor_number` (`UNIQUE (floor_id, normalized_unit_number)`), `ix_property_units_status`; `CHECK` constraints for non-negative areas, `net <= gross`, `rooms_count BETWEEN 0 AND 20`, valid `unit_type` & `status`; FK `building_floors` (`Cascade`) |
| `stored_files` | `id` (`uuid`), `original_file_name` (`255`), `stored_relative_path` (`500`), `content_type` (`120`), `size_bytes` (`bigint`), `sha256_checksum` (`64`), `category` (`40`: `Legal`, `LandAndTitle`, `Permits`, `Plans`, `Engineering`, `Commercial`, `Financial`, `Correspondence`, `Other`), `description` (`500?`), `scope` (`32`), `project_id` (`uuid?`), `uploaded_by_user_id` (`Restrict`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_stored_files_relative_path` (`UNIQUE (stored_relative_path)`), `ix_stored_files_project_id`, `ix_stored_files_uploaded_by_user_id`; `CHECK (size_bytes > 0)`, `CHECK (category IN (...))`; SHA-256 verified on every download |

### 2.3 Party, Project Customers, Interactions & Reservations (Literal Schema)

> **Current Schema Boundary:** `parties` stores only canonical identity columns (`id`, `party_kind`, `display_name`, `normalized_display_name`, timestamps, `concurrency_stamp`). Phone, email, address, and identity document attachments live on `project_customers`. The duplicate identity mirrors (`customer_type`, `display_name`, `normalized_display_name`) were removed from `project_customers` by Migration #12. Fiscal/national identifiers (`NIF`, `NIS`, `RC`, `CNI`) are **not** stored on `parties` or `project_customers` today (`NIF`, `NIS`, `RC`, `tax_article_number` exist only on `organization_settings` for the developer organization itself).

| Table | Exact Implemented Columns (Domain + EF Configuration + Snapshot) | Key Constraints & Indexes |
|---|---|---|
| `parties` | `id` (`uuid`), **`party_kind`** (`20`: `'Person'` \| `'LegalEntity'`), `display_name` (`200`), `normalized_display_name` (`200`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ix_parties_normalized_display_name` (non-unique index); `ck_parties_kind` (`party_kind IN ('Person', 'LegalEntity')`), `ck_parties_name_non_empty` (`length(btrim(display_name)) > 0`). Migration #10 backfilled 1:1 from `project_customers` reusing UUIDs. |
| `project_customers` | `id` (`uuid`), `project_id` (`uuid`), `party_id` (`uuid NOT NULL`), `contact_person` (`150?`), `phone` (`40`), `normalized_phone` (`20`), `email` (`254?`), `normalized_email` (`254?`), `address` (`300?`), `preferred_language` (`2`: `'ar'` \| `'fr'`), `source` (`24`: `WalkIn`, `Phone`, `Referral`, `Website`, `SocialMedia`, `Other`), `status` (`24`: `Prospect`, `Qualified`, `Customer`, `Archived`), `identity_document_stored_file_id` (`uuid?`), `created_by_user_id` (`uuid`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_project_customers_project_party` (`UNIQUE (project_id, party_id)` — Migration #11), `ix_project_customers_party_id`, `ix_project_customers_project_status`, `ix_project_customers_identity_document`; deferred database triggers `trg_project_customers_identity_unique` and `trg_parties_identity_unique` enforce project/name/normalized-phone uniqueness across `project_customers` and `parties` (Migration #13); FKs `projects`, `parties`, `stored_files`, `users` (all `Restrict`). |
| `customer_interactions` | `id` (`uuid`), `project_customer_id` (`uuid`), `interaction_type` (`24`: `Call`, `Email`, `Meeting`, `Visit`, `Note`), `subject` (`120`), `summary` (`1500`), `occurred_at_utc`, `next_follow_up_at_utc` (`timestamptz?`), `created_by_user_id` (`uuid`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ix_customer_interactions_customer_occurred`; `ck_customer_interactions_type`, `ck_customer_interactions_follow_up` (`next_follow_up_at_utc IS NULL OR next_follow_up_at_utc >= occurred_at_utc`); FKs `project_customers` (`Restrict`), `users` (`Restrict`). |
| `project_sales_reservations` | `id` (`uuid`), `project_id` (`uuid`), `property_unit_id` (`uuid`), `project_customer_id` (`uuid`), `reservation_number` (`50`), `status` (`20`: `Active`, `Cancelled`, `Expired`), `reserved_at_utc`, `expires_at_utc`, `closed_at_utc` (`timestamptz?`), `closed_by_user_id` (`uuid?`), `close_reason` (`300?`), `created_by_user_id` (`uuid`), `created_at_utc`, `updated_at_utc`, `concurrency_stamp` | `ux_project_sales_reservations_project_number` (`UNIQUE (project_id, reservation_number)`), **`ux_project_sales_reservations_active_unit` (`UNIQUE (property_unit_id) WHERE status = 'Active'`)**, `ix_project_sales_reservations_customer`, `ix_project_sales_reservations_project_status_expiry`; `ck_project_sales_reservations_closure`, `ck_project_sales_reservations_expiry`, `ck_project_sales_reservations_status`; all FKs `Restrict`. *(Note: represents an internal unit hold only — no monetary deposit column exists yet.)* |

---

## 3. Architectural Boundary: Party vs ProjectCustomer & Identity Documents

To prevent domain conflation or cross-project data leakage, the model strictly separates **five layers**:

1. **Canonical Party Identity (`parties`):** Organization-wide identity (`id`, `party_kind`, `display_name`, `normalized_display_name`, `concurrency_stamp`). Owned centrally so one person or legal entity can participate across multiple projects without duplicating their legal identity.
2. **Project-Scoped Customer Relationship (`project_customers`):** Project-specific relationship (`project_id`, `party_id`, `status`, `source`, `preferred_language`, `created_by_user_id`). Uniquely constrained per `(project_id, party_id)`.
3. **Contact & Project-Specific Information:** `phone`, `normalized_phone`, `email`, `normalized_email`, `address`, `contact_person`, and `customer_interactions` (`subject`, `summary`, `occurred_at_utc`, `next_follow_up_at_utc`) remain strictly project-scoped so a sales conversation or project phone contact in Project A never leaks via organization-wide Party search (`GET /api/parties`).
4. **Identity Documents & Access Boundaries:** `identity_document_stored_file_id` references a project-scoped `stored_files` row (`Scope = Project`, matching `ProjectId`). Linking or viewing identity document metadata requires `files.read` (`ProjectCustomerService.ValidateIdentityDocumentAsync`), and listing or downloading customer identity documents through `ProjectDocumentService` additionally requires `customers.read` (plus capability-based category scoping, with `VIEWER` holding no `files.read`), preserving strict PII isolation; sales users without `files.read` can still update non-document contact fields without unlinking the file.
5. **Dual-Column Stabilization Policy (Decision Record):**  
   - **Canonical Identity Owner:** `parties` (`PartyKind`, `DisplayName`, `NormalizedDisplayName`) is the sole legal/canonical identity authority (`ProjectCustomerService` DTOs already return `customer.Party.DisplayName` & `customer.Party.Kind`).
   - **Retired Mirrors:** Migration #12 removed `project_customers.customer_type`, `display_name`, and `normalized_display_name`; `parties` is now the sole canonical owner of kind/name. `ProjectCustomer.Id` remains a separate relationship UUID. The initial historical backfill reused each old customer UUID as its Party UUID, but newly created customer and Party records receive distinct IDs.
   - **Database Duplicate Guard:** Migration #13 reinstates the project-level duplicate rule without a cross-table unique index: deferred PostgreSQL triggers compare `parties.normalized_display_name` with `project_customers.normalized_phone`, serialize matching keys with transaction-scoped advisory locks, and reject duplicates with the named conflict `ux_project_customers_project_name_phone`. The preflight aborts rather than deleting or merging already-duplicated data.
- **Algerian Phone Canonicalization (P1-11 / Migration #15):** `phone` remains the preserved, project-scoped source value; `normalized_phone` is a derived duplicate-detection key. A 10-digit national number beginning with `0` is canonicalized to `213` plus its final nine digits, making `0555123456`, `+213555123456`, and `213555123456` share `213555123456`. Other international prefixes are not interpreted as Algeria and retain their digits-only key. Migration #15 first rejects invalid derived lengths and any collision under `(project_id, parties.normalized_display_name, canonical normalized_phone)`, then updates only `normalized_phone`; its Down path safely re-derives the previous digits-only key and also fails closed on invalid/colliding data. `scripts/p1-11-phone-normalization-preflight.sql` is a read-only PostgreSQL 18 report; it returns counts and opaque row UUIDs, not phone numbers or names. No Party/ProjectCustomer records are merged or deleted, and the EF model snapshot is unchanged because this migration changes derived values, not schema.
   - **Manual Merge Only:** Future Party consolidation must be explicit, human-reviewed, audited, and non-destructive — never auto-merged by normalized name or phone.

---

## 4. Concurrency & Consistency Model

- Every mutable aggregate carries a `Guid ConcurrencyStamp` mapped via EF Core `.IsConcurrencyToken()`.
- **Explicit Compare-and-Swap (`ExpectedConcurrencyStamp`):**
  - `UpdateProjectRequest` enforces ADR-0008 CAS (`PROJECT_CONCURRENCY_CONFLICT`). Membership add, existing-member role/capability update, and removal all touch the owning `Project` root and rotate `Project.ConcurrencyStamp`; this root concurrency token serializes concurrent changes to different `ProjectMember` rows, so only one competing mutation can commit and the losing SaveChanges transaction (including its pending audit entry) rolls back with HTTP 409 `CONCURRENCY_CONFLICT`.
  - `UpdatePartyIdentityRequest` compares `ConcurrencyStamp` (`PARTY_CONCURRENCY_CONFLICT`).
  - `UpdateProjectCustomerRequest` carries **both** `ConcurrencyStamp` (customer record) and `PartyConcurrencyStamp` (linked canonical `Party`).
  - Buildings, floors, units, and reservations carry independent `ConcurrencyStamp` tokens returning HTTP `409` on stale writes.

---

## 5. Planned Domain Model (Not Yet Implemented)

> **Planned Only (`PLANNED`):** None of the tables, columns, or workflows in this section exist in `src/` or EF migrations today. Implementing legal, tax, or SCF entities remains gated on **Phase 0 stabilization**, **qualified Algerian legal/notarial review**, and **CPA/SCF sign-off** ([QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md)).

### 5.1 Planned Master Data & Counterparty Extensions (Module D + A)
- **`PartyContactPoint` (`PLANNED`):** Multi-purpose contact channels (`Phone`, `Email`, `Address`) attached to `Party`, non-unique globally, with optional project-level overrides rather than overwriting shared Party data.
- **`PartyIdentifier` (`PLANNED`):** Typed legal/fiscal identifiers (`CNI`, `Passport`, `NIF`, `NIS`, `RC`, `ArtTax`) with issuing jurisdiction, purpose justification, field-level protection/masking, and restricted authorization (`ADR-0009`, excluding PII from audit metadata and logs).
- **`PartyRepresentative` (`PLANNED`):** Natural-person `Party` authorized to represent a `LegalEntity` `Party` with supporting authority documents.
- **`Employee` (`PLANNED`):** Organization-owned HR/employment entity linked optionally to natural-person `Party` and optionally to `User` (`ADR-0009`).
- **`AdministrativeUnit` (`PLANNED`):** Versioned, effective-dated 69 Wilayas / 1,541 communes dataset (`ADR-0010`).

### 5.2 Planned Algerian Legal Contract Hierarchy & Lifecycles (Module F)
PROMO GEST must never collapse distinct Algerian legal instruments into one generic status:
1. **Internal Unit Hold (`ProjectSalesReservation` — *Implemented, Hold Only*):** Project-scoped operational hold (`Active`, `Cancelled`, `Expired`) preventing double allocation of a `PropertyUnit`. Not a statutory contract under Law 11-04 and never generates promoter treasury cash.
2. **Statutory Reservation Contract (`StatutoryReservationContract` — `PLANNED`, Law 11-04 Art. 27 / 32 / 33):** Formal reservation agreement backed by an escrow advance account opened in the reserver's name at FGCMPI; records escrow account/reference, advance amount (subject to statutory cap, not unrestricted promoter cash), notary/document links, buyer-requested termination (15% retention path under Law 11-04 Art. 32 pending legal validation) or promoter judicial-notice termination paths, and conversion window toward final notarial sale deed.
3. **VSP Contract (*Vente sur Plan*, `VspContract` — `PLANNED`, Law 11-04 Art. 28 / 30 / 34–39 & Executive Decree 13-431):** Authentic under-construction sale contract requiring land/title/permit references, verified promotion guarantee/insurance prerequisite (Art. 42, 54–55), construction-finance eligibility review (Art. 36), buyer co-ownership shares, price composition, immutable versioned schedule linked to physical milestones, price-revision clauses, and delivery certificate of conformity prerequisites.
4. **Completed Property Sale / *Acte Notarié* (`FinalSaleDeed` — `PLANNED`, Law 11-04 Art. 25 / 33):** Authentic notarial sale deed for built/accepted units recording notary office, deed reference/date, publicity registration reference, executed local document link, and contradictory possession/handover minute (*PV de prise de possession*).

### 5.3 Planned Cross-Module Financial & Operational Flow Entities (Modules F, G, H, J)
- **Sales & Commitments:** `ContractVersion` (immutable amendments/addenda), `ContractPartyRole` (co-buyers, representatives, shares), `PaymentObligation / Installment` (immutable schedule tranches in DZD `numeric(18,2)`).
- **Execution & Collections:** `ConstructionMilestoneEvidence` (submitted/reviewed/accepted progress proof driving VSP due events — never overwritten via raw %), `PaymentReceipt` (explicit promoter cash/bank receipt separate from FGCMPI escrow), `PaymentAllocation` (allocating receipts to specific obligations), `RefundOrReversal` (non-destructive cancellations, retentions, bounced check reversals).
- **Fiscal & SCF Ledger:** `TaxEvent` (explicit collection-based VAT trigger, legal basis, effective date, 9%/19% rate metadata — never hardcoded without CPA sign-off), `FiscalPeriod`, `ScfAccount`, `ScfJournal`, `ScfJournalEntry` + `ScfJournalEntryLine` (immutable double-entry balanced postings referencing project, unit, contract, and party; adjustments via explicit reversal entries *extourne*).
