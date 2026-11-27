# P1-10 — atomic suspension and hold-creation ordering (#280)

Date: 27 November 2026. Roadmap: **Phase 1 IN_PROGRESS; P1-10 In Progress / Pending**.
[Issue #280](https://github.com/younestech31/PROMO-GEST/issues/280),
[PR #281](https://github.com/younestech31/PROMO-GEST/pull/281).

## Scope and roadmap check

The live Notion roadmap and P1-10 task were read before implementation. P1-09 is
Done / Verified; its dependency is resolved, not waived. ADR-0018's owner decision
of 23 November is unchanged. This work repairs the technical acceptance gap in
criteria 2/5/6; it does not duplicate the existing eligibility policy, queue or UI.
P1-11 institution-local operations, legal/accounting approvals, P1-08 policy,
municipality deferrals and Phase 1 closure/release-scope gates remain independent.
No schema/migration, permission/grant, limiter, actor, deployment or production-data
change is introduced.

## Verified baseline

PR #279 merged at `e827dcb5cf290661d029e5f975a07a2c9947aaa1` after final head
`a6532d871824fafb5f8685ce88db527b8a3ea22a` CI 46047253659 **PASS 4/4** and
CodeQL 46047253522 **PASS 2/2**. Independent exact-main CI
[46048350110](https://github.com/younestech31/PROMO-GEST/actions/runs/46048350110)
**PASS 4/4**, CodeQL
[46048350121](https://github.com/younestech31/PROMO-GEST/actions/runs/46048350121)
**PASS 2/2**. The previous pending-main note is superseded.

The baseline saved project/status audit first, then queried/stamped active holds
and saved review metadata/audit separately. A create read Commercialization but did
not update the project root. Sequential browser results cannot prove atomicity or
serialization across those operations.

## Regression-first tests

`tests/PromoGest.IntegrationTests/ProjectSuspensionConcurrencyTests.cs` uses the
existing real API/PG18 least-privilege fixture and a test-only SaveChanges interceptor.
Each case has an isolated disposable database; no production records are used.
No sleeps or probabilistic simultaneous-request timing is used. A bounded gate
signals that the selected request has prepared its tracked write, then the other
request commits completely before the selected request is released in `finally`.

| Case | Required result |
|---|---|
| Pause create after eligibility read; commit suspension; release create | Stale create gets 409, no new hold/unit allocation or successful-create audit; original hold queued |
| Pause suspension before save; commit create; release suspension | Stale transition gets 409 with no project-update/review audit committed; fresh-stamp retry queues both holds |
| Inject exception on save with review markers pending | 500 with injected failure confirmed; project stays Commercialization with unchanged root stamp, no persisted markers/update/review audit; retry succeeds |
| Re-save Suspended after completing an existing review | Exactly one transition audit; completed hold not re-queued; no cancellation/release |
| Admin authorized for both projects uses foreign hold/unit IDs | GET/review/create return 404, foreign queue empty, owning hold stamp/queue unchanged; not a permission-only denial |

The original hold remains Active with its original expiry and Reserved unit. A
failed new create leaves its unit AvailableForSale. Committed successful-create,
project-update and transition-review audit counts are asserted separately.

## Narrow repair and ordering semantics

- `ProjectService.UpdateProjectAsync` stages the project update, project audit,
  active-hold markers and transition audit before **one** repository SaveChanges.
  Production scoped repositories and audit writer share one `AppDbContext`; EF's
  relational SaveChanges transaction commits or rolls back the entire staged set.
- `ProjectSalesReservationService.CreateAsync` touches the tracked Project root
  after authorization/eligibility/unit/customer validation and before staging the
  new hold. The existing root `ConcurrencyStamp` is now a shared optimistic
  serialization boundary for create versus project update. Root, unit, hold and
  creation audit commit in the same SaveChanges transaction.
- **Conflict semantics:** a competing operation based on a stale root loses with
  HTTP 409; no automatic retry is introduced. Reload/re-evaluate and explicitly
  retry. If create wins, suspension must reload and queue all then-current holds;
  if suspension wins, stale create rolls back and a fresh create is denied by the
  existing policy. A successful create also invalidates an open project's edit
  stamp. Concurrent creates on different units of the same project may now
  conflict conservatively; creates in distinct projects share no root token.
- Existing project permissions/scope, deny-by-default policy, immutable audit,
  unit uniqueness, reservation/review CAS and expiry behavior remain in place.
  Review completion is documentary only; no automatic cancellation/unit release.

## Execution log

- Regression-only source `b621b23c05ebd385a5dadec46b22fc8a7abfc988`,
  CI [46049728289](https://github.com/younestech31/PROMO-GEST/actions/runs/46049728289):
  integration step **FAIL**. Specific diagnostics were hidden by the job's 50-annotation
  budget (40 image notices + 10 analyzer warnings); log-storage redirect inaccessible.
  No individual cause was inferred from that exit code.
- CI-only ordering follow-up `5eb07d6557d63995781be119ea7b836cd1618139` moves the
  unchanged migration/full-integration/failed-TRX-report steps before screenshot
  exports; no tests are removed or weakened. CI
  [46050829871](https://github.com/younestech31/PROMO-GEST/actions/runs/46050829871)
  **FAIL as expected**, check run `140681601812` exposes exactly three failed tests:
  injected review-save failure left project **Suspended** instead of Commercialization;
  paused stale suspension returned **200 OK** instead of 409;
  paused stale create returned **201 Created** instead of 409.
  [Sanitized original failure annotations and exact source/run identity](evidence/p1-10-atomic-2026-11-27/baseline-failures.json).
  These are executed deterministic PG18 reproductions, not production incidents.
- Runtime repair plus additional foreign-customer/untouched-foreign-root assertions
  now proceeds to its own CI run. Test expiry comparisons use a persisted GET to
  respect PostgreSQL microsecond precision rather than request-side 100ns ticks.
- The local sandbox has no .NET SDK/PostgreSQL service; no local .NET pass is
  claimed. Execution/compilation evidence must come from the exact CI source.
- Repair-head CI and post-merge checks must be recorded independently before
  acceptance/closure. P1-10 remains Pending; #280 is not closed by this report.

## Screenshots and evidence boundaries

The UI is unchanged by this repair. Four genuine AR/FR desktop/mobile
[reviewed queue-confirmation JPEGs and bound provenance](evidence/p1-10-realstack-2026-11-27/README.md)
remain anchored to source `99bab26`, CI 46044806419, tested merge `04f9224`.
They are not relabeled as repair screenshots, database rollback proof or
concurrency proof. New real-browser CI regression must pass on the repair head;
its execution is distinct from visual review of newly captured images. See
[seven-criterion mapping and existing inline screenshots](P1-10-BROWSER-ACCEPTANCE.md).
