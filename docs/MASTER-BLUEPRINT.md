# PROMO GEST — Master Engineering Blueprint

**Document Role:** Single authoritative index & master entry point for the PROMO GEST local-first real estate developer ERP (*promoteur immobilier* — Algeria).  
**Last ASP.NET Core API/Application Runtime Source:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87 merge; P1-07 financial-document read authorization and list-denial audit). PR #87 added no EF migration; **EF/schema source remains** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f` (PR #59).
**Latest Frontend Architecture Source:** `bf8a47c1cd334ec94807c727c79d10f40f20be7f` (PR #82 merge; PR #81 canonical frontend platform and PR #82 active module-boundary import analysis).  
**Latest Test-Source Commit:** PR #87 final head `8dc81b0bc74629d125c01f2549caec1370bd2ec1` (financial-document read authorization and list-denial audit tests); PR CI #766 passed all three jobs.
**Most recent code-bearing Main commit inspected:** `b41d34aae03e1549ca1963a23d92643ff91bf393` (PR #87; PRs #91–#94 after it were documentation-only).
**Latest main CI:** Run #795 / [44168633237](https://github.com/younestech31/PROMO-GEST/actions/runs/44168633237) passed all three jobs on post-PR-94 main SHA `0413556195d0e0fc85265d1a9081c1640e5da8a9`; frontend 79/79 tests, .NET 10/PostgreSQL 18 Domain 34/34, Application 21/21, Integration 32/32, full restore drill, Windows x64 publish and PowerShell validation. The Vite chunk-size warning was observed in earlier CI #735, not reported as a failure; manual RTL/LTR browser acceptance remains outstanding.
**Governing Charter:** Local-first, on-premises per organization, PostgreSQL 18 single source of truth, single System Administrator (`SYSTEM_ADMIN`), HTTP-only `SameSite=Strict` cookie sessions (`promogest_session`) + CSRF, local filesystem storage with SHA-256 verification, Arabic RTL primary / French LTR secondary, Algerian DZD & legal context.

---

## 0. Operational Roadmap Reference

Notion is the operational workspace for delivery order, priorities, dependencies, and task progress:
- [PROMO GEST — Master Roadmap & Operating Reference](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f)
- [PROMO GEST — Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46)

GitHub `docs/`, source code, migrations, tests, and CI remain the authoritative technical evidence. A Notion status never upgrades an implementation state without linked repository and acceptance evidence. Reconcile both systems on every roadmap-affecting PR.

## 1. Unified 6-State Status Taxonomy

Every claim across this blueprint uses **strictly one** of the six evidence-backed states below:

| State | Meaning |
|---|---|
| `IMPLEMENTED_AND_VERIFIED` | Code exists end-to-end **and** passed automated tests/verification in the current repository baseline without failing build dependencies. |
| `IMPLEMENTED_NOT_VERIFIED` | Code exists in the workspace, but automated build/integration/E2E verification failed, is missing, or could not run (e.g., broken test compilation, unexecuted PG18 CI verification, or missing runtime coverage). |
| `PARTIALLY_IMPLEMENTED` | Part of the module/feature exists (e.g., backend or UI or schema only, or preview/API drift, or missing CRUD/edit endpoints). |
| `PLANNED` | Designed and scoped in architecture/roadmap docs, with no production implementation in `src/` or `apps/local-web/`. |
| `BLOCKED` | Cannot move to `IMPLEMENTED_AND_VERIFIED` until a specific defect, external legal/practitioner validation, or prerequisite gate is resolved. |
| `DEPRECATED` | Legacy document, transitional pattern, or superseded behavior retained only for compatibility and scheduled for retirement after transition. |

> **Constitutional Rule:** No module or sub-feature is ever labeled `IMPLEMENTED_AND_VERIFIED` without verified source code **and** passing test execution in the audited state (see [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md)).

---

## 2. Canonical Blueprint Suite (`docs/`)

| # | Document | Purpose & Scope |
|---|---|---|
| 1 | [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) | This master index, executive product vision, product scope boundaries, completion scorecard, and navigation map. |
| 2 | [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) | Evidence-backed application/test source baselines, current main/CI anchor, merged C2 corrections, owner-attested Phase 0 workflows, transitional Party mirrors, and AI Studio preview boundaries. |
| 3 | [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | Clean/Layered dependency graph, modular monolith boundaries, HTTP middleware pipeline, and SPA hosting model. |
| 4 | [DOMAIN-MODEL.md](DOMAIN-MODEL.md) | Authoritative schema matching `AppDbContextModelSnapshot.cs` & migrations, Party vs ProjectCustomer separation, concurrency, and planned contract/financial models. |
| 5 | [MODULE-CATALOG.md](MODULE-CATALOG.md) | All 12 ERP domains (**A–L**) mapped from current implementation through target contracts, K-Min vs K-Full document split, Algerian contract types, and unified financial event flow. |
| 6 | [MASTER-ROADMAP.md](MASTER-ROADMAP.md) | Dependency-ordered phased roadmap, parallelizable vs gated streams, stage transition gates, and program risks. |
| 7 | [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md) | `Pbkdf2PasswordHasher` (PBKDF2-SHA512), `promogest_session`, 18 permissions × 7 seeded roles classified by actual API/UI enforcement, resource scoping, SoD, and audit controls. |
| 8 | [DATA-AND-LOCAL-DEPLOYMENT.md](DATA-AND-LOCAL-DEPLOYMENT.md) | Local PG18 3-role topology, Data Protection (Windows DPAPI / Linux PKCS#12), Caddy LAN HTTPS, backup/restore drills, offline boundary, and Cloud SQL non-prod isolation. |
| 9 | [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) | Mandatory per-module acceptance gates (`G1–G10`) and practitioner legal/CPA sign-off gates. |
| 10 | [DECISION-LOG.md](DECISION-LOG.md) | Consolidated ADRs `0001–0010`, Party/ProjectCustomer canonical ownership decision, password-hashing policy, CI run records, practitioner sign-off register, and drift log. |
| 11 | [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md) | Mandatory pre-work, in-development, post-development, and Definition-of-Done governance preventing architectural drift. |
| 12 | [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) | Complete traceability matrix linking functional requirements across Domains **A–L** to code, endpoints, permissions, views, tests, and gates. |
| 13 | [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md) | Source-audited inventory of current React screens, API-backed actions, module status, navigation gaps, and Phase 0/1 UI boundaries. |
| 14 | [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) | Executable browser/real-API acceptance protocol for Phase 0; records Product Owner-attested PASS groups separately from CI, the owner-directed closure decision, and residual P0-A01/P0-A04 exceptions. |

---

## 3. Existing Specialized Reference Documents (Preserved & Cross-Linked)

- **Legal & Regulatory Baseline:** [ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md) (Law 11-04, Executive Decree 13-431, FGCMPI, Finance Laws 2025/2026)
- **Territorial & Administrative Data:** [ALGERIAN-REFERENCE-DATA.md](ALGERIAN-REFERENCE-DATA.md), [REFERENCE-DATA-GOVERNANCE.md](REFERENCE-DATA-GOVERNANCE.md) (Law 26-06, Decrees 26-206 & 26-208, Wilayas 01–69)
- **Operations & Install:** [INSTALLATION.md](INSTALLATION.md), [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md), [OFFLINE-OPERATION.md](OFFLINE-OPERATION.md)
- **Non-Production Dev Tooling:** [GOOGLE-AI-STUDIO-PREVIEW.md](GOOGLE-AI-STUDIO-PREVIEW.md), [GOOGLE-AI-STUDIO-CLOUD-SQL.md](GOOGLE-AI-STUDIO-CLOUD-SQL.md)
- **Navigation UX & Historical Audits:** [PROJECT-NAVIGATION-UX.md](PROJECT-NAVIGATION-UX.md), [FOUNDATION-AUDIT-2026-11.md](FOUNDATION-AUDIT-2026-11.md)
- **ADR Directory:** [ADR/0001](ADR/0001-local-first-self-hosted-architecture.md) through [ADR/0010](ADR/0010-versioned-algerian-administrative-reference-data.md)
- **Legacy Overviews (Superseded for Status/Schema by the 12 Canonical Docs Above):** [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE-DESIGN.md](DATABASE-DESIGN.md), [SECURITY.md](SECURITY.md), [ROADMAP.md](ROADMAP.md), [ERP-MODULE-ARCHITECTURE.md](ERP-MODULE-ARCHITECTURE.md), [PARTY-MASTER-DATA.md](PARTY-MASTER-DATA.md)

---

## 4. Product Vision & Completion Overview

**PROMO GEST** is an integrated on-premises ERP for Algerian real estate developers (*promoteurs immobiliers*), covering the full enterprise lifecycle on customer hardware:

1. **Governance & Security Core:** Single-organization installation wizard, single System Administrator (`SYSTEM_ADMIN`), 7 seeded RBAC roles, explicit project-scoped membership, immutable PostgreSQL audit trail.
2. **Real Estate Portfolio & Unit Inventory:** Projects (`projects`), physical hierarchy (`buildings` → `building_floors` → `property_units`), commercial statuses, DZD estimated budgets, and verified SHA-256 local files (`stored_files`).
3. **Counterparties (Party), CRM & Holds:** Organization-wide `parties` identity (`id`, `party_kind`, `display_name`), project-scoped `project_customers` & `customer_interactions`, and internal lot/unit holds (`project_sales_reservations`), cleanly separated from future Statutory Reservation Contracts, VSP / *Acte Notarié* sales contracts, regulated payment milestones, and DZD collections.
4. **Execution, Accounting & Statutory Compliance:** Works/construction tracking (lots, contractor situations, FGCMPI/legal compliance), suppliers/inventory, **Algerian SCF (Système Comptable Financier)** journal generation, VAT/IBS/TAP/IRG tax tracking (Finance Laws 2025/2026 gated on qualified accountant review), and local reporting.

### High-Level Program Status Snapshot (Main Merge Baseline: `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; latest main CI #730)

| Layer / Domain | Current State | Verification Evidence |
|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #581: **34/34** Domain tests passed |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #581: **20/20** Application tests passed |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 and #55–#57 merged; canonical Party ownership, retired ProjectCustomer identity mirrors, PostgreSQL project/name/phone uniqueness, concurrent duplicate rejection, Party rename protection, fail-closed preflight, and migration Down/reapply are covered by PostgreSQL 18 tests |
| PostgreSQL 18 Integration Suite (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | Main CI #581: **30/30** PostgreSQL 18 integration tests passed, including the public 69-Wilaya reference endpoint contract; full database/storage/Data Protection restore drill passed |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | Post-merge main CI #730: strict TypeScript, **68/68** frontend tests, production Vite and ASP.NET Core `wwwroot` builds pass; .NET 10/PostgreSQL 18 and Linux/Windows jobs also pass. Manual Arabic RTL/French LTR acceptance for the current navigation shell remains outstanding; P0-A01 and P0-A04 remain `NOT_RUN`. Vite-only simulator remains non-production tooling. |
| Algerian administrative reference — Wilaya subset | `IMPLEMENTED_AND_VERIFIED` | Main CI #581 verifies the server-owned versioned 69-Wilaya endpoint and frontend/preview consumption by first-run setup, organization profile and project create/update forms. The endpoint explicitly reports `communesCount = 0` and `PendingOfficialVerification`; the 1,541-commune hierarchy is not yet implemented. |
| Organization Profile Edit (`PUT /api/organization`) | `IMPLEMENTED_AND_VERIFIED` | `OrganizationController` (`PUT /api/organization`), `OrganizationProfileService`, `OrganizationProfileView.tsx`, `org.manage` enforcement, and CAS `ExpectedConcurrencyStamp` conflict tests verified in `PostgresEndToEndTests` |
| Modules F–J (Contracts, DZD Finance/Installments, Works/Chantier, Procurement/Stock, SCF Accounting) | `PLANNED` | Bilingual presentation shells and metadata exist; no production business workflows or persistence. Reporting (L) remains `PARTIALLY_IMPLEMENTED`: live project/audit summaries exist while report-generation endpoints remain explicitly planned/unavailable. |
| Module K (Document Vault `stored_files`) | `PARTIALLY_IMPLEMENTED` | K-Min upload/list/download, SHA-256 verification, category capability checks, and `customers.read` isolation for customer identity files are implemented; metadata lifecycle, structured links and K-Full archival remain unimplemented |

---

### Product Interaction Model — Organization to Project

PROMO GEST is one ERP, but its navigation must reflect how a property developer operates. The intended interaction model has three levels:

1. **Organization workspace:** role-aware daily work, tasks, exceptions, and authorized portfolio indicators.
2. **Project selection and switching:** explicit search and access to projects the signed-in user is authorized to open.
3. **Active project workspace:** project-scoped operations with the active project code and name visibly retained.

Technical administration (server health, database readiness, backup/restore, security audit, and user/role administration) belongs in a dedicated administrative area and must not dominate daily commercial or project work.

[PROJECT-NAVIGATION-UX.md](PROJECT-NAVIGATION-UX.md) is the approved design reference (D-013). PR #81 implements navigation foundations and safety controls, but not the complete role-aware work centre, task/approval model, or full directory filtering/pagination. Manual Arabic RTL / French LTR browser acceptance remains required. The exact screen-by-screen implementation and gap inventory is recorded in [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md).

**Live preview and manual acceptance evidence:** On 15 November 2026, the Product Owner confirmed that the Google AI Studio development server/API and PostgreSQL development connection operate, and separately attested successful Arabic RTL / French LTR desktop/mobile checks for login/session/CSRF, projects, structure, customers/interactions, internal holds, documents/SHA-256, authorization, audit, concurrency, safe errors, and persistence after reload. The attestation is recorded in `PHASE-0-MANUAL-ACCEPTANCE.md`; browser-version metadata and sanitized screenshot/API artifacts were not attached. Phase 0 is administratively closed under D-010; P0-A01 fresh-database initialization/second-initialization rejection and P0-A04 logout/session-revocation remain `NOT_RUN` as accepted residual exceptions, not passes.

## 5. Product Scope & Release Boundaries (Governance Guardrail)

PROMO GEST refuses scope creep driven by generic SaaS ERP conventions. All development adheres to this strict classification:

| Scope Tier | Included Capabilities | Governing Rule |
|---|---|---|
| **Core Product Scope** | Single-organization on-premises ASP.NET Core 10 + PostgreSQL 18 + local storage + bilingual RTL/LTR SPA; single `SYSTEM_ADMIN`; explicit project membership; DZD financials; Algerian legal/tax compliance. | Non-negotiable per Constitution & ADRs `0001–0005`. |
| **Required for First Production Release *(Minimum Viable On-Premises Operations — Pending PO Sign-Off)*** | **Must pass:** Phase 0 (keep CI green; execute residual `P0-A01`/`P0-A04` before production release) + Phase 1 (`PUT /api/organization`, `projects.structure.manage`, Party mirror retirement, and PostgreSQL project-customer identity guard implemented; versioned 69-Wilaya / commune catalogue and bounded navigation design remain) + verified Linux/Windows service packaging, DPAPI/PKCS#12 keys, production-installation and backup/restore round-trip drill. *(Wait for Product Owner approval on whether First Production Release includes Projects+Inventory+CRM+Holds only OR also Phase 2/3A VSP Contracts & Collections.)* | No customer installation without verified backup/restore & green `G1–G10`. |
| **Later Enhancements (`PLANNED`)** | Phase 2 (Statutory Reservation, VSP & *Acte Notarié* Contracts + K-Min links), Phase 3A (DZD Installments, Collections & Treasury), Phase 3B/3C (Chantier Lots/Situations, Procurement/Stock), Phase 4 (SCF Ledger & Tax Engine), Phase 5 (Full K-Full Archival & Executive Reporting). | Strictly sequenced via [MASTER-ROADMAP.md](MASTER-ROADMAP.md) & legal/CPA gates. |
| **Explicitly Out of Scope** | Multi-tenant SaaS hosting; public internet exposure of local ERP; cloud DBs (`Cloud SQL`, Firestore, etc.) holding real customer/company data; buyer self-service portals sharing the ERP process/DB (`ADR-0005`); native mobile apps; auto-merging Parties by fuzzy name/phone; hardcoded unapproved tax/SCF posting rules. | Rejected automatically unless governed by an approved ADR. |
| **Decisions Awaiting Product Owner / Practitioner Approval** | (1) Exact commercial release cut-off (Foundation+CRM+Holds vs full VSP Contracts+Collections); (2) Business role assignment for `parties.identity.manage`; (3) Law 11-04 / Decree 13-431 VSP & FGCMPI legal sign-off; (4) Finance Law 2025/2026 VAT & SCF posting rules CPA sign-off; (5) Verified official 1,541-commune dataset (`ADR-0010`). | Documented in [DECISION-LOG.md](DECISION-LOG.md) Section 3. |
