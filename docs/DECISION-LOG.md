# PROMO GEST — Consolidated Decision Log & Architecture Decision Records (ADRs)

**Document Role:** Single repository of architectural, design, and governance decisions for PROMO GEST.  
**Baseline Anchor:** Source code commit `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`, GitHub Actions CI #495 / `43720679970` (all jobs passed).

---

## 1. Summary of Architecture Decision Records (ADRs `0001–0010`)

| ADR | Title | Decision Summary | Status |
|---|---|---|---|
| **ADR-0001** | Local-First Self-Hosted Architecture | Single-organization on-premises ASP.NET Core 10 + PostgreSQL 18 + local storage over office LAN. Zero cloud/internet runtime dependency. | Accepted & Implemented |
| **ADR-0002** | PostgreSQL 18 Single-Tenant Per Organization | Isolated database instance per customer installation. Least-privilege runtime role `promogest_app`. | Accepted & Implemented |
| **ADR-0003** | Same-Origin Static SPA Hosted by ASP.NET Core | Compiled Vite React SPA served from `wwwroot/` by ASP.NET Core process. | Accepted & Implemented |
| **ADR-0004** | HTTP-Only Cookies & Single System Administrator | `promogest_session` SameSite=Strict HTTP-only cookie + CSRF; exactly one System Administrator (`SYSTEM_ADMIN`). | Accepted & Implemented |
| **ADR-0005** | Strict Separation of Public Web / Buyer Portal | Public-facing marketing or buyer portals must be completely separate systems and never share the ERP database or process. | Accepted & Implemented |
| **ADR-0006** | Project-Scoped Resource Authorization | Global RBAC permissions combined with explicit `ProjectMember` membership and capability flags (`CanManageConstruction`, `CanManageSales`, `CanManageDocuments`). | Accepted & Implemented |
| **ADR-0007** | Immutable PostgreSQL Audit Logging | Append-only `audit_logs` table protected by PostgreSQL triggers against UPDATE/DELETE/TRUNCATE. | Accepted & Implemented |
| **ADR-0008** | Optimistic Concurrency Control (CAS) | `ConcurrencyStamp` check on mutable domain aggregates returning `409 Conflict` on stale updates. | Accepted & Implemented |
| **ADR-0009** | Organization-Wide Party & Decoupled Employee Identity | Centralized `parties` table for counterparties, separating CRM customer registry from identity master and decoupling future `Employee` records from optional `User` logins. | Accepted (C1/C2 API/data flows verified in PRs #35–#38; final legacy-column retirement and Employee master remain Phase 1/planned) |
| **ADR-0010** | Versioned Algerian Administrative Reference Data | 69 Wilayas and verified 1,541 communes with effective dates and transitional authority separation (Decrees 26-206 & 26-208). | Accepted (`PLANNED` dataset integration) |

---

## 2. Key Architectural Decisions (`D-001` to `D-004`)

### `D-001`: Party vs ProjectCustomer Separation & Resolution
- **Decision:** The organization-wide `parties` table is the canonical source of truth for counterparty identity (`id`, `party_kind`, `display_name`). Project-scoped `project_customers` maintain relationship-specific contact, status, source and document data linked to a Party. Until the Phase 1 retirement migration is applied, the duplicated display-name/type fields are transitional mirrors: every canonical identity change synchronizes all linked customer mirrors and advances their concurrency stamps. Duplicate detection considers both canonical and legacy mirror names; a change is rejected if it would collide with a different Party in any linked project. Retire the mirrors only through a reviewed EF migration with backfill, uniqueness checks and rollback tests. Fuzzy auto-merging remains rejected in favor of human-approved manual Party merge workflows.

### `D-002`: Password Hashing Policy
- **Decision:** PROMO GEST uses **`Pbkdf2PasswordHasher`** (`PBKDF2-SHA512`, 310,000 iterations, 16-byte random salt, serialized format `PBKDF2-SHA512$<iterations>$<salt>$<hash>`). Any future algorithm migration requires an explicit independent ADR ensuring backwards compatibility and transparent rehashing upon successful login.

### `D-003`: Module K Document Management Two-Stage Split (`K-Min` vs `K-Full`)
- **Decision:** To resolve roadmap/catalog discrepancies, Module K is split into **`K-Min`** (local file upload/download with SHA-256 verification, required before Phase 2 Contracts) and **`K-Full`** (enterprise-wide archiving, legal hold, retention policies, scheduled in Phase 5).

### `D-004`: Baseline Commit & CI Record (`c890ba05...` & Run #495)
- **Decision:** The latest audited source baseline is `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`, merged through PR #38. GitHub Actions Run #495 (`43720679970`) passed all three jobs: Frontend (24/24 tests), .NET/PG18 (27 Domain, 14 Application, 9 Integration tests), and Windows publish/PowerShell validation. The former `CS7036` blocker is resolved by PR #35; PRs #36–#38 close Party audit, authorization, mirror-sync and identity-collision defects. Manual preview/browser validation and Phase 1 work remain open.

---

## 3. Practitioner Sign-Off Register (`PLANNED`)
- **Legal (Law 11-04 & Decree 13-431):** Awaiting formal practitioner review of reservation contracts, VSP tranches, FGCMPI escrow separation, and 15% cancellation retention.
- **Tax & Accounting (SCF / Finance Laws 2025-2026):** Awaiting CPA review of TVA collection triggers (Art. 59), 9% vs 19% rates (Art. 53), and revenue recognition rules.
- **Territorial Reference Data:** Awaiting final sign-off on the official 1,541-commune dataset (`ADR-0010`).
