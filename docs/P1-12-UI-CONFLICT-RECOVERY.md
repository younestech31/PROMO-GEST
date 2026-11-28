# Reservation workflow — recover safely from server conflicts

## Functional scope

Phase 1, Module E internal commercial holds only. This is a UI follow-up to the
independently verified P1-12 backend, not a new expiry policy or statutory
reservation/contract workflow.

- A rejected create/cancel/review returning HTTP 409 triggers one authoritative
  read of reservations, pending reviews, and (for managers) unit/customer options.
  The write is never replayed automatically.
- The original localized error remains visible. A separate status announces a
  successful refresh without claiming that the rejected operation succeeded.
- Cancellation/review selections resolve against the latest server snapshot,
  including its concurrency stamp. A closed/missing hold or completed review no
  longer leaves an obsolete confirmation form open. An active protected hold is
  not inferred to be Expired merely because cancellation returned an expiry error.
- An active cancellation keeps its reason across conflicts/reloads. A separate
  creation draft retains its date and still-valid choices and dirty-state guard.
  Invalidated unit/customer choices become blank; subsequent refreshes never
  silently substitute a different unit/customer. Initial option defaults remain.
- All write actions are blocked while loading/saving or after a failed read.
  A failed refresh exposes Arabic/French retry; it does not show old actionable
  rows or imply an empty history/review queue. Reads publish one complete snapshot.
- Superseded reads and completions after effect cleanup are ignored. Mutation
  completions from a prior view lifetime cannot refresh a different project view.
- Read-only viewers still fetch only reservation/history reads, not manager-only
  structure/customer options, and cannot submit writes.

No endpoint, permission, database, worker, audit, protected-hold, legal, or
production deployment changes. Phase 2–5 gates remain unchanged.

## Verification and boundary

Seven new rendered React/JSDOM cases cover Arabic and French expiry (including a
protected active hold), retained creation drafts, failed refresh/retry, blocked
stale submissions, fresh-stamp explicit confirmation, unavailable unit selection,
already-completed review, and read-only access. These are automated component
checks with mocked API responses, not real PostgreSQL or manual browser evidence.
The existing full CI remains required for this follow-up before merge.

Original backend closure and exact independent-main evidence remain separately
recorded in [P1-12-RESERVATION-EXPIRY.md](P1-12-RESERVATION-EXPIRY.md).

Local checks: `npm test` **128/128 PASS**; `npm run lint`,
`npm run lint:js:guard`, `npm run build`, canonical documentation consistency,
and `git diff --check` PASS. Remote head checks and merge are not implied.
