# PROMO GEST — Product Milestones & Delivery Roadmap

**Document Role:** Dependency-ordered delivery roadmap for PROMO GEST.  
**Baseline Anchor:** Source code commit `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`, GitHub Actions CI #495 / `43720679970` (all three jobs successful).

---

## 1. Phased Delivery Sequence

| Phase | Module Scope | Status | Primary Gate Requirements |
|---|---|---|---|
| **Phase 0** | Stabilization & Baseline Correction | `IN_PROGRESS` *(main CI and C2 fixes verified; preview/manual UX validation remains)* | Keep all CI jobs green; verify the actual ASP.NET Core API path in AI Studio with configured `ASPNETCORE_URL` / development database; inspect Arabic RTL and French LTR workflows; keep the Vite-only simulator separate from production API claims. The former `CS7036` and C2 audit/sync defects are resolved in PRs #35–#38. |
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
