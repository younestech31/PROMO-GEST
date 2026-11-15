# PROMO GEST — Product Milestones & Delivery Roadmap

**Document Role:** Dependency-ordered delivery roadmap and execution control for PROMO GEST.  
**Audited Source Baseline:** `6bbd97f70ed0fb63cf226a1117cf6e83c359d2be` (PR #44 merge).  
**Latest Green CI:** GitHub Actions Run **#526** / `43743107914` — all three jobs passed on 15 November 2026.  
**Product Rule:** Deliver complete, secure business workflows in dependency order. Do not let isolated defects, cosmetic changes, or technical administration work displace the ERP product vision.

---

## 1. Phased Delivery Sequence

| Phase | Module Scope | Status | Primary Gate Requirements |
|---|---|---|---|
| **Phase 0** | Stabilization, runtime proof, and baseline correction | `IN_PROGRESS` | Main CI #526 is green. The owner confirmed the real Google AI Studio development server/API and PostgreSQL development connection operate, and the reported customer/prospect and reservation page errors are resolved after PR #44. Remaining: manual browser review of principal workflows in Arabic RTL and French LTR and focused regression verification. Keep evidence-backed documentation synchronized as each subsequent change is completed. Keep the Vite-only simulator separate from real-API evidence. |
| **Phase 1** | Foundation completion, master data, and product navigation alignment | `PLANNED` | Implement organization profile editing; align structure authorization; retire transitional `project_customers` identity mirrors through reviewed migration/backfill/rollback; complete versioned official 69-Wilaya / commune reference data under ADR-0010. Review and approve the organization workspace → project switcher → active project workspace model before broad navigation implementation. |
| **Phase 2** | Contracts, legal deeds, and **K-Min** | `PLANNED` | Complete K-Min metadata/archive/structured DocumentLink capabilities; implement distinct statutory reservation, VSP, and final notarial sale workflows with immutable ContractVersion; obtain qualified Algerian legal/notarial sign-off before encoding statutory rules. |
| **Phase 3A** | DZD installments, collections, and treasury | `PLANNED` | Versioned PaymentObligation schedules, confirmed cash/bank/check receipts, allocations, refunds/reversals, separation of promoter treasury from FGCMPI escrow, and qualified legal/accounting review. |
| **Phase 3B / 3C** | Construction works, procurement, and stock | `PLANNED` | Work lots, contractor agreements, site measurements and interim payment situations, accepted ConstructionMilestoneEvidence, supplier directory, purchase orders, and warehouse/site stock ledger. |
| **Phase 4** | Algerian SCF accounting and tax engine | `PLANNED` | SCF Classes 1–7, balanced journals (Debit = Credit), fiscal periods/locks, TaxEvent tracking, and qualified Algerian CPA sign-off. |
| **Phase 5** | Executive reporting and **K-Full** archiving | `PLANNED` | Commercial pipeline and arrears aging, construction/financial variance, trial balances, enterprise-wide archival, retention/legal holds, and verified export/restore controls. |

---

## 2. Current Execution Order — Do Not Skip

The next work is deliberately bounded. Do not start Phase 2–5 feature coding while Phase 0 and Phase 1 are incomplete.

1. **Finish Phase 0 evidence:** retain the user-confirmed AI Studio real-API smoke result; complete manual Arabic RTL and French LTR browser review across login, organization workspace, project selection, project workspace, structure, customer registry, and reservations. Verify real API persistence and authorization using fictional development data only.
2. **Complete the product-scope map:** map every existing screen and API workflow to its business purpose, module A–L, roadmap phase, implementation status, permissions, and dependencies. Separate operational work from technical administration. Record gaps without initiating unrelated rewrites.
3. **Approve navigation and information architecture:** review `PROJECT-NAVIGATION-UX.md` against the product vision and existing code. Confirm the organization workspace, explicit project switcher, active project workspace, and separate technical administration. Treat this as a bounded design/acceptance task, not an excuse for an unscoped redesign.
4. **Start Phase 1 only after Phase 0 gates pass:** deliver organization profile editing, structure authorization alignment, Party/ProjectCustomer mirror retirement, and versioned territorial reference data as individually reviewable vertical slices.
5. **Reassess release scope:** the exact first-production-release boundary remains a Product Owner decision. Do not assume that later legal/financial phases are included or excluded without a documented decision.

---

## 3. Stage Transition Rules

- **Zero Phase Skip:** No Phase 2–5 business implementation begins until all applicable `G1–G10` acceptance gates for Phase 0 and Phase 1 pass with objective test, CI, and browser evidence.
- **K-Min dependency:** Phase 2 and construction workflows must not proceed until required K-Min metadata lifecycle and structured attachment-link capabilities are completed and verified.
- **Legal and accounting sign-off:** Phases 2 and 3A require documented legal/notarial review where statutory contracts, FGCMPI, or payment obligations are involved. Phase 4 requires documented qualified Algerian CPA/tax review. Do not hard-code uncertain legal or tax interpretations.
- **No false completion:** A green CI proves only the checks it ran. User-confirmed page loading is a smoke check, not a complete end-to-end business workflow. Production installation, backup/restore, legal compliance, and RTL/LTR acceptance require their own evidence.
- **Vite simulator boundary:** The Vite-only in-memory simulator is for frontend-only work. Never use it to claim real API, PostgreSQL persistence, authentication, reservation, or customer workflow parity.
- **Product-first prioritization:** A task must map to a business workflow and an A–L module. Security, data-integrity, and release blockers are handled immediately; unrelated cosmetic or speculative improvements go to the backlog.
- **Branch and PR discipline:** No direct changes to `main`. Every coherent change uses a focused branch, reviewable PR, required passing CI, and synchronized canonical documentation.

---

## 4. Governance References

- [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) — product vision, scope, and architecture.
- [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) — audited implementation and verification evidence.
- [MODULE-CATALOG.md](MODULE-CATALOG.md) — domains A–L and current implementation boundaries.
- [PROJECT-NAVIGATION-UX.md](PROJECT-NAVIGATION-UX.md) — proposed organization/project navigation model.
- [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) — mandatory gates G1–G10 and practitioner sign-offs.
- [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md) — required engineering process.
