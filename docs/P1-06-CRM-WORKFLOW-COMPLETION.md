# Phase 1 / P1-06 — customer and Party workflow completion

## Delivery checkpoint

[PR #295](https://github.com/younestech31/PROMO-GEST/pull/295) merged at
`36c637c0ad7c131d6a9fe6d3fb2c4c1fa61f7271` after all eight exact-head checks
passed on `94d581d4425c1b411cae5b16cd9d242ab9321154`:
CI[46098184595](https://github.com/younestech31/PROMO-GEST/actions/runs/46098184595)
and CodeQL[46098184512](https://github.com/younestech31/PROMO-GEST/actions/runs/46098184512).
Independent main CI46129790407 is pending and CodeQL46129790417 PASS at this
checkpoint. P1-06 overall acceptance remains separate.

## Scope and work selection

The operational backlog query returned no Phase 1 task in Ready or In Progress.
This batch completes safety and usability gaps in the existing Module D workflows
under P1-06, rather than implementing blocked master-data decisions or the planned
commercial pipeline. It does not declare P1-06 complete or substitute component
tests for its independent manual acceptance.

## Implemented work packages

1. **Guard all internal customer transitions.** Selecting another customer,
   adding a customer, entering edit mode, cancelling a customer form, changing
   sub-view and closing use the same Stay / Discard decision. Stay preserves the
   entire draft; Discard clears it before performing the requested action. A note
   for one customer cannot silently migrate to another. Interaction type alone is
   also tracked as a draft.
2. **Reliable customer details and Party lookups.** Latest-request ownership
   protects selection, list, document-option and Party-search results. Opening a
   different form invalidates outstanding details/lookups; changing the lookup
   query clears stale results. Failed customer reads expose a dedicated retry,
   never the previous customer's actionable details.
3. **Safe customer and interaction saves.** Failed writes retain input and dirty
   protection. Successful writes display explicit server-acknowledged success;
   subsequent failed detail/list reads have separate errors and read-only retry.
   A failed read does not invite replaying an already saved interaction. Saving
   blocks conflicting navigation/inputs, and callbacks from a former view
   lifetime do not update the current one.
4. **Find loaded customers quickly.** Local name/contact/phone/email search and
   Prospect / Qualified / Customer / Archived filters include a visible result
   count, distinct no-match text and reset. Filtering does not navigate away from
   the selected draft. This filters the already authorized complete loaded list;
   it is not server pagination, a global directory or a commercial pipeline.
5. **Reliable central Party search.** Latest submitted request wins, failures
   are not empty results, and retry repeats the submitted failed query rather
   than an unsubmitted draft. Actor-scope changes and unmount invalidate pending
   reads. A late search cannot overwrite a successfully saved canonical identity.
6. **Preserve identity edit intent.** Failed canonical identity writes keep the
   draft and original concurrency stamp; no new stamp or successful mutation is
   fabricated. Save freezes editor fields/close controls. Existing read-only and
   no-directory-permission boundaries are preserved.

No new endpoint, database/migration, authorization policy, Party merge/contact
model, HR master, contract, payment, planned pipeline or production change.
Phase 1 remains in progress; Phases 2–5 remain gated.

## Verification

- `npm test`: **146/146 PASS**, including 18 new rendered React/JSDOM cases for
  both Arabic and French, plus read-only/denied-access boundaries.
- `npm run lint`: PASS (TypeScript).
- `npm run lint:js:guard`: PASS without raising the baseline.
- `npm run build`: PASS.
- `git diff --check`: PASS.

The new tests use mocked API responses. They prove component decisions and
request ordering, not PostgreSQL persistence, manual visual acceptance or a
production installation. Remote PR checks/merge remain separate checkpoints.
