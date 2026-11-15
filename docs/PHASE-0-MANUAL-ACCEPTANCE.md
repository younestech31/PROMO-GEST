# PROMO GEST — Phase 0 Manual Browser & Real-API Acceptance

**Document role:** Executable acceptance protocol for the remaining Phase 0 browser and real-API evidence.  
**Status at preparation:** `NOT_RUN`. This document defines tests; it does not claim that any manual test passed.  
**Main commit inspected at audit start:** `5415f0e668a55f902ac2802e1669af58ad7ec410`.  
**Automated baseline:** GitHub Actions Run #531 / `43752672569` passed on that commit.  
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
| P0-A01 | On a separate empty disposable database, complete first-run setup with fictional organization details and one System Administrator. | Setup succeeds once; organization identity is returned; exactly one `SYSTEM_ADMIN` exists. A second initialization is rejected safely. |
| P0-A02 | Open the login page in Arabic, then French; submit valid synthetic credentials. | Both languages render correctly; successful sign-in loads the authenticated shell and only the projects authorized for that actor. |
| P0-A03 | Reload the page after login. | Session restoration is successful while the session is valid. No bearer/session token is stored in localStorage or sessionStorage. |
| P0-A04 | Sign out, then revisit/reload an authenticated route. | Session is revoked and the user returns to login; protected API access is denied. |
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

**Known authorization boundary:** current source checks explicit project membership and `projects.read` for structure reads; structure management currently checks `CanManageConstruction` or ProjectManager membership. The seeded `projects.structure.manage` permission is not yet the effective backend check. This mismatch is recorded for Phase 1 alignment; do not claim it was fixed by a browser test.

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

## 6. Evidence recording

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
| P0-A — Installation/Auth | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-B — Overview/Projects | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-C — Structure | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-D — Customers/CRM | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-E — Internal Holds | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-F — Documents | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| P0-G — Audit/Errors | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

## 7. Phase 0 exit criteria

Phase 0 may move to `COMPLETE` only when:
1. The current main CI is green for the exact main commit under review.
2. Every applicable case above has a recorded result; there are no unresolved critical or high-severity failures.
3. Principal workflows pass against the real ASP.NET Core API and PostgreSQL 18, including persistence/reload and permission denial paths.
4. The four browser profiles (Arabic/French × desktop/mobile) pass for the principal screens and operations.
5. Evidence is sanitized, reviewable, and recorded without exposing secrets or real customer information.
6. The Product Owner accepts the navigation/information-architecture proposal or records a bounded decision to defer it.

A prepared checklist is not evidence of execution. A green automated CI run is not a substitute for these manual browser and real-preview criteria.
