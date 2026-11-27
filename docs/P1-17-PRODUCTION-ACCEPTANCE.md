# P1-17 — Production HTTPS language preference acceptance

Date: 27 November 2026. Status: **new real-stack execution pending**.

## Scope

The own-language preference API and SPA persistence wiring are already shipped.
`tests/browser/phase0.py` covers the Development-mode employee scenario. This slice
adds a focused Production HTTPS/restart matrix for the existing administrator's own
preference. No runtime application, API policy, database schema/migration, seeded
permission, session lifetime or deployment configuration changes.

PR #274 was squash-merged as `df350efbd6993a25e87fbc6b67c904ec5be5a347` after final
PR-head CI 46000918302 passed 4/4 and CodeQL 46000918344 passed 2/2. Its P1-19
technical results/screenshots retain their original source/tested-checkout provenance.

## New matrix and boundaries

`tests/browser/language_preferences.py` runs on all four existing isolated Production
HTTPS profiles. It validates the exact disposable CI target and encrypted-key proof
before browser/API/filesystem/SQL I/O. The guard is shared with the previous helpers;
actual persisted encrypted key files are inspected by the staging runner before preparation.

The helper reuses the existing administrator, so the baseline singleton-user check is
unchanged. One extra fresh login occurs **before API restart**; no new verify-phase
login and no Production login-limit override. Passwords stay in memory. The fresh
cookie jar is mode 0600 under the private temporary fixture directory, removed by
shell cleanup and never uploaded as evidence.

Eight named checks per profile:

1. Actual SPA switch from the profile's original language to the opposite language
   returns 200, persists the own preference and leaves the full organization summary,
   including `Organization.DefaultLanguage`, unchanged.
2. Reload and an independent fresh browser login apply the saved language and RTL/LTR.
3. Direct own-preference PUT without CSRF returns 403 and preserves the saved preference.
4. An explicitly injected browser transport failure (abort only the preference PUT)
   keeps the previous locale/persisted value and displays the localized failure alert.
5. A real API update behind the open tab makes its stale stamp return 409
   `USER_CONCURRENCY_CONFLICT`; the SPA refreshes the authoritative server language
   and shows the localized error, rather than pretending the stale write succeeded.
6. After actual API process restart, the saved preference and organization summary
   are reconstructed using the persisted cookie jar and real SPA.
7. Restore the original language via the actual switcher, reload, and independently
   verify the original administrator session sees that own preference while the
   organization summary/default language remains unchanged.
8. Exactly four successful language changes are recorded for that actor in
   `USER_PREFERRED_LANGUAGE_UPDATED`; rejected/aborted writes add no successful event.

Cross-user preference denial, non-admin handling, invalid-language values and concurrent
races are not newly scored by this administrator-focused slice. Existing Development
browser and API/integration coverage remains separate. No institutional/operator
signature or phase-gate advancement is inferred.

## Screenshot meaning

Each profile produces four original PNGs: fresh login, injected network failure,
stale-concurrency refresh and post-restart preference. The exported compact review image
is the **post-restart, opposite-language** screenshot, before restoring the original:

| Profile name / original language | Screenshot language after persisted switch |
|---|---|
| ar-desktop / ar-mobile | French LTR |
| fr-desktop / fr-mobile | Arabic RTL |

The inverse language is intentional evidence of the saved choice, not a mislabeled
translation screenshot. The original-profile name identifies the fixture, not the final
choice. Profile heading, real organization name and HTML language/direction are checked
before capture. Screenshots do not by themselves prove persistence, API denial or audit;
executed assertions and the manifest provide that evidence.

The explicit `--suite language` exporter validates all eight checks plus the existing
baseline, organization and session matrices, exporting only boolean outcomes and static
scope. It uses the existing bounded read-only annotation transport and SHA-256 import;
previous suite defaults/meanings remain unchanged. Full originals stay in
`staging-https-evidence` for 30 days. No cookie state, password, user/session ID or raw
response is exported by the language result. curl validates the local disposable CA;
Chrome ignores trust for that fixture CA only, not an organization certificate rollout.

## Verification log

- New offline helper **3/3 PASS**: guarded I/O rejection and user-stamp-only payload.
- Exporter **16/16 PASS**: completeness, failed/extra-sensitive fields and symlink denial.
- Importer **7/7 PASS**. Python compilation **PASS**.
- New Production browser matrix and screenshots: **PENDING CI**, not scored yet.
- PR #274 exact-main CI 46002336753: **in progress** at this checkpoint;
  CodeQL 46002336544: **SUCCESS 2/2**.

P1-17 tracking remains In Review / Pending. P1-08 owner policy, P1-10 acceptance
dependency, P1-01/P1-35 deferral, P1-02 block and Phases 2–5 gates remain unchanged.
No Notion status or institutional sign-off is changed.
