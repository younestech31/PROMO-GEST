## Current repository snapshot — 23 November 2026 (after PR #217 & PR #219 merges)

- **Live source:** GitHub `main` was independently resolved to `3a46470acf1742d8827e1ff02cc63ef0fb7aebed` (PR #219 squash-merge SHA; open PRs = 0; `main` branch protection disabled / `protected=false`). Resolve the live branch ref again in every later session rather than treating this checkpoint as a permanent branch tip.
- **PR #219 (current `main` tip):** `chore(deps): bump the npm-minor-patch group with 2 updates` merged at `3a46470acf1742d8827e1ff02cc63ef0fb7aebed` (PR head `d96299e019a65ef85b5ce3d92045cf841394689a1`; `package.json`, `package-lock.json`). Exact merge-SHA push CI [#1315](https://github.com/younestech31/PROMO-GEST/actions/runs/45138203554) passed 3/3 jobs and CodeQL [#207](https://github.com/younestech31/PROMO-GEST/actions/runs/45138203515) passed 2/2 analyses.
- **PR #217:** `docs: synchronize security baseline after PR #214/#215` merged at `5694b0409a2c1c32dd443443450c8e0a60f91a6d` (exact PR head `e6af6fc37f6f60f45e7fdb237ac6ea001f93f05f`). PR-head CI [#1312](https://github.com/younestech31/PROMO-GEST/actions/runs/45078417725) passed 3/3 and CodeQL [#204](https://github.com/younestech31/PROMO-GEST/actions/runs/45078417732) passed 2/2; exact merge-SHA push CI [#1313](https://github.com/younestech31/PROMO-GEST/actions/runs/45078912704) passed 3/3 and CodeQL [#205](https://github.com/younestech31/PROMO-GEST/actions/runs/45078912730) passed 2/2.
- **PR #214:** documentation-only synchronization merged at `bea3f87679d72301b8f92a91364cf6a0b0492fdc`. Its PR-head CI #45075816774 passed all three jobs and CodeQL #45075816751 passed both analyses. Exact merge-SHA push CI #45076261957 passed 3/3 and CodeQL #45076261926 passed 2/2 on `main`, with matching `head_sha=bea3f87679d72301b8f92a91364cf6a0b0492fdc`.
- **PR #215:** eight-file HTTP security hardening merged at `fe8800cc239a998cda2b44d77cc83b9429c5ebf4`; exact PR head `6b64e4df9919ec6384e09f6838c674314887fe23`. PR-head CI #45076475525 passed Frontend, .NET 10/PostgreSQL 18, and Windows (3/3); CodeQL #45076475598 passed C# and JavaScript/TypeScript (2/2). Exact merge-SHA push CI [#1299](https://github.com/younestech31/PROMO-GEST/actions/runs/45076919285) passed 3/3 and CodeQL [#191](https://github.com/younestech31/PROMO-GEST/actions/runs/45076919249) passed 2/2 on `main`, with matching `head_sha=fe8800cc239a998cda2b44d77cc83b9429c5ebf4`.
- **PR #218:** host-prefixed session-cookie migration merged to `main` at `ecef870d3f09ff5fee6dd4a4cd4db6aab0174961`; exact PR head `d916b4dbf6c4bf85b5ce3d92045cf841394689a1`. PR-head CI #45077406445 passed all three jobs; CodeQL #45077406476 passed both C# and JavaScript/TypeScript analyses. The .NET 10/PostgreSQL 18 job passed Domain 49/49, Application 24/24, Integration 43/43, automated browser setup/logout checks, and the full database/storage/Data Protection restore drill. Exact push-triggered CI [#1306](https://github.com/younestech31/PROMO-GEST/actions/runs/45077878830) passed 3/3 and CodeQL [#198](https://github.com/younestech31/PROMO-GEST/actions/runs/45077878814) passed 2/2 on `main`, matching `head_sha=ecef870d3f09ff5fee6dd4a4cd4db6aab0174961`.
- **HTTP controls now on main:** CSP adds `object-src 'none'`; Production HSTS runs after forwarded-header processing with `max-age=86400`, no `includeSubDomains` and no `preload`; Development/preview does not emit HSTS. Kestrel explicitly sets a 30,000,000-byte request-body cap, 15-second request-header timeout and two-minute keep-alive timeout. The 30,000,000-byte cap and two-minute keep-alive match Kestrel's usual defaults; the header timeout is reduced from 30 seconds. The project-document endpoint retains its narrower 26 MiB upload limit.
- **AUD-20:** closed on main. Setup initialization is rate-limited per client IP (5/minute by default, bounded 1–60); guard denials persist append-only `SETUP_BOOTSTRAP_DENIED` events with anonymous actor, IP and User-Agent only. The limiter is in-process for the single-server-per-organization architecture. Denial-audit persistence is bounded to five seconds; on storage failure the request remains 403 and an operator error is logged.
- **AUD-22:** code remediation closed on `main`; deployment acceptance remains pending. PR #215 implements `object-src 'none'`, one-day Production HSTS after forwarded-header processing, and explicit Kestrel request/header/keep-alive limits. PR #218 (merge `ecef870d3f09ff5fee6dd4a4cd4db6aab0174961`) issues `__Host-promogest_session` in Production and HTTPS contexts with Secure/HttpOnly/Path=/ and no Domain, preserves the legacy name for plain-HTTP Development, and preserves partitioned HTTPS preview cookies. PR #218 tests cover Production login/me/logout, preview authentication, and local Development compatibility; CI and CodeQL passed on the exact PR head and merge SHA. Real Caddy HTTPS staging acceptance remains pending.
- **Local workspace boundary (23 November 2026 audit):** local workspace modifications adding Production HSTS/ForwardedHeaders spoofing and legacy-cookie rejection/revocation assertions in `tests/PromoGest.IntegrationTests/PostgresEndToEndTests.cs` plus this documentation-synchronization pass remain unpushed in the local workspace until committed to a branch/PR and verified by `.NET 10`/PostgreSQL 18 CI.
- **Operational acceptance:** no production host was configured or verified by PR #215/#218; no actual BitLocker/LUKS host evidence is implied by PR #212. P1-36 remains In Review / Verification Pending until Caddy staging acceptance is recorded; exact merge-SHA CI/CodeQL is green. P1-16 remains Blocked by P0-A01's outstanding manual first-run acceptance.
- **Phase/data boundary:** P0-A01 and P0-A04 manual operator acceptance remain `NOT_RUN`. P1-01/P1-35 remain Deferred / Pending; P1-02 remains Blocked; Phase 1 remains `IN_PROGRESS`; Phase 2–5 remain gated. No municipality approval/import, `valid_from`, production database, organization data, Google AI Studio Cloud SQL business data, schema/migration, credential, permission, CSRF, or branch-protection change was made.

---

## Historical repository snapshot — 22 November 2026 (before PR #214/#215; retained for provenance)

- **Audited source snapshot:** GitHub `main` was independently resolved at `5e361160cc29ce30947e3e7bea790f940a5c06a7` before this documentation-only synchronization. This SHA anchors the evidence below; it is not a promise that `main` remains at this SHA after this PR. Always resolve the live branch ref before starting work, merging, or reporting current repository state.
- **Product application/runtime baseline:** the last product application and aggregate-root runtime implementation remains PR #186 at `07cba896eec07bb28878d948a6cfb905313a2b22` (Project aggregate-root concurrency fix). PR #193 is a CI/packaging regression repair only; the 22 November P1-01 additions are evidence/validation artifacts and do not change the ASP.NET Core business runtime, React product behavior, EF schema, or production data.
- **Historical PR #188 evidence:** CI #44912565314 and CodeQL #44912565267 passed on historical snapshot `e6290cab7e784d7e83ef3c0108a2d74468ec3487`. Keep this as dated historical verification, not the live branch tip.
- **P1-01 supplement provenance:** commit `a7d1c549ae462e7ca9546606cd1ccd7bd62fcf77` was pushed directly to `main` at 2026-11-22 11:57:52 UTC. GitHub compare showed **15 changed paths**, not the 10 reported: the supplement, validator, tests and documentation were accompanied by an unintended root `package-lock.json` change and two backup-script mode changes. The Q110 supplement provides 102 new unique readings alongside 8 already covered rows (110/110 coverage); all remain pending practitioner decision. The post-1985 supplement has 38 records: 23 bilingual FR/AR PNG-verified, 4 Arabic-body PNG with existing French extraction, 3 partial-cache/body-gap cases, and 8 primary naming acts not located in cache. PNG hashes prove rendered image-byte identity, not PDF source identity or legal approval.
- **Original CI regression:** push CI [#45019855756](https://github.com/younestech31/PROMO-GEST/actions/runs/45019855756) failed at `npm ci` with EUSAGE because the rewritten lockfile did not match unchanged `package.json`. The same commit changed `scripts/check-backup-freshness.sh` and `scripts/test_check-backup-freshness.sh` from Git mode `100755` to `100644` while preserving file-content blobs. Original CodeQL [#45019855774](https://github.com/younestech31/PROMO-GEST/actions/runs/45019855774) passed both language analyses; that did not compensate for failed CI.
- **Bounded repair:** PR [#193](https://github.com/younestech31/PROMO-GEST/pull/193) restored the previously synchronized root lockfile and restored both backup scripts to mode `100755`, with unchanged script contents. Exactly three paths changed; no product runtime, tests, migrations, DB schema, business data, authorization, or security-policy changes were part of this repair. It merged at audited source snapshot `5e361160cc29ce30947e3e7bea790f940a5c06a7`.
- **PR-head verification:** CI [#45020548509](https://github.com/younestech31/PROMO-GEST/actions/runs/45020548509) passed all three jobs (Frontend, .NET 10/PostgreSQL 18, Windows); CodeQL [#45020548471](https://github.com/younestech31/PROMO-GEST/actions/runs/45020548471) passed C# and JavaScript/TypeScript.
- **Post-merge verification on the exact audited SHA:** main CI [#45020871059](https://github.com/younestech31/PROMO-GEST/actions/runs/45020871059) passed all three jobs. Frontend dependency install, security/territorial validators, strict TypeScript, lint, tests, build and static hosting passed; .NET 10/PostgreSQL 18 solution build, domain/application tests, migration and least-privilege integration checks, and database/storage/Data Protection restore drill passed; Windows publish and PowerShell/backup checks passed. CodeQL [#45020871024](https://github.com/younestech31/PROMO-GEST/actions/runs/45020871024) passed both C# and JavaScript/TypeScript analyses on the same SHA.
- **Branch-tip rule:** after this docs-only PR merges, the live `main` SHA will change again. Do not call this audited SHA the current tip after merge; resolve `main` directly every session.
- **P1-15 acceptance boundary:** the aggregate-root concurrency implementation and deterministic PostgreSQL 18 coverage are merged, but keep the capability `IMPLEMENTED_NOT_VERIFIED` and task In Review / Pending until actual manual Arabic RTL / French LTR acceptance is evidenced. Automated checks do not replace practitioner/operator acceptance.
- **P1-01 remains the Phase 1 gate:** P1-01 stays In Progress / Pending; all 1,541 master-ledger practitioner sign-offs remain PENDING. `W30-R007` remains NEEDS_EVIDENCE (proposed code `3021`; `valid_from` and reviewer decision remain blank). Eight primary naming acts remain uncached, three source-body image items remain incomplete, and Arabic review of Decrees 92-412 and 06-256 remains outstanding. No commune records are imported (`communesCount = 0`); P1-02 remains Blocked. Q110 visual coverage and CI validators do not constitute legal acceptance. No Phase 2–5 advancement is authorized.
- **Repository governance risk:** GitHub reports `main` branch protection disabled and required status-check enforcement off. This was observed and recorded, not changed by these tasks. Do not interpret green manually inspected checks as branch-level enforcement.
- **Production/data boundary:** no production database, local customer data, Cloud SQL business data, commune imports, credentials, roles, permissions, authorization policy, CSRF, immutable audit, deployment configuration, or branch protection settings were changed by this documentation synchronization or PR #193.

---

## Historical checkpoint — PR #186 (superseded by PR #187 main verification)

- **PR #186 merge commit (implementation baseline):** `07cba896eec07bb28878d948a6cfb905313a2b22`; PR [#186](https://github.com/younestech31/PROMO-GEST/pull/186) was squash-merged.
- **P1-15 implementation:** existing ProjectMember role/capability changes now touch the owning Project aggregate root. The root ConcurrencyStamp serializes concurrent membership mutations across different child rows; the losing EF transaction returns HTTP 409 `CONCURRENCY_CONFLICT` and rolls back the membership mutation and pending audit event.
- **PR-head evidence only:** PR-head CI #44909430011 and #44909433367 passed all three jobs (Frontend, .NET 10/PostgreSQL 18 least-privilege/integration, Windows publish/PowerShell); CodeQL #44909433309 passed JavaScript/TypeScript and C# on PR head 405cd8c3f8169043ce18315391cc4dfbcb1b2f11. These are PR-head results, not post-merge main results.
- **Post-merge evidence boundary:** the available commit-workflow-run query (which returns PR-triggered runs only) and combined-status query returned no post-merge main checks for this SHA. Do not claim post-merge CI/CodeQL success from the PR-head results.
- **P1-15 status:** `IMPLEMENTED_NOT_VERIFIED`; task remains In Review / Pending pending independently evidenced post-merge checks and required manual Arabic RTL / French LTR acceptance.
- **Phase gate unchanged:** P1-01 remains In Progress / Pending; all 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; P1-02 remains Blocked; no commune records imported and `communesCount = 0`. No Phase 2–5 advancement.
- **Security/data boundary:** no schema migration, production data, role/permission policy, authorization bypass, or cloud business-data change was made.

---

# PROMO GEST — Development Workflow & Engineering Governance

**Document Role:** Mandatory operational procedure before, during, and after every change in PROMO GEST. Designed to enforce local-first data sovereignty, Clean Architecture boundaries, database integrity, and evidence-backed status tracking.  
**Related References:** [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) · [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) · [MASTER-ROADMAP.md](MASTER-ROADMAP.md) · [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md) · [REQUIREMENT-TRACEABILITY.md](REQUIREMENT-TRACEABILITY.md) · [DECISION-LOG.md](DECISION-LOG.md) · [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md)

**Historical repository checkpoint before PR #186 — 21 November 2026:** main SHA `1914703bce77aaeda49830a396d39acce04ea58f` after PR #184; post-merge main CI #44840514137 and CodeQL #44840514142 passed on the exact SHA. PR #184 adds P1-11 Migration #15 for Algeria-only customer-phone key canonicalization; PR-head CI #44839944794 and CodeQL #44839944849 passed. P1-11 / Migration #15 canonicalizes only an Algerian national phone consisting of 10 digits beginning with 0 to `213` plus its final nine digits; other international prefixes remain distinct. It updates only derived `project_customers.normalized_phone`, fails closed on invalid lengths/collisions, and does not merge/delete Party or ProjectCustomer records. Domain 48/48, Application 24/24 and PostgreSQL 18 Integration 37/37 passed; Frontend 28/28 steps, Windows 14/14 and .NET/PG18 job 26/26 passed. CI exercised disposable databases only: no organization-local customer database has been preflighted or migrated. P1-11 remains In Review / Pending and capability `IMPLEMENTED_NOT_VERIFIED` until backup/restore, quiesced writes, local preflight, disposable rehearsal and approved operator acceptance are evidenced. PR #179's Windows `PromoGestBackupFreshnessMonitor` remains an earlier feature; its separate local-admin installation and deliberate failure-case acceptance remains outstanding.

**Operational acceptance boundary:** this repository change did not install a task on any customer/production machine. Require an authorized local administrator to install on a disposable on-premises Windows host, confirm SYSTEM access to the actual offsite target, inspect `LastTaskResult`, and demonstrate a deliberately failing freshness case. Task Scheduler history is the current signal; no email/SMS forwarding is included.

**Current delivery gate:** P1-25 remains In Review / Pending pending actual Windows installation/failure-case evidence; P1-26 and P1-27 are Done / Verified (P1-27 is the earlier PR #180 baseline sync). P1-11 is technically merged but remains In Review / Pending (`IMPLEMENTED_NOT_VERIFIED`) pending local operator acceptance; PR #185 updates its runbook and current docs baselines. P1-01 remains In Progress / Pending with all 1,541 practitioner sign-offs pending; P1-02 remains Blocked. Phase 1 remains IN_PROGRESS; no commune import or Phase 2–5 advancement is inferred.
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
   - [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md) (live main ref as resolved at audit time, last code-changing source SHA, latest CI evidence, preview boundaries, and remaining Phase 0 gates)
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
   - **Authentication vs Authorization:** Authentication verifies who the user is (via HTTP-only session cookie — `__Host-promogest_session` in Production and HTTPS contexts, or `promogest_session` in plain-HTTP Development only — + `SessionAuthenticationHandler`, rejecting legacy non-prefixed tokens in secure contexts). Authorization verifies what the user is allowed to do (via seeded permissions and role assignments).
   - **Resource Scoping & `ProjectMember` Checks:** Global permissions govern application-wide features (e.g., creating projects, managing users), whereas `ProjectMember` explicit membership checks (`CanManageConstruction`, `CanManageSales`, `CanManageDocuments`) are strictly required for project-scoped business records (projects, structure, documents, customers, reservations). Not every API requires `ProjectMember` checks (e.g., organization status, authentication, global user management, audit logs do not).
   - **CSRF Enforcement:** Every unsafe `/api/*` request (POST, PUT, PATCH, DELETE) remains strictly mandatory to provide a valid `X-CSRF-TOKEN` header validated by `CsrfValidationMiddleware`.
   - **Audit Logging:** Every sensitive read/write/denial **must** invoke `IAuditWriter` before persistence completes (`G6`).
   - Do not modify `apps/local-web` without keeping `dev-api-middleware.ts` permissions/contracts synchronized (or explicitly marking preview gaps).
5. **Zero Placeholder Code & Zero Runtime Secret Leaks:**
   - Never add stub endpoints returning fake success, empty files, or unverified `mock` data inside `src/` or `apps/local-web/`.
   - Never embed API keys, static credentials, or default passwords in code or templates.

6. **Vite Development Preview Isolation (P1-14):**
   - The normal development path uses the real ASP.NET Core API: `npm run dev` starts `scripts/dev-with-local-api.sh`, which requires a ready `ASPNETCORE_URL` or configured Cloud SQL development target before starting Vite. For the dedicated Google AI Studio Cloud SQL development runner use `npm run dev:cloudsql`; it applies migrations with the separate migration identity, starts the API with the restricted runtime identity, waits for `/health/ready`, and then starts the UI. Use fictional test data only; Cloud SQL is development/test only, never production business storage.
   - The disposable in-memory demo is a separate mode. Enable it only with `PROMOGEST_VITE_ONLY=1`; do not configure `ASPNETCORE_URL` or any of `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, or `SQL_ADMIN_PASSWORD`. Both Vite configuration entry points enforce this boundary. The demo is in-memory, non-persistent, and is not evidence of API, PostgreSQL 18, permissions, migrations, restore, or production behavior.
   - Vite binds to `127.0.0.1` by default. A temporary external preview requires `PROMOGEST_VITE_ALLOW_EXTERNAL=1`, a comma-separated exact hostname/IP list in `PROMOGEST_VITE_ALLOWED_HOSTS`, and comma-separated exact HTTP(S) origins in `PROMOGEST_VITE_ALLOWED_ORIGINS` (no wildcards, URL paths, query strings, or credentials). Add only the exact preview host/origin supplied by the platform; never use wildcard allowlists.
   - Host/origin allowlists and CORS are not authentication. Any external listener also requires restrictive Google AI Studio/platform network ingress. Never expose Vite or its in-memory demo directly to a public or production network. Do not treat an external preview link as proof of a protected API session.

---

## 3. After Completing Development (Before Opening / Merging PR)

Execute the complete verification checklist locally and in CI before declaring work ready:

0. **P1-01 Territorial Workpaper Integrity (documentation/data-reference changes):**
   - Run `python3 scripts/validate-jo44-reference-extracts.py` and `python3 scripts/validate-p1-01-working-crosswalk.py`.
   - Run `python3 scripts/p1_01_decision_book.py` (read-only validation) and `python3 scripts/test_p1_01_decision_book.py`.
   - Use `--init` only when the decision book does not exist; never delete or overwrite an existing reviewer workbook to recover from a failed initialization. Preserve its decisions and make an explicit reconciled copy.
   - These validators assert structural/provenance consistency and preserve unapproved states; they are not legal-source verification, practitioner sign-off, or import authorization.
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
