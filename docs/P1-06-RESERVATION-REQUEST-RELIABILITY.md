# P1-06 — existing reservation request reliability

## Scope

Bounded frontend stabilization of the existing Module E create, cancel and review
forms. No endpoint, schema, reservation/expiry/status rules, permissions, money,
contracts or approval policy changes. Recording a suspension review is explicitly
not reservation approval. P1-06 remains In Review; Phase1 IN_PROGRESS, Phases2–5
gated. This does not close any institutional or manual browser acceptance gate.

## Implemented behavior

- One synchronous request lock across all three writes, held until their read
  refresh completes. Duplicate same-event submissions and competing write forms
  cannot send a second request; close checks the same lock, not only React state.
- Inputs, selectors, cancellation text and close are disabled during a write.
  The existing read-snapshot validity checks remain authoritative for affordances.
  Create checks selected IDs against the loaded eligible unit/customer options.
- Language changes preserve the draft and in-flight write without restarting the
  loading effect, renewing its lifetime or unlocking saving. Async errors use the
  language current at completion.
- Project ID / management scope replacements remount an isolated editor. Old
  reads/writes cannot publish or trigger reads in the new editor.
- Successful create/cancel/review has an explicit localized acknowledgment before
  refreshing. If that read fails, success and read error are both shown, write
  actions stay blocked and a read-only retry never repeats the completed write.
- Failed non-conflict writes retain draft/IDs/stamp for an explicit retry. Existing
  409 authoritative refresh remains unchanged: no write replay, no locally inferred
  expiry, no silent substitution of an unavailable unit and fresh stamp only after
  reloading server truth.

## Verification

Local TypeScript, production build, JS lint ratchet, full frontend **183/183**,
secret scan, repository hygiene, canonical baseline and diff checks pass. Eight
additional rendered component tests cover AR/FR × all three writes, same-event
single-flight/close, cross-family lock, language stability, failed retry payload,
success plus failed read/read-only recovery, project/scope replacement and stale
read/write completions. The seven existing conflict/read-only tests remain green.
These are React/JSDOM tests, not manual visual or actual institutional execution.
This change still needs its own exact-head remote CI/CodeQL and merge.

## Prior delivery checkpoint

PR300 merged after all eight checks SUCCESS on `20417ce` (CI46141031470 and
CodeQL46141031502). Independent main CI46142099423 and CodeQL46142099406 pending
at authoring. PR299 independent main CI46140818938 and CodeQL46140818949 SUCCESS.

## Limits

No claim of offline retry/idempotency across tabs or cancelling an already sent
server request. Existing local cancellation-target switching / discard UX is not
expanded in this batch. No source reference import or legal/practitioner approval.
