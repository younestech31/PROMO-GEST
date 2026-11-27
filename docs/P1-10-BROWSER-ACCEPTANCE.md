# P1-10 — commercialization and suspension-review acceptance

Date: 27 November 2026. **Task: In Progress / Pending.**
This slice tests existing runtime; it does not implement commercialization again.

## Dependency reconciliation

P1-09 is explicitly **Done / Verified** in Notion after its six criteria were mapped
to implementation and recorded real-stack evidence. See [acceptance decision](P1-09-PRODUCTION-ACCEPTANCE.md).
Its P1-10 acceptance dependency is resolved, not waived. The old “runtime not started”
dependency text was corrected in Notion; prior dated checkpoints remain historical.
ADR-0018 records the approved owner decision of 23 November. Runtime was already
merged in PR #233 (eligibility), #234 (review state), #235 (review API), and #237 (UI).
P1-11 operational acceptance and later-phase/release-scope gates remain separate.

## Actual policy and existing coverage

| Actual `ProjectStatus` | Marketing/new internal hold |
|---|---|
| Planning | Deny |
| UnderConstruction | Deny |
| Commercialization | Allow, subject to normal project/permission/unit/customer checks |
| Delivered | Deny |
| Suspended | Deny; queue active holds for documentary review |
| Undefined/future values | Deny by default; not inferred from a deny-list |

- `ProjectCommercializationPolicyTests.cs`: single allow-list member, all actual
  denied statuses, undefined enum values, transition-only review marker.
- `ProjectSalesReservationEntities.cs`: review request/completion, active hold
  invariants and explicit conflict codes. No implicit cancellation or unit release.
- `PostgresEndToEndTests.cs`: real API/PG18 eligibility, suspension queue,
  review completion, duplicate/stale denial, scope/permissions and audit persistence.
  Other PG18 race tests retain project/unit/hold integrity; sequential browser
  assertions below must not be described as deterministic concurrency testing.
- `reservationReview.test.ts`: queue partition and bilingual non-approval wording.
- `ProjectCustomerStatus.Customer` is CRM only. Internal holds/reviews create no
  contract, receipt, installment, accounting entry or legal/financial approval.
  This test adds none of those operations and does not open Phase 2.

## New four-profile real-browser regression

`tests/browser/commercialization_review.py` is called by `phase0.py` after the
existing budget matrix, using the existing administrator session. It creates only a
synthetic project, building/floor/two units and CRM prospect through real APIs.
No additional account/login, SQL grant, mock or runtime configuration change.
The guard rejects anything except the exact disposable GitHub Actions loopback
`p0_<ar|fr>_<desktop|mobile>` fixture before browser, filesystem or network I/O.
This is a Development-mode published ASP.NET Core SPA/PG18 regression, **not** a
Production HTTPS run or institution-local installation acceptance.

Seven named checks per profile (28 planned assertions, not a claimed result):

1. All four non-commercial actual statuses return 409 `PROJECT_NOT_COMMERCIALIZABLE`
   without changing holds or units.
2. Explicit Commercialization allows a real SPA-created active hold and reserves its unit.
3. Suspension queues that active hold without cancellation, expiry/identity changes or unit release.
4. Stale review stamp returns 409 `CONCURRENCY_CONFLICT`, queue unchanged.
5. Real bilingual SPA review confirmation/completion preserves hold, unit, expiry and
   Suspended project state; queue is empty after reload.
6. Even after review, a new hold on the second available unit is denied without mutation.
7. Exactly one completion audit and a denial audit identify the actor and target.

Screenshots per profile: `p1-10-review-confirmation.png` (confirmation scrolled into
viewport) and `p1-10-review-completed.png`, published with sanitized `P1_10` results in
`phase0-browser-evidence`. No credentials, cookies, session state or response dumps
are added to artifacts. Screenshots illustrate UI states, not audit/409/concurrency
proof; those require executed assertions.

## Verification log

- Offline helper tests: **3/3 PASS**, including unsafe-target refusal before I/O and
  field-by-field preservation invariants.
- Python compile: **PASS**, helper and integrated runner.
- Baseline validator tests **12/12 PASS**, hygiene tests **12/12 PASS**;
  nine canonical documents agree on main `484871f99aa62dfb65904ad7ec4100c0a9ac1a29`.
- New real-stack browser matrix / screenshots: **PENDING CI execution**. No new
  screenshot or 28/28 PASS is claimed before the job actually succeeds.

P1-10 remains Pending until its evidence has been reconciled against all seven task
criteria. No institutional signature, new policy decision or operational acceptance
is inferred from the delegated development authority.
