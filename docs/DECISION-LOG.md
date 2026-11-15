# PROMO GEST — Consolidated Decision Log, Open Legal Questions & Drift Register

**Baseline Verified:** `main` at commit `ec8769a5f778429cad0fec8f35d59f84f93b049d` (PR #34 merged **2026-11-15**; GitHub Actions Run `43710844749`).

---

## 1. Consolidated Architecture Decision Records (`ADR-0001` – `ADR-0010`)

| ADR | Decision Summary | Status in Codebase |
|---|---|---|
| [ADR-0001](ADR/0001-local-first-self-hosted-architecture.md) | Local-first self-hosted on-premises runtime; zero cloud/SaaS dependency. | **Enforced** |
| [ADR-0002](ADR/0002-postgresql-18-single-tenant-per-org.md) | Dedicated PostgreSQL 18 database per organization; IndexedDB prohibited for business data. | **Enforced** |
| [ADR-0003](ADR/0003-aspnet-core-static-spa-same-origin.md) | Static React SPA compiled into `wwwroot/` and served same-origin by `PromoGest.Api`. | **Enforced** |
| [ADR-0004](ADR/0004-http-only-cookie-auth-and-single-sysadmin.md) | `HttpOnly; SameSite=Strict` SHA-256 cookie sessions (`promogest_session`); single `SYSTEM_ADMIN` via partial unique index. | **Enforced** |
| [ADR-0005](ADR/0005-public-website-separation.md) | Any future public buyer/marketing website must be completely separate from local ERP process & DB. | **Enforced (Policy)** |
| [ADR-0006](ADR/0006-project-access-requires-explicit-membership.md) | Global permission + explicit `ProjectMember` intersection required for all project-scoped resources. | **Enforced** *(see structure note in Section 3)* |
| [ADR-0007](ADR/0007-69-wilaya-reference-data.md) | Support Algerian Wilaya codes `01–69` per Law 26-06 & Decree 26-206 without rewriting history. | **Enforced in Backend & UI** *(drifts in preview setup regex)* |
| [ADR-0008](ADR/0008-project-master-data-concurrency.md) | Explicit `ExpectedConcurrencyStamp` CAS check on project updates + membership stamp rotation. | **Enforced** |
| [ADR-0009](ADR/0009-organization-wide-party-and-employee-separation.md) | Canonical `Party` identity + project-scoped relationships + future `Employee` detached from `User`. | **Partially Implemented (C2 merged in PR #34 with `CS7036` test break & audit/sync defects)**; Employee separation **Planned** |
| [ADR-0010](ADR/0010-versioned-algerian-administrative-reference-data.md) | Server-owned, effective-dated 69-Wilaya / 1,541-commune catalogue separating legal jurisdiction from operational authority. | **Planned** (requires verified official commune dataset) |

---

## 2. Explicit Governance & Architecture Decisions Added in Audit Round (`2026-11-15`)

### Decision D-001 — Canonical `Party` vs `ProjectCustomer` Identity Ownership & Dual-Column Transition
Resolves the duplication between `parties` (`DisplayName`, `NormalizedDisplayName`, `Kind`) and `project_customers` (`DisplayName`, `NormalizedDisplayName`, `CustomerType`, `ux_project_customers_project_name_phone`) introduced across Migrations #7, #10, and #11:

1. **Canonical Identity Fields (`parties`):** `Id`, `PartyKind` (`Person` \| `LegalEntity`), `DisplayName`, `NormalizedDisplayName`, and `ConcurrencyStamp` belong **strictly** to `parties`. `Party` is the single legal/central identity master across all projects (and future `PartyIdentifier` / `PartyContactPoint` tables belong under `Party` under explicit governance).
2. **Project-Scoped Relationship & Contact Fields (`project_customers`):** `ProjectId`, `PartyId`, `Status` (`Prospect`, `Qualified`, `Customer`, `Archived`), `Source`, `PreferredLanguage`, `Phone`, `NormalizedPhone`, `Email`, `NormalizedEmail`, `Address`, `ContactPerson`, `IdentityDocumentStoredFileId`, and `CustomerInteraction` remain **strictly owned by the project relationship** so project-specific sales context and files never leak cross-project.
3. **Retiring vs Keeping Duplicated Columns (`display_name`, `normalized_display_name`, `customer_type`):** Those duplicated columns on `project_customers` are **deprecated legacy compatibility mirrors retained temporarily** strictly so Migration #10's 1:1 backfill and rollback contract stay intact during Phase 0. They are **scheduled for retirement** in a dedicated **Phase 1 migration** after all queries, tests, and compatibility consumers read exclusively from `Party` — **never dropped ad-hoc without a migration plan, downgrade verification, and backup/restore rehearsal**.
4. **Preventing Cross-Project Name Divergence During Updates:** API reads (`ProjectCustomerService`) already project `customer.Party.DisplayName` and `customer.Party.Kind` rather than `project_customers.display_name`. Until the Phase 1 column-retirement migration executes, any Phase 0 fix updating a `Party` (`PUT /api/parties/{partyId}`) must preserve referential consistency without allowing `project_customers.display_name` to become an independent editable master (and must **never** blindly mass-overwrite unreviewed historical records).
5. **Preserving Index & Duplicate Integrity:** `ux_project_customers_project_party` (`UNIQUE (project_id, party_id)`) is the authoritative per-project Party link guard. Legacy index `ux_project_customers_project_name_phone` on `(project_id, normalized_display_name, normalized_phone)` conflicts with cross-project identity edits if `project_customers.display_name` drifts and must be superseded cleanly in the Phase 1 migration (replacing any duplicate-phone safety checks with domain-aware checks that do not block legitimate shared family/company phones).
6. **Human-Reviewed Merge Policy & Migration Impact:** Any future `Party` deduplication/merge must be **manual, authorized, human-approved, and audited** (preserving all legacy UUID mappings and relationships; **zero auto-merge by name or phone**). Migrations must always remain additive/rehearsed with verified database + file backups.

### Decision D-002 — Password Hashing Baseline & Upgrade Policy
- The verified implemented algorithm is **`Pbkdf2PasswordHasher` (`PBKDF2-SHA512`, 310,000 iterations, random 16-byte salt, 32-byte key, format `PBKDF2-SHA512$<iterations>$<salt>$<hash>`)**.
- Do **not** upgrade or replace the password hash algorithm implicitly inside unrelated work. Any future migration (e.g., to Argon2id) requires an **independent ADR** covering backwards-compatible verification of existing `PBKDF2-SHA512$...` hashes and safe transparent rehashing upon successful login.

### Decision D-003 — Module F ↔ Module K Dependency Split (`K-Min` vs `K-Full`)
- Resolves the former conflict between `MODULE-CATALOG.md` (Module F depends on K) and `MASTER-ROADMAP.md` (Module K expanded in Phase 5):
  - **`K-Min` (Minimum Document Capabilities)** — metadata edit/soft-archive + explicit entity attachment links for Contracts, Reservations, Milestone Evidence, Payment Receipts, and Party KYC files over existing SHA-256 `stored_files` — **must be delivered before Phase 2 (Contracts) and Phase 3B (Chantier)** starts.
  - **`K-Full`** — enterprise-wide attachment expansion across Accounting/Procurement/HR, retention/cold-archive policies, and export bundles — remains in **Phase 5**.

### Decision D-004 — PR #34 & CI Run `43710844749` Baseline Status
- C2 Party Directory work arrived on `main` via **PR #34 (`ec8769a5f778429cad0fec8f35d59f84f93b049d`, 2026-11-15)** and is **committed & merged**, **NOT uncommitted**.
- GitHub Actions **Run `43710844749`**: `frontend` job **succeeded**; PostgreSQL 18 container (`postgres:18-alpine`) **started cleanly**; `backend-and-postgres` and `windows-publish-and-powershell` **failed at compile step (`CS7036` at `PostgresEndToEndTests.cs:1072`)** before any integration tests executed.

---

## 3. Undocumented / Implicit Decisions Observed in Codebase

1. **No DELETE or Bulk Endpoints for Physical Structure (`ProjectStructureController`):** Buildings, floors, and units have `CASCADE` FKs in DB, yet no `DELETE` or `/bulk` controller endpoints exist—preventing accidental cascading removal of inventory.
2. **Dynamic Actual Counts Decoupled from Planned Counts (`Projects`):** `actualBuildingsCount` and `actualUnitsCount` compute dynamically from `buildings`/`property_units`, independent of `plannedBlocksCount`/`plannedUnitsCount`.
3. **Structure Authorization Uses `ProjectMember` Flags Over `projects.structure.manage`:** `ProjectStructureService` requires `ProjectMemberRole.ProjectManager` or `CanManageConstruction == true` without checking the seeded `projects.structure.manage` permission. Similarly, `ProjectDocumentService` upload checks `files.write` + `CanManageDocuments == true` (not `ProjectManager` alone unless `CanManageDocuments == true`).
4. **Non-Destructive `ProjectCustomer` Retirement:** Customers transition to `Archived` instead of physical deletion, preserving FK integrity for `CustomerInteraction` and `ProjectSalesReservation`.
5. **Lazy + Worker Reservation Expiry:** `ProjectSalesReservationService` has no `POST .../expire` controller endpoint; expiry is handled via due-date checks/hosted background worker.

---

## 4. Items Mandatory for Qualified Algerian Practitioner Sign-Off (Do Not Invent)

1. **VSP Milestone Timing & Verification Rules (Executive Decree 13-431):** Exact technical verification proof required before issuing 20% / 15% / 35% / 25% / 5% billing calls, and Article 36 construction-finance eligibility boundaries.
2. **Statutory Reservation vs Cancellation Retention (Law 11-04 / Decree 13-431):** FGCMPI escrow vs promoter cash boundaries, 15% buyer-default retention handling, judicial-officer notice rules, and 10% late-delivery penalty workflow.
3. **VAT Rates & Collection Event (Finance Law 2025 Art. 59 & Finance Law 2026 Art. 53):** Exact boundary between 9% reduced housing VAT vs 19% standard VAT (commercial, annexes, finished units) and whether FGCMPI escrow advances trigger VAT before release.
4. **SCF Revenue Recognition Timing:** Accounting treatment of buyer advances (*comptes 419*) vs revenue recognition upon delivery / *Acte Notarié* (*classe 70*), and WIP inventory valuation (*classe 3*).
5. **Official 1,541-Commune Bilingual Dataset (Law 26-06 & Decrees 26-206 / 26-208):** Verified Arabic/French spellings, postal/ONS/MICLAT codes, and effective dates through the 31 December 2026 transitional period.

---

## 5. Corrected Code / Documentation / Preview Drift Register

| Drift Area | Former Doc / Preview Claim | Verified Inspected Repository Truth (`ec8769a5...`) | Action Required |
|---|---|---|---|
| **Password Hasher** | Older blueprint docs claimed `Argon2id` / `Argon2PasswordHasher` | Actual code uses **`Pbkdf2PasswordHasher` (`PBKDF2-SHA512`, 310,000 iterations)** (`SecurityServices.cs`) | **Corrected in docs** (2026-11-15 audit round) |
| **Session Cookie & Auth Classes** | Older docs claimed `promogest.sid`, `Sha256SessionTokenGenerator`, `CookieSessionAuthenticationHandler` | Actual cookie is **`promogest_session`**, classes **`CryptoSessionTokenGenerator`** & **`SessionAuthenticationHandler`**, route **`GET /api/auth/me`** | **Corrected in docs** (2026-11-15 audit round) |
| **Role Codes** | Older table in `DOMAIN-MODEL.md` listed `PROJECT_ENGINEER`, `SALES_AGENT`, `ACCOUNTANT`, `PROCUREMENT_OFFICER`, `AUDIT_VIEWER` | Exact 7 seeded roles (`DbInitializer.cs`, `Role.cs`): `SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, **`COMMERCIAL_MANAGER`**, **`FINANCE_OFFICER`**, **`SITE_ENGINEER`**, **`LEGAL_OFFICER`**, **`VIEWER`** | **Corrected in docs** (2026-11-15 audit round) |
| **`Party` & `ProjectCustomer` Schema** | Older `DOMAIN-MODEL.md` listed phone/NIF/NIS/RC on `parties`, `notes`/`nif` on `project_customers`, `price_dzd` on `property_units` | Literal schema (`AppDbContextModelSnapshot.cs`): `parties` has only `id`, `party_kind`, `display_name`, `normalized_display_name`, timestamps, `concurrency_stamp`; physical table names are `organization_settings` and `stored_files` | **Corrected in docs** (2026-11-15 audit round) |
| **C2 Status & CI Run `43710844749`** | Older draft called C2 "uncommitted" | C2 merged into `main` in **PR #34** (`ec8769a5...`); CI Run `43710844749` failed `backend-and-postgres` & `windows-publish` build on `CS7036` | Fix `CS7036` + C2 bugs in Phase 0 |
| **Preview Permissions & Setup Regex (`dev-api-middleware.ts`)** | Preview seeds 12/18 permissions & validates Wilaya `01–58` | Backend seeds 18 permissions & validates Wilaya `01–69` | Sync preview in Phase 0 |
| **Seeded Unused Permissions (`DbInitializer.cs`)** | `org.manage`, `projects.structure.manage`, `users.read` | `org.manage` unused; `projects.structure.manage` ignored by `ProjectStructureService` | Align in Phase 1 |
