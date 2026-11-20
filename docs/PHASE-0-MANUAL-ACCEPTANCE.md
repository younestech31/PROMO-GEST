# PROMO GEST — Phase 0 Manual Browser & Real-API Acceptance

**Document role:** Executable acceptance protocol for the remaining Phase 0 browser and real-API evidence.  
**Historical audit baseline (17 November 2026):** The inspected `main` commit is `16ed3fdd93a4a2685d37433b0eed5cdf256f953d` (PR #90 merge). Main CI [Run #787](https://github.com/younestech31/PROMO-GEST/actions/runs/44129809872) passed all 3 required jobs on that exact SHA: frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration/restore, and Windows x64/PowerShell validation.
**P0 implementation status:** PR [#85](https://github.com/younestech31/PROMO-GEST/pull/85) (first-run handoff to normal login) and PR [#86](https://github.com/younestech31/PROMO-GEST/pull/86) (server-confirmed logout) are merged. Their automated regression coverage is present in `main`; the integration suite includes empty-database exactly-once setup and logout/session replay-rejection tests.  
**PR #150 automated-browser checkpoint:** [main CI #1017](https://github.com/younestech31/PROMO-GEST/actions/runs/44654878332) passed 3/3 on `d85fe816eb00e8b5bfe17f17e5d993eb3c4da0db`; [download the post-merge browser evidence](https://github.com/younestech31/PROMO-GEST/actions/runs/44654878332/artifacts/14592233583). The current integrated main is `a306487d06068649bbffbc2b5ef2e05c4dcac102`; [main CI #1029](https://github.com/younestech31/PROMO-GEST/actions/runs/44728401646) also passed all three required jobs, but CI #1029 is not a human operator acceptance result. For manual execution use the [Arabic operator worksheet](PHASE-0-OPERATOR-CHECKLIST.ar.md).

**P0-A01 / P0-A04 — automated real-browser evidence: PASS; full manual operator acceptance: NOT_RUN.** [PR #150](https://github.com/younestech31/PROMO-GEST/pull/150), [run 44653288979, backend job](https://github.com/younestech31/PROMO-GEST/actions/runs/44653288979/job/136013374722), tested PR head `451e57e` in the CI merge checkout. Chrome drove the published SPA and ASP.NET Core 10 API over loopback, with a fresh PostgreSQL 18 database per profile, separate migration/runtime identities and fictional data. Both cases passed in Arabic RTL and French LTR at 1440×900 and 390×844. Mobile here means a browser viewport, not a physical phone.

| Case | Observed in each profile |
|---|---|
| P0-A01 | Started with zero organizations/users/admin role assignments. Wizard returned 201 and handed off to localized login; `/api/auth/me` remained 401. Re-submission returned 409 `SETUP_ALREADY_INITIALIZED`; database counts remained 1/1/1. Explicit login returned 200. |
| P0-A04 | Aborting the logout request left the authenticated session active (200) and showed the localized warning and retry. Retry reached the real server (204). Current and previously valid session clients both received 401. Reopening and reloading `/admin/users` returned to login. |

[Evidence archive](https://github.com/younestech31/PROMO-GEST/actions/runs/44653288979/artifacts/14591324179): four `result.json` files and three sanitized screenshots per profile; GitHub-reported archive SHA-256 `25581ef7b2f68b3d1b9caa764b0c3a03bf5e40f0dd672253822d13b3e48fdf4b`. Download before the 30-day retention expires if required for the release record. No human visual inspection or signature is asserted by this run. For manual closure a named operator must execute the two cases in §5A using the §4 profiles and record the observations and disposition; preserve D-010 and the existing P0-A02/A03/A05 and P0-B–G attestations. This does not authorize production release.

**Operator tooling added after the automated-browser checkpoint — 20 November 2026:** PR [#152](https://github.com/younestech31/PROMO-GEST/pull/152) packages the local disposable PostgreSQL 18 browser kit; PR [#153](https://github.com/younestech31/PROMO-GEST/pull/153) supports private Codespaces forwarding with a session bootstrap token; PR [#154](https://github.com/younestech31/PROMO-GEST/pull/154) adds an interactive repeat-setup helper and records scoped Arabic/French mobile observations. The recorded mobile observations omit one or more required status/session-replay steps and do not cover all four operator profiles. The blank Arabic worksheet remains the source of the human result record. Do not change P0-A01/P0-A04 to PASS until every required step is executed and sanitized evidence is recorded.

**Primary references:** [CURRENT-STATE-BASELINE.md](CURRENT-STATE-BASELINE.md), [QUALITY-AND-RELEASE-GATES.md](QUALITY-AND-RELEASE-GATES.md), [GOOGLE-AI-STUDIO-CLOUD-SQL.md](GOOGLE-AI-STUDIO-CLOUD-SQL.md), and [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md).

---

## 1. Purpose and acceptance boundary

Phase 0 requires evidence from the actual React UI calling the ASP.NET Core 10 API and PostgreSQL 18. The purpose is to verify principal user workflows, persistence after reload, authentication/CSRF behavior, authorization boundaries, and Arabic RTL / French LTR presentation.

This protocol does **not**:
- Treat the Vite-only in-memory simulator as evidence of API, database, authentication, or persistence behavior.
- Treat a successful `/health/ready` response as proof that all EF migrations and feature tables are current.
- Treat a page opening successfully as proof that its create/update/cancel operations work.
- Validate statutory contracts, Algerian tax calculations, SCF posting, or production installation. Those remain governed by their later phases and practitioner gates.
- Authorize destructive resets of a shared development database or any production database.

## 2. Environment prerequisites

Run against one of these non-production targets:

1. The real ASP.NET Core API behind the Google AI Studio Vite proxy with the dedicated Cloud SQL development database; or
2. A local ASP.NET Core 10 + PostgreSQL 18 environment using the production-like API path.

For Google AI Studio:
- Use `npm run dev:cloudsql`, or the verified `npm run dev` real-API launcher with its required server-side environment.
- Require distinct migration/admin and runtime database identities. The launcher must complete migrations and least-privilege grants before starting Vite.
- Use the actual API proxy target. Do not set `PROMOGEST_VITE_ONLY=1` for these tests.
- Confirm the API is ready and inspect launcher logs if startup fails. `/health/ready` checks database connectivity and organization initialization; it does not independently prove migration history is current.
- Remember that Linux Development Data Protection keys may be ephemeral and uploaded file bytes are stored in the preview container's local filesystem. Re-authenticate after an API restart if necessary; use only disposable test files.

**Data safety:** Use fictional organizations, projects, people, and documents only. Do not enter real customer, employee, property, financial, contract, identity, password, cookie, or token data. Do not paste secrets or raw authenticated HAR files into the PR or issue tracker.

## 3. Test actors and synthetic records

Prepare the actors in a dedicated test organization/database. Keep the one-`SYSTEM_ADMIN` invariant intact.

| Actor | Intended test scope |
|---|---|
| `QA-SYSADMIN` | First-run/bootstrap and technical administration; not used as a substitute for a business approver |
| `QA-PM-A` | Explicit ProjectManager member of Project A |
| `QA-SALES-A` | Project A member with the required sales capability and assigned global role permissions |
| `QA-VIEWER-A` | Read-only or limited member of Project A |
| `QA-NONMEMBER` | Authenticated user with no membership in Project A or Project B |

Use clearly fictional identifiers, for example:
- Organization: `PROMO GEST QA — DEV`
- Projects: `QA-UI-AR-01` and `QA-UI-FR-02`
- Customers: `QA PERSON AR 001` and `QA ENTITY FR 002`
- Units: `QA-A-B1-F01-U001`
- Documents: a small generated `qa-acceptance.txt` and a harmless test PDF.

Do not assign roles or permissions by assumption. Record the actual seeded organization role and explicit `ProjectMember` capability flags used for each actor.

For first-run setup, use a **separate empty disposable database**. Never reset an already initialized shared database to repeat the wizard test.

## 4. Browser and language matrix

Run all principal screen checks in both languages, on the same supported browser:

| Profile | Viewport | Language | Expected document direction |
|---|---:|---|---|
| Desktop Arabic | 1440 × 900 | `ar` | `dir="rtl"` |
| Desktop French | 1440 × 900 | `fr` | `dir="ltr"` |
| Mobile Arabic | 390 × 844 | `ar` | `dir="rtl"` |
| Mobile French | 390 × 844 | `fr` | `dir="ltr"` |

For each view, check:
- The document `lang` and `dir` values follow the selected language.
- Labels, field order, navigation, tables, dialogs, dates, and action buttons remain legible and correctly aligned.
- Mixed-direction values (project codes, phones, email addresses, identifiers, and DZD amounts) remain readable and are not visually reversed.
- No modal or drawer traps content outside the viewport; scrollable content and close controls remain usable.
- Switching language does not silently clear form values or change the active record.
- No browser console exception or unhandled rejected request occurs during the workflow.

The language selector and root `dir` update are source-backed; this matrix is a manual browser acceptance requirement, not a claim that these layouts have already passed.

## 5. Workflow acceptance cases

Record each case as `NOT_RUN`, `PASS`, `FAIL`, or `BLOCKED`. A case passes only when both the visible UI result and the corresponding persisted/API result are confirmed.

### A. Installation and authentication

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-A01 | On a separate empty disposable database, complete first-run setup with fictional organization details and one System Administrator. | Setup succeeds once; exactly one organization and one `SYSTEM_ADMIN` exist; the UI transitions to the normal login page without assuming setup issued a session cookie; the organization name/default language and a bilingual completion notice are shown. Sign in explicitly with the administrator credentials just created. A second initialization is rejected safely. |
| P0-A02 | Open the login page in Arabic, then French; submit valid synthetic credentials. | Both languages render correctly; successful sign-in loads the authenticated shell and only the projects authorized for that actor. |
| P0-A03 | Reload the page after login. | Session restoration is successful while the session is valid. No bearer/session token is stored in localStorage or sessionStorage. |
| P0-A04 | Sign out, then revisit/reload an authenticated route. Also simulate an unreachable API or rejected logout response on a disposable test session. | A confirmed logout response clears the UI session; a follow-up `/api/auth/me` returning 401 also confirms revocation. A protected API request and replay of the pre-logout cookie are denied. When logout cannot be confirmed (network error or a non-revoking error response), the UI must keep the authenticated state visible, explain that logout is unconfirmed, and offer retry; it must not simulate logout by clearing React state alone. |
| P0-A05 | Perform a state-changing request without a valid CSRF token in a controlled test. | Request is rejected with the expected CSRF error; do not weaken or bypass the middleware to make the test pass. |

For cookies, inspect attributes without copying values: production HTTPS uses the configured secure HTTP-only policy; the Google preview may apply its documented Development preview cookie policy. Never include cookie, CSRF, or authorization values in captured evidence.

### B. Organization overview and project directory

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-B01 | Open Overview as each applicable actor. | Organization identity and accessible-project information load. A transient health-probe failure does not create a false global disconnected/offline-write state. |
| P0-B02 | Open the project directory as `QA-PM-A` and `QA-NONMEMBER`. | The directory contains only projects authorized for the signed-in actor. No hidden project names, summaries, counts, or details are exposed. |
| P0-B03 | Create a fictional project, then reload the directory. | The new project appears once with its persisted code, bilingual names, location, status, and DZD budget. |
| P0-B04 | Update a permitted project with the current concurrency stamp, then attempt a stale update in a controlled test. | Fresh update succeeds; stale update returns a conflict and does not overwrite the latest record. |
| P0-B05 | Open the project-team access form and assign/remove a test member. | Membership and capability changes persist; the last ProjectManager guard is preserved. A revoked member loses access on the next API request. |

### C. Project structure and unit inventory

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-C01 | Open Project A structure and inspect its building/floor/unit tree. | Only Project A records are returned; empty states and loading/errors are understandable in both languages. |
| P0-C02 | Create a building, floor, and unit with synthetic values. | Each item appears in the correct parent and remains after reload; duplicate building/floor/unit keys are rejected. |
| P0-C03 | Update building, floor, and unit details using the latest concurrency stamp. | Updates persist; stale updates produce a conflict without data loss. |
| P0-C04 | Change a unit through an allowed physical status transition. | The new status persists; an invalid direct transition (for example, directly marking a unit as sold/delivered) is rejected. |
| P0-C05 | Try to read or manage Project A structure as `QA-NONMEMBER`, including a request using Project A's ID. | The API denies the operation and records the required security audit; client-side hiding alone is not sufficient. |

**Authorization boundary:** current source checks explicit project membership, `projects.read` for structure reads, and both `projects.structure.manage` and explicit `ProjectMember` capability (`CanManageConstruction` or `ProjectManager`) for structure mutations. `SITE_ENGINEER`, `PROJECT_DIRECTOR`, and `SYSTEM_ADMIN` receive `projects.structure.manage`.

### D. Customers and CRM interactions

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-D01 | Open Project A customer registry and search/select a synthetic Party. | Only permitted project customer details are displayed; canonical Party identity is selected without exposing other projects' private contact data. |
| P0-D02 | Create a person and a legal-entity customer with fictional contact details. | Both records persist in Project A and appear once after reload. |
| P0-D03 | Update customer contact/status details and save with the current concurrency stamp. | Changes persist; stale updates return a conflict. |
| P0-D04 | Add a call/visit/note interaction and a future follow-up date. | Interaction appears in the customer timeline after reload with the expected date and actor. |
| P0-D05 | Link the same canonical Party to a second authorized project, then attempt an identity change that would collide with another customer's name/phone combination. | Shared identity behavior remains consistent; collisions are rejected before mutation and concurrency stamps advance only on successful changes. |
| P0-D06 | Attempt to read Project A customer details or identity documents as `QA-NONMEMBER` or without the required file permission. | Private project details and identity-document downloads are denied and audited; organization-wide Party lookup does not grant access to project-specific PII. |

### E. Internal unit holds (not statutory contracts)

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-E01 | Create a hold for an available unit and a customer in the same project, with an expiry. | A single active hold is created; the unit moves from `AvailableForSale` to `Reserved`. |
| P0-E02 | Attempt a second active hold for the same unit from a separate session. | The duplicate/racing attempt is rejected; the database invariant allows only one active hold. |
| P0-E03 | Cancel the hold with a reason. | Hold closes, unit returns to `AvailableForSale`, and the result remains after reload. |
| P0-E04 | In an isolated test record, allow a short-lived hold to expire and refresh the list. | Expiry worker closes the hold and releases the unit. Confirm through the API/database-backed UI, not a mock preview. |

A `ProjectSalesReservation` is an **internal unit hold only**. It is not a Law 11-04 statutory reservation contract, does not collect a deposit, and does not create cash, installments, tax events, or accounting entries.

### F. Project documents

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-F01 | Upload the generated harmless test file with a category and description. | Upload succeeds, document appears in the project list, and metadata matches the submission. |
| P0-F02 | Download the uploaded document and compare its SHA-256 checksum with the original local test file. | Bytes match exactly; filename and content type are sensible; response is not served from a stale cache. |
| P0-F03 | Attempt a disallowed extension/content signature and a file above the configured size limit using disposable files. | Invalid uploads are rejected with safe errors; no orphaned successful-looking record is shown. |
| P0-F04 | Attempt project-document list/download/upload as a non-member or a member without the required file permissions. | Access is denied; no cross-project document bytes or metadata are revealed. |

### G. Audit and safe error handling

| ID | Action | Expected result and evidence |
|---|---|---|
| P0-G01 | Perform one authorized project/customer/document mutation. | The expected audit event is visible to an authorized audit viewer with the correct actor, target, and event type. |
| P0-G02 | Attempt one unauthorized project/customer/Party operation. | An `ACCESS_DENIED` audit event is written before the operation is rejected. |
| P0-G03 | Trigger a controlled stale concurrency update. | API returns a conflict; the last valid value remains unchanged. |
| P0-G04 | Trigger a controlled validation or file error. | The UI shows a safe operation-level error; no stack trace, secret, token, or internal connection string is exposed. |
| P0-G05 | After any ambiguous create/update response (especially a 500), inspect the list/detail endpoint before retrying the mutation. | The tester verifies whether the first request persisted. No duplicate is created by blind retry. Record the trace ID, never credentials or request cookies. |

## 6. Owner-attested execution record — 15 November 2026

**Evidence source:** explicit Product Owner confirmation in the PROMO GEST project conversation on 15 November 2026. The Product Owner stated that the following workflows were exercised and work correctly:

- Arabic RTL and French LTR on desktop and mobile.
- Login, session handling, and CSRF.
- Projects and project structure.
- Customers and customer interactions.
- Internal hold creation, cancellation, and expiry.
- Document upload/download and SHA-256 integrity comparison.
- Authorization, audit events, concurrency conflicts, and safe errors.
- Persistence after page reload.

**Register mapping:** the owner confirmation is recorded as `PASS` for P0-A02, P0-A03, P0-A05, and P0-B through P0-G, across all four browser profiles. The owner explicitly confirmed persistence/reload and API-backed business behavior in the listed workflows. This is an owner-attested manual acceptance result; it is not represented as an automated test, CI assertion, or an artifact independently inspected by engineering.

**Explicit boundary:** P0-A01 and P0-A04 remain `NOT_RUN`: the confirmation did not specifically state that first-run initialization was exercised against a separate empty disposable database with a second initialization rejected, or that logout was followed by a protected-route/session-revocation check. Do not infer this scenario from normal login/session testing.

**Artifact limitation:** the Product Owner did not attach per-case timestamps, tester initials, browser name/version, sanitized screenshots/recordings, or redacted API response/trace records in the conversation. The attestation is retained as the source of the result; no such artifacts are claimed to exist in this repository.

## 7. Evidence recording

For each case, capture:
- Test ID and status (`PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`).
- Date/time with timezone, tester initials/role, browser version, viewport, language, and audited application commit.
- Synthetic project code and synthetic record identifier (not personal data).
- Expected result, actual result, and sanitized screenshot or short screen recording where relevant.
- API status/error code and `traceparent`/correlation ID when investigating a failure; redact cookies, CSRF values, Authorization headers, passwords, and all secrets.
- Persistence evidence after a full page reload or a fresh authorized GET.

Do not attach an unredacted HAR, browser storage dump, environment file, SQL connection string, or preview log containing secrets.

### Result register

| Test ID range | Arabic desktop | French desktop | Arabic mobile | French mobile | API/persistence evidence | Overall |
|---|---|---|---|---|---|---|
| P0-A01 — First-run setup on empty disposable DB | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-A02 — Login | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-A03 — Session restoration after reload | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-A04 — Logout and session revocation | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-A05 — CSRF rejection for unsafe request | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-B — Overview and project directory | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-C — Project structure and units | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-D — Customers and CRM interactions | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-E — Internal unit holds | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-F — Project document integrity | PASS | PASS | PASS | PASS | PASS | PASS |
| P0-G — Authorization, audit, concurrency, and safe errors | PASS | PASS | PASS | PASS | PASS | PASS |

**Status provenance:** Every `PASS` in this register is based on the Product Owner's 15 November 2026 confirmation, not on a newly executed test or a CI run. The status is recorded at the workflow-group level described by the owner; no claim is made that each negative/boundary subcase in every detailed test row has a separately attached timestamp or trace. The missing artifact metadata is stated in Section 6 above.

## 7. Implementation and verification follow-up — 17 November 2026

- **PR #85 — merged:** [first-run handoff to login](https://github.com/younestech31/PROMO-GEST/pull/85), merge SHA `746bbb66f506b8c7c3ba709d468717bd42dee383`. The setup endpoint creates the administrator account but does not issue an authenticated session. The UI therefore returns to the normal login screen, displays a bilingual completion notice, and lets the user choose Arabic/French before authentication. The wizard re-reads database-backed setup status and handles a concurrent `SETUP_ALREADY_INITIALIZED` response without assuming a session cookie.
- **PR #86 — merged:** [require server confirmation before clearing local session](https://github.com/younestech31/PROMO-GEST/pull/86), merge SHA `69a3fa625e4b2a11b4a778d42f452c3894a0173b`. On a confirmed logout response the UI clears local state. If the response is ambiguous, it checks `GET /api/auth/me`; only a server-confirmed `401` permits local clearing. Otherwise the authenticated UI remains visible with a retry message in Arabic/French.
- **Automated PostgreSQL 18 regression coverage:** `FirstRunSetup_OnEmptyPostgreSql18Database_InitializesExactlyOnce` proves an empty database, successful first initialization, rejected second initialization (`409 SETUP_ALREADY_INITIALIZED`), exactly one organization and `SYSTEM_ADMIN`, one role assignment, and one `SETUP_INITIALIZED` audit event. `Logout_RevokesServerSession_AndRejectsCurrentAndReplayedCookies` proves CSRF rejection without revocation, successful logout, protected-route denial, rejection of a replayed pre-logout cookie, persisted revocation, and `AUTH_LOGOUT` audit.
- **Current-main verification:** CI [Run #787](https://github.com/younestech31/PROMO-GEST/actions/runs/44129809872) passed all 3 required jobs on the exact current main SHA `16ed3fdd93a4a2685d37433b0eed5cdf256f953d`. It reruns the integration suite containing the regression tests above. PR CI and later main CI results do not turn the remaining manual browser cases into PASS.
- **Remaining manual acceptance:** P0-A01 and P0-A04 still require a human-operated browser against a dedicated disposable PostgreSQL 18 database with synthetic data and sanitized evidence. Specifically, verify the actual wizard/login handoff and second-init response; then verify browser logout, protected-route denial, stale-cookie replay, and unconfirmed/offline logout retry. Do not copy cookie, CSRF, password, token, or connection-string values into evidence.

The manual result register remains `NOT_RUN` for P0-A01 and P0-A04 until those actions are actually executed. No production or Google AI Studio Cloud SQL business data was modified by these code changes.

## 8. Owner-directed Phase 0 closure — 16 November 2026 (D-010)

The Product Owner explicitly directed that Phase 0 be considered closed for program sequencing and that Phase 1 begin. This is an owner-approved acceptance of known residual risks, not a claim that every original technical exit criterion was executed.

- P0-A02, P0-A03, P0-A05 and P0-B–G remain `PASS` as owner-attested above.
- P0-A01 (first-run initialization on an empty disposable database and rejection of a second initialization) remains `NOT_RUN`.
- P0-A04 (logout/session revocation followed by protected-route denial) remains `NOT_RUN`.
- Browser/version metadata and sanitized per-case artifacts were not provided; none are claimed.
- Phase 0 is administratively `COMPLETE` by the Product Owner's direction. The outstanding checks remain visible residual work and must be executed before production release or any release claim depending on those scenarios.
- Phase 1 is authorized to enter `IN_PROGRESS`. D-010 does not waive G1–G10, security, data-integrity, backup/restore, or later practitioner sign-off gates.

## 9. Original Phase 0 exit criteria

The original technical exit criteria remain the engineering definition of a fully evidenced Phase 0. The Product Owner's D-010 administrative closure above accepted the named exceptions for program sequencing; it does not assert that these criteria were all satisfied. The original criteria are:
1. The current main CI is green for the exact main commit under review.
2. Every applicable case above has a recorded result; there are no unresolved critical or high-severity failures.
3. Principal workflows pass against the real ASP.NET Core API and PostgreSQL 18, including persistence/reload and permission denial paths.
4. The four browser profiles (Arabic/French × desktop/mobile) pass for the principal screens and operations.
5. Evidence is sanitized, reviewable, and recorded without exposing secrets or real customer information.
6. The Product Owner accepts the navigation/information-architecture proposal or records a bounded decision to defer it.

A prepared checklist is not evidence of execution. A green automated CI run is not a substitute for these manual browser and real-preview criteria.


## 10. Additional automated regression evidence — 16 November 2026

PR [#63](https://github.com/younestech31/PROMO-GEST/pull/63) merged the following tests into `main` (merge SHA `ba3106dfd24b0fca915788350e4e1166c0cbe9ce`):

| Automated test | Verified assertions | CI result |
|---|---|---|
| `FirstRunSetup_OnEmptyPostgreSql18Database_InitializesExactlyOnce` | Starts from an isolated empty PostgreSQL 18 database; first setup returns 201; second setup returns 409 / `SETUP_ALREADY_INITIALIZED`; exactly one organization, one SYSTEM_ADMIN/user, one role assignment and one `SETUP_INITIALIZED` audit event remain. | PASS — PR CI #589 |
| `Logout_RevokesServerSession_AndRejectsCurrentAndReplayedCookies` | Logout without CSRF returns 403 and session remains valid; valid logout returns 204 and clears cookie; protected `/api/auth/me` and `/api/audit` return 401; replay of the original cookie from a separate client is rejected; DB session has `IsRevoked` and `RevokedAtUtc`; one `AUTH_LOGOUT` audit event exists. | PASS — PR CI #589 |

**Exact CI evidence:** [Run #589](https://github.com/younestech31/PROMO-GEST/actions/runs/43900696444), on PR head `58dde79719db5949033363dfed1e4e9cb8b66f29`. All three required jobs passed:
- Frontend/static hosting: strict TypeScript, frontend tests, SPA and ASP.NET Core static builds, preview-leak checks.
- .NET 10 / PostgreSQL 18: Domain **34/34**, Application **20/20**, Integration **32/32**; full database/storage/Data Protection restore drill passed.
- Windows publish: Windows x64 publish, machine-scoped Data Protection recovery and PowerShell validation passed.

[Run #592](https://github.com/younestech31/PROMO-GEST/actions/runs/43904395690) subsequently passed all three jobs on main SHA `a30cc898c1c6de87f83334ac453af03ba31208ce` after the documentation-only PR #65 merge.

**Manual/automated distinction remains unchanged:** these integration tests establish server/API/database behavior but do not execute a human browser workflow. Therefore the result register above remains unchanged: P0-A01 and P0-A04 are still `NOT_RUN` for manual browser acceptance. Do not change them to `PASS` based solely on CI. The manual run still requires a dedicated non-production target, supported browser, Arabic/French × desktop/mobile profiles where applicable, and sanitized evidence with no cookies, CSRF values, credentials, or real customer data.

