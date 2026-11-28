# P1-12 — Safe, immediate reservation-expiry reconciliation

Status: **Implementation merged; final head verified; independent main pending.**
Not production rollout approval.

PR [292](https://github.com/younestech31/PROMO-GEST/pull/292) merged with exact
head guard at01:44:38Z into `f89cc4448b89974440c2be2af527e9dcbac1f997`.
Final head `34f7b564b594287cd30c25142cd5e087ad1447be`:
CI[46093639878](https://github.com/younestech31/PROMO-GEST/actions/runs/46093639878)
**PASS5/5** + CodeQL[46093639911](https://github.com/younestech31/PROMO-GEST/actions/runs/46093639911)
**PASS**; all eight PR checks SUCCESS. Real PG18 integration, existing all-four
Development/Production HTTPS profiles, restart, restore and export gates PASS.
Local frontend119/119, TypeScript, baseline12/12, hygiene/secrets673/diff PASS.
Arabic/French expiry-conflict wording now explicitly preserves suspended and
review-required holds and instructs refreshing the list; no unconditional
release or manual-cancel success is promised.

Independent exact merged-main CI46094642448/CodeQL46094642443 pending at checkpoint;
head success is not inherited. [Compact exact-run archive](evidence/p1-12-reservation-expiry/checks.json).
Previous PR291 main8ff4330 CI46092836863/CodeQL46092836856 also independently PASS.
Superseded source5924eb8 CI46093550987 explicitly cancelled to avoid wasting
resources after the localized final head; its CodeQL was cancelled too.
No evidence-only follow-up PR or new browser matrix is required.

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
Final exact-head results are verified above; independent merged-main verification
remains pending before final task closure. No new screenshots or manual UI acceptance
are claimed.
