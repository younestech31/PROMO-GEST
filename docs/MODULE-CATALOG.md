# PROMO GEST — ERP Module Catalog (Domains A–L)

All 12 functional ERP domains required by PROMO GEST, mapped strictly using the 6-state taxonomy against actual inspected code, controllers, EF configurations, and tests.

**Last Code-Changing Source Baseline:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59 merge; server-owned 69-Wilaya reference integrated with the main forms).  
**Main Commit Inspected:** `62ebdcb725e0ab95059e7e4abe64581976898642` (documentation-only merge PR #61; latest application-source baseline remains `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`).  
**Latest Documentation PR CI:** Run **#584** / `43888881047` passed all three jobs on PR #61 head `b1f36615f12c1186f481109431c8aa2edd0dc4ae` (documentation-only; not the merge SHA). **Latest application-source CI:** Run **#581** / `43881240365` passed all three jobs on the current runtime/test baseline `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (frontend 40/40, Domain 34/34, Application 20/20, PostgreSQL 18 Integration 30/30, restore drill, Windows x64).  
**Live Preview / Manual Acceptance Evidence:** On 15 November 2026, the Product Owner confirmed the real Google AI Studio development server/API and PostgreSQL development connection operate, and owner-attested successful Arabic RTL / French LTR desktop/mobile workflows for projects, structure, customer interactions, internal holds, documents/SHA-256, authorization, audit, concurrency, safe errors, and persistence. Detailed group mapping is in `PHASE-0-MANUAL-ACCEPTANCE.md`; Phase 0 was administratively closed by owner decision D-010, with P0-A01 and P0-A04 still `NOT_RUN` as accepted residual exceptions.

---

## 1. Overview Matrix

| Code | Domain Name | Overall Status | Primary Dependencies |
|---|---|---|---|
| **A** | Organization, Governance & Administration | `IMPLEMENTED_AND_VERIFIED` *(except `AdministrativeUnit` 1,541-commune catalogue)* | None (Foundation) |
| **B** | Real Estate Projects | `IMPLEMENTED_AND_VERIFIED` | Domain A |
| **C** | Physical Structure & Property Units | `IMPLEMENTED_AND_VERIFIED` *(no DELETE/bulk; enforces `projects.structure.manage`)* | Domain B |
| **D** | Counterparties (Party), Customers & CRM | `PARTIALLY_IMPLEMENTED` *(Party identity split and project-level duplicate guard implemented; wider master-data lifecycle remains)* | Domains A, B |
| **E** | Commercial Operations & Internal Unit Holds | `IMPLEMENTED_AND_VERIFIED` | Domains B, C, D |
| **F** | Contracts, Commitments & Legal Deeds | `PLANNED` | Domains C, D, E, **K-Min** |
| **G** | Installments, Collections & Treasury (DZD) | `PLANNED` | Domains D, F |
| **H** | Construction Works & Chantier Tracking | `PLANNED` | Domains B, D, **K-Min** |
| **I** | Procurement, Suppliers & Inventory | `PLANNED` | Domains B, D, H |
| **J** | Algerian SCF Accounting & Tax | `PLANNED` | Domains A, F, G, H, I |
| **K** | Document Management & Archiving (**K-Min** pre-Phase 2; **K-Full** Phase 5) | `PARTIALLY_IMPLEMENTED` | Domain A, B |
| **L** | Reporting, Dashboards & Control | `PARTIALLY_IMPLEMENTED` | All active modules |

---

## 2. Detailed Module Specifications (A–L)

### A. Organization, Governance & Administration (`PARTIALLY_IMPLEMENTED`)
- **Frontend surfaces:** `FirstRunSetupWizard.tsx`, `LoginScreen.tsx`, `UsersManagementView.tsx`, `AuditLogView.tsx`, `OrganizationProfileView.tsx`, and organization-level `OverviewView.tsx`.
- **UI boundary:** technical administration links (users/audit) currently share the same shell/navigation as daily operations rather than a separate technical-admin workspace.
- **Current Reality:**
  - *First-Run Wizard (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/setup/status`, `POST /api/setup/initialize` (enforces loopback IP or `X-PROMOGEST-SETUP-TOKEN` bootstrap guard).
  - *Session Auth & CSRF (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/auth/csrf` (intentionally `[AllowAnonymous]` bootstrap), `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (cookie **`promogest_session`** + `X-CSRF-TOKEN`; gates org fiscal/contact fields by `org.read` and `ConcurrencyStamp` by `org.manage`).
  - *User & Role Management (`IMPLEMENTED_AND_VERIFIED`):* `GET/POST/PUT /api/users`, `PATCH /api/users/{id}/status`, `POST /api/users/{id}/reset-password`, `GET /api/users/roles`.
  - *Audit Trail (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/audit`.
  - *Offline CLI Recovery (`IMPLEMENTED_AND_VERIFIED`):* `--unlock-admin`, `--reset-admin-password` (`Program.cs`, `AdminRecoveryService`).
  - *Organization Profile Update (`IMPLEMENTED_AND_VERIFIED`):* `PUT /api/organization` (`OrganizationController`, `OrganizationProfileService`) and `OrganizationProfileView.tsx` edit form enforce `org.manage`, `ExpectedConcurrencyStamp`, `singleton_guard`, and security/audit logging (verified in `PostgresEndToEndTests`).
- *Administrative Reference — Wilaya subset (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/reference/administrative-units` returns the server-owned versioned bilingual 69-Wilaya catalogue and source/effective-date metadata. PR #59 connects first-run setup, organization-profile edit and project create/update selectors to this API; PostgreSQL 18 E2E verifies the endpoint and no-store policy, and frontend tests verify the Vite preview contract.
- **Target Scope (`PLANNED`):** Active session revocation UI and the complete effective-dated 1,541-commune hierarchy. The endpoint currently reports `communesCount = 0` and `PendingOfficialVerification`; free-text municipality remains for compatibility.

### B. Real Estate Projects (`IMPLEMENTED_AND_VERIFIED`)
- **Frontend surface:** `ProjectsAccessView.tsx` lists accessible projects, supports project creation/update and team membership operations. It launches project sub-areas as modals from the directory; it is not yet the dedicated project switcher or active project workspace.
- **Current Reality:** `GET/POST /api/projects`, `GET/PUT /api/projects/{projectId}`, `PUT /api/projects/{projectId}/members`, `DELETE /api/projects/{projectId}/members/{userId}`. Dynamic `actualBuildingsCount`/`actualUnitsCount`, `ExpectedConcurrencyStamp` CAS protection, last-PM guard, Wilaya `01–69`.
- **Target Scope (`PLANNED`):** Structured land parcel references, subdivision/viability certificates, building permits, and VSP eligibility metadata linked to local verified files.

### C. Physical Structure & Property Units (`IMPLEMENTED_AND_VERIFIED` with documented gaps)
- **Frontend surface:** `ProjectStructureModal.tsx` supports building/floor/unit create and update flows and property-unit status changes. The Product Owner owner-attested successful Arabic RTL / French LTR desktop/mobile use of the project-structure workflow; see `PHASE-0-MANUAL-ACCEPTANCE.md`.
- **Current Reality:** `GET /api/projects/{id}/structure`, `POST/PUT .../buildings`, `POST/PUT .../buildings/{bId}/floors`, `POST/PUT .../floors/{fId}/units`, `PUT .../units/{uId}/status`. `UnitType` (`Apartment`, `Shop`, `ParkingSpace`, `Office`, `Storage`); `PropertyUnitStatus` (`Planned`, `UnderConstruction`, `AvailableForSale`, `Reserved`, `Sold`, `Delivered`, `Withdrawn`).
- **Documented Reality Notes:** Neither `DELETE` endpoints nor `/bulk` HTTP endpoints exist in `ProjectStructureController`; `gross_area_square_meters`, `net_area_square_meters`, `rooms_count` exist on `property_units` (no `price_dzd` or `orientation` columns yet); `ProjectStructureService` and `canManageProjectStructure` enforce both `projects.structure.manage` (seeded on `SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, and `SITE_ENGINEER`) and `ProjectMember` (`CanManageConstruction || ProjectManager`).
- **Target Scope (`PLANNED`):** Controlled retirement (`Withdrawn`), base reference pricing/composition, and multi-dimensional unit status separating physical readiness, commercial availability, and legal contract ownership.

### D. Counterparties (Party), Customers & CRM (`PARTIALLY_IMPLEMENTED`)
- **Frontend surface:** `ProjectCustomerRegistryModal.tsx` supports project customer registry, canonical Party search/selection, customer details, CRM interactions/follow-up fields, and linked identity-document download. The Product Owner owner-attested successful Arabic RTL / French LTR desktop/mobile use of the customer and interaction workflows. A full lead pipeline, standalone Party directory, and broader contact/representative management are not present.
- **Current Reality:**
  - *Project Customer Registry (C1):* `GET/POST /api/projects/{id}/customers`, `GET/PUT .../customers/{customerId}`, `POST .../customers/{customerId}/interactions`.
  - *Party Directory (C2, PRs #35–#38):* `GET /api/parties`, `PUT /api/parties/{partyId}`; canonical `parties` identity is authoritative. Unauthorized reads/identity changes are security-audited and stale Party writes use concurrency stamps.
  - *Phase 1 identity retirement (PRs #55–#56):* duplicate `project_customers` identity columns are removed; new ProjectCustomer IDs remain separate from Party IDs; deferred PostgreSQL triggers enforce project/name/normalized-phone uniqueness under concurrent relationship writes and Party identity changes. PR #57 directly verifies trigger Down and fail-closed preflight; main CI #573 passed PostgreSQL Integration **29/29**.
  - *Employee Master (`PLANNED`):* No `Employee` table yet (`ADR-0009`).
- **Target Scope (`PLANNED`):** Add `PartyContactPoint`, protected `PartyIdentifier`, `PartyRepresentative`, human-approved manual `Party` merge workflow, fuller Supplier/Subcontractor roles, and `Employee` detached from `User`. Party mirror retirement and the core project-level duplicate guard are implemented; these wider master-data workflows are not.

### E. Commercial Operations & Internal Unit Holds (`IMPLEMENTED_AND_VERIFIED`)
- **Frontend surface:** `ProjectSalesReservationsModal.tsx` lists holds, creates them for an available unit and project customer with an expiry, and cancels with a reason. This is an internal hold only; it is not a statutory contract and does not collect money.
- **Current Reality:** `GET /api/projects/{id}/reservations`, `GET .../reservations/{reservationId}`, `POST .../reservations`, `POST .../reservations/{reservationId}/cancel` (expiry runs automatically on due holds via service/worker; no `/expire` HTTP endpoint). Transitions unit `AvailableForSale -> Reserved` (enforced by partial unique index `ux_project_sales_reservations_active_unit`) and releases `Reserved -> AvailableForSale` on cancel/expiry.
- **Explicit Legal Boundary:** `ProjectSalesReservation` is strictly an **Internal Unit Hold**, **NOT** a Law 11-04 statutory reservation contract, and collects **zero** promoter treasury cash today.
- **Verification:** PostgreSQL 18 E2E covers create/read/list, active-hold uniqueness, cancellation and unit release, concurrent reservation race (one winner), and expiry processing; CI #544 executed the integration suite successfully and main CI #546 re-ran all required jobs successfully. The Product Owner separately owner-attested the real UI flow for hold creation, cancellation, and expiry across both languages and desktop/mobile, with persistence/reload. The internal-hold workflow is therefore `IMPLEMENTED_AND_VERIFIED`; this remains strictly separate from statutory contracts and cash collection. The Vite-only preview simulator still lacks `/reservations`; that is a development-preview limitation, not the production ASP.NET Core API.

### F. Contracts, Commitments & Legal Deeds (`PLANNED`)
**Prerequisite:** Phase 0 + Phase 1 + **K-Min** Document Capabilities + **Qualified Algerian Legal/Notarial Sign-Off**.
Promoter commitments must strictly distinguish **four separate record types** (never collapsing them into one table/status):

| Record Type | Legal Nature (Algeria) | Lifecycle & Conversion Rules | Financial / Treasury Impact |
|---|---|---|---|
| **1. Internal Unit Hold** *(Module E — Implemented)* | Operational option/hold (`ProjectSalesReservation`). Not a statutory contract. | `Active` → `Cancelled` \| `Expired` \| *(Future)* `SupersededByContract`. Does **not** guarantee a statutory contract follows. | **None.** Holds no statutory advance and never creates promoter treasury cash or VAT event. |
| **2. Statutory Reservation Contract** (`PLANNED` — Law 11-04 Art. 27, 32, 33; FGCMPI) | Statutory reservation contract where advance is deposited in an escrow account opened in the reserver's name at FGCMPI. | `Draft` → `Notarized/Executed` → `CompletedBySaleDeed` \| `TerminatedByBuyer` \| `TerminatedByPromoter` (requires 2 judicial notices). | Tracks FGCMPI escrow account/reference & statutory advance separately from **promoter available treasury cash**. Buyer-requested cancellation retention (15% under Art. 32) requires verified legal/accounting rule before posting. |
| **3. VSP Contract** (*Vente sur Plan*, `PLANNED` — Law 11-04 Art. 28, 30, 34–39; Decree 13-431) | Authentic sale-on-plan contract transferring rights on land and works as realized against construction-linked tranches. | Prerequisites: Land/title/permit refs, subscribed FGCMPI guarantee (Art. 42, 54–55), Art. 36 loan/eligibility review. States: `Draft` → `UnderReview` → `Executed` (authentic notary reference + **K-Min** signed file) → `Delivered` \| `Rescinded` \| `Transferred`. Addenda tracked via immutable `ContractVersion`. | Generates versioned `PaymentObligation / Installment` schedule (Decree 13-431 triggers). No VSP collection permitted before execution & milestone due rule (Art. 42). |
| **4. Completed Property Sale / *Acte Notarié*** (`PLANNED` — Law 11-04 Art. 25, 33) | Final authentic notarial sale deed for built/accepted property. | `Draft` → `NotarizedExecuted` → `RegisteredPublished` → `HandoverCompleted` (*PV de possession* + conformity prerequisites). | Generates agreed settlement obligation, collection receipts, tax determination, and accounting revenue transfer event upon practitioner-approved rules. |

- **Co-Buyers, Representatives & Transfers:** Contracts must support multiple buyer `Party` rows with explicit ownership shares (`%` totaling 100%), legal-entity `PartyRepresentative` links, and audited *Cession/Transfer* / *Résiliation* workflows without overwriting historical contract versions. **Legal, VSP, and tax rules remain `PLANNED` documentation constraints until validated by Algerian legal/accounting professionals.**

### G. Installments, Collections & Treasury in DZD (`PLANNED`)
- **Scope:** Contractual installment obligations (`PaymentObligation`), explicit cash/bank/check collections (`PaymentReceipt`), itemized allocation (`PaymentAllocation`), cashbox & bank ledgers, bounced check / cancellation `RefundOrReversal`, and buyer account statements. Never combines FGCMPI escrow deposits with unrestricted promoter bank receipts.

### H. Construction Works & Chantier Tracking (`PLANNED`)
- **Scope:** Technical project lots (*gros œuvre*, CES, VRD), contractor/subcontractor contracts (`Party`), site measurements (*attachements*), interim payment situations (*décomptes*), warranty retentions, and formal **`ConstructionMilestoneEvidence`** acceptance (Draft → Submitted → UnderReview → Accepted/Rejected) driving VSP billing eligibility cleanly without a duplicate progress slider.

### I. Procurement, Suppliers & Inventory (`PLANNED`)
- **Scope:** Supplier directory (`Party`), purchase requests, POs, site delivery notes, warehouse/site stock ledger (`IN`/`OUT`/`TRANSFER`), and invoice-to-delivery matching before treasury settlement.

### J. Algerian SCF Accounting & Tax (`PLANNED`)
- **Prerequisite:** Qualified Algerian *Expert-Comptable / Commissaire aux Comptes* sign-off.
- **Scope:** SCF Classes 1–7 chart of accounts, double-entry balanced journals (`Debit == Credit` in DZD `numeric(18,2)`), fiscal periods & locks, non-destructive reversals (*extourne*), and separated `TaxEvent` tracking (TVA collection trigger per Finance Law 2025 Art. 59; 9% vs 19% rates per Finance Law 2026 Art. 53).

### K. Document Management & Archiving (`PARTIALLY_IMPLEMENTED` — Two-Stage Split)
- **Frontend surface:** `ProjectDocumentsModal.tsx` supports project-file upload, category/description, list, and download. Metadata editing, soft archive, structured business-entity links, retention, and K-Full remain unimplemented.
Resolves the former catalog vs roadmap dependency conflict by splitting Module K cleanly into **two explicit tiers**:
1. **`K-Min` (Required Before Phase 2 — Contracts & Chantier):**
   - **Current Reality (`IMPLEMENTED_AND_VERIFIED` for the existing K-Min upload/list/download slice):** `stored_files` (`GET/POST /api/projects/{id}/documents`, `GET .../download`), `LocalFileStorageService`, SHA-256 verification on upload/download, whitelist (`pdf`, images, Office docs, txt/csv, max 25 MB). PostgreSQL 18 E2E exercises upload, list, download, checksum and invalid file rejection in CI #544; the Product Owner owner-attested successful bilingual desktop/mobile upload/download and SHA-256 browser workflow. Metadata/archive/link extensions remain unimplemented, so Module K overall remains `PARTIALLY_IMPLEMENTED`.
   - **Required Additions before Phase 2:** Add metadata update/soft-archive lifecycle + explicit structured attachment links (`DocumentLink` / FK references) binding SHA-256 `StoredFile` records to `ProjectSalesReservation`, Legal Contracts (`StatutoryReservation`, `VSP`, `FinalSaleDeed`), `ContractVersion`, `ConstructionMilestoneEvidence`, `PaymentReceipt`, and authorized `Party` KYC files with strict permission isolation.
2. **`K-Full` (Scheduled in Phase 5):**
   - Full cross-enterprise attachment links across Procurement, Inventory, HR, and SCF vouchers; retention policies; legal hold tags; cold-storage reconciliation & bulk export bundles.

### L. Reporting, Dashboards & Control (`PARTIALLY_IMPLEMENTED`)
- **Frontend surface:** `OverviewView.tsx` provides organization/system/readiness summaries and shortcuts; `AuditLogView.tsx` shows a bounded recent audit list. Executive, financial, arrears, construction-variance, supplier, and SCF reports remain planned.
- **Current Reality:** Live building/unit counts per project (`ProjectsAccessView`), recent audit view (`AuditLogView`).
- **Target Scope (`PLANNED`):** Inventory & commercial pipeline reports, arrears & collection aging, physical vs financial VSP variance, supplier liabilities, and SCF trial balances/general ledgers exported offline (PDF/CSV/XLSX).

---

## 3. Unified Cross-Module Financial Event Flow (`PLANNED`)

> **Design Only (`PLANNED`):** None of the financial, tax, or SCF entities below exist in code yet. Exact posting rules, VAT treatment of escrow advances, and revenue recognition require **Algerian CPA & legal sign-off** before implementation.

```text
[1. Internal Hold] ──(optional conversion)──► [2. Legal Contract] ──► [3. ContractVersion (v1, v2...)]
     (No cash)                                                               │
                                                                             ▼
[8. ConstructionMilestoneEvidence] ──(Accepted)──► [4. PaymentObligation / Installment]
                                                               │
                                                               ▼
[5. PaymentReceipt (DZD)] ──► [6. PaymentAllocation] ◄──► [7. Refund / Reversal]
        │                             │
        ├─────────────────────────────┴──► [9. TaxEvent (TVA collection / exemption basis)]
        │
        └────────────────────────────────► [10. ScfJournalEntry (Balanced Debit = Credit)]
```

| Stage / Event | Source Trigger | Approval / Finality Condition | Mutability Rule | Idempotency / Double-Post Guard | Context Links Required | Audit & Reconstruction |
|---|---|---|---|---|---|---|
| **1. Reservation (`Internal Hold`)** | Commercial user creates unit hold | Active upon save (`AvailableForSale -> Reserved`) | Closed only via `Cancel` or `Expire` (no edit after close) | Partial unique index `ux_project_sales_reservations_active_unit` | Project, Unit, Customer (`Party`) | Logged in `audit_logs` + timestamps |
| **2. Legal Contract & 3. Version** | Legal officer prepares contract from hold or unit | Signed/notarized **only** with legal prereqs + **K-Min** document SHA-256 link | Contract terms immutable once `Executed`; amendments append new `ContractVersion` | Unique `(ProjectId, ContractNumber, VersionNumber)` | Project, Unit, Parties+Shares, Hold? | Full version chain preserved |
| **4. Payment Obligation / Installment** | Active `ContractVersion` schedule + due trigger (e.g., signature or milestone) | Active when contract signed & trigger condition verified | Locked once partially/fully settled; price revisions create explicit adjustment delta | Unique `(ContractVersionId, TrancheSequence)` | ContractVersion, Project, Unit, Party | Traced back to trigger rule & contract version |
| **8. Construction Milestone Evidence** | Site Engineer submits measurement/certificate | Approved only by authorized reviewer (`Accepted` state + **K-Min** file proof) | Append-only decision history; rework requires new submission | Unique verified acceptance per building/lot stage | Project, Building/Lot, Approver, StoredFile | Reviewer, timestamp, evidence hash |
| **5. Payment Receipt & 6. Allocation** | Finance Officer records cash/bank/check receipt (explicitly distinct from FGCMPI escrow) | Confirmed once validated by Finance Officer (separate from Commercial creator — SoD) | Immutable once `Confirmed`/`Posted` | Unique idempotency key + unique bank ref; `SUM(Allocations) <= ReceiptAmount` | TreasuryAccount, Contract, Obligations, Party, Project, Unit | Separates **cash flow** (date banked) from due obligation |
| **7. Refund / Reversal** | Cancellation retention, buyer refund, bounced check, or error correction | Authorized by Finance + Legal approval | Append-only compensating event (original receipt remains historically visible) | Linked 1:1 / bounded against `OriginalReceiptId` (prevents double refund) | OriginalReceipt, Contract, Party, TreasuryAccount | Full causal chain preserved |
| **9. Tax Event** | Collection trigger (Finance Law 2025 Art. 59) or verified statutory event | Generated only from confirmed `PaymentReceipt` / verified reversal per CPA spec | Immutable once declared/posted; corrections append delta `TaxEvent` | Unique `(SourceEventType, SourceEventId, TaxRuleVersion)` | Contract, PaymentReceipt, LegalRuleRef, Rate (`9%`/`19%`/Exempt) | Keeps **tax liability** separate from raw cash receipt & revenue |
| **10. SCF Journal Entry** | Validated business events (`Receipt`, `Refund`, `WorkSituation`, `TaxEvent`, `Handover`) | Posted by SCF engine under open `FiscalPeriod` | Strictly immutable after posting; errors corrected via *extourne* (reversal entry) | Unique `(SourceEventType, SourceEventId, PostingRuleId)` prevents duplicate journals | `FiscalPeriod`, `ScfAccount`, Project, Unit, Contract, Party | Deterministic replay from immutable source business events |
