# Phase 1 / P1-06 — reliable document upload, browsing and download

## Bounded functional scope

Complete the already available Module K project upload/list/download workflow.
Do not implement planned metadata editing, soft-archive, DocumentLink, retention,
contracts or financial workflows. Existing category authorization, KYC isolation,
25 MiB upload validation and API SHA-256 verification remain unchanged.

## Delivered in PR #296

1. **Upload intent and pending-write protection.** A synchronous request lock
   rejects duplicate submissions while the first request is pending. Upload
   fields, close controls, list refresh and sub-view changes are blocked during
   upload. Failed uploads retain file, category, description and dirty guard.
2. **Acknowledge upload separately from list reload.** A server-acknowledged upload
   clears the submitted draft and displays the filename with an explicit notice
   not to upload it again merely because list reload failed. Read errors and retry
   are separate from write errors; retry performs only GET/list operations.
3. **Find authorized loaded documents.** Local filename/description search and
   category filtering expose counts, reset and a distinct no-match state without
   changing the upload draft or making broader API requests. A failed read is not
   presented as an empty vault.
4. **Project-scoped request ownership.** Superseded list results cannot overwrite
   another project's list. Old upload completions cannot clear the next project's
   draft or reload the old project. A stale download is not delivered into a new
   project view. The file input is scoped through its React ref, not a global DOM
   lookup.
5. **Language and read-only boundaries.** Language change reloads translated reads
   without unlocking a pending upload or allowing duplicate writes. Upload success
   is rendered in the current language. Read-only viewers retain list/filter and
   download, but no upload form. Download failures release the request lock for an
   explicit retry; no downloaded blob is created on a failed request.

A project change clears project-specific drafts only after the parent navigation
workflow has allowed the transition. Existing Stay / Discard upload navigation is
preserved. Client-side guards do not replace server authorization or idempotency
for ambiguous network failures; no automatic write retry is introduced.

## Verification

- `npm test`: **155/155 PASS**, including nine new rendered React/JSDOM cases
  covering Arabic/French upload validation, failed draft retention, pending-write
  lock, acknowledged upload plus failed list read/retry, filters, Stay/Discard,
  project-switch races, language change during upload and read-only downloads.
- TypeScript (`npm run lint`), lint ratchet (`npm run lint:js:guard`), production
  frontend build and `git diff --check`: PASS.
- Tests mock API responses; they are not manual browser, PostgreSQL persistence,
  production installation, or legal/retention acceptance.

PR #296 merged at `c0c32757ee109c3179d8a39ca40471fd7de7b336` after all eight
exact-head checks succeeded (CI46130175418/CodeQL46130175356). Independent
main CI46136104804 pending; CodeQL46136104813 PASS. It does not close
P1-06 as a whole or remove any Phase 1 or Phase 2–5 gate. The new bounded
[closure execution](PHASE-1-CLOSURE-EXECUTION.ar.md) adds actual CI browser
acceptance of document persistence/retry/download and guarded routes; its own
remote execution is pending, not inherited from PR296.
