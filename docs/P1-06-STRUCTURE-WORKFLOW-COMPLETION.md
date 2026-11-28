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

### Local draft-transition follow-up

Building/floor selection, switching between create/edit forms, toggling a form
closed, explicit Cancel, subview changes and modal close now use one Stay/Discard
entry point. Clicking the already selected building/floor is a no-op. Stay keeps
the editor, values and dirty signal unchanged. Discard closes the old editor,
clears its values/flags and applies only the requested UI transition; it performs
no write or structure refetch. Only one editor is active at a time, preventing
hidden drafts from surfacing in a different building/floor context. Pending-write
locking still wins and mutation handlers reject submission behind a confirmation.

This does not claim offline support, cancellation of a server write already
submitted, or human visual approval. Unit-status selector intent is unchanged;
this follow-up governs the tracked create/edit forms, not a new status workflow.

## Local verification

`npm run lint`, `npm run build`, `npm run lint:js:guard`, and `git diff --check`
PASS. Frontend tests **173/173 PASS**, including 14 new rendered React/JSDOM cases
covering Arabic and French initial read failure/retry, empty success, draft
preservation on language change, all five write families pending/same-turn lock,
failed retry with identical IDs/draft/stamp, success, project change and stale
read/write completion. These are component tests, not actual browser acceptance.

PR299's eight exact-head checks passed on `47d1527` (CI46139392068,
CodeQL46139392059) and it merged at
`360cfbc371fde3dc00f889da0bd7e9aa82e920c3`. Its independent main CI46140818938
and CodeQL46140818949 subsequently passed. PR298 independent main
CI46139067018 and CodeQL46139067047 PASS.

The local transition follow-up passes TypeScript/build/lint guard and **175/175**
frontend tests. Two additional rendered AR/FR cases each exercise eight actual
component transitions with Stay and Discard: building cancel/selection, floor
selection/editor replacement, unit floor/context changes, edit-to-create,
create-to-edit, and unit-edit cancel. Assertions cover preserved draft/dirty state,
clean target state and zero writes/refetches. These component checks and the new
head's remote CI are distinct from PR299's delivery or manual browser acceptance.
The transition follow-up merged as PR300 after all eight exact-head checks
SUCCESS on `20417ce` (CI46141031470 and CodeQL46141031502). Its independent
main CI46142099423 and CodeQL46142099406 are pending at this checkpoint.

## Live roadmap correction

The Notion read in this session found P1-01 and P1-35 **In Progress**, superseding
the former Deferred snapshot. P1-01's Dependencies explicitly records resumption
and a limited other-environment W11 source correction. Its raw-input full build
is still NOT RUN in that record. No source bytes, PDF images or candidate output
were imported/reviewed in this Module C change. All 1,541 practitioner approvals
remain PENDING, W30-R007 NEEDS_EVIDENCE, no inferred valid_from, communesCount=0,
and P1-02 remains Blocked. Resumed source work is not approval or import authority.
