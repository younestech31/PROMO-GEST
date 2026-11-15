# PROMO GEST — Product Milestones & Delivery Roadmap

**Document Role:** Dependency-ordered delivery roadmap for PROMO GEST.  
**Baseline Anchor:** Source code commit `2eee4771f2e5de23809e1b5fcf5a559c6ad48994`, CI Runs `43710844749` & `43713215866`.

---

## 1. Phased Delivery Sequence

| Phase | Module Scope | Status | Primary Gate Requirements |
|---|---|---|---|
| **Phase 0** | Stabilization & Baseline Correction | `IN_PROGRESS` *(Blocked by CS7036)* | Fix `CS7036` in `PostgresEndToEndTests.cs:1072`, resolve C2 audit/sync gaps, achieve 100% green CI across all jobs (`frontend`, `backend-and-postgres`, `windows-publish-and-powershell`). |
| **Phase 1** | Foundation Completion & Master Data | `PLANNED` | Implement `PUT /api/organization`, align structure authorization, complete `Party` vs `ProjectCustomer` migration & separation, versioned 69-Wilaya / commune catalogue (`ADR-0010`). |
| **Phase 2** | Contracts, Legal Deeds & **K-Min** | `PLANNED` | Law 11-04 Statutory Reservation & VSP Contracts, `ContractVersion`, `K-Min` structured `DocumentLink` attachments, **Qualified Algerian Legal/Notarial Sign-Off**. |
| **Phase 3A** | DZD Installments, Collections & Treasury | `PLANNED` | Versioned `PaymentObligation`, confirmed receipts (cashbox/bank/check separate from FGCMPI escrow), allocations, refunds/reversals. |
| **Phase 3B / 3C** | Chantier Works & Procurement / Stock | `PLANNED` | Work lots, contractor agreements, *attachements*, *décomptes*, `ConstructionMilestoneEvidence`, supplier directory, POs, warehouse stock ledger. |
| **Phase 4** | Algerian SCF Accounting & Tax Engine | `PLANNED` | SCF Classes 1–7 accounts, balanced journals (`Debit == Credit`), fiscal periods/locks, `TaxEvent` tracking (Finance Laws 2025/2026), **Qualified Algerian CPA Sign-Off**. |
| **Phase 5** | Executive Reporting & **K-Full** Archiving | `PLANNED` | Commercial pipelines, arrears aging, trial balances, enterprise-wide archival, legal holds, cold storage bundle export (`G1–G10`). |

---

## 2. Stage Transition Rules

- **Zero Phase Skip:** No module in Phase 2–5 may begin coding until all acceptance gates (`G1–G10`) for Phase 0 and Phase 1 pass successfully with objective test and CI evidence.
- **Practitioner Sign-Offs:** Legal and tax modules (Phases 2, 3A, 4) require formal written or documented practitioner sign-off before implementation.
