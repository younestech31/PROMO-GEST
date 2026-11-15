# PROMO GEST — Master Execution Roadmap

**Design Principle:** Strictly dependency-ordered stages with mandatory verification gates between stages. **Zero downstream financial or accounting module may start before upstream security, Party/Customer consistency, and PostgreSQL 18 CI verification pass.**

---

## 1. Program Stages & Dependency Chain

```text
  [Phase 0: Immediate Stabilization]
       │ (Fix CS7036 from PR #34 / CI 43710844749, C2 Party defects, preview parity, PG18 green CI)
       ▼
  [Phase 1: Complete Foundation & Admin Reference Baseline]
       │ (Org profile edit, authz alignment, Employee/Party separation, 1,541-commune catalogue,
       │  retirement of dual ProjectCustomer name columns after migration rehearsal)
       ▼
  [Pre-Phase 2 Prerequisite: Document Links K-Min]
       │ (Explicit entity attachment table/refs for Contracts, Reservations, Milestones, Parties + archive)
       ▼
  [Phase 2: Legal Contracts & Commitments (Module F)] ◄─── Algerian Legal/Notarial Sign-Off
       │ (Statutory Reservation 11-04, VSP 13-431, Acte Notarié)
       │
       ├──► [Phase 3A: DZD Installments, Collections & Treasury (Module G)] ◄─── Fiscal/CPA Sign-Off
       │
       └──► [Phase 3B: Construction Works & Chantier (Module H)] ──► [Phase 3C: Procurement & Stock (I)]
                   │                                                           │
                   └───────────────────────────┬───────────────────────────────┘
                                               ▼
                         [Phase 4: Algerian SCF Accounting & Tax Engine (Module J)] ◄─── CPA/SCF Sign-Off
                                               │
                                               ▼
                         [Phase 5: Full Cross-Module Archival (K-Full) & Executive Reporting (L)]
```

---

## 2. Detailed Phased Roadmap

### Phase 0 — Immediate Stabilization *(BLOCKED / CRITICAL PATH)*
- **Objective:** Return `src/PromoGest.sln` and GitHub Actions CI (`ci.yml`) from the broken PR #34 baseline (`ec8769a5f778429cad0fec8f35d59f84f93b049d`, CI Run `43710844749`) to a 100% verified green state without expanding feature scope.
- **Concrete Scope:**
  1. Fix `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs:1072` (`CS7036` missing `PartyConcurrencyStamp` argument on `UpdateProjectCustomerRequest`) and add end-to-end tests for `PartiesController` (`GET /api/parties`, `PUT /api/parties/{id}`).
  2. Fix C2 `PartyDirectoryService` defects (`previousKind` captured before mutation, missing `ACCESS_DENIED` audit log entry, review `parties.identity.manage` business role grants, and establish clean single-authority synchronization for `Party` ↔ `ProjectCustomer` `DisplayName` / `Kind`).
  3. Add dedicated `Domain.Tests` & `Application.Tests` for `ProjectDocumentService` and `ProjectSalesReservationService`.
  4. Bring `apps/local-web/dev-api-middleware.ts` into parity with backend (6 missing permissions, Wilaya `01–69` setup regex, `/documents`, `/customers`, `/reservations`, `/parties`).
- **Exit Gate:** `dotnet build src/PromoGest.sln`, all unit/app tests, `PostgresEndToEndTests` against PG18, Windows publish job, and frontend checks 100% green in CI (see [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md)).

### Phase 1 — Foundation Hardening & Organization Master Data
- **Objective:** Close remaining `PARTIALLY_IMPLEMENTED` items in Modules A, C, D and fulfill ADRs `0009` & `0010`.
- **Concrete Scope:**
  - Implement audited `PUT /api/organization` (`org.manage`) in backend + editable `OrganizationProfileView.tsx`.
  - Reconcile `projects.structure.manage` permission check with `ProjectMember.CanManageConstruction` in `ProjectStructureService` (and align `files.write` / `ProjectManager` rules cleanly).
  - Execute a dedicated, tested migration retiring legacy duplicate identity columns/indexes on `project_customers` (`display_name`, `normalized_display_name`, `customer_type`, `ux_project_customers_project_name_phone`) once all consumers read/write canonical `parties` cleanly, **accompanied by rollback tests and backup/restore verification**.
  - Introduce `Employee` entity linked optionally to natural-person `Party` and `User` (ADR-0009), typed `PartyContactPoint` / protected `PartyIdentifier`, and human-approved manual `Party` merge workflow.
  - Deploy server-owned versioned `AdministrativeUnit` catalogue (69 Wilayas + verified 1,541 communes with effective dates per ADR-0010, preserving legacy snapshots).
- **Parallelizable Work:** Organization profile update and `AdministrativeUnit` catalogue can proceed in parallel with `Employee` modeling once Phase 0 passes.

### Pre-Phase 2 Prerequisite — Minimum Document Capabilities (`K-Min`)
- **Resolves Module F ↔ Module K Dependency Conflict:** Full enterprise archival does **not** block Phase 2, **but** Module F (Contracts) and Module H (Chantier Evidence) cannot launch without a verified minimal document-attachment baseline:
  1. Explicit entity attachment associations (`StoredFile` / `document_links`) binding local SHA-256 files cleanly to `ProjectSalesReservation`, future Legal Contracts, Construction Milestones, Payment Receipts, and Party KYC files.
  2. Document metadata edit/soft-archive lifecycle (preserving immutable storage files and audit trail).
  3. Authorization isolation ensuring confidential KYC/notarial files enforce file-read/write scopes independently of general CRM listings.

### Phase 2 — Legal Contracts & Commitments (Module F)
- **Prerequisite Gate:** Phase 0 + Phase 1 + **K-Min** verified **AND** qualified Algerian notarial/real-estate legal review (Law 11-04, Decree 13-431, FGCMPI rules).
- **Scope:** Strict separation of three legal contract instruments downstream from `ProjectSalesReservation` (Internal Unit Hold):
  - **Statutory Reservation Contract (`StatutoryReservationContract`):** Law 11-04 Art. 27/32/33, FGCMPI escrow account in reserver's name, buyer-default 15% retention path & judicial notices.
  - **VSP Contract (`VspContract`):** Law 11-04 Art. 28/30/34–39 & Decree 13-431, FGCMPI guarantee prerequisite (Art. 42, 54–55), Art. 36 construction-finance eligibility review, buyer shares, versioned milestone schedule, addenda (`ContractVersion`).
  - **Completed Property Sale / *Acte Notarié* (`FinalSaleDeed`):** Law 11-04 Art. 25/33, notary deed reference, publicity registration, contradictory delivery/possession minute.

### Phase 3 — Operational Execution (Parallel Streams 3A, 3B, 3C)
Once Phase 2 Legal Contracts and Phase 1 Party roles are verified, operational streams may run in parallel:
- **Stream 3A — Installments, Collections & Treasury in DZD (Module G):**
  - Requires Fiscal/CPA sign-off on collection event vs escrow treatment.
  - Implements `PaymentObligation / Installment`, `PaymentReceipt` (explicit promoter cash/bank receipts separated from FGCMPI escrow), `PaymentAllocation`, cashboxes/bank accounts, bounced check / `Refund / Reversal`, and customer statements.
- **Stream 3B — Construction Works & Chantier Tracking (Module H):**
  - Implements project technical lots, contractor/subcontractor engagements (`Party`), physical measurements (*attachements*), `ConstructionMilestoneEvidence` (explicit acceptance workflow triggering VSP due events), interim situations (*décomptes*), and warranty retentions.
- **Stream 3C — Procurement, Suppliers & Inventory (Module I):** *(starts after Supplier `Party` + Project Lots)*
  - Purchase requisitions, POs, site delivery notes, stock ledger (`IN`/`OUT`/`TRANSFER`), and supplier invoice verification prior to treasury payout.

### Phase 4 — Algerian SCF Accounting & Tax Engine (Module J)
- **Prerequisite Gate:** Modules G, H, and I producing immutable validated business events **AND** signed-off Algerian *Expert-Comptable / Commissaire aux Comptes* mapping rules (SCF Classes 1–7, Finance Law 2025 Art. 59 collection-based VAT, Finance Law 2026 Art. 53 9%/19% TVA rates).
- **Scope:** `TaxEvent` separation (explicit rate/basis/collection trigger), double-entry balanced `ScfJournalEntry` ledger (`Debit == Credit`), automated posting from approved business events (never from internal holds or drafts), fiscal periods & closing locks, non-destructive reversals (*extourne*).

### Phase 5 — Full Enterprise Document Archival & Executive Reporting (`K-Full` + Module L)
- **Scope:** Expand **K-Full** across all remaining entities (accounting, procurement, HR, treasury), automated retention & archival storage verification packs; deliver offline PDF/XLSX/CSV reporting packs for commercial inventory, collection aging, chantier cost variance, and SCF trial balances.

---

## 3. Top Program Risks & Mitigations

| Risk | Severity | Impact | Mitigation |
|---|---|---|---|
| **Building new modules on top of broken PR #34 CI baseline (`CS7036`)** | High | Failing CI builds (`43710844749`), unverified C2 audit/sync bugs | Freeze new module work until Phase 0 passes `G1–G10` in CI ([DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md)). |
| **Hardcoding unverified Algerian tax/VSP rules** | High | Legal non-compliance (wrong TVA 9%/19% split, Art. 36 misinterpretation, wrong cancellation retention) | Mandatory practitioner sign-off gate ([DECISION-LOG.md](DECISION-LOG.md)) before coding Phases 2, 3A, 4. |
| **Conflating Internal Holds, Escrow Advances, Receipts, Tax & SCF Postings** | High | Corrupted treasury cash, unlawful VSP billing, double VAT/journal posting | Enforce separate event entities and idempotent cross-module financial event architecture ([MODULE-CATALOG.md](MODULE-CATALOG.md)). |
| **Divergent Preview vs Production API behavior** | Medium | False confidence in preview vs ASP.NET Core | Enforce Phase 0 preview parity checklist; run real ASP.NET Core + PostgreSQL in local Cloud SQL dev (`scripts/dev-with-local-api.sh`) and CI. |
| **Dual `Party`/`ProjectCustomer` name columns causing stale constraints** | Medium | Divergent names across projects or false duplicate rejections | Keep `parties` as sole canonical identity owner (`DECISION-LOG.md`); retire duplicate columns via dedicated tested migration in Phase 1. |
| **Operational loss from unverified backups** | High | Unrecoverable local server disk/DB failure | Scheduled `pg_dump` + SHA-256 storage backup & CI/local restore verification drills ([DATA-AND-LOCAL-DEPLOYMENT.md](DATA-AND-LOCAL-DEPLOYMENT.md)). |
