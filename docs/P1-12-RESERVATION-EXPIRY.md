# P1-12 — Safe, immediate reservation-expiry reconciliation

Status: **In Progress / Pending execution**, not production rollout approval.

## User-visible outcome

An authorized cancellation request for an elapsed hold now invokes the same
expiry processor as the worker before returning the existing
`409 RESERVATION_EXPIRY_REACHED`. For an eligible hold it persists `Expired`,
`EXPIRED` and releases a still-Reserved unit immediately. This is expiration,
not manual cancellation; the supplied cancellation reason is not substituted.
The worker also processes overdue holds on startup/restart without waiting for
its first one-minute tick. Later passes retain the existing cadence and batch cap.

## Safety boundary

- No expiration/release while the project is Suspended or the hold awaits review,
  including reviewed-but-still-suspended and resumed-but-not-reviewed cases.
- The due query excludes preserved holds before the batch limit, so they do not
  consume eligible work slots. The processor rechecks both conditions.
- Touch the tracked Project concurrency root before expiration. Suspension and
  expiration contend through the existing optimistic concurrency stamp.
- Project, reservation, unit and append-only expiry audit use the shared scoped
  DbContext and one SaveChanges transaction. A losing operation commits nothing;
  it returns the existing conflict and a later fresh worker scope can retry.
- Never release a unit no longer Reserved. Preserve the existing mismatch audit.
- No duration/policy/permission changes, schema/migration, finance side effects,
  production data changes, deployment or Phase 2 feature expansion.

## Prior failed attempt and correction

Closed PR290/e9b1855 CI46086923928 and46086919686 failed the new suspension race
at `AssertSuspensionFixtureIntegrityAsync` line267. The test's SQL fixture helper
changed the hold expiry from four days in the future to one minute overdue, but
passed the original immutable fixture to the preservation assertion. The new
helper returns the **persisted PostgreSQL timestamp**, and that race updates
its expected fixture before running. The preservation assertion is retained.
This explains that particular assertion failure, not a claim that all other
behavior of the closed attempt was accepted. Reused implementation is reviewed
and reverified on this branch, not merged from the failed PR.

## Bounded verification in the existing CI

`P1_12ReservationExpiryTests.cs` adds seven real PostgreSQL cases:

1. Actual hosted-worker startup and a second worker instance (restart) process
   due holds within a 30-second bound, without sleeping a minute; repeat pass
   changes nothing and expiry audit remains exactly once.
2. Pause worker before SaveChanges; late-cancel API wins and persists expiry;
   worker loses with a concurrency conflict, with exactly one expiry audit.
3. Pause expiry before SaveChanges; suspension wins, losing expiry rolls back,
   queue/hold/unit preserved, and a fresh worker pass skips the protected hold.
4–6. Suspended/unreviewed, suspended/reviewed and resumed/awaiting-review:
   batch, exact reconciliation and authorized late-cancel all preserve hold,
   expiry, review timestamps, unit/project stamps and audit count.
7. Fixed clock one tick before vs exactly at persisted expiry, repeat/exact
   processing idempotency and a Sold unit left untouched with one mismatch audit.

The existing end-to-end late-cancel case additionally reads back the database
immediately after409 and asserts Expired/EXPIRED/unit available/one expiry audit.
No sleeps, dropped assertions, disabled suites or synthetic browser evidence.
The normal full CI/CodeQL, PG18, restore and existing four-profile browser gates
remain in place. No extra browser scenarios were added for this backend change.
Local checks do not substitute for .NET/PG execution (not installed locally).
Final exact-head results and independent main verification must be checked before
acceptance; this record does not claim either has run yet.
