# PROMO GEST — ERP Module Catalog (Domains A–L)

All 12 functional ERP domains required by PROMO GEST, mapped strictly using the 6-state taxonomy against actual inspected code, controllers, EF configurations, and tests.

**Last verified code-bearing main baseline:** `875f4a178f24d36a4d3fa8a6620a526c33a763c6` (PR #177 squash merge); [post-merge CI #1109](https://github.com/younestech31/PROMO-GEST/actions/runs/44805079826) and [CodeQL #25](https://github.com/younestech31/PROMO-GEST/actions/runs/44805079753) passed on this exact SHA.
**Last ASP.NET Core API/Application runtime source:** PR #163 merge `711a05282869b8ebfe6965921045c9225dcecb17`. **Latest password-lifecycle EF/schema source:** PR #161 merge `03d1288a391ba72e49faf2cf8aa82d604e1ddc6e`. PR #161 adds mandatory temporary-password fields; PR #163 adds voluntary rotation and configurable session/credential lifetimes. PR #176 fixes SPA session bootstrap on reload without widening the temporary-session API allowlist; PR #177 is tests-only and adds deadline/session-token and existing-user migration-upgrade coverage.
**Delivery boundary:** Phase 1 remains IN_PROGRESS; Phases 2–5 remain PLANNED. P1-18 is Done / Verified after PRs #176/#177 and post-merge CI #1109/CodeQL #25. P1-01 is In Progress / Pending; P1-02 Blocked; no commune records loaded (`communesCount = 0`). Manual RTL/LTR browser acceptance remains pending. Decision-book statuses are 1,540 PENDING + one NEEDS_EVIDENCE; all 1,541 master-ledger practitioner sign-offs remain PENDING. PR #155 adds 26 W41 row readings and four collision controls, but does not upgrade any ERP module state or establish legal approval.

---

**Administrative reference delivery:** the server-owned bilingual 69-Wilaya catalogue remains implemented. The P1-01 master ledger structurally links 1,541 candidate row keys to 1,541 JO44 historical assertion IDs; the current main CI #1109 includes the corresponding validators. PR #141/#1038 is retained as the original historical introduction of the validator. PR #146 adds the decision book and bounded image-reading/temporal comparison workpapers; PR #155 adds a further bounded W41 reading set and collision controls. Neither changes module capability states. It records 1,431 proposed-clean rows and 110 explicit practitioner-decision rows; all sign-offs remain PENDING. Evidence scope does not establish full JO44 bilingual page-image review: 841 rows have French text-layer-only scope and 27 explicit JO44 Arabic spot-verification, with other register visual reviews separately scoped. The 75 candidate Arabic anomaly flags are routed to explicit review. PR #146 adds 51 bounded JO44 bilingual image-reading observations and the 21-row Ouargla/Touggourt compare; PR #155 adds the 26-row W41 reading set and four historical collision controls; these do not establish full 1,541-row bilingual transcription or legal sign-off. El Borma W30-R007 remains NEEDS_EVIDENCE with proposed 3021 and no effective date. No commune data are imported; `communesCount = 0`; P1-01 remains In Progress / Pending, P1-02 remains Blocked. See the master report, decision book and El Borma timeline memo.



**P1-18 evidence boundary:** PR #176 restored temporary-password session state on browser reload without widening the server allowlist. PR #177 proves the exact 24-hour expiry boundary/session-token rejection and PostgreSQL 18 existing-user migration upgrade. PR-head CI #1108 and post-merge main CI #1109 passed; full human Arabic RTL/French LTR acceptance of user-management workflows remains pending, so that capability stays `IMPLEMENTED_NOT_VERIFIED`.

## 1. Overview Matrix

| Code | Domain Name | Overall Status | Primary Dependencies |
|---|---|---|---|
| **A** | Organization, Governance & Administration | `PARTIALLY_IMPLEMENTED` *(69-Wilaya API active; 1,541-commune catalogue & HR Employee master planned)* | None (Foundation) |
| **B** | Real Estate Projects | `IMPLEMENTED_NOT_VERIFIED` *(workspace shell & switcher added locally; API CRUD `IMPLEMENTED_AND_VERIFIED`)* | Domain A |
| **C** | Physical Structure & Property Units | `PARTIALLY_IMPLEMENTED` *(create/edit/status verified; delete/bulk & pricing planned)* | Domain B |
| **D** | Counterparties (Party), Customers & CRM | `PARTIALLY_IMPLEMENTED` *(Party directory & customer CRM verified; wider Party lifecycle & Employee planned)* | Domains A, B |
| **E** | Commercial Operations & Internal Unit Holds | `IMPLEMENTED_AND_VERIFIED` | Domains B, C, D |
| **F** | Contracts, Commitments & Legal Deeds | `PLANNED` *(bilingual UI shell column previews only; zero backend workflow)* | Domains C, D, E, **K-Min** |
| **G** | Installments, Collections & Treasury (DZD) | `PLANNED` *(bilingual UI shell column previews only; zero backend workflow)* | Domains D, F |
| **H** | Construction Works & Chantier Tracking | `PLANNED` *(bilingual UI shell column previews only; zero backend workflow)* | Domains B, D, **K-Min** |
| **I** | Procurement, Suppliers & Inventory | `PLANNED` *(bilingual UI shell column previews only; zero backend workflow)* | Domains B, D, H |
| **J** | Algerian SCF Accounting & Tax | `PLANNED` *(bilingual UI shell column previews only; zero hardcoded tax rates; CPA sign-off required)* | Domains A, F, G, H, I |
| **K** | Document Management & Archiving (**K-Min** upload/download active; **K-Min finish** & **K-Full** planned) | `PARTIALLY_IMPLEMENTED` | Domain A, B |
| **L** | Reporting, Dashboards & Control | `PARTIALLY_IMPLEMENTED` | All active modules |

---

## 2. Frontend platform and module ownership — PRs #81/#82/#90/#140 (merged; historical CI #1038, current main CI #1109 passed)

- Canonical frontend entry points: `core/api/apiClient.ts`, `core/api/csrf.ts`, `core/permissions/permissionPolicy.ts`, `core/modules/registry.ts`, `core/modules/moduleCodes.ts`, `core/modules/routeTypes.ts`, `app/routeRegistry.ts`, and `core/localization/translations.ts`.
- Legacy `services/apiClient.ts`, CSRF utilities, `utils/permissions.ts`, `utils/moduleCatalog.ts`, `utils/navigation.ts`, `utils/workspaceGuards.ts`, and `localization/translations.ts` are explicit compatibility adapters, not alternate implementations.
- Active screen implementations now live in owning `modules/` directories for A–E, K, L, auth, setup and technical administration; Login and first-run setup have module-owned page implementations. Former `features/`, root `components/`, `layouts/` and duplicate utility paths are compatibility facades.
- Reusable visual components are owned by `shared/components/`; active application/module code imports that surface. F–J remain planned business capabilities, with display metadata under module `presentation/workflows.ts` rather than `api/`.
- Architecture regression tests verify module entry points, import parsing for static/type-only/re-export/side-effect/dynamic imports, public-index-only peer dependencies, acyclic module graph, no active imports from legacy `features/`, unique shared-component/API/CSRF/localization implementations, planned endpoint rejection, and the F–J presentation/API boundary.
- Historical main CI #1038 passed all three jobs on its exact baseline SHA `0a3bbadb`; current main CI #1109 also passes all three required jobs on `875f4a1`. Manual Arabic RTL / French LTR desktop/mobile browser acceptance and real dirty-form interaction evidence have not been performed. Navigation remains `IMPLEMENTED_NOT_VERIFIED` for manual UX acceptance.

## 3. Detailed Module Specifications (A–L)

### A. Organization, Governance & Administration (`PARTIALLY_IMPLEMENTED`)
- **Frontend surfaces:** the active organization/profile/overview/reference/employee-plan screens are owned by `modules/module-a-organization/pages/`; user, audit, and diagnostics screens are owned by `modules/technical-admin/pages/`. Root `features/` files are compatibility facades.
- **UI boundary:** `app/routeRegistry.ts` is the authoritative route access registry; `utils/workspaceGuards.ts` is a tested compatibility adapter. `AppContentRouter` gates unauthorized routes before protected screens mount.
- **Current Reality:**
  - *First-Run Wizard (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/setup/status`, `POST /api/setup/initialize` (enforces loopback IP or `X-PROMOGEST-SETUP-TOKEN` bootstrap guard).
  - *Session Auth & CSRF (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/auth/csrf` (intentionally `[AllowAnonymous]` bootstrap), `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (cookie **`promogest_session`** + `X-CSRF-TOKEN`; gates org fiscal/contact fields by `org.read` and `ConcurrencyStamp` by `org.manage`).
  - *User & Role Management (`IMPLEMENTED_NOT_VERIFIED`):* `GET/POST/PUT /api/users`, `PATCH /api/users/{id}/status`, `POST /api/users/{id}/reset-password`, `GET /api/users/roles`. PR #161 adds the temporary-password migration; PR #163 adds voluntary password rotation and server-enforced session idle expiry. PR #176 fixes temporary-session browser reload bootstrap without widening the server allowlist; PR #177 adds automated deadline/session-token and existing-user migration-upgrade tests. PR-head CI #1108 recorded Application 24/24 and PG18 Integration 35/35; post-merge main CI #1109 passed all three required jobs on `875f4a1`. Manual Arabic RTL/French LTR user-management acceptance remains outstanding.
  - *Audit Trail (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/audit`.
  - *Offline CLI Recovery (`IMPLEMENTED_AND_VERIFIED`):* `--unlock-admin`, `--reset-admin-password` (`Program.cs`, `AdminRecoveryService`).
  - *Organization Profile Update (`IMPLEMENTED_AND_VERIFIED`):* `PUT /api/organization` (`OrganizationController`, `OrganizationProfileService`) and `OrganizationProfileView.tsx` edit form enforce `org.manage`, `ExpectedConcurrencyStamp`, `singleton_guard`, and security/audit logging (verified in `PostgresEndToEndTests`).
- *Administrative Reference — Wilaya subset (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/reference/administrative-units` returns the server-owned versioned bilingual 69-Wilaya catalogue and source/effective-date metadata. PR #59 connects first-run setup, organization-profile edit and project create/update selectors to this API; PostgreSQL 18 E2E verifies the endpoint and no-store policy, and frontend tests verify the Vite preview contract.
- **Target Scope (`PLANNED`):** Active session revocation UI, HR Employee master, and the complete effective-dated 1,541-commune hierarchy (`communesCount = 0`).

### B. Real Estate Projects (`IMPLEMENTED_NOT_VERIFIED` — workspace shell)
- **Frontend surface:** `modules/module-b-projects/pages/ProjectsAccessView.tsx`, `pages/ProjectWorkspaceView.tsx`, and `components/ProjectSwitcherModal.tsx`. PRs #81/#82 establish the modular frontend; PR #90 implements the single global-header project switcher and sidebar-only project-section navigation. Latest main CI #825 passes; manual navigation and bilingual budget UI acceptance remain outstanding.
- **Current Reality:** `GET/POST /api/projects`, `GET/PUT /api/projects/{projectId}`, `PUT /api/projects/{projectId}/members`, `DELETE /api/projects/{projectId}/members/{userId}`. Dynamic `actualBuildingsCount`/`actualUnitsCount`, `ExpectedConcurrencyStamp` CAS protection, last-PM guard, Wilaya `01–69`. Project-access revocation clears cached stale context (`revokeProjectAccessFromState`). `EstimatedBudgetDzd` is redacted unless the actor has an explicit project membership with `CanViewFinancials`; budget writes additionally require `projects.manage` and ProjectManager membership. Null budget on a general master-data update preserves the stored value; unauthorized numeric writes are rejected and audited (PR #80 / D-014 / ADR-0011). Automated PR/main CI passed; manual RTL/LTR browser acceptance remains outstanding.
- **Target Scope (`PLANNED`):** Structured land parcel references, subdivision/viability certificates, building permits, and VSP eligibility metadata linked to local verified files.

### C. Physical Structure & Property Units (`PARTIALLY_IMPLEMENTED`)
- **Frontend surface:** `ProjectStructureModal.tsx` supports building/floor/unit create and update flows and property-unit status changes (modal & embedded workspace). The Product Owner owner-attested successful Arabic RTL / French LTR desktop/mobile use of the project-structure workflow; see `PHASE-0-MANUAL-ACCEPTANCE.md`.
- **Current Reality:** `GET /api/projects/{id}/structure`, `POST/PUT .../buildings`, `POST/PUT .../buildings/{bId}/floors`, `POST/PUT .../floors/{fId}/units`, `PUT .../units/{uId}/status`. `UnitType` (`Apartment`, `Shop`, `ParkingSpace`, `Office`, `Storage`); `PropertyUnitStatus` (`Planned`, `UnderConstruction`, `AvailableForSale`, `Reserved`, `Sold`, `Delivered`, `Withdrawn`).
- **Documented Reality Notes:** Neither `DELETE` endpoints nor `/bulk` HTTP endpoints exist in `ProjectStructureController`; `gross_area_square_meters`, `net_area_square_meters`, `rooms_count` exist on `property_units` (no `price_dzd` or `orientation` columns yet); `ProjectStructureService` and `canManageProjectStructure` enforce both `projects.structure.manage` (seeded on `SYSTEM_ADMIN`, `PROJECT_DIRECTOR`, and `SITE_ENGINEER`) and `ProjectMember` (`CanManageConstruction || ProjectManager`).
- **Target Scope (`PLANNED`):** Controlled retirement (`Withdrawn`), base reference pricing/composition, and multi-dimensional unit status separating physical readiness, commercial availability, and legal contract ownership.

### D. Counterparties (Party), Customers & CRM (`PARTIALLY_IMPLEMENTED`)
- **Frontend surface:** `PartiesDirectoryView.tsx` (organization directory gated by `parties.directory.read`) and `ProjectCustomerRegistryModal.tsx` (project customer registry, canonical Party search/selection, customer details, CRM interactions/follow-up fields, and linked identity-document download).
- **Current Reality:**
  - *Project Customer Registry (C1):* `GET/POST /api/projects/{id}/customers`, `GET/PUT .../customers/{customerId}`, `POST .../customers/{customerId}/interactions`.
  - *Party Directory (C2, PRs #35–#38):* `GET /api/parties`, `PUT /api/parties/{partyId}`; canonical `parties` identity is authoritative. Unauthorized reads/identity changes are security-audited and stale Party writes use concurrency stamps.
  - *Phase 1 identity retirement (PRs #55–#56):* duplicate `project_customers` identity columns are removed; new ProjectCustomer IDs remain separate from Party IDs; deferred PostgreSQL triggers enforce project/name/normalized-phone uniqueness under concurrent relationship writes and Party identity changes. PR #57 directly verifies trigger Down and fail-closed preflight; main CI #573 passed PostgreSQL Integration **29/29**.
  - *Employee Master (`PLANNED`):* No `Employee` table/entity yet. Existing user-management request/method names containing `Employee` manage `User` authentication accounts; they do not create HR records.
- **Phase 1 scope decision (D-012):** Keep the delivered canonical Party identity and project-scoped `ProjectCustomer` boundary. `ProjectCustomer` remains the owner of current contact data, status/source/language, customer identity-document reference and interactions; `User` remains the login/security principal; `ProjectMember` remains authorization scope. Do not duplicate or move those data in this phase.
- **Deferred Scope (`PLANNED`):** `PartyContactPoint` (pending cross-project ownership/provenance/verification and override rules); protected `PartyIdentifier` (pending lawful purpose, qualified Algerian review, encryption/key recovery, masking, dedicated permissions and retention); `PartyRepresentative` (pending legal/notarial authority model); human-reviewed Party merge/`PartyMergeRecord` (pending former-ID/reference preservation, conflict resolution, append-only audit and recovery design); generic role/lifecycle-aware `ProjectPartyRole` for suppliers/contractors/consultants (pending the corresponding later workflows); and `Employee` HR profiles decoupled from optional `User` logins. No auto-merge, global contact uniqueness, contact synchronization, Party/User auto-link, new permissions or schema is part of D-012. Module D remains `PARTIALLY_IMPLEMENTED`; requirements REQ-D05 and REQ-D06 remain `PLANNED`.

### E. Commercial Operations & Internal Unit Holds (`IMPLEMENTED_AND_VERIFIED`)
- **Frontend surface:** `ProjectSalesReservationsModal.tsx` lists holds, creates them for an available unit and project customer with an expiry, and cancels with a reason. This is an internal hold only; it is not a statutory contract and does not collect money.
- **Current Reality:** `GET /api/projects/{id}/reservations`, `GET .../reservations/{reservationId}`, `POST .../reservations`, `POST .../reservations/{reservationId}/cancel` (expiry runs automatically on due holds via service/worker; no `/expire` HTTP endpoint). Transitions unit `AvailableForSale -> Reserved` (enforced by partial unique index `ux_project_sales_reservations_active_unit`) and releases `Reserved -> AvailableForSale` on cancel/expiry.
- **Explicit Legal Boundary:** `ProjectSalesReservation` is strictly an **Internal Unit Hold**, **NOT** a Law 11-04 statutory reservation contract, and collects **zero** promoter treasury cash today.
- **Verification:** PostgreSQL 18 E2E covers create/read/list, active-hold uniqueness, cancellation and unit release, concurrent reservation race (one winner), and expiry processing; CI #544 executed the integration suite successfully and main CI #546 re-ran all required jobs successfully. The Product Owner separately owner-attested the real UI flow for hold creation, cancellation, and expiry across both languages and desktop/mobile, with persistence/reload. The Vite preview simulator (`dev-api-middleware.ts`) also mirrors `/reservations` authorization, expiry, and cancellation concurrency checks for frontend integration tests.

### F. Contracts, Commitments & Legal Deeds (`PLANNED`)
- **Frontend/API boundary:** workflow display metadata is in `presentation/workflows.ts`; API modules contain only API contracts or explicit `MODULE_PLANNED` rejection. The Contracts page's K-Min cross-link now navigates to project documents. Legal/notarial copy is explicitly provisional pending qualified Algerian legal/notarial review.
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
- **Frontend/API boundary:** planned workflow display metadata is under `presentation/workflows.ts`; API calls reject as unavailable rather than returning fabricated data.
- **Scope:** Contractual installment obligations (`PaymentObligation`), explicit cash/bank/check collections (`PaymentReceipt`), itemized allocation (`PaymentAllocation`), cashbox & bank ledgers, bounced check / cancellation `RefundOrReversal`, and buyer account statements. Never combines FGCMPI escrow deposits with unrestricted promoter bank receipts.

### H. Construction Works & Chantier Tracking (`PLANNED`)
- **Frontend/API boundary:** planned workflow display metadata is under `presentation/workflows.ts`; API calls reject as unavailable.
- **Scope:** Technical project lots (*gros œuvre*, CES, VRD), contractor/subcontractor contracts (`Party`), site measurements (*attachements*), interim payment situations (*décomptes*), warranty retentions, and formal **`ConstructionMilestoneEvidence`** acceptance (Draft → Submitted → UnderReview → Accepted/Rejected) driving VSP billing eligibility cleanly without a duplicate progress slider.

### I. Procurement, Suppliers & Inventory (`PLANNED`)
- **Frontend/API boundary:** planned workflow display metadata is under `presentation/workflows.ts`; API calls reject as unavailable.
- **Scope:** Supplier directory (`Party`), purchase requests, POs, site delivery notes, warehouse/site stock ledger (`IN`/`OUT`/`TRANSFER`), and invoice-to-delivery matching before treasury settlement.

### J. Algerian SCF Accounting & Tax (`PLANNED`)
- **Frontend/API boundary:** planned workflow display metadata is under `presentation/workflows.ts`; API calls reject as unavailable. No statutory tax-rate assumptions are introduced.
- **Prerequisite:** Qualified Algerian *Expert-Comptable / Commissaire aux Comptes* sign-off.
- **Scope:** SCF Classes 1–7 chart of accounts, double-entry balanced journals (`Debit == Credit` in DZD `numeric(18,2)`), fiscal periods & locks, non-destructive reversals (*extourne*), and separated `TaxEvent` tracking (statutory VAT/IBS/TAP/IRG rules and rates remain parameterized and **never hardcoded in the UI** pending CPA approval).

### K. Document Management & Archiving (`PARTIALLY_IMPLEMENTED` — Two-Stage Split)
- **Frontend surface:** `ProjectDocumentsModal.tsx` (`K-Min` upload, category/description, list, and SHA-256 download) paired with planned sub-screen placeholders in `moduleCatalog.ts` separating active `K-Min` upload/list/download from planned metadata/soft-archive, `DocumentLink`, and `K-Full` retention workflows.
Resolves the former catalog vs roadmap dependency conflict by splitting Module K cleanly into **two explicit tiers**:
1. **`K-Min` (Active upload/list/download verified; metadata/soft-archive/`DocumentLink` planned pre-Phase 2):**
   - **Current Reality (`IMPLEMENTED_AND_VERIFIED` for upload/list/download):** `stored_files` (`GET/POST /api/projects/{id}/documents`, `GET .../download`), `LocalFileStorageService`, SHA-256 verification on upload/download, whitelist (`pdf`, images, Office docs, txt/csv, max 25 MB), capability category scoping, and `customers.read` KYC isolation (also mirrored in `dev-api-middleware.ts`).
   - **Required Additions before Phase 2 (`PLANNED`):** Metadata update/soft-archive lifecycle + explicit structured attachment links (`DocumentLink` / FK references) binding `StoredFile` records to `ProjectSalesReservation`, Legal Contracts, `ContractVersion`, `ConstructionMilestoneEvidence`, `PaymentReceipt`, and authorized `Party` files.
2. **`K-Full` (Scheduled in Phase 5 — `PLANNED`):**
   - Full cross-enterprise attachment links across Procurement, Inventory, HR, and SCF vouchers; retention policies; legal hold tags; cold-storage reconciliation & bulk export bundles.

### L. Reporting, Dashboards & Control (`PARTIALLY_IMPLEMENTED`)
- **Frontend/API boundary:** `ReportsWorkspaceView.tsx` is owned by `modules/module-l-reporting/pages/`. `reportingApi.listReports()` rejects with `MODULE_PLANNED`; it no longer fabricates a successful empty report list.
- **Frontend surface:** `OverviewView.tsx`, `ReportsWorkspaceView.tsx`, and `AuditLogView.tsx` provide authorized organization/project summaries and recent audit trails alongside planned report column previews. Executive, financial, arrears, construction-variance, supplier, and SCF reports remain planned.
- **Current Reality:** Live building/unit counts per project (`ProjectsAccessView`), recent audit view (`AuditLogView`).
- **Target Scope (`PLANNED`):** Inventory & commercial pipeline reports, arrears & collection aging, physical vs financial VSP variance, supplier liabilities, and SCF trial balances/general ledgers exported offline (PDF/CSV/XLSX).

---

## 4. Unified Cross-Module Financial Event Flow (`PLANNED`)

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
