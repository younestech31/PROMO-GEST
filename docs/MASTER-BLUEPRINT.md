# PROMO GEST — Master Engineering Blueprint

**Document Role:** Single authoritative index & master entry point for the PROMO GEST local-first real estate developer ERP (*promoteur immobilier* — Algeria).  
**Source-Code Baseline Commit:** `c890ba05e83831fb965d855d1e7c2d7ab1d8a643` (PR #38 merge; PRs #35–#38 contain the verified C2 corrections).  
**Previous Documentation Snapshot:** `d34eba606e5e2473898deed5e31a73eef2e7374d` (superseded by this baseline refresh).  
**Latest Green CI:** GitHub Actions Run #495 / `43720679970` on the source baseline above.  
**Governing Charter:** Local-first, on-premises per organization, PostgreSQL 18 single source of truth, single System Administrator (`SYSTEM_ADMIN`), HTTP-only `SameSite=Strict` cookie sessions (`promogest_session`) + CSRF, local filesystem storage with SHA-256 verification, Arabic RTL primary / French LTR secondary, Algerian DZD & legal context.

---

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
| 2 | [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) | Evidence-backed status at source commit `c890ba05...`, CI #495, current test counts, merged C2 corrections, transitional Party mirrors, and explicit AI Studio preview boundaries. |
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

### High-Level Program Status Snapshot (Code Baseline: `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`, CI #495)

| Layer / Domain | Current State | Verification Evidence |
|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: **27/27** Domain tests passed |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: **14/14** Application tests passed |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 merged; audit denials, concurrency, cross-project reuse, identity-collision rejection, and linked mirror synchronization are covered by Application and PostgreSQL 18 tests |
| PostgreSQL 18 Integration Suite (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | CI #495: **9/9** PostgreSQL 18 integration tests passed; former `CS7036` is resolved |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | CI #495: strict TypeScript check, **24/24** pure tests, production build and `wwwroot` checks pass; manual RTL/LTR browser review and full parity of the Vite-only simulator remain outstanding |
| Organization Profile Edit (`PUT /api/organization`) | `PARTIALLY_IMPLEMENTED` | `OrganizationProfileView.tsx` is read-only; `org.manage` is seeded but no update endpoint exists |
| Modules F–J & L (Contracts, DZD Finance/Installments, Works/Chantier, Procurement/Stock, SCF Accounting, Reporting) | `PLANNED` | Design baselines documented; no production business modules implemented |
| Module K (Document Vault `stored_files`) | `PARTIALLY_IMPLEMENTED` | K-Min upload/list/download and SHA-256 API path pass PostgreSQL 18 E2E; metadata lifecycle, structured links and K-Full archival remain unimplemented |

---

## 5. Product Scope & Release Boundaries (Governance Guardrail)

PROMO GEST refuses scope creep driven by generic SaaS ERP conventions. All development adheres to this strict classification:

| Scope Tier | Included Capabilities | Governing Rule |
|---|---|---|
| **Core Product Scope** | Single-organization on-premises ASP.NET Core 10 + PostgreSQL 18 + local storage + bilingual RTL/LTR SPA; single `SYSTEM_ADMIN`; explicit project membership; DZD financials; Algerian legal/tax compliance. | Non-negotiable per Constitution & ADRs `0001–0005`. |
| **Required for First Production Release *(Minimum Viable On-Premises Operations — Pending PO Sign-Off)*** | **Must pass:** Phase 0 (keep CI green; verify the real ASP.NET Core / Cloud SQL development-preview path and manual Arabic RTL / French LTR workflows) + Phase 1 (`PUT /api/organization`, structure authorization alignment, final Party mirror-retirement migration, versioned 69-Wilaya / commune catalogue) + verified Linux/Windows service packaging, DPAPI/PKCS#12 keys, and backup/restore round-trip drill. *(Wait for Product Owner approval on whether First Production Release includes Projects+Inventory+CRM+Holds only OR also Phase 2/3A VSP Contracts & Collections.)* | No customer installation without verified backup/restore & green `G1–G10`. |
| **Later Enhancements (`PLANNED`)** | Phase 2 (Statutory Reservation, VSP & *Acte Notarié* Contracts + K-Min links), Phase 3A (DZD Installments, Collections & Treasury), Phase 3B/3C (Chantier Lots/Situations, Procurement/Stock), Phase 4 (SCF Ledger & Tax Engine), Phase 5 (Full K-Full Archival & Executive Reporting). | Strictly sequenced via [MASTER-ROADMAP.md](MASTER-ROADMAP.md) & legal/CPA gates. |
| **Explicitly Out of Scope** | Multi-tenant SaaS hosting; public internet exposure of local ERP; cloud DBs (`Cloud SQL`, Firestore, etc.) holding real customer/company data; buyer self-service portals sharing the ERP process/DB (`ADR-0005`); native mobile apps; auto-merging Parties by fuzzy name/phone; hardcoded unapproved tax/SCF posting rules. | Rejected automatically unless governed by an approved ADR. |
| **Decisions Awaiting Product Owner / Practitioner Approval** | (1) Exact commercial release cut-off (Foundation+CRM+Holds vs full VSP Contracts+Collections); (2) Business role assignment for `parties.identity.manage`; (3) Law 11-04 / Decree 13-431 VSP & FGCMPI legal sign-off; (4) Finance Law 2025/2026 VAT & SCF posting rules CPA sign-off; (5) Verified official 1,541-commune dataset (`ADR-0010`). | Documented in [DECISION-LOG.md](DECISION-LOG.md) Section 3. |
