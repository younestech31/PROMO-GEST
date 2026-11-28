# Phase 1 / P1-06 — customer and Party workflow completion

## Delivery checkpoint

[PR #295](https://github.com/younestech31/PROMO-GEST/pull/295) merged at
`36c637c0ad7c131d6a9fe6d3fb2c4c1fa61f7271` after all eight exact-head checks
passed on `94d581d4425c1b411cae5b16cd9d242ab9321154`:
CI[46098184595](https://github.com/younestech31/PROMO-GEST/actions/runs/46098184595)
and CodeQL[46098184512](https://github.com/younestech31/PROMO-GEST/actions/runs/46098184512).
Independent main CI46129790407 and CodeQL46129790417 both PASS on the exact
merged SHA. P1-06 overall acceptance remains separate.

## Scope and work selection

At the PR295 work-selection snapshot, the operational backlog query returned no
Phase 1 task in Ready or In Progress. This is historical, not a new live query;
subsequent checkpoints record P1-01/P1-35 resumed In Progress with source gates intact.
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


## Canonical Party save isolation follow-up

This bounded P1-06 frontend follow-up closes remaining request-ownership gaps in
the existing central identity editor, not a Party master-data expansion:

- A synchronous single-flight save lock rejects same-event duplicate submissions,
  conflicting search/open-editor actions and close before React commits disabled
  controls. Confirmation dialogs also reject background saves/searches.
- All edit/search controls are frozen while saving. A failed write retains the
  canonical Party ID, kind/name draft, dirty guard and original concurrency stamp
  for an explicit retry; no refetch or synthetic stamp is introduced.
- Actor ID, actor concurrency stamp and effective directory-read/identity-manage
  scopes key an isolated editor. Changing any clears old query/results/editor,
  errors, confirmation and dirty state, invalidating outstanding reads/writes.
  In particular, manage revocation with read retained no longer leaves the prior
  editor alive or allows an obsolete success to publish into the new scope.
- Language-only changes keep the draft and pending write, without search/refetch.
  Async errors use the current language at completion; success is stored as an
  outcome and rendered in the selected language, including later language changes.
- Success applies the returned canonical identity and closes the editor without
  a second read; earlier searches remain unable to overwrite it.

Local TypeScript, production build, JS lint ratchet, full frontend **187/187**,
secret scan, repository hygiene, canonical baseline and diff checks PASS. Four new
AR/FR component tests cover same-event duplicate/close, search exclusion,
confirmation exclusion, language-stable failure/retry/success, and replacement by
actor ID/stamp/read/manage scope during writes. Tests cover both stale success and
stale failure. The five existing Party request tests also pass. This is mocked
React/JSDOM evidence, not manual visual, database or institutional acceptance.
This follow-up still requires its own exact-head remote checks and merge.

Prior delivery checkpoint: PR301 merged at main `4eeffa4` after all eight
exact-head checks SUCCESS on `649e587` (CI46142347443/CodeQL46142347461).
Independent main CI46143373760 and CodeQL46143373737 pending at authoring.
PR300 independent main CI46142099423 and CodeQL46142099406 SUCCESS.
No API, database/schema, permission-policy, merge/contact/identifier model or
financial change. P1-06 remains In Review, Phase1 IN_PROGRESS, later phases gated.
