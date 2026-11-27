# P1-06 — Navigation acceptance reconciliation

27 November 2026 — **In Review / Pending; not full acceptance**.

Live Notion task: `41b13e9e-d368-8138-b03c-c58a16acc25b`, reread on this date,
including all nine acceptance criteria and non-goals. Phase 1 only; no backend,
schema, policy, deployment or F–J business implementation changes.

## Bounded next slice: failed Save & Continue

`tests/browser/phase0.py` already executes actual App routing against ASP.NET Core
and PostgreSQL 18 in AR/FR desktop/mobile. The new regression extends its dirty
organization-profile Back navigation, not a duplicate router implementation:

1. Keep an unsaved legal-name draft and a pending Back action.
2. Abort only this page's organization PUT with `internetdisconnected`. This is
   **injected transport failure**, not an actual infrastructure outage. Other
   requests and the independent API context remain connected.
3. Require the error alert, open confirmation, enabled retry, original route and
   intact draft. Independently read `/api/auth/me` to prove storage is unchanged.
4. Capture `p1-06-save-failure-guard.png` in the disposable CI artifact.
5. Remove interception in `finally`; retry the same pending action against the
   real API, require PUT 200, prior history route, and persisted name via API.
6. Restore the original synthetic organization fixture and assert zero uncaught
   errors on this test's page. Existing Forward Stay/Discard assertions remain.

**Execution state:** source7bc08db [CI46071842100](https://github.com/younestech31/PROMO-GEST/actions/runs/46071842100)
**FAIL** in the four-profile Development browser step; Production/restore/export
were not reached. Docs/frontend/Windows PASS; [CodeQL46071842057](https://github.com/younestech31/PROMO-GEST/actions/runs/46071842057)
PASS2/2. The authored test called nonexistent Python `Page.expect_request_failed`.
Confirmed against the Playwright Python API; replaced with supported
`Page.expect_event('requestfailed', predicate=...)`. Scoped sanitized source/type
annotations now diagnose failures without request/cookie/draft values. Full logs
could not be retrieved through this sandbox's network allowlist; the exact runtime
traceback is not claimed. The API-contract defect is independently demonstrable.
**Corrected source `ab46ed962a0524b9961029314787c7fad8ad633b`:**
[CI46072434925](https://github.com/younestech31/PROMO-GEST/actions/runs/46072434925)
**PASS5/5**, [CodeQL46072434930](https://github.com/younestech31/PROMO-GEST/actions/runs/46072434930)
**PASS2/2**. The complete four-profile Development browser step executed the
failed-save/retry assertions; full PG18, Production HTTPS/restart, restore and
export also passed. [Failure and correction job/critical-step archive](evidence/p1-06-navigation-2026-11-27/checks.json).

Follow-up adds `test_navigation_playwright_contract.py` before the browser loop,
using the **actual pinned Playwright1.56.0 Page class** with AST/signature checks,
not unrestricted mocks. **Local4/4 PASS**, including rejection of the original
nonexistent method and an unsupported keyword. These are API-contract tests, not
browser behavior proof. The follow-up head requires its own CI before merge.
Python syntax, local frontend118/118 and TypeScript PASS; no local browser/.NET/PG18
execution is claimed. No new screenshot is imported or visually accepted; the CI
artifact screenshot illustrates the retained confirmation, not API persistence.

## Nine-criterion evidence inventory (not promotion)

| Live criterion | Existing implementation / evidence | Remaining acceptance work |
|---|---|---|
| Complete ProjectWorkspaceView contract / strict TS | `AppContentRouter` in `src/app/App.tsx`; frontend CI and TypeScript | Pin source/checks in final closure mapping |
| Protected views never mount for unauthorized routes | `canAccessRoute` pre-render guard; routeRegistry/workspaceGuards tests | Independently exercise actual router self/cross-role cases, not helper-only assertions |
| Dirty form propagation; Back/Forward/internal/project/logout/reload/close | `useUnsavedGuard`, App callbacks, embedded settings refs; existing browser history flow and original 26-Nov report | Full route/project-switch/logout/embedded form matrix; native unload is browser-controlled (not a custom Save/Discard prompt); failed-save slice source CI PASS (follow-up pending) |
| Revoked access removes cache/pinned/recent and returns home | `handleProjectVerificationFailed`, `revokeProjectAccessFromState`, preferences storage | Actual browser membership revocation and cached/preference cleanup assertions |
| One API/CSRF/registry/route/localization implementation | `frontendArchitecture.test.ts` dependency/boundary tests | Final exact-source execution references |
| F–J planned APIs explicit; no-op actions removed; legal review | planned API rejection and metadata boundary tests | Keep qualified Algerian legal review independent; do not mark F–J implemented |
| Incidental repair scripts removed | architecture/hygiene checks | Scope-specific tracked-file audit |
| npm/static-host/automated/PR checks pass | Existing baseline CI | Correction source CI PASS; follow-up head checks pending, not inherited |
| Truthful docs; D-013 design; Phase 1 in progress | This inventory and canonical checkpoints | Preserve independent closure dependencies |

## Original image provenance reconciled (not a new run)

The [26-Nov report](evidence/manual/2026-11-26/P1-06/README.md) now explicitly
withdraws its unsupported cryptographic workspace claim and retains the malformed
39-character source string in a correction appendix. GitHub API confirms deposit
`73a06493241876c35b9f20b2a93ff4d52b3ae909` has exactly one parent,
`a4e1f6daa8828d01d481900f1051dcc335da7e25`. That is a corrected recorded
baseline, not independent attestation of the NO_GIT execution checkout.

All six original PNG Git blobs match the deposit; image decoding, SHA-256, sizes
and dimensions are archived in the [index](evidence/manual/2026-11-26/P1-06/reconciliation-2026-11-27.json).
All six were visually reopened: four AR/FR desktop/mobile confirmations contain
Save/Discard/Stay within the viewport, AR desktop profile shows the synthetic saved
trade name, FR desktop project overview shows `Alger Centre QA`. The old header
switcher is historical UI, not a new-source capture. These images do not prove
beforeunload, failed-save, membership revocation or API/SQL persistence by themselves.
No full P1-06 promotion or new browser execution is inferred from reconciliation.

## Independent constraints

P1-11 still requires actual authorized local data preflight/migration evidence;
a synthetic rehearsal cannot stand in for that. P1-14 still requires actual
Google AI Studio hostname/Origin/ingress evidence, not an Arena preview substitute.
P1-08 needs owner policy. Distinct phase-closure P1-05 stays blocked. Municipality,
legal/accounting/institution/release approvals and Phases 2–5 gates are unchanged.
