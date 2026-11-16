# PROMO GEST — Development Workflow & Engineering Governance

**Document Role:** Mandatory operational procedure before, during, and after every change in PROMO GEST. Designed to enforce local-first data sovereignty, Clean Architecture boundaries, database integrity, and evidence-backed status tracking.  
**Related References:** [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) · [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) · [MASTER-ROADMAP.md](MASTER-ROADMAP.md) · [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) · [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) · [DECISION-LOG.md](DECISION-LOG.md) · [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md)

---

## 0. Product-First Intake and Scope Control

Before accepting a task, identify the business workflow it advances, its module (A–L), roadmap phase, upstream dependencies, and acceptance evidence. Prioritize real blockers, security defects, data-integrity risks, and work that closes the current phase. Put unrelated cosmetic requests, speculative enhancements, and non-blocking cleanup in a backlog; do not let them displace the active roadmap task.

The product interaction model should separate:
1. **Organization workspace** — role-aware daily work and cross-project tasks/indicators.
2. **Project selection/switching** — explicit selection of authorized projects.
3. **Active project workspace** — project-scoped modules with persistent project identity.

Technical administration (health, database readiness, backups, security audit, and user/role administration) must be available in the appropriate administrative area without becoming the primary daily-work interface. Use `PROJECT-NAVIGATION-UX.md` as a proposal to review against the business workflows and implementation, and `UI-IMPLEMENTATION-AND-GAP-MATRIX.md` as the source-audited current-state inventory; do not launch an unbounded redesign or claim the proposal is implemented.

A UI screen or technical component is not a business deliverable by itself. Map every changed screen/API to its actual business requirement, domain module, permission, data owner, and downstream workflow.

## 1. Before Starting Any Change

Every contributor or engineering session **must** complete these 5 preparation steps before editing code, migrations, or docs:

1. **Read the Canonical Engineering Suite:**
   - [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) (status taxonomy & scope boundaries)
   - [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) (current main SHA, last code-changing source SHA, latest CI evidence, preview boundaries, and remaining Phase 0 gates)
   - [DOMAIN-MODEL.md](DOMAIN-MODEL.md) (literal schema, concurrency, Party vs ProjectCustomer rules)
   - [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md) (hashing, cookies, CSRF, permissions, resource scoping)
   - [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md) (current screens, module ownership, and verified UI boundaries)
   - [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) (manual browser/real-API test protocol; never claim unrun cases as passed)
   - [MASTER-ROADMAP.md](MASTER-ROADMAP.md) (dependencies & phase sequencing)
   - Applicable ADRs in `docs/ADR/` (`0001–0010`) and [DECISION-LOG.md](DECISION-LOG.md).
2. **Verify Prerequisite Dependencies:**
   - Check [MASTER-ROADMAP.md](MASTER-ROADMAP.md) and [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) to ensure the target module is **unblocked**.
   - For Algerian legal, notarial, VSP/FGCMPI, territorial, or SCF/tax features, verify whether **Practitioner Sign-Off** exists in [DECISION-LOG.md](DECISION-LOG.md) Section 3 before encoding statutory rules.
3. **Write a Brief Change Record (Task / PR Brief) Covering 6 Mandatory Elements:**
   - **Goal:** Exact business/technical outcome (vertical slice).
   - **Dependencies:** Upstream tables, modules, permissions, or sign-offs required.
   - **Risks:** Security, concurrency, migration rollback, data integrity, or offline/LAN failure modes.
   - **Affected Files & Layers:** `Domain`, `Contracts`, `Application`, `Infrastructure`, `Api`, `apps/local-web`, `tests/`.
   - **Explicit Non-Goals:** What will *not* be touched in this change.
   - **Acceptance Criteria:** Exact tests, permission checks, UI direction checks (`ar` RTL + `fr` LTR), and gates (`G1–G10`) that prove completion. For Phase 0, use the result register and evidence rules in `PHASE-0-MANUAL-ACCEPTANCE.md`.
4. **Enforce Constitutional Guardrails Upfront:**
   - Reject any design introducing multi-tenant SaaS, cloud DB dependencies in runtime, public internet exposure, bearer tokens in browser storage, primary business data in IndexedDB/localStorage, or weakening single `SYSTEM_ADMIN`.
5. **Confirm Dependency Direction:**
   - `PromoGest.Domain` → zero external/EF dependencies.
   - `PromoGest.Contracts` → pure DTOs/records.
   - `PromoGest.Application` → depends only on `Domain` + `Contracts` + ports/interfaces.
   - `PromoGest.Infrastructure` → EF Core 10, Npgsql/PostgreSQL 18, `LocalFileStorageService`, crypto implementations.
   - `PromoGest.Api` → thin controllers + middleware + static SPA host (`wwwroot`).

---

## 2. During Development

1. **Isolated Vertical-Slice Branch Only:**
   - Work in a focused feature/fix/docs branch (never push directly to `main`).
   - One PR = one coherent vertical slice or cohesive bug-fix batch.
2. **Prohibited Mixing & Sweeping Refactors:**
   - **Never** mix unrelated module additions, opportunistic rewrites, or cosmetic folder shuffles into an active bugfix or vertical-slice PR.
   - **Never** rewrite working modules merely for stylistic cleanup.
3. **Dependency Discipline:**
   - Do **not** start coding blocked downstream modules (e.g., Phase 2 Contracts before `K-Min`; Phase 3A Collections before Contracts; Phase 4 SCF before Phase 2/3A & CPA sign-off).
   - If a new technical dependency, schema change, or cross-module coupling emerges during coding: stop, document the ADR or decision update in [DECISION-LOG.md](DECISION-LOG.md) and [MASTER-ROADMAP.md](MASTER-ROADMAP.md), and update [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md).
4. **PostgreSQL 18 First-Class Integrity:**
   - Every new entity invariant (singletons, partial unique constraints, valid state enums, immutability triggers, positive DZD amounts) must be enforced in `PromoGest.Domain` and a forward database migration (`G1`, `G2`). `AppDbContextModelSnapshot.cs` must reflect every EF entity/mapping change. Provider-specific database objects implemented only through migration SQL (for example deferred PostgreSQL constraint triggers) do not create a synthetic EF model delta; document why the snapshot remains unchanged and add PostgreSQL 18 integration tests for trigger behavior, migration preflight, and the Down path.
   - Monetary amounts must always use DZD `decimal` (`numeric(18,2)`) — never `float` or `double`.
   - **Authentication vs Authorization:** Authentication verifies who the user is (via HTTP-only `promogest_session` cookie + `SessionAuthenticationHandler`). Authorization verifies what the user is allowed to do (via seeded permissions and role assignments).
   - **Resource Scoping & `ProjectMember` Checks:** Global permissions govern application-wide features (e.g., creating projects, managing users), whereas `ProjectMember` explicit membership checks (`CanManageConstruction`, `CanManageSales`, `CanManageDocuments`) are strictly required for project-scoped business records (projects, structure, documents, customers, reservations). Not every API requires `ProjectMember` checks (e.g., organization status, authentication, global user management, audit logs do not).
   - **CSRF Enforcement:** Every unsafe `/api/*` request (POST, PUT, PATCH, DELETE) remains strictly mandatory to provide a valid `X-CSRF-TOKEN` header validated by `CsrfValidationMiddleware`.
   - **Audit Logging:** Every sensitive read/write/denial **must** invoke `IAuditWriter` before persistence completes (`G6`).
   - Do not modify `apps/local-web` without keeping `dev-api-middleware.ts` permissions/contracts synchronized (or explicitly marking preview gaps).
5. **Zero Placeholder Code & Zero Runtime Secret Leaks:**
   - Never add stub endpoints returning fake success, empty files, or unverified `mock` data inside `src/` or `apps/local-web/`.
   - Never embed API keys, static credentials, or default passwords in code or templates.

---

## 3. After Completing Development (Before Opening / Merging PR)

Execute the complete verification checklist locally and in CI before declaring work ready:

1. **Domain & Application Tests (`G1`, `G9`):**
   - Run `dotnet test tests/PromoGest.Domain.Tests` and `dotnet test tests/PromoGest.Application.Tests`.
   - Verify both valid paths **and** failure/boundary/denial assertions exist for every new rule.
2. **PostgreSQL 18 Real Integration Tests (`G2`, `G7`, `G9`):**
   - Verify clean build & execution of `dotnet test tests/PromoGest.IntegrationTests` against PostgreSQL 18 (real migrations, `promogest_app` least-privilege runtime role, audit append-only trigger, `pg_dump`/`pg_restore` impact where schema/storage changes).
   - Must specifically test:
     - Unauthenticated (`401`), missing global permission (`403`), non-member IDOR attempt (`403`), revoked membership (`403`), authorized member (`200/201`)
     - Missing/invalid `X-CSRF-TOKEN` (`403`)
     - Stale & racing `ConcurrencyStamp` (`409 Conflict`)
     - `AuditLog` insertion and error propagation on audit write failure.
3. **Frontend TypeScript, Pure Logic Tests & Bilingual UI Verification (`G8`):**
   - Run `npm --prefix apps/local-web run lint` (`tsc --noEmit` must exit `0`).
   - Run `npm --prefix apps/local-web test` (pure TS unit tests via `node:test`).
   - Run `npm --prefix apps/local-web run build` and `npm --prefix apps/local-web run build:aspnetcore` ensuring zero preview/mock leakage into `src/PromoGest.Api/wwwroot`.
   - Visually verify modified screens in **both** Arabic (**RTL**) and French (**LTR**) across desktop & mobile widths, confirming offline/disconnected behavior (`network-only` `/api/*`).
4. **Build, Publish & Operational Scripts (`G10`):**
   - Run `dotnet build PromoGest.sln -c Release`.
   - Confirm Linux/Windows publish scripts, Data Protection tests, and `scripts/verify-backup-restore.sh` compatibility remain intact when infrastructure, storage, config, or migrations change.
5. **Evidence-Backed Documentation Update:**
   - Update [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md), [DOMAIN-MODEL.md](DOMAIN-MODEL.md), [MODULE-CATALOG.md](MODULE-CATALOG.md), [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md), and [DECISION-LOG.md](DECISION-LOG.md) to reflect exact observed code, migrations, and passing test counts.
6. **Pull Request & CI Gate:**
   - Open an independent PR with the Change Record summary and exact CI/test evidence.
   - **Strict Merge Prohibition:** Never merge a PR while CI jobs fail or have unfixed warnings/compile errors.

---

## 4. Completion Rule ("Definition of Done")

The Definition of Done depends strictly on the applicable layers and scope of each requirement:
- **Documentation-Only Tasks:** Complete when canonical docs are updated, verified against code, internal links validated, and constraints respected (no source code or migration edits forced).
- **CLI / Infrastructure Tasks:** Complete when scripts/CLI tooling, integration tests, and configuration hardening pass successfully.
- **Full Feature / Vertical Slice Requirements:** Requires real end-to-end implementation across Schema + Domain + Application + Infrastructure + Controller + Frontend view, passing automated tests across Domain, Application, PG18 Integration, and Frontend, verified authorization & security, data/migration integrity, bilingual offline-safe UI, green CI, and synchronized canonical docs.
