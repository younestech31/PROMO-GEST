# PROMO GEST — Consolidated Decision Log & Architecture Decision Records (ADRs)

**Document Role:** Single repository of architectural, design, and governance decisions for PROMO GEST.  
**Current Audit Evidence Anchor:** Latest application runtime source change PR #48 / `23f019de7c787c0f93b5b7f0b5cec69992ff087a`; latest test-source change PR #50 / `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`; main inspected at audit start `432e6f8ea76bb540dd5bc69d3314c0d658805ba7`; latest green main CI Run #546 / `43768228052` (all three jobs passed). D-004 through D-007 are retained as historical/current evidence records.

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

## 2. Key Architectural Decisions and Evidence Records (`D-001` to `D-009`)

### `D-001`: Party vs ProjectCustomer Separation & Resolution
- **Decision:** The organization-wide `parties` table is the canonical source of truth for counterparty identity (`id`, `party_kind`, `display_name`). Project-scoped `project_customers` maintain relationship-specific contact, status, source and document data linked to a Party. Until the Phase 1 retirement migration is applied, the duplicated display-name/type fields are transitional mirrors: every canonical identity change synchronizes all linked customer mirrors and advances their concurrency stamps. Duplicate detection considers both canonical and legacy mirror names; a change is rejected if it would collide with a different Party in any linked project. Retire the mirrors only through a reviewed EF migration with backfill, uniqueness checks and rollback tests. Fuzzy auto-merging remains rejected in favor of human-approved manual Party merge workflows.

### `D-002`: Password Hashing Policy
- **Decision:** PROMO GEST uses **`Pbkdf2PasswordHasher`** (`PBKDF2-SHA512`, 310,000 iterations, 16-byte random salt, serialized format `PBKDF2-SHA512$<iterations>$<salt>$<hash>`). Any future algorithm migration requires an explicit independent ADR ensuring backwards compatibility and transparent rehashing upon successful login.

### `D-003`: Module K Document Management Two-Stage Split (`K-Min` vs `K-Full`)
- **Decision:** To resolve roadmap/catalog discrepancies, Module K is split into **`K-Min`** (local file upload/download with SHA-256 verification, required before Phase 2 Contracts) and **`K-Full`** (enterprise-wide archiving, legal hold, retention policies, scheduled in Phase 5).

### `D-004`: Baseline Commit & CI Record (`c890ba05...` & Run #495)
- **Decision:** The latest audited source baseline is `c890ba05e83831fb965d855d1e7c2d7ab1d8a643`, merged through PR #38. GitHub Actions Run #495 (`43720679970`) passed all three jobs: Frontend (24/24 tests), .NET/PG18 (27 Domain, 14 Application, 9 Integration tests), and Windows publish/PowerShell validation. The former `CS7036` blocker is resolved by PR #35; PRs #36–#38 close Party audit, authorization, mirror-sync and identity-collision defects. Manual preview/browser validation and Phase 1 work remain open.

### `D-005`: Historical Main Snapshot & CI Record (PR #46 / Run #531)
- **Decision:** The `main` commit recorded for that earlier audit was `5415f0e668a55f902ac2802e1669af58ad7ec410`. PR #46 was a documentation-only change that added the source-audited UI implementation/gap matrix and synchronized baseline, roadmap, module catalog, navigation proposal, traceability, quality and security guidance. It did not change application code, API contracts, database schema, migrations, business data, credentials, or security policy.
- **Source baseline at that time:** The application-code baseline was `6bbd97f70ed0fb63cf226a1117cf6e83c359d2be` (PR #44). PR #45 and PR #46 changed documentation only.
- **Verification at that time:** GitHub Actions Run #531 (`43752672569`) ran on main SHA `5415f0e...` and all three jobs passed: Frontend (**38/38** tests), .NET 10 / PostgreSQL 18 (Domain **27/27**, Application **14/14**, Integration **9/9**, plus restore checks), and Windows publish/PowerShell validation.
- **Remaining acceptance:** Phase 0 remained `IN_PROGRESS`. Manual Arabic RTL / French LTR browser review and focused real-API workflow acceptance (CRUD, persistence/reload, cookie/CSRF and authorization boundaries) were not proven by that CI run.

### `D-006`: Do Not Store API or Health Responses in HTTP Caches (PR #48 / Run #539)
- **Decision:** `SecurityHeadersMiddleware` assigns `Cache-Control: no-store` to every request whose path belongs to `/api` or `/health`, case-insensitively. The rule applies centrally so it does not depend on individual frontend calls remembering to set Fetch `cache: 'no-store'`.
- **Boundary:** Static SPA routes (`/`, `/index.html`), hashed `/assets/*`, and `/manifest.webmanifest` are excluded. Existing Service Worker rules still bypass API and health requests; they are a separate protection layer and are not changed by this decision.
- **Rationale:** Authenticated API responses may contain session, customer, project, or operational data. A Service Worker bypass does not control the browser's ordinary HTTP cache, and selective frontend fetch options do not reliably cover all API calls.
- **Regression coverage:** `SecurityHeadersMiddlewareTests.cs` covers API/health paths including unknown endpoints, uppercase prefixes, static shell/assets, and near-miss routes (`/apiary`, `/healthcare`). The policy does not alter cookies, CSRF, permissions, persistence, database schema, migrations, or cloud/local deployment boundaries.
- **Verification:** PR #48 (`73b3afbe748619c73489dc6f7f736a70d3607567`) passed all three PR CI jobs in Run #538 (`43763596953`). Squash merge `23f019de7c787c0f93b5b7f0b5cec69992ff087a` was verified by post-merge Run #539 (`43763807711`), with all three jobs successful.

### `D-007`: Verify HTTP Response Privacy Through the Real ASP.NET Core Pipeline (PR #50 / Run #544)
- **Decision:** Keep the centralized `Cache-Control: no-store` policy for `/api` and `/health` responses introduced by PR #48. Verify it at two levels: direct middleware path-boundary tests and real `WebApplicationFactory` HTTP integration assertions against PostgreSQL 18.
- **Coverage:** Successful `GET /api/auth/csrf`, `GET /health/live`, and `GET /health/ready`; API and health fallback 404 responses; and an unsafe setup request rejected with CSRF 403. Integration tests require the parsed `Cache-Control` `NoStore` directive and intentionally allow additional directives such as `no-cache`.
- **Non-goals:** No runtime middleware, response semantics, session, CSRF, authorization, schema, migration, business-data, or cloud/local deployment behavior changed by PR #50.
- **Verification:** PR #50 head `90faecbf3d218e2d3d21f721e026636e09e42969` passed PR CI #543 (`43766827253`) across all three jobs, including PostgreSQL 18 Integration **24/24**. Squash merge `c26194dce5124d5d5e8d67fc5a04708346b1d5e4` passed post-merge main CI #544 (`43767110822`) across all three jobs.

---

### `D-008`: Owner-Attested Phase 0 Manual Acceptance (15 November 2026)
- **Record:** The Product Owner explicitly confirmed successful execution of the principal bilingual desktop/mobile workflows: Arabic RTL and French LTR; login/session/CSRF; project directory and structure; customers/interactions; internal hold creation/cancellation/expiry; document upload/download with SHA-256 comparison; authorization, audit, concurrency conflicts, safe errors; and persistence after reload.
- **Status mapping:** `PHASE-0-MANUAL-ACCEPTANCE.md` records P0-A02, P0-A03, P0-A05 and P0-B–G as `PASS` with the source clearly marked as Product Owner attestation. This is not a CI test result or a claim that engineering independently operated the Product Owner's browser.
- **Boundary:** P0-A01 (first-run initialization on a separate empty disposable database and safe rejection of a second initialization) and P0-A04 (logout followed by protected-route/session-revocation check) were not explicitly included in the confirmation and remain `NOT_RUN`. Browser/version metadata, per-case timestamps, sanitized screenshots/recordings, and redacted API trace artifacts were not attached.
- **Effect:** Manual bilingual business-flow acceptance is no longer listed as wholly unrun. Phase 0 remains `IN_PROGRESS` until P0-A01 and P0-A04 are evidenced; D-009 records the bounded navigation-proposal deferral.

### `D-009`: Defer Project-Navigation Proposal Approval to Phase 1 Design Review
- **Decision:** Do not launch a navigation redesign during Phase 0. Keep the current application shell and project modals unchanged. Defer approval and implementation of the proposed organization workspace / explicit project switcher / active project workspace model to a bounded Phase 1 design review against the actual workflows and current source.
- **Rationale:** The current three-level proposal is a product design reference, not implemented functionality. Phase 0 is focused on stabilization and evidenced workflow acceptance; Phase 1 owns foundation completion and product navigation alignment.
- **Constraints:** This deferral does not authorize broad redesign, automatic project context, client-side-only project filtering, changes to project authorization, or any weakening of server-side membership enforcement. Any Phase 1 implementation must be a separately scoped vertical slice with acceptance criteria and required gates.
- **Status:** Bounded deferral recorded under the Product Owner's explicit delegation to continue project work; no navigation UI implementation is claimed.

## 3. Practitioner Sign-Off Register (`PLANNED`)
- **Legal (Law 11-04 & Decree 13-431):** Awaiting formal practitioner review of reservation contracts, VSP tranches, FGCMPI escrow separation, and 15% cancellation retention.
- **Tax & Accounting (SCF / Finance Laws 2025-2026):** Awaiting CPA review of TVA collection triggers (Art. 59), 9% vs 19% rates (Art. 53), and revenue recognition rules.
- **Territorial Reference Data:** Awaiting final sign-off on the official 1,541-commune dataset (`ADR-0010`).
