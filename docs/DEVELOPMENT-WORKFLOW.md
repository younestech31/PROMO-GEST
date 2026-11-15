# PROMO GEST — Development Workflow & Engineering Governance

**Document Role:** Mandatory operational procedure before, during, and after every change in PROMO GEST. Designed to enforce local-first data sovereignty, Clean Architecture boundaries, database integrity, and evidence-backed status tracking.  
**Related References:** [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) · [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) · [MASTER-ROADMAP.md](MASTER-ROADMAP.md) · [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) · [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) · [DECISION-LOG.md](DECISION-LOG.md)

---

## 1. Before Starting Any Change

Every contributor or engineering session **must** complete these 5 preparation steps before editing code, migrations, or docs:

1. **Read the Canonical Engineering Suite:**
   - [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) (status taxonomy & scope boundaries)
   - [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) (verified commit state, active blockers, CI reality)
   - [DOMAIN-MODEL.md](DOMAIN-MODEL.md) (literal schema, concurrency, Party vs ProjectCustomer rules)
   - [SECURITY-AND-PERMISSIONS.md](SECURITY-AND-PERMISSIONS.md) (hashing, cookies, CSRF, 18 permissions, `ProjectMember` rules)
   - [MASTER-ROADMAP.md](MASTER-ROADMAP.md) (dependencies & phase sequencing)
   - Applicable ADRs in `docs/ADR/` (`0001–0010`) and [DECISION-LOG.md](DECISION-LOG.md).
2. **Verify Prerequisite Dependencies:**
   - Check [MASTER-ROADMAP.md](MASTER-ROADMAP.md) and [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) to ensure the target module is **unblocked** (for example: no Phase 2 Contracts work while Phase 0 `CS7036` / C2 blockers or `K-Min` remain open).
   - For Algerian legal, notarial, VSP/FGCMPI, territorial, or SCF/tax features, verify whether **Practitioner Sign-Off** exists in [DECISION-LOG.md](DECISION-LOG.md) Section 3 before encoding statutory rules.
3. **Write a Brief Change Record (Task / PR Brief) Covering 6 Mandatory Elements:**
   - **Goal:** Exact business/technical outcome (vertical slice).
   - **Dependencies:** Upstream tables, modules, permissions, or sign-offs required.
   - **Risks:** Security, concurrency, migration rollback, data integrity, or offline/LAN failure modes.
   - **Affected Files & Layers:** `Domain`, `Contracts`, `Application`, `Infrastructure`, `Api`, `apps/local-web`, `tests/`.
   - **Explicit Non-Goals:** What will *not* be touched in this change.
   - **Acceptance Criteria:** Exact tests, permission checks, UI direction checks (`ar` RTL + `fr` LTR), and gates (`G1–G10`) that prove completion.
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
   - Work in a focused feature/fix/docs branch (never push directly to `main`, never commit straight to `main`).
   - One PR = one coherent vertical slice or cohesive bug-fix batch.
2. **Prohibited Mixing & Sweeping Refactors:**
   - **Never** mix unrelated module additions, opportunistic rewrites, or cosmetic folder shuffles into an active bugfix or vertical-slice PR.
   - **Never** rewrite working modules merely for stylistic cleanup.
3. **Dependency Discipline:**
   - Do **not** start coding blocked downstream modules (e.g., Phase 2 Contracts before `K-Min`; Phase 3A Collections before Contracts; Phase 4 SCF before Phase 2/3A & CPA sign-off).
   - If a new technical dependency, schema change, or cross-module coupling emerges during coding: stop, document the ADR or decision update in [DECISION-LOG.md](DECISION-LOG.md) and [MASTER-ROADMAP.md](MASTER-ROADMAP.md), and update [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md).
4. **PostgreSQL 18 First-Class Integrity:**
   - Every new entity invariant (singletons, partial unique constraints, valid state enums, immutability triggers, positive DZD amounts) **must** live in **both** `PromoGest.Domain` **and** a forward EF Core migration + `AppDbContextModelSnapshot.cs` (`G1`, `G2`).
   - Monetary amounts must always use DZD `decimal` (`numeric(18,2)`) — never `float` or `double`.
   - Every sensitive read/write/denial **must** invoke `IAuditLogger` before persistence completes (`G6`).
   - Every unsafe `/api/*` state-changing route must remain protected by `CsrfValidationMiddleware` (`X-CSRF-TOKEN`), session auth (`promogest_session`), permission check, and explicit `ProjectMember` check (`G3`, `G4`).
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
   - Open an independent PR with the 6-item Change Record summary and exact CI/test evidence.
   - **Strict Merge Prohibition:** Never merge a PR while `frontend`, `backend-and-postgres`, or `windows-publish-and-powershell` CI jobs fail or have unfixed warnings/compile errors.

---

## 4. Completion Rule ("Definition of Done")

A task, requirement (`REQ-*`), or ERP module is **never** considered complete unless **all 7 criteria** below are satisfied simultaneously with verifiable evidence:

1. **Real End-to-End Implementation:** Schema + Domain + Application + Infrastructure + Controller + Frontend view exist with real PostgreSQL persistence (zero stub/fake fallbacks).
2. **Automated Test Coverage Passed:** Corresponding tests exist and **passed** across Domain (`PromoGest.Domain.Tests`), Application (`PromoGest.Application.Tests`), PG18 Integration (`PromoGest.IntegrationTests`), and Frontend (`apps/local-web`).
3. **Verified Authorization & Security:** Permissions, `ProjectMember` scope, CSRF, optimistic concurrency (`409`), and immutable `AuditLog` assertions explicitly pass — including denial paths (`401`/`403`/`409`).
4. **Data & Migration Integrity:** Migrations apply cleanly upward from empty DB and from previous baseline, matching `AppDbContextModelSnapshot.cs` cleanly under `promogest_owner` while runtime works cleanly under least-privilege `promogest_app`.
5. **Bilingual Offline-Safe UI:** Verified in Arabic (`RTL`) and French (`LTR`) with proper DZD formatting, zero secrets/tokens in browser storage, and zero unhandled console errors.
6. **Green CI Across All Jobs:** Full GitHub Actions run (`frontend`, `backend-and-postgres`, `windows-publish-and-powershell`) passed on the PR commit without skipping tests.
7. **Synchronized Canonical Docs:** Traceability matrix (`REQUIREMENT-TRACEABILITY.md`), `CURRENT-STATE-BASELINE.md`, and relevant ADRs match the merged commit 1-to-1.
