# PROMO GEST — Master Execution Roadmap

**Design Principle:** Strictly dependency-ordered stages with mandatory verification gates between stages. **Zero downstream financial or accounting module may start before upstream security, Party/Customer consistency, and PG18 integration verification pass.**

---

## 1. Program Stages & Dependency Chain

```text
  [Phase 0: Immediate Stabilization]
       │ (Fix CS7036, C2 Party defects, preview parity, PG18 green CI)
       ▼
  [Phase 1: Complete Foundation & Admin Reference Baseline]
       │ (Org profile edit, authz alignment, Employee/Party separation, 1,541-commune catalogue)
       ▼
  [Phase 2: Contracts & Regulated VSP Commitments (Module F)] ◄─── Legal Sign-Off Gate
       │
       ├──► [Phase 3A: DZD Installments, Collections & Treasury (Module G)] ◄─── Fiscal Sign-Off
       │
       └──► [Phase 3B: Construction Works & Chantier (Module H)] ──► [Phase 3C: Procurement & Stock (I)]
                   │                                                           │
                   └───────────────────────────┬───────────────────────────────┘
                                               ▼
                         [Phase 4: Algerian SCF Accounting & Tax Engine (Module J)] ◄─── CPA/SCF Gate
                                               │
                                               ▼
                         [Phase 5: Polymorphic Document Links & Executive Reporting (K + L)]
```

---

## 2. Detailed Phased Roadmap

### Phase 0 — Immediate Stabilization *(BLOCKED / CRITICAL PATH)*
- **Objective:** Return `src/PromoGest.sln` and PostgreSQL 18 integration tests to a verified green baseline without expanding feature scope.
- **Concrete Scope:**
  1. Fix `PostgresEndToEndTests.cs:1072` (`CS7036` missing `PartyConcurrencyStamp`) and add end-to-end tests for `PartiesController` (`GET /api/parties`, `PUT /api/parties/{id}`).
  2. Fix C2 `PartyDirectoryService` defects (`previousKind` mutation order, missing `ACCESS_DENIED` audit entry, role assignment review for `parties.identity.manage`, and `Party` ↔ `ProjectCustomer` `DisplayName` synchronization or column deprecation).
  3. Add dedicated `Domain.Tests` & `Application.Tests` for `ProjectDocumentService` and `ProjectSalesReservationService`.
  4. Bring `apps/local-web/dev-api-middleware.ts` into parity with backend (6 missing permissions, Wilaya `01–69` regex, `/documents`, `/customers`, `/reservations`, `/parties`).
- **Exit Gate:** `dotnet build src/PromoGest.sln`, all unit/app tests, `PostgresEndToEndTests` on PG18, and frontend checks 100% green.

### Phase 1 — Foundation Hardening & Organization Master Data
- **Objective:** Close remaining `PARTIALLY_IMPLEMENTED` items in Modules A, C, D and fulfill ADRs `0009` & `0010`.
- **Concrete Scope:**
  - Implement audited `PUT /api/organization` (`org.manage`) in `Setup`/`Organization` controller & `OrganizationProfileView.tsx`.
  - Reconcile `projects.structure.manage` permission check with `ProjectMember.CanManageConstruction` in `ProjectStructureService`.
  - Introduce `Employee` entity linked optionally to `Party` and `User` (ADR-0009), plus controlled duplicate-review & human-approved `Party` merge workflow.
  - Deploy server-owned versioned `AdministrativeUnit` catalogue (69 Wilayas + verified 1,541 communes with effective dates per ADR-0010, preserving legacy snapshots).
- **Parallelizable Work:** Organization profile update and `AdministrativeUnit` catalogue can proceed in parallel with `Employee` modeling once Phase 0 passes.

### Phase 2 — Contracts & Legal Commitments (Module F)
- **Prerequisite Gate:** Phase 0 + Phase 1 (`Party` & `ProjectSalesReservation` verified) **AND** qualified Algerian notarial/real-estate legal review (Law 11-04, Decree 13-431, FGCMPI rules).
- **Scope:** `SaleContract` (VSP and *Acte Notarié* types), reservation-to-contract conversion (`Reserved -> ConvertedToContract` and `PropertyUnit: Reserved -> Sold`), buyer co-ownership shares, notarial reference, FGCMPI guarantee certificate, controlled cancellation/transfer with audit.

### Phase 3 — Operational Execution (Parallel Streams 3A, 3B, 3C)
Once `SaleContract` (Phase 2) and `Party` roles (Phase 1) exist, two major streams can run in parallel:
- **Stream 3A — Installments, Collections & Treasury in DZD (Module G):**
  - Decree 13-431 VSP milestone payment plans, custom payment schedules, DZD payment receipts (*espèces* legal cap checks, *chèque*, *virement*), cashboxes & bank accounts, bounced-check reversal, customer statement of account.
- **Stream 3B — Construction Works & Chantier Tracking (Module H):**
  - Project technical lots, subcontractor engagements (`Party`), physical progress measurements (*attachements*), interim payment situations (*décomptes*), warranty retentions (*retenue de garantie*), and cross-check linking physical milestones to VSP contractual billing stages.
- **Stream 3C — Procurement, Suppliers & Inventory (Module I):** *(starts after Supplier `Party` + Project Lots)*
  - Purchase requests, POs, site delivery notes, stock movements, and supplier invoice verification before treasury payout.

### Phase 4 — Algerian SCF Accounting & Tax Engine (Module J)
- **Prerequisite Gate:** Modules G, H, and I producing immutable validated business events **AND** signed-off Algerian *Expert-Comptable / Commissaire aux Comptes* mapping rules (SCF Classes 1–7, Finance Law 2025 Art. 59 collection-based VAT, Finance Law 2026 Art. 53 9%/19% TVA rates).
- **Scope:** Double-entry balanced ledger, automated journal posting rules, fiscal periods & closing locks, VAT/IBS/TAP declarations support, non-destructive reversal entries (*extourne*).

### Phase 5 — Polymorphic Documents & Executive Reporting (Modules K + L)
- **Scope:** Expand `project_documents` / vault linking to `SaleContract`, `PaymentReceipt`, `WorkProgressSituation`, `Party` KYC files; build offline PDF/XLSX/CSV reporting packs for commercial inventory, collection aging, chantier cost variance, and SCF trial balances.

---

## 3. Top Program Risks & Mitigations

| Risk | Severity | Impact | Mitigation |
|---|---|---|---|
| **Unverified C2 drift reaching further development** | High | Broken CI (`CS7036`), silent audit bugs, stale customer names | Freeze new module work until Phase 0 clears every C2 defect and PG18 CI passes. |
| **Hardcoding unverified Algerian tax/VSP rules** | High | Legal non-compliance (wrong TVA 9%/19% split, wrong Law 11-04 retention) | Mandatory practitioner sign-off gate ([DECISION-LOG.md](DECISION-LOG.md)) before coding Phases 2, 3A, 4. |
| **Divergent Preview vs Production API behavior** | Medium | False confidence in AI Studio preview vs ASP.NET Core | Enforce Phase 0 parity checklist & shared validation expectations. |
| **Dual `Party`/`ProjectCustomer` source of truth** | Medium | Divergent buyer identity on contracts/receipts | Designate `parties` as sole canonical identity fields in Phase 0/1 and deprecate redundant `project_customers` copies cleanly. |
| **Operational loss from unverified backups** | High | Unrecoverable local server disk/DB failure | Maintain scheduled `pg_dump` + SHA-256 file backup & automated restore verification drills ([DATA-AND-LOCAL-DEPLOYMENT.md](DATA-AND-LOCAL-DEPLOYMENT.md)). |
