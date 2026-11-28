# P1-49 follow-up — reliable project directory requests

## Scope

Functional follow-up to the already implemented project directory pagination.
No new endpoint, migration, permission, project-switcher change, or Phase 2–5 work.

## Changes

- Only the latest directory request can publish rows, counts, errors, user options,
  or loading completion. Effect cleanup invalidates requests after unmount or an
  authenticated actor/version change.
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
