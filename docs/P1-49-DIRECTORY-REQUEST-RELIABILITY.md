# P1-49 follow-up — reliable project directory requests

## Delivery checkpoint

[PR #293](https://github.com/younestech31/PROMO-GEST/pull/293) merged at
`153273c61815b9d3c3cf5b4d8e6745f724c4686e`. Exact head
`da9988f51252f58b02f60e8deecd70962064a9ee` passed all eight PR checks:
CI[46095458732](https://github.com/younestech31/PROMO-GEST/actions/runs/46095458732)
and CodeQL[46095458725](https://github.com/younestech31/PROMO-GEST/actions/runs/46095458725).
Independent merged-main CI[46096601652](https://github.com/younestech31/PROMO-GEST/actions/runs/46096601652) **PASS5/5** and
CodeQL[46096601635](https://github.com/younestech31/PROMO-GEST/actions/runs/46096601635) **PASS** on the exact merge SHA.
This independent check does not close deferred manual acceptance.

## Scope

Functional follow-up to the already implemented project directory pagination.
No new endpoint, migration, permission, project-switcher change, or Phase 2–5 work.

## Changes

- Only the latest directory request can publish rows, counts, errors, or directory
  loading completion. Employee options now have an independent request generation
  (see follow-up below). Effect cleanup invalidates both after unmount or an
  authenticated actor/version/employee-read capability change.
- Search text remains a draft until the filter form is submitted. Page navigation,
  page-size changes, status selection, and mutation refreshes reuse the successful
  applied search. Status selection still applies immediately; reset clears both
  filters and returns to page one.
- Pending and failed loads do not leave old project rows actionable. A failure is
  not rendered as the normal empty-directory state.
- An Arabic/French retry action repeats the failed request, not unsubmitted draft
  text. The results container exposes its loading state through `aria-busy`.

## Verification

- `npm run lint`: PASS (TypeScript).
- `npm run lint:js:guard`: PASS, no baseline increase.
- `npm test`: **121/121 PASS**, including two new rendered React/JSDOM tests
  exercising both Arabic and French: out-of-order success, stale rejection and
  loading completion, draft/applied filters, page/size/status changes, failure,
  exact-query retry, reset, actor change, and completion after unmount.
- `npm run build`: PASS.
- `git diff --check`: PASS.

These are automated component checks, not manual browser/visual acceptance.
The existing P1-49 owner-requested deferral of manual visual acceptance remains
unchanged. Remote PR checks and merge are separate delivery checkpoints; local
success is not a claim of deployment or independent merged-main success.

## Bounded follow-up — independent employee lookup

The access-management employee list was awaited inside the directory request.
A failed employee lookup therefore discarded successfully fetched projects, and a
slow lookup kept the directory busy. This follow-up separates the two lifecycles:

- Directory success is immediately usable regardless of employee lookup outcome.
- Only actors already allowed by `canManageUsers` request employee options; this
  does not grant any API or project permission.
- The access dialog shows localized lookup loading, failure/retry, or genuine
  empty states. Retrying employees does not repeat the directory query or write.
- Assignment is disabled and guarded in the submit handler until a currently
  returned active, non-system employee is selected. A retry clears the old
  selection rather than silently choosing a replacement.
- Actor/version/capability changes close the access dialog, clear lookup data,
  and invalidate stale responses. Unmount also invalidates outstanding requests.
- Project filter/page/mutation refreshes no longer restart employee lookup.

Local verification: TypeScript PASS; **159/159** component/unit tests PASS,
including four new rendered AR/FR tests for pending/failing lookup isolation,
read-only retry, eligible employee filtering, selection and assignment, empty
results, actor change, capability revocation, and stale completion after unmount.
These remain component checks, not manual visual acceptance or institutional
access-management approval. Remote exact-head CI is a separate pending gate.

## Follow-up delivery checkpoint

PR298 merged at `58793dda00e8b5f960e13efb4c02bb787e3636cc` after all eight
exact-head checks passed on `a227537` (CI46137955893, CodeQL46137955903).
Independent main CI46139067018 pending at this checkpoint; CodeQL46139067047
PASS. Manual visual acceptance remains separate. PR297 independent main
CI46137466758 and CodeQL46137466759 PASS.
