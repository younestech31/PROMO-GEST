# PROMO GEST — ERP Module Catalog (Domains A–L)

All 12 functional ERP domains required by PROMO GEST, mapped strictly using the 6-state taxonomy against actual inspected code, endpoints, and tests.

---

## Overview Matrix

| Code | Domain Name | Overall Status | Primary Dependencies |
|---|---|---|---|
| **A** | Organization, Governance & Administration | `PARTIALLY_IMPLEMENTED` | None (Foundation) |
| **B** | Real Estate Projects | `IMPLEMENTED_AND_VERIFIED` | Domain A |
| **C** | Physical Structure & Property Units | `IMPLEMENTED_AND_VERIFIED` *(minor authz/DELETE gaps)* | Domain B |
| **D** | Counterparties (Party), Customers & CRM | `PARTIALLY_IMPLEMENTED` / `IMPLEMENTED_NOT_VERIFIED` | Domains A, B |
| **E** | Commercial Operations & Reservations | `IMPLEMENTED_NOT_VERIFIED` | Domains B, C, D |
| **F** | Contracts, Commitments & Legal Deeds | `PLANNED` | Domains C, D, E, K |
| **G** | Installments, Collections & Treasury (DZD) | `PLANNED` | Domains D, F |
| **H** | Construction Works & Chantier Tracking | `PLANNED` | Domains B, D, K |
| **I** | Procurement, Suppliers & Inventory | `PLANNED` | Domains B, D, H |
| **J** | Algerian SCF Accounting & Tax | `PLANNED` | Domains A, F, G, H, I |
| **K** | Document Management & Archiving | `PARTIALLY_IMPLEMENTED` | Domain A, B *(polymorphic links planned)* |
| **L** | Reporting, Dashboards & Control | `PARTIALLY_IMPLEMENTED` | All active modules |

---

## Detailed Module Specifications

### A. Organization, Governance & Administration
- **Current Reality:**
  - *First-Run Wizard (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/setup/status`, `POST /api/setup/initialize`.
  - *Session Auth & CSRF (`IMPLEMENTED_AND_VERIFIED`):* `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, `GET /api/auth/csrf`.
  - *User & Role Management (`IMPLEMENTED_AND_VERIFIED`):* `GET/POST/PUT /api/users`, `/status`, `/reset-password`, `GET /api/users/roles`.
  - *Audit Trail (`IMPLEMENTED_AND_VERIFIED`):* `GET /api/audit`.
  - *Organization Profile Update (`PARTIALLY_IMPLEMENTED`):* `OrganizationProfileView.tsx` is read-only; no `PUT /api/organization` endpoint exists yet despite seeded `org.manage` permission.
  - *Offline CLI Recovery (`IMPLEMENTED_AND_VERIFIED`):* `--recover-admin`.
- **Target Scope:** Add audited organization profile updates (excluding immutable `singleton_key` and fiscal-history audit), session listing/revocation UI, and versioned Algerian Administrative Reference catalogue (69 Wilayas + verified 1,541 communes per ADR-0010).

### B. Real Estate Projects (`IMPLEMENTED_AND_VERIFIED`)
- **Current Reality:** `GET/POST /api/projects`, `GET/PUT /api/projects/{id}`, `GET/POST/DELETE /api/projects/{id}/members`. Dynamic `actualBuildingsCount`/`actualUnitsCount`, `ExpectedConcurrencyStamp` CAS conflict protection, last-PM guard, Wilaya `01–69`.
- **Target Scope:** Land parcel registry (*titre foncier / livret foncier*), building permit (*permis de construire*) and VSP authorization references linked to documents and legal jurisdiction effective dates.

### C. Physical Structure & Property Units (`IMPLEMENTED_AND_VERIFIED` with documented notes)
- **Current Reality:** `GET/POST/PUT` on `/api/projects/{id}/buildings`, `/buildings/{bId}/floors`, `/buildings/{bId}/floors/bulk`, `/floors/{fId}/units`, `/floors/{fId}/units/bulk`. Supports apartments, commercial premises, offices, parking, storage; `commercialStatus` (`Available`, `Reserved`, `Sold`, `Blocked`); `areaSqm`, `priceDzd`, `roomCount`, `orientation`.
- **Documented Gaps:** No DELETE endpoints by design; `ProjectStructureService` enforces `ProjectMember` capability `CanManageConstruction || ProjectManager` instead of checking `projects.structure.manage`.
- **Target Scope:** Controlled archiving/retirement of unused empty units, unit price-change audit history, annexes/parking bundling rules.

### D. Counterparties (Party), Customers & CRM (`PARTIALLY_IMPLEMENTED` / `IMPLEMENTED_NOT_VERIFIED`)
- **Current Reality:**
  - *Project Customer Registry (C1):* `GET/POST/PUT /api/projects/{id}/customers`, `GET/POST .../interactions`.
  - *Party Directory (C2 workspace changes):* `GET /api/parties`, `PUT /api/parties/{partyId}` (`parties` table + `ux_project_customers_project_party`). **Currently `IMPLEMENTED_NOT_VERIFIED` with `CS7036` compile failure in `PostgresEndToEndTests.cs` + 4 active defects** (see [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md)).
  - *Employee Master (`PLANNED`):* No `Employee` table yet (ADR-0009).
- **Target Scope:** Resolve C2 defects & synchronize `Party`/`ProjectCustomer` name sources; add duplicate-candidate review & human-approved merge (`ADR-0009`), Supplier/Subcontractor roles on `Party`, and `Employee` entity detached from `User`.

### E. Commercial Operations & Reservations (`IMPLEMENTED_NOT_VERIFIED`)
- **Current Reality:** `GET/POST/PUT /api/projects/{id}/reservations`, `/cancel`, `/expire`. Automatic unit status transition `Available -> Reserved` (blocked by `ux_reservations_active_unit` partial unique index if already `Active`) and release `Reserved -> Available` on cancellation/expiry.
- **Documented Gap:** No dedicated `Domain.Tests` / `Application.Tests` unit coverage; `PostgresEndToEndTests` blocked by `CS7036`; preview middleware lacks `/reservations` routes.
- **Target Scope:** Reservation fee voucher linkage, expiration batch/reminder job, and formal conversion workflow (`Reserved -> ConvertedToContract`).

### F. Contracts, Commitments & Legal Deeds (`PLANNED`)
- **Scope:** VSP (*Vente sur Plan*, Law 11-04 & Decree 13-431) and standard *Acte Notarié* sales contracts; FGCMPI guarantee bond tracking, notarial deed references, transfer/cancellation rules (including statutory retention & penalty caps pending legal sign-off).
- **Key Guardrail:** Unit status transitions to `Sold` only upon validated contract activation.

### G. Installments, Collections & Treasury in DZD (`PLANNED`)
- **Scope:** Decree 13-431 VSP milestone billing schedules (20% / 15% / 35% / 25% / 5% pending practitioner sign-off), custom contractual tranches, DZD receipt issuance (*versement bancaire*, *chèque*, *espèces* respecting legal cash limits), bank/cashbox journals, bounced check reversal, late-payment tracking, and customer statement of account.

### H. Construction Works & Chantier Tracking (`PLANNED`)
- **Scope:** Project technical lots (*gros œuvre*, CES, VRD), contractor/subcontractor engagements linked to `Party`, measured progress (*attachements*), interim payment certificates (*situations de travaux*), *retenue de garantie* (warranty retention), and physical progress vs VSP billing milestone validation.

### I. Procurement, Suppliers & Inventory (`PLANNED`)
- **Scope:** Supplier directory (`Party` role), purchase requisitions (*demandes d'achat*), POs (*bons de commande*), site delivery notes (*bons de réception*), warehouse/chantier stock ledger (`IN`/`OUT`/`TRANSFER`), and supplier invoice matching before treasury settlement.

### J. Algerian SCF Accounting & Tax (`PLANNED`)
- **Scope:** Standard Algerian *Système Comptable Financier* (SCF) chart of accounts (`Classes 1–7`), double-entry balanced journals (`Debit = Credit`), automatic posting from validated collections/situations/invoices, fiscal period close/lock, and statutory tax tracking (TVA 9% vs 19% separation per Finance Law 2026 Art. 53, collection-based VAT event per Finance Law 2025 Art. 59, IRG/IBS/TAP tracking — **all tax rules gated on qualified Algerian accountant sign-off**).

### K. Document Management & Archiving (`PARTIALLY_IMPLEMENTED`)
- **Current Reality (`IMPLEMENTED_NOT_VERIFIED`):** Project-scoped metadata (`project_documents`), local disk storage (`LocalFileStorageService`), SHA-256 verification on upload & download, `GET/POST/PUT/download/archive` endpoints.
- **Target Scope:** Polymorphic/explicit attachment references to Contracts, Reservations, Units, Parties (NIF/CNI/RC), Work Situations, and Payment Receipts; retention & physical backup reconciliation checks.

### L. Reporting, Dashboards & Control (`PARTIALLY_IMPLEMENTED`)
- **Current Reality:** Dynamic project unit/building counts (`ProjectsView.tsx`, `ProjectDashboard`), audit log filtering (`AuditLogView.tsx`).
- **Target Scope:** Commercial pipeline (available/reserved/sold m² & DZD), cash-collection aging & arrears, construction vs billing milestone variance, statutory SCF trial balance / general ledger exports (PDF/CSV/XLSX offline generation).
