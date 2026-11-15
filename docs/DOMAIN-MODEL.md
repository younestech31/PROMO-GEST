# PROMO GEST — Domain Model & PostgreSQL 18 Schema

**Authoritative Source:** Verified directly against `src/PromoGest.Domain/Entities/`, `src/PromoGest.Infrastructure/Persistence/Configurations/`, `src/PromoGest.Infrastructure/Persistence/AppDbContext.cs`, and all 11 migrations in `src/PromoGest.Infrastructure/Migrations/`.

---

## 1. Entity & Relationship Map (Current Database Reality)

```text
  organizations (singleton: singleton_key = 1)

  users ──< user_roles >── roles ──< role_permissions >── permissions
    │
    ├──< user_sessions (token_hash SHA-256, expires_at_utc, revoked_at_utc)
    ├──< audit_logs (immutable via PostgreSQL trigger; actor_user_id nullable)
    └──< project_members >── projects
                                │
                                ├──< buildings ──< building_floors ──< property_units
                                │                                           ▲
                                ├──< project_documents                      │ (1 active reservation
                                │                                           │  per unit via partial index)
  parties ──< project_customers ──────────< project_sales_reservations ─────┘
                    │
                    └──< customer_interactions
```

---

## 2. Implemented Tables, Keys, Constraints & Indexes

### 2.1 Core Governance, Auth & Audit

| Table | Primary Key | Key Columns & Constraints | Unique / Partial Indexes & DB Guards |
|---|---|---|---|
| `organizations` | `id` (`uuid`) | `legal_name`, `legal_form`, `wilaya_code` (2 chars), `wilaya_name`, `address`, `default_language` (`ar`\|`fr`), `currency_code` (`DZD`), `singleton_key` (`int`) | `CHECK (singleton_key = 1)` + `UNIQUE (singleton_key)` enforces single organization per installation |
| `users` | `id` (`uuid`) | `username`, `normalized_username`, `email`, `normalized_email`, `password_hash` (Argon2id), `is_system_administrator`, `is_active`, `preferred_language`, `failed_login_attempts`, `lockout_end_utc`, `concurrency_stamp` | `UNIQUE (normalized_username)`, `UNIQUE (normalized_email)`, **`ux_users_single_system_admin` (`UNIQUE (is_system_administrator) WHERE is_system_administrator = TRUE`)** |
| `roles` | `id` (`uuid`) | `code` (unique), `name_ar`, `name_fr`, `is_system_role` | 7 seeded roles (`SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, `PROJECT_ENGINEER`, `SALES_AGENT`, `ACCOUNTANT`, `PROCUREMENT_OFFICER`, `AUDIT_VIEWER`) |
| `permissions` | `id` (`uuid`) | `code` (unique), `module`, `description_ar`, `description_fr` | 18 seeded permissions |
| `role_permissions` | `(role_id, permission_id)` | FKs to `roles`, `permissions` (`CASCADE`) | Composite PK |
| `user_roles` | `(user_id, role_id)` | FKs to `users`, `roles` (`CASCADE`) | Composite PK |
| `user_sessions` | `id` (`uuid`) | `user_id`, `token_hash` (64 hex SHA-256), `expires_at_utc`, `revoked_at_utc`, `ip_address`, `user_agent` | `UNIQUE (token_hash)` |
| `audit_logs` | `id` (`uuid`) | `occurred_at_utc`, `actor_user_id` (`SET NULL`), `actor_username`, `event_type`, `severity`, `target_entity_type`, `target_entity_id`, `summary`, `metadata_json` (`jsonb`), `ip_address` | **PostgreSQL trigger (`BEFORE UPDATE OR DELETE`) raises exception (`prevent_audit_log_mutation`)**; append-only |

### 2.2 Real Estate Projects, Structure & Documents

| Table | Primary Key | Key Columns & Concurrency | Key Constraints & Indexes |
|---|---|---|---|
| `projects` | `id` (`uuid`) | `code`, `normalized_code`, `name`, `wilaya_code`, `wilaya_name`, `municipality`, `project_type`, `status`, `planned_blocks_count`, `planned_units_count`, `estimated_budget_dzd` (`numeric(18,2)`), `concurrency_stamp` | `UNIQUE (normalized_code)`; `actualBuildingsCount`/`actualUnitsCount` computed dynamically from child tables |
| `project_members` | `(project_id, user_id)` | `role_in_project` (`ProjectManager`, `SiteEngineer`, `SalesRepresentative`, `Accountant`, `Procurement`, `Observer`), `can_manage_sales`, `can_manage_finance`, `can_manage_construction`, `can_manage_documents`, `assigned_at_utc` | Composite PK; cascade from `projects` and `users` |
| `buildings` | `id` (`uuid`) | `project_id`, `code`, `normalized_code`, `name`, `total_floors`, `status`, `concurrency_stamp` | `UNIQUE (project_id, normalized_code)`; FK `projects` (`CASCADE` at DB, unused in API) |
| `building_floors` | `id` (`uuid`) | `building_id`, `floor_number`, `code`, `normalized_code`, `name`, `concurrency_stamp` | `UNIQUE (building_id, floor_number)`, `UNIQUE (building_id, normalized_code)` |
| `property_units` | `id` (`uuid`) | `building_floor_id`, `code`, `normalized_code`, `unit_type`, `commercial_status` (`Available`, `Reserved`, `Sold`, `Blocked`), `area_sqm`, `price_dzd` (`numeric(18,2)`), `room_count`, `orientation`, `concurrency_stamp` | `UNIQUE (building_floor_id, normalized_code)`; `CHECK` on positive/non-negative area & price |
| `project_documents` | `id` (`uuid`) | `project_id`, `title`, `category`, `original_file_name`, `storage_relative_path`, `content_type`, `file_size_bytes`, `sha256_checksum`, `is_archived`, `uploaded_by_user_id` (`Restrict`), `concurrency_stamp` | `UNIQUE (storage_relative_path)`; SHA-256 verified on every download |

### 2.3 Party, Project Customers, Interactions & Reservations

| Table | Primary Key | Key Columns & Concurrency | Key Constraints & Indexes (Exact Inspected Truth) |
|---|---|---|---|
| `parties` | `id` (`uuid`) | `kind` (`Person` \| `LegalEntity`), `display_name`, `normalized_display_name`, `primary_phone`, `normalized_phone`, `email`, `national_id_number`, `nif`, `nis`, `trade_register_number`, `tax_article_number`, `concurrency_stamp` | Added in migration #10; 1:1 backfilled from existing `project_customers` |
| `project_customers` | `id` (`uuid`) | `project_id`, `party_id` (`NOT NULL`), `customer_type`, `display_name`, `normalized_display_name`, `phone`, `normalized_phone`, `email`, `national_id_number`, `nif`, `trade_register_number`, `address`, `status` (`Prospect`, `ActiveBuyer`, `Archived`), `notes`, `concurrency_stamp` | `ux_project_customers_project_name_phone` on `(project_id, normalized_display_name, normalized_phone)` **AND** `ux_project_customers_project_party` (`UNIQUE (project_id, party_id)`, migration #11); FKs to `projects` & `parties` (`Restrict`) |
| `customer_interactions` | `id` (`uuid`) | `project_customer_id`, `interaction_type`, `occurred_at_utc`, `summary`, `recorded_by_user_id` (`Restrict`) | FK `project_customers` (`Cascade`) |
| `project_sales_reservations` | `id` (`uuid`) | `project_id`, `property_unit_id`, `project_customer_id`, `reservation_number`, `normalized_reservation_number`, `status` (`Active`, `Cancelled`, `Expired`, `ConvertedToContract`), `reserved_at_utc`, `expires_at_utc`, `agreed_price_dzd`, `deposit_amount_dzd`, `notes`, `concurrency_stamp` | `UNIQUE (project_id, normalized_reservation_number)`; **`ux_reservations_active_unit` (`UNIQUE (property_unit_id) WHERE status = 'Active'`)** |

---

## 3. Concurrency & Consistency Model

- Every mutable aggregate carries a `Guid ConcurrencyStamp` mapped via EF Core `.IsConcurrencyToken()`.
- **Explicit Compare-and-Swap (`ExpectedConcurrencyStamp`):**
  - `UpdateProjectRequest` enforces ADR-0008 compare-and-swap (`PROJECT_CONCURRENCY_CONFLICT`), and membership add/remove rotates `Project.ConcurrencyStamp`.
  - `UpdatePartyIdentityRequest` compares `ConcurrencyStamp` (`PARTY_CONCURRENCY_CONFLICT`).
  - `UpdateProjectCustomerRequest` carries **both** `ConcurrencyStamp` (customer record) and `PartyConcurrencyStamp` (linked canonical Party).
  - Buildings, Floors, Units, Documents, and Reservations carry independent `ConcurrencyStamp` tokens returning HTTP 409 on stale writes.
- **Note on Dual Columns (`ProjectCustomer` vs `Party`):** Currently `project_customers` retains `display_name` / `normalized_display_name` alongside `parties.display_name` / `normalized_display_name`. Editing a Party via `PUT /api/parties/{id}` updates `parties` without cascading to `project_customers`, creating a known consistency gap documented in [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) and targeted for resolution in Gate C2 stabilization.

---

## 4. End-to-End Business Lifecycles

### 4.1 Implemented Lifecycle (Modules A–E, K-partial)
```text
[FirstRunSetup] -> [Project (Planning -> InProgress -> Completed/Archived)]
                     ├── Buildings -> BuildingFloors -> PropertyUnits (Available)
                     └── Party (Person/LegalEntity) -> ProjectCustomer (Prospect)
                                                            │
                                                            ▼ (Create Reservation)
                                           ProjectSalesReservation (Active) ◄──► PropertyUnit (Reserved)
                                                │             │
                                        (Cancel / Expire)     ▼ (Future Gate D: ConvertToContract)
                                                │         [SaleContract (VSP / Acte Notarié)]
                                                ▼         PropertyUnit (Sold)
                                    PropertyUnit (Available)
```

### 4.2 Planned Downstream Lifecycle (Gates D–G)
`SaleContract (VSP / Final)` → `InstallmentSchedule (Decree 13-431 milestones or agreed tranches)` → `PaymentAllocation / Receipt (DZD)` → `TreasuryAccount` + `ScfJournalEntry` + `TaxObligation (TVA 9%/19% on collection per Law 24-08 Art. 59 / Law 25-17 Art. 53)` + `ContractorWorkSituation (Chantier)`.

---

## 5. Target Planned Entities (Not Yet in Code)

To avoid inventing schema prematurely, target entities are designed at contract boundary level in [MODULE-CATALOG.md](MODULE-CATALOG.md) and gated by [MASTER-ROADMAP.md](MASTER-ROADMAP.md):
- **Reference Data:** `AdministrativeUnit` (versioned, effective-dated 69 Wilayas / 1,541 communes per ADR-0010).
- **HR Separation:** `Employee` (linked optionally to `Party` + optionally to `User` per ADR-0009).
- **Contracts & Finance:** `SaleContract`, `ContractMilestone`, `PaymentReceipt`, `TreasuryAccount`, `CashBankTransaction`, `Refund`.
- **Construction & Procurement:** `ProjectLot`, `Subcontractor`, `WorkOrder`, `WorkProgressSituation` (*attachement / décompte*), `PurchaseOrder`, `StockItem`, `StockMovement`.
- **SCF Accounting:** `FiscalPeriod`, `ScfAccount`, `ScfJournal`, `JournalEntry`, `JournalEntryLine` (balanced `Debit == Credit` in DZD `numeric(18,2)`).
