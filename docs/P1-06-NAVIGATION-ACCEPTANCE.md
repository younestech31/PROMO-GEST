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

**Execution state:** authored; Python syntax, local frontend118/118 and TypeScript PASS; new browser regression awaits
its own CI execution. No local browser/.NET/PostgreSQL execution is claimed, and
no new screenshot is yet imported or visually accepted. The artifact screenshot
is intended to illustrate the retained confirmation, not prove API persistence.

## Nine-criterion evidence inventory (not promotion)

| Live criterion | Existing implementation / evidence | Remaining acceptance work |
|---|---|---|
| Complete ProjectWorkspaceView contract / strict TS | `AppContentRouter` in `src/app/App.tsx`; frontend CI and TypeScript | Pin source/checks in final closure mapping |
| Protected views never mount for unauthorized routes | `canAccessRoute` pre-render guard; routeRegistry/workspaceGuards tests | Independently exercise actual router self/cross-role cases, not helper-only assertions |
| Dirty form propagation; Back/Forward/internal/project/logout/reload/close | `useUnsavedGuard`, App callbacks, embedded settings refs; existing browser history flow and original 26-Nov report | Full route/project-switch/logout/embedded form matrix; native unload is browser-controlled (not a custom Save/Discard prompt); failed-save slice above pending CI |
| Revoked access removes cache/pinned/recent and returns home | `handleProjectVerificationFailed`, `revokeProjectAccessFromState`, preferences storage | Actual browser membership revocation and cached/preference cleanup assertions |
| One API/CSRF/registry/route/localization implementation | `frontendArchitecture.test.ts` dependency/boundary tests | Final exact-source execution references |
| F–J planned APIs explicit; no-op actions removed; legal review | planned API rejection and metadata boundary tests | Keep qualified Algerian legal review independent; do not mark F–J implemented |
| Incidental repair scripts removed | architecture/hygiene checks | Scope-specific tracked-file audit |
| npm/static-host/automated/PR checks pass | Existing baseline CI | New-source PR checks pending; do not inherit old green status |
| Truthful docs; D-013 design; Phase 1 in progress | This inventory and canonical checkpoints | Preserve independent closure dependencies |

The original report at `evidence/manual/2026-11-26/P1-06/README.md` is historical
input, not automatically accepted provenance. It still contains the invalid
39-character source string `a4e1f6daa828d01d481900f1051dcc335da7e25` and an
unsupported cryptographic workspace claim. Before relying on that report for full
closure, reconcile its source/parent relationship and image hashes as was done
for P0; do not silently reinterpret it as a new-source capture or rerun.

## Independent constraints

P1-11 still requires actual authorized local data preflight/migration evidence;
a synthetic rehearsal cannot stand in for that. P1-14 still requires actual
Google AI Studio hostname/Origin/ingress evidence, not an Arena preview substitute.
P1-08 needs owner policy. Distinct phase-closure P1-05 stays blocked. Municipality,
legal/accounting/institution/release approvals and Phases 2–5 gates are unchanged.
