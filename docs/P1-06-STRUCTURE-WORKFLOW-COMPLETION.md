# P1-06 — bounded Module C structure workflow recovery

## Roadmap mapping

This implements the existing P1-06 safe-editing/request-lifecycle requirements in
Module C, not a new construction or financial workflow. It covers current
building/floor/unit create/update and allowed unit status actions only. No delete,
bulk generation, pricing, unified property file, API/schema, transition policy or
permission-policy change is included. P1-06 remains In Review; Phase 1 remains
IN_PROGRESS and Phases 2–5 gated.

## Delivered behavior

- An initial read failure is an explicit localized error with a read-only retry,
  not an apparently empty registry with create controls. Reads have a generation
  guard; obsolete completions cannot publish after unmount.
- The editor is keyed by project ID. Changing project clears the previous draft,
  selection and errors and invalidates its async completions and callbacks.
- Language-neutral structure DTOs are not refetched for a language change, keeping
  the current form/draft stable and avoiding a read/write race.
- All five write handlers share a synchronous single-flight lock: building
  create/update, floor create/update, unit create, unit update and unit status.
  Duplicate same-event submissions cannot send a second write.
- Inputs, selectors, local navigation, form cancellation and close controls are
  frozen while a write is pending; close/subview callbacks check the same lock.
- Failed saves retain the current draft and original concurrency stamp. Successful
  writes publish the returned structure, clear only the saved form and notify the
  parent once. No follow-up read is required to acknowledge a successful save.
- A completion from an unmounted/project-replaced editor does not publish state,
  errors or parent callbacks into its successor.

This does not extend dirty confirmation to every existing registry selection or
form-to-form transition. It does not claim offline support, cancellation of a
server write already submitted, or human visual approval.

## Local verification

`npm run lint`, `npm run build`, `npm run lint:js:guard`, and `git diff --check`
PASS. Frontend tests **173/173 PASS**, including 14 new rendered React/JSDOM cases
covering Arabic and French initial read failure/retry, empty success, draft
preservation on language change, all five write families pending/same-turn lock,
failed retry with identical IDs/draft/stamp, success, project change and stale
read/write completion. These are component tests, not actual browser acceptance.

Remote exact-head CI/CodeQL and merge remain separate gates for this batch.
PR298's eight exact-head checks passed and it merged at
`58793dda00e8b5f960e13efb4c02bb787e3636cc`; independent main CI46139067018 is
pending at authoring, CodeQL46139067047 PASS. Prior PR297 independent-main
CI46137466758 and CodeQL46137466759 PASS.

## Live roadmap correction

The Notion read in this session found P1-01 and P1-35 **In Progress**, superseding
the former Deferred snapshot. P1-01's Dependencies explicitly records resumption
and a limited other-environment W11 source correction. Its raw-input full build
is still NOT RUN in that record. No source bytes, PDF images or candidate output
were imported/reviewed in this Module C change. All 1,541 practitioner approvals
remain PENDING, W30-R007 NEEDS_EVIDENCE, no inferred valid_from, communesCount=0,
and P1-02 remains Blocked. Resumed source work is not approval or import authority.
