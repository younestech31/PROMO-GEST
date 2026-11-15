# PROMO GEST — Consolidated Decision Log, Open Legal Questions & Drift Register

---

## 1. Consolidated Architecture Decision Records (`ADR-0001` – `ADR-0010`)

| ADR | Decision Summary | Status in Codebase |
|---|---|---|
| [ADR-0001](ADR/0001-local-first-self-hosted-architecture.md) | Local-first self-hosted on-premises runtime; zero cloud/SaaS dependency. | **Enforced** |
| [ADR-0002](ADR/0002-postgresql-18-single-tenant-per-org.md) | Dedicated PostgreSQL 18 database per organization; IndexedDB prohibited for business data. | **Enforced** |
| [ADR-0003](ADR/0003-aspnet-core-static-spa-same-origin.md) | Static React SPA compiled into `wwwroot/` and served same-origin by `PromoGest.Api`. | **Enforced** |
| [ADR-0004](ADR/0004-http-only-cookie-auth-and-single-sysadmin.md) | `HttpOnly; SameSite=Strict` SHA-256 cookie sessions; single `SYSTEM_ADMIN` via partial unique index. | **Enforced** |
| [ADR-0005](ADR/0005-public-website-separation.md) | Any future public buyer/marketing website must be completely separate from local ERP process & DB. | **Enforced (Policy)** |
| [ADR-0006](ADR/0006-project-access-requires-explicit-membership.md) | Global permission + explicit `ProjectMember` intersection required for all project-scoped resources. | **Enforced** *(see structure note below)* |
| [ADR-0007](ADR/0007-69-wilaya-reference-data.md) | Support Algerian Wilaya codes `01–69` per Law 26-06 & Decree 26-206 without rewriting history. | **Enforced in Backend & UI** *(drifts in preview setup regex)* |
| [ADR-0008](ADR/0008-project-master-data-concurrency.md) | Explicit `ExpectedConcurrencyStamp` CAS check on project updates + membership stamp rotation. | **Enforced** |
| [ADR-0009](ADR/0009-organization-wide-party-and-employee-separation.md) | Canonical `Party` identity + project-scoped relationships + future `Employee` detached from `User`. | **Partially Implemented (C2 unverified & broken test build)**; Employee separation **Planned** |
| [ADR-0010](ADR/0010-versioned-algerian-administrative-reference-data.md) | Server-owned, effective-dated 69-Wilaya / 1,541-commune catalogue separating legal jurisdiction from operational authority. | **Planned** (requires verified official commune dataset) |

---

## 2. Undocumented / Implicit Decisions Observed in Codebase

These decisions were discovered directly in code without standalone ADRs:

1. **No DELETE Endpoints for Physical Structure (`ProjectStructureController`):** Buildings, floors, and units have `CASCADE` foreign keys at the database level, yet no `DELETE` controller endpoints exist—preventing accidental cascading removal of inventory once created. Status changes (`Blocked`, etc.) are favored instead.
2. **Dynamic Actual Counts Decoupled from Planned Counts (`Projects`):** `actualBuildingsCount` and `actualUnitsCount` are computed live from `buildings`/`property_units`, completely independent of `plannedBlocksCount`/`plannedUnitsCount` budget/target inputs.
3. **Structure Authorization Uses `ProjectMember` Flags Over `projects.structure.manage`:** `ProjectStructureService` requires `ProjectMemberRole.ProjectManager` or `CanManageConstruction == true`, without checking the seeded `projects.structure.manage` global permission.
4. **Dual Name Persistence During C2 Transition (`parties` + `project_customers`):** Migration #10 introduced `parties` while preserving `display_name`/`normalized_display_name` and `ux_project_customers_project_name_phone` on `project_customers`, alongside migration #11's `ux_project_customers_project_party`.
5. **100% Project-Customer Deletion Absence:** `ProjectCustomer` moves to `Archived` status rather than exposing physical deletion, preserving FK integrity for `CustomerInteraction` and `ProjectSalesReservation`.

---

## 3. Items Mandatory for Qualified Algerian Practitioner Sign-Off (Do Not Invent)

1. **VSP Milestone Timing & Verification Rules (Executive Decree 13-431):** Exact technical verification proof required before issuing the 15% foundations, 35% major works, 25% all trades, and 5% possession billing calls, plus permitted grace windows.
2. **Cancellation Retention & Late Penalties (Law 11-04 / Decree 13-431):** Exact handling of the 15% buyer-default retention cap, FGCMPI subrogation/guarantee release triggers, and 10% late-payment penalty calculation/judicial-notice workflow.
3. **VAT Rates & Collection Event (Finance Law 2025 Art. 59 & Finance Law 2026 Art. 53):** Exact boundary between 9% reduced social/eligible housing VAT vs 19% standard VAT on commercial/mixed units, parking annexes, and VSP vs finished-unit sales, plus treatment of refundable reservation deposits vs firm contract advances.
4. **SCF Revenue Recognition Timing:** Exact accounting treatment of VSP buyer advances (*comptes 419*) vs revenue recognition upon *Acte Notarié* / delivery (*classe 70*), plus WIP inventory valuation (*classe 3*).
5. **Official 1,541-Commune Bilingual Dataset (Law 26-06 & Decrees 26-206 / 26-208):** Verified bilingual Arabic/French spellings, postal/ONS/MICLAT codes, and effective dates through the 31 December 2026 transitional asset/liability period.

---

## 4. Verified Code / Documentation / Preview Drift Register

| Drift Area | Legacy Doc / Preview Claim | Actual Inspected Repository Truth | Action Required |
|---|---|---|---|
| **Migrations Count (`DATABASE-DESIGN.md`)** | Lists up to migration #10 (`OrganizationWidePartyFoundation`) | **11 migrations exist** (includes #11 `20261115120000_UniqueProjectPartyCustomerLink`) | Legacy doc flagged; canonical count locked in `CURRENT-STATE-BASELINE.md` |
| **Party Directory Endpoints (`PARTY-MASTER-DATA.md`)** | States C2 party search/reuse endpoints do not yet exist | `PartiesController`, `PartyDirectoryService`, `EfPartyRepository`, and modal lookup **exist in workspace**, but have `CS7036` test break & audit/sync bugs | Fix in Phase 0; legacy `PARTY-MASTER-DATA.md` superseded by `CURRENT-STATE-BASELINE.md` |
| **Preview Permissions (`dev-api-middleware.ts`)** | Acts as local UI simulator | Seeds **12/18 permissions** (omits Customers, Reservations, Parties permissions) and lacks `/documents`, `/customers`, `/reservations`, `/parties` routes | Sync in Phase 0 |
| **Preview Setup Wilaya Regex (`dev-api-middleware.ts:563`)** | Enforces `01–58` | Domain, `algerianFormat.ts`, `validation.ts`, `devPreviewProjectStore.ts` accept `01–69` | Sync regex to `01–69` in Phase 0 |
| **Unused Seeded Permissions (`DbInitializer.cs`)** | Seeds `org.manage` (`SYSTEM_ADMIN`) and `projects.structure.manage` (`PROJECT_DIRECTOR`, `SYSTEM_ADMIN`) | `OrganizationProfileView` has no update API (`org.manage` unused); `ProjectStructureService` checks member flags instead of `projects.structure.manage` | Align in Phase 1 |
