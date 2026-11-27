# P1-05 — Project budget browser regression and remaining acceptance

Date: 27 November 2026. Policy: [ADR-0011](ADR/0011-project-estimated-budget-requires-financial-capability.md).

## Scope

`tests/browser/project_budget.py`, called by `phase0.py`, exercises the shipped React SPA
against the actual ASP.NET Core API and fresh PostgreSQL 18 databases. The existing CI
runner executes Arabic RTL / French LTR at 1440×900 and 390×844. This is not the Vite
in-memory preview, a mock, or manual operator acceptance.

Only the exact loopback CI target and `p0_<language>_<device>` disposable database are
permitted. Users are created with seeded roles through the API; mandatory password
rotation is completed before browser login. No SQL role/permission changes, schema
changes, migration additions or operational database access are introduced. The disposable
API process alone uses a bounded login/password-rotation limiter of 30 requests/minute
because the expanded multi-user suite exceeds ten requests from the same loopback IP.
The shipped default remains ten; no operational security configuration is changed.

## Regression matrix

| Actor / state | API assertions | Browser assertions |
|---|---|---|
| SYSTEM_ADMIN, no project membership | Nonzero creation denied; detail/list/paged directory return null; numeric update denied | Directory dash, overview redaction notice, no budget input |
| PROJECT_DIRECTOR + financial ProjectManager membership | Nonzero creation succeeds with explicit creator membership; decimal update persists | Exact localized directory amount; editable budget; save and reload retain decimal value |
| Same ProjectManager after financial flag removal | All read shapes redact; null update preserves amount; zero and nonzero tampering denied | Directory dash, overview notice, hidden budget input; non-financial name edit saves and survives reload |
| FINANCE_OFFICER, no project membership | Detail denied; list and paged directory exclude project | No UI acceptance claim for non-member deep links in this slice |
| FINANCE_OFFICER + financial FinanceController membership | Amount visible; update denied; independent read confirms all prior denied writes/null update preserved amount | Exact localized amount; general fields disabled; no budget input or save control |
| Audit | Financial-read and access-denial events identify the expected actors and project | Existing audit rendering acceptance is outside this slice |

The administrator's member-assignment responses are also checked for budget redaction.
The test checks authorization immediately with the existing sessions after capability
changes; it does not rely on logging in again to enforce resource scope.

## Mobile correction found during browser execution

The first runs passed the Arabic desktop slice but stopped on Arabic mobile: the
responsive directory uses cards, not table rows. Those cards also omitted the budget
entirely. The fix adds a labeled budget definition to each accessible project article,
using the same `ProjectBudgetValue` component as the desktop table. Authorized amounts
are localized with two decimals; server-redacted null stays a dash, distinct from zero.
Four rendering tests cover null, zero, decimals and LTR isolation in both languages.
Browser assertions target the visible card on mobile and the visible row on desktop;
they must never score a hidden desktop table as mobile evidence.

## Evidence and verification boundary

- Local: `npm ci --no-audit --no-fund`, `npm run lint`, `npm test` (117/117),
  `npm run build`, Python compilation, and `python3 tests/browser/test_project_budget.py`
  (5/5) passed on 27 November 2026. The helper tests check null/zero/decimal payloads,
  fresh CSRF retrieval, missing-token refusal and non-CI/non-disposable target rejection.
- Real ASP.NET Core/PostgreSQL/browser execution is delegated to the PR CI runner;
  no local real-database or browser execution is claimed. This sandbox has no .NET SDK,
  PostgreSQL or Chrome installed. Record the exact-head CI outcome before approval.
- Successful browser runs write `P1_05` into each profile's `result.json` and five
  `p1-05-*.png` screenshots to the existing `phase0-browser-evidence` artifact.
  Artifacts contain synthetic users/projects only; no passwords, cookies, session tokens
  or complete HTTP request/response dumps are written by this scenario.
- Existing-main verification at branch base `562d6340fd10a55d4124d287e082a91709222bf5`:
  [CI 45860100938](https://github.com/younestech31/PROMO-GEST/actions/runs/45860100938)
  (4/4) and [CodeQL 45860100847](https://github.com/younestech31/PROMO-GEST/actions/runs/45860100847)
  (2/2). Those runs predate this new P1-05 scenario and are not evidence for it.

## Remaining manual gate

P1-05 stays **In Review / Pending** and **IMPLEMENTED_NOT_VERIFIED** until the authorized
operator performs and signs off the Arabic/French Staging acceptance. Automated CI
must pass first; its screenshots are supporting evidence, not an operator signature.
No Phase 0 closure, Phase 1 closure, Phase 2–5 start, deployment, existing-database
migration, or municipality approval/import is implied.
