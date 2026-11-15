# PROMO GEST — Master Engineering Blueprint

**Document Role:** Single authoritative index & master entry point for the PROMO GEST local-first real estate developer ERP (`promoteur immobilier` — Algeria).  
**Last Verified Against Repository:** 2026-11-15 (inspecting `src/`, `apps/local-web/`, `tests/`, `deploy/`, `scripts/`, and 11 EF Core migrations).  
**Governing Charter:** Local-first, on-premises per organization, PostgreSQL 18 single source of truth, single System Administrator (`SYSTEM_ADMIN`), HTTP-only `SameSite=Strict` cookie sessions + CSRF, local filesystem storage with SHA-256 verification, Arabic RTL primary / French LTR secondary, Algerian DZD & legal context.

---

## 1. Unified 6-State Status Taxonomy

Every claim across this blueprint uses **strictly one** of the six evidence-backed states below:

| State | Meaning |
|---|---|
| `IMPLEMENTED_AND_VERIFIED` | Code exists end-to-end **and** passed automated tests/verification in the current repository baseline without failing build dependencies. |
| `IMPLEMENTED_NOT_VERIFIED` | Code exists in the workspace, but automated build/integration/E2E verification failed, is missing, or could not run (e.g., broken test compilation, missing Docker PG18 verification, or unexecuted runtime verification). |
| `PARTIALLY_IMPLEMENTED` | Part of the module/feature exists (e.g., backend or UI or schema only, or preview/API drift, or missing CRUD/edit endpoints). |
| `PLANNED` | Designed and scoped in architecture/roadmap docs, with no production implementation in `src/` or `apps/local-web/`. |
| `BLOCKED` | Cannot move to `IMPLEMENTED_AND_VERIFIED` until a specific defect, external legal/practitioner validation, or prerequisite gate is resolved. |
| `DEPRECATED` | Legacy document, transitional pattern, or superseded behavior retained only for compatibility and scheduled for retirement after transition. |

> **Constitutional Rule:** No module or sub-feature is ever labeled `IMPLEMENTED_AND_VERIFIED` without verified source code **and** passing test execution in the audited state.

---

## 2. Canonical Blueprint Suite (`docs/`)

| # | Document | Purpose & Scope |
|---|---|---|
| 1 | [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) | This master index, executive product vision, completion scorecard, and navigation map. |
| 2 | [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) | Honest baseline backed by inspected files, 11 EF migrations, exact test/build results, active C2 defects, and preview drift. |
| 3 | [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | Clean/Layered dependency graph, modular monolith boundaries, HTTP middleware pipeline, and SPA hosting model. |
| 4 | [DOMAIN-MODEL.md](DOMAIN-MODEL.md) | Authoritative ER/aggregate model, PostgreSQL 18 constraints/triggers/partial indexes, concurrency (`ConcurrencyStamp`), and entity lifecycles. |
| 5 | [MODULE-CATALOG.md](MODULE-CATALOG.md) | All 12 target ERP domains (**A–L**) mapped from current implementation through target contracts, workflows, and boundaries. |
| 6 | [MASTER-ROADMAP.md](MASTER-ROADMAP.md) | Dependency-ordered phased roadmap, parallelizable vs gated streams, stage transition gates, and program risks. |
| 7 | [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md) | 18 permissions × 7 roles, `ProjectMember` capability intersection, SoD rules, PII isolation, session/CSRF/audit controls. |
| 8 | [DATA-AND-LOCAL-DEPLOYMENT.md](DATA-AND-LOCAL-DEPLOYMENT.md) | Local PG18 3-role topology, Data Protection (Windows DPAPI / Linux PKCS#12), Caddy LAN HTTPS, backup/restore drills, offline boundary, Cloud SQL non-prod isolation. |
| 9 | [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) | Mandatory per-module acceptance gates (domain, relational integrity, authz, concurrency, audit, unit/PG18/UI/Windows/restore checks). |
| 10 | [DECISION-LOG.md](DECISION-LOG.md) | Consolidated ADRs `0001–0010`, undocumented implicit decisions found in code, Algerian practitioner sign-off register, and code/doc/preview drift log. |

---

## 3. Existing Specialized Reference Documents (Preserved & Cross-Linked)

The following pre-existing repository documents retain detailed domain, legal, operational, and historical audit context and remain cross-linked from the canonical suite:

- **Legal & Regulatory Baseline:** [ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md](ALGERIAN-REAL-ESTATE-LEGAL-DOMAIN.md) (Law 11-04, Executive Decree 13-431, FGCMPI, Finance Laws 2025/2026)
- **Territorial & Administrative Data:** [ALGERIAN-REFERENCE-DATA.md](ALGERIAN-REFERENCE-DATA.md), [REFERENCE-DATA-GOVERNANCE.md](REFERENCE-DATA-GOVERNANCE.md) (Law 26-06, Decrees 26-206 & 26-208, Wilayas 01–69)
- **Operations & Install:** [INSTALLATION.md](INSTALLATION.md), [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md), [OFFLINE-OPERATION.md](OFFLINE-OPERATION.md)
- **Non-Production Dev Tooling:** [GOOGLE-AI-STUDIO-PREVIEW.md](GOOGLE-AI-STUDIO-PREVIEW.md), [GOOGLE-AI-STUDIO-CLOUD-SQL.md](GOOGLE-AI-STUDIO-CLOUD-SQL.md)
- **Navigation UX & Historical Audits:** [PROJECT-NAVIGATION-UX.md](PROJECT-NAVIGATION-UX.md), [FOUNDATION-AUDIT-2026-11.md](FOUNDATION-AUDIT-2026-11.md)
- **ADR Directory:** [ADR/0001](ADR/0001-local-first-self-hosted-architecture.md) through [ADR/0010](ADR/0010-versioned-algerian-administrative-reference-data.md)
- **Legacy Overviews (Superseded for Status/Architecture by the 10 Canonical Docs Above):** [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE-DESIGN.md](DATABASE-DESIGN.md), [SECURITY.md](SECURITY.md), [ROADMAP.md](ROADMAP.md), [ERP-MODULE-ARCHITECTURE.md](ERP-MODULE-ARCHITECTURE.md), [PARTY-MASTER-DATA.md](PARTY-MASTER-DATA.md)

---

## 4. Product Vision & Completion Overview

**PROMO GEST** is an integrated on-premises ERP for Algerian real estate developers (*promoteurs immobiliers*), covering the full enterprise lifecycle on customer hardware:

1. **Governance & Security Core:** Single-organization installation wizard, single System Administrator (`SYSTEM_ADMIN`), 7 seeded RBAC roles, explicit project-scoped membership, immutable PostgreSQL audit trail.
2. **Real Estate Portfolio & Unit Inventory:** Projects (`projects`), physical hierarchy (`buildings` → `building_floors` → `property_units`), commercial statuses, DZD pricing, and verified SHA-256 local documents.
3. **Counterparties (Party), CRM & Sales Pipeline:** Organization-wide `parties` identity, project-scoped `project_customers` & `customer_interactions`, lot/unit `project_sales_reservations`, transitioning cleanly into VSP / standard sale contracts (*actes notariés*), regulated payment milestones, and DZD collections.
4. **Execution, Accounting & Statutory Compliance:** Works/construction tracking (LOTs, contractor situations, FGCMPI/legal compliance), suppliers/inventory, **Algerian SCF (Système Comptable Financier)** journal generation, VAT/IBS/TAP/IRG tax rules (Finance Laws 2025/2026 pending qualified accountant review), and local reporting.

### High-Level Program Status Snapshot (Measured 2026-11-15)

| Layer / Domain | Current State | Verification Evidence |
|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | Builds cleanly; **27/27** `PromoGest.Domain.Tests` pass |
| Application Services (`PromoGest.Application` — Core Auth/Setup/Users/Audit/Projects/Structure/Docs/Reservations) | `IMPLEMENTED_AND_VERIFIED` (for tested core) / `IMPLEMENTED_NOT_VERIFIED` (C2 Party & Customer changes) | **10/10** `PromoGest.Application.Tests` pass; C2 `PartyDirectoryService` & updated `ProjectCustomerService` lack Application/PG18 coverage |
| PostgreSQL 18 Integration Suite (`PromoGest.IntegrationTests`) | `BLOCKED` | **Compile failure (`CS7036`)** in `PostgresEndToEndTests.cs:1072` due to uncommitted C2 contract change (`PartyConcurrencyStamp`); Docker unavailable in current workspace |
| Local React SPA (`apps/local-web`) | `PARTIALLY_IMPLEMENTED` | `tsc --noEmit` (0 errors) & **22/22** pure TS unit tests pass; preview middleware (`dev-api-middleware.ts`) lacks 6 permissions & Docs/Customers/Reservations/Parties handlers |
| Organization Profile Edit (`PUT /api/organization`) | `PARTIALLY_IMPLEMENTED` | `OrganizationProfileView.tsx` is read-only; `org.manage` permission seeded but no update endpoint exists |
| Modules F–J & L (Contracts, DZD Finance/Installments, Works/Chantier, Procurement/Stock, SCF Accounting, Reporting) | `PLANNED` | No tables, services, endpoints, or UI implemented yet |
| Module K (Documents) | `PARTIALLY_IMPLEMENTED` | Project documents with SHA-256 storage & download implemented; entity-level linking (`Contract`, `Reservation`, `Unit`, `Party`) not yet implemented |
