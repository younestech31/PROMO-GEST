# PROMO GEST — Product Milestones & Delivery Roadmap

**Document Role:** Dependency-ordered delivery roadmap and execution control for PROMO GEST.  
**Last Code-Changing Source Baseline:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59 merge; server-owned 69-Wilaya reference integration).  
**Main Commit Inspected:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`.  
**Latest Green Main CI:** Run **#581** / `43881240365` — all three jobs passed on main SHA `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (frontend 40/40; Domain 34/34; Application 20/20; PostgreSQL 18 Integration 30/30; restore drill; Windows x64).  
**Product Rule:** Deliver complete, secure business workflows in dependency order. Do not let isolated defects, cosmetic changes, or technical administration work displace the ERP product vision.  
**Notion Operating Roadmap:** [PROMO GEST — Master Roadmap & Operating Reference](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f) and [Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46) are the operational planning and task-status workspace. GitHub remains authoritative for code, technical requirements, decisions, migrations, and verification evidence. In a conflict, current repository source/tests/docs determine implementation truth; Notion determines the agreed work order. Keep both synchronized through focused PRs.

---

## 1. Phased Delivery Sequence

| Phase | Module Scope | Status | Primary Gate Requirements |
|---|---|---|---|
| **Phase 0** | Stabilization, runtime proof, and baseline correction | `COMPLETE` (owner-directed closure; D-010) | Product Owner explicitly closed Phase 0 on 16 November 2026 after attesting the principal bilingual desktop/mobile workflows. P0-A01 and P0-A04 remain `NOT_RUN` and are accepted residual exceptions, not passes. Supporting browser/version artifacts were not attached. This administrative closure authorizes Phase 1 only; it does not waive G1–G10 or production-release evidence. |
| **Phase 1** | Foundation completion, master data, and product navigation alignment | `IN_PROGRESS` | Organization profile editing, `projects.structure.manage`, Party canonical identity, retired ProjectCustomer identity mirrors, and the PostgreSQL 18 project/name/phone duplicate guard are implemented and verified (PRs #55–#57). PR #59 connects setup, organization and project Wilaya selectors to the server-owned versioned 69-Wilaya API. Remaining: reconcile and import the authoritative 1,541-commune hierarchy (still 0 loaded records) and complete the bounded organization workspace → project switcher → active project workspace design review before navigation implementation. |
| **Phase 2** | Contracts, legal deeds, and **K-Min** | `PLANNED` | Complete K-Min metadata/archive/structured DocumentLink capabilities; implement distinct statutory reservation, VSP, and final notarial sale workflows with immutable ContractVersion; obtain qualified Algerian legal/notarial sign-off before encoding statutory rules. |
| **Phase 3A** | DZD installments, collections, and treasury | `PLANNED` | Versioned PaymentObligation schedules, confirmed cash/bank/check receipts, allocations, refunds/reversals, separation of promoter treasury from FGCMPI escrow, and qualified legal/accounting review. |
| **Phase 3B / 3C** | Construction works, procurement, and stock | `PLANNED` | Work lots, contractor agreements, site measurements and interim payment situations, accepted ConstructionMilestoneEvidence, supplier directory, purchase orders, and warehouse/site stock ledger. |
| **Phase 4** | Algerian SCF accounting and tax engine | `PLANNED` | SCF Classes 1–7, balanced journals (Debit = Credit), fiscal periods/locks, TaxEvent tracking, and qualified Algerian CPA sign-off. |
| **Phase 5** | Executive reporting and **K-Full** archiving | `PLANNED` | Commercial pipeline and arrears aging, construction/financial variance, trial balances, enterprise-wide archival, retention/legal holds, and verified export/restore controls. |

---

## 2. Current Execution Order — Do Not Skip

The next work is deliberately bounded. Do not start Phase 2–5 feature coding while Phase 0 and Phase 1 are incomplete.

1. **Phase 0 closure (owner decision D-010):** retain the owner-attested PASS groups for P0-A02, P0-A03, P0-A05 and P0-B–G. Keep P0-A01 and P0-A04 visibly `NOT_RUN` as accepted residual exceptions; complete them before production release or any later gate that relies on those scenarios. Do not relabel them as passed.
2. **Product-scope map — completed as a documentation baseline:** [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md) records the current React screens, API-backed actions, module ownership, implementation states, and gaps from source inspection. Keep it synchronized with future UI/API changes; it is not manual browser acceptance.
3. **Bound navigation decision:** defer approval and implementation of `PROJECT-NAVIGATION-UX.md` to the Phase 1 design review. Keep the current UI intact in Phase 0; Phase 1 must first review the organization workspace, explicit project switcher, active project workspace, and separate technical administration as a bounded design task.
4. **Execute Phase 1 (IN_PROGRESS):** organization profile editing, `projects.structure.manage`, Party/ProjectCustomer identity separation, PostgreSQL duplicate prevention, and guard migration lifecycle regression tests are delivered and verified. PR #59 verifies the versioned 69-Wilaya reference endpoint and connects the relevant forms to it. Continue with the separately scoped official 1,541-commune data reconciliation/import and bounded product-navigation design review; do not treat the 69-Wilaya slice as completion of the commune catalogue.
5. **Reassess release scope:** the exact first-production-release boundary remains a Product Owner decision. Do not assume that later legal/financial phases are included or excluded without a documented decision.

---

## 3. Stage Transition Rules

- **Zero Phase Skip:** Phase 1 is authorized to proceed under D-010. No Phase 2–5 business implementation begins until applicable `G1–G10` acceptance gates for Phase 0 and Phase 1 pass with objective test, CI, and browser evidence; D-010 does not waive those gates.
- **K-Min dependency:** Phase 2 and construction workflows must not proceed until required K-Min metadata lifecycle and structured attachment-link capabilities are completed and verified.
- **Legal and accounting sign-off:** Phases 2 and 3A require documented legal/notarial review where statutory contracts, FGCMPI, or payment obligations are involved. Phase 4 requires documented qualified Algerian CPA/tax review. Do not hard-code uncertain legal or tax interpretations.
- **No false completion:** A green CI proves only the checks it ran. User-confirmed page loading is a smoke check, not a complete end-to-end business workflow. Production installation, backup/restore, legal compliance, and RTL/LTR acceptance require their own evidence.
- **Vite simulator boundary:** The Vite-only in-memory simulator is for frontend-only work. Never use it to claim real API, PostgreSQL persistence, authentication, reservation, or customer workflow parity.
- **Product-first prioritization:** A task must map to a business workflow and an A–L module. Security, data-integrity, and release blockers are handled immediately; unrelated cosmetic or speculative improvements go to the backlog.
- **Branch and PR discipline:** No direct changes to `main`. Every coherent change uses a focused branch, reviewable PR, required passing CI, and synchronized canonical documentation.

---

## 4. Notion Operating Control

The Product Owner established Notion as the operational reference for roadmap sequencing, priorities, dependencies, task ownership when explicitly assigned, and delivery tracking.

- Master operating roadmap: [Notion PROMO GEST — Master Roadmap & Operating Reference](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f).
- Execution task register: [Notion PROMO GEST — Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46).
- A Notion task is not implementation evidence. Mark it Done only after its acceptance criteria are met, the relevant PR is merged, required CI is green on the final commit, and manual/practitioner evidence is recorded where applicable.
- Never invent owners or due dates. Keep dependency-blocked tasks Blocked; do not bypass the phase sequence.
- Keep technical truth in the canonical repository suite. Every material roadmap/status change must be reconciled with GitHub docs and linked evidence.
- Current Notion baseline was created from main `20f2e043515bd5cb164ddb2ee3b4a195f0ab86ed`, code baseline `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`, CI #583 (docs-only commit) and CI #581 (application code baseline).

## 5. Governance References

- [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) — product vision, scope, and architecture.
- [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) — audited implementation and verification evidence.
- [MODULE-CATALOG.md](MODULE-CATALOG.md) — domains A–L and current implementation boundaries.
- [PROJECT-NAVIGATION-UX.md](PROJECT-NAVIGATION-UX.md) — proposed organization/project navigation model.
- [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md) — source-audited current UI surfaces and gaps; not browser acceptance.
- [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) — executable manual browser and real-API acceptance protocol; P0-A02, P0-A03, P0-A05 and P0-B–G are owner-attested `PASS`; P0-A01 and P0-A04 remain `NOT_RUN`.
- [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) — mandatory gates G1–G10 and practitioner sign-offs.
- [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md) — required engineering process.
