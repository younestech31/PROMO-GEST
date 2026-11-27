# Staging evidence import contract — 27 November 2026

## Why this follow-up exists

After merging PR #275, review found an asymmetry: the exporter checked every suite's
named boolean result, but the importer checked only profile/source/verdict and image
integrity. A malformed manifest with a PASS label could therefore be imported without
its individual assertions. The import boundary now revalidates those assertions before
creating its output directory. This is evidence-tool hardening, not a runtime security
incident or a new application acceptance claim.

## Contract

- Explicit modes only: staging, organization, sessions, language, and the P1-15 `team`
  extension. The team mode requires all four prior assertion groups plus its own eight
  named checks; prior modes keep their original meanings.
- Independent `budget` mode uses the complete baseline Production HTTPS checks,
  including literal `production_budget_authorization_matrix: true`, and a nonempty
  sanitized `budgetEvidence` description. It selects only
  `p1-05-non-financial-manager-general-save.png` (never the organization image).
  It does not claim team/session/language checks from a different manifest; all
  scenarios still run unchanged and full results remain in the Actions artifact.
  Existing team/other archives remain supported with their strict schemas.
- All four unique profiles must contain the exact known profile fields, Production
  environment, matching source, PASS verdict, full tested-checkout SHA and numeric run.
- Every named baseline check must be exactly boolean `true`. Organization, session and
  language groups are mandatory for their respective modes and subsequent modes.
  Missing groups, unknown fields, numeric `1` and string `"true"` are rejected.
- All profiles must share the tested revision and run ID; the run ID must equal the
  explicitly requested successful GitHub run before any output is written.
- Image manifest entries and decoded image records use exact field allowlists. Existing
  bounded chunking, duplicate/missing-chunk rejection, compact JPEG signature/size,
  SHA-256 comparison and path checks remain in place.
- Named check lists are read from the exporter module without executing its CLI or
  importing Pillow; the importer needs only the Python standard library and `gh`.

This is schema/identity validation, not cryptographic attestation of CI or automated
redaction of arbitrary text in allowed descriptive fields. Successful same-repository
run/job checks, sanitized exporter inputs and actual visual review remain necessary.

## PR #276 verification (historical baseline)

The subsequent P1-15 extension adds one importer regression (14 total) and three
exporter regressions (19 total). Its real-stack status is recorded separately in the
[P1-15 report](P1-15-PRODUCTION-ACCEPTANCE.md); the results below retain their original
PR #276 scope and do not claim any P1-15 outcome.

- Importer: **13/13 PASS**, including all four archived suites, missing/false/non-boolean
  assertions, missing prerequisite groups, conflicting run/checkouts, unexpected fields,
  unknown/mismatched suite, image tampering/path traversal and wrong requested run.
- Exporter: **16/16 PASS**; importer Python compilation PASS.
- Actual read-only re-import of P1-17 [CI 46002815426](https://github.com/younestech31/PROMO-GEST/actions/runs/46002815426)
  succeeded through GitHub check annotations into a disposable scratch directory. No
  archived file was overwritten; its four hashes were compared against the permanent
  evidence. Run/job/source checks and the new suite/run validations were exercised.
- No UI changes, so no new screenshots are claimed. The four archived screenshot sets
  remain unchanged, with their original source/tested revisions and visual reviews.
  See [P1-17 actual screenshot report](P1-17-PRODUCTION-ACCEPTANCE.md).

PR #275 merged as `9566f86bc2a971baff68355fd87ea8c2857ddcbc` after final head CI
46004178317 passed 4/4 and CodeQL 46004178309 passed 2/2. Exact-main CI 46013272743
passed 4/4 and CodeQL 46013272694 passed 2/2 on that same merged SHA. No deployment, operational database change, Notion mutation, institutional
signature or phase-gate advancement is performed by this follow-up.


## Separate notice budget for Production exports

PR283 observed50 backend annotations:10 warnings +38 P1-10 chunks +only2 budget
chunks; run46060648111 passed all export steps but strict import correctly rejected
missing pieces. Production notices now use dedicated job `Production HTTPS evidence
export`, which downloads the same run's `staging-https-evidence` after successful
backend. Import requires the overall run and backend to pass, and prefers exactly
one successful dedicated export job. Failed/skipped/ambiguous dedicated jobs cannot
fall back to legacy backend notices. Historical runs without it keep original
selection. This is read-only artifact transport, not an acceptance bypass.
