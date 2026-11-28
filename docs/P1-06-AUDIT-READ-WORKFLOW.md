# P1-06 — bounded audit-log read workflow

## Delivery checkpoint

PR303 merged at `24ed95a1899a2eabb04b0be9d21b8041ee01d92c` after all eight
checks SUCCESS on `6608058` (CI46145845806 / CodeQL46145845797).
Independent main CI46147418827 pending; CodeQL46147418769 PASS.
PR302 independent main CI46145555028 / CodeQL46145555029 both PASS.
The local and pre-delivery wording below is historical; full P1-06 stays In Review.

## Roadmap and scope

Existing frontend/platform stabilization under P1-06; technical administration's
current read-only audit screen (module L route metadata). No new audit endpoint,
server-side filtering/pagination, export, investigation/retention workflow,
permission policy, schema, write, financial or later-phase feature.
P1-06 remains In Review, Phase1 IN_PROGRESS and Phases2–5 gated.

## Delivered behavior

- Initial/read-refresh failures are explicit localized errors with read-only retry,
  never an apparently empty successful audit response. Generic failures and unknown
  API codes use a safe localized fallback, not raw exception/backend text.
- Synchronous single-flight refresh freezes the refresh affordance and prevents
  duplicate same-event requests. Old rows are not shown as a current snapshot
  while refreshing or after failure. An accessible loading status is explicit.
- The existing `listAuditLogs(100)` read remains unchanged. A visible bounded-scope
  notice explains that this is at most the latest 100 loaded events, not complete
  audit history. Server ordering is already descending OccurredAtUtc.
- Search matches visible actor username, event type, severity, summary or source
  IP text, case-insensitively with trimmed search. Severity filtering uses levels
  present in the loaded snapshot. Search/filter/reset never issue a request.
- The visible count is matching / loaded, not total history. No-match and empty
  successful snapshot are distinct. Filters survive explicit refresh/retry; a
  selected level absent from a new snapshot is retained, never silently replaced.
- AppContentRouter passes the current actor to the screen. The existing centralized
  `canViewAuditLogs` policy is reused, not redefined. Denied/inactive users do not
  mount the reader or fetch. Actor ID/stamp replacement or loss of audit-read
  unmounts the old scope, clearing rows/filters and ignoring its pending results.
- Language changes do not refetch; labels, counts, status and errors render in the
  selected language without replacing the reader's pending request or filters.

## Verification and limits

Local TypeScript, frontend **195/195**, production build, JS lint ratchet, secret
scan, hygiene, canonical baseline and diff checks PASS. Eight new rendered AR/FR
component tests cover initial failure/retry/empty success, bounded reads, loaded
search/severity/count/reset, same-event single-flight, language stability, failed
refresh and retained filters, actor/stamp replacement, denied/inactive users and
obsolete success/failure. Existing router audit-permission tests remain green.

Mocked React/JSDOM checks are not manual browser/RTL/mobile acceptance, actual
PostgreSQL execution, review of real audit records or institution acceptance.
This head still requires its own exact-head remote CI/CodeQL and merge. No real
customer/audit data, credentials or generated evidence assets are added.

## Prior delivery checkpoint

PR302 merged at main `b31f76f` after all eight exact-head checks SUCCESS on
`7ea5e34` (CI46143591539 / CodeQL46143591251). Independent main CI46145555028
and CodeQL46145555029 pending at authoring. PR301 independent main
CI46143373760 / CodeQL46143373737 both SUCCESS. Prior checks are not inherited by
this head or used to close P1-06's manual/institutional gates.
