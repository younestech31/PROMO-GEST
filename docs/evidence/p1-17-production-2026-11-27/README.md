# P1-17 Production language evidence — 27 November 2026

Actual Chrome screenshots of the shipped React SPA against the published Production
API, PostgreSQL 18 and Caddy 2.10.2 HTTPS fixture. Organizations/accounts/addresses
are synthetic. No mock or in-memory API; only the documented network-failure case
aborts one browser request deliberately, never fabricates a successful response.

- PR: [#275](https://github.com/younestech31/PROMO-GEST/pull/275), open at capture.
- Source head: `34304e98219d2d576b7a48e98c594174a7c7c52d`.
- Tested synthetic PR merge: `fb627e22ec0d109e2aae7f9f17e89df9f910a3ee`.
- [CI 46002815426](https://github.com/younestech31/PROMO-GEST/actions/runs/46002815426): **4/4 PASS**.
- [CodeQL 46002815316](https://github.com/younestech31/PROMO-GEST/actions/runs/46002815316): **2/2 PASS**.
- [Original artifact 15198929016](https://github.com/younestech31/PROMO-GEST/actions/runs/46002815426/artifacts/15198929016): `staging-https-evidence`, 6,544,562 bytes, 30-day retention. Contains 16 original language PNGs and four language JSON result files, plus prior matrices' originals.

`manifest.json` binds source/tested revisions, the original baseline/organization/session
checks and **eight new language checks per profile (32 results)** under `languageEvidence`.
`provenance.json` records the successful run/job. Four compact JPEGs were reconstructed
via bounded read-only check annotations, SHA-256 rechecked and individually opened
for visual review. No repository-write CI permission or artifact redirect is required.

## Read the fixture names correctly

Each image is derived from `language-04-after-restart.png`, before restoring the original
preference. The stored choice is intentionally the **opposite** of the fixture's initial
language:

| Directory | Original | Screenshot after restart |
|---|---|---|
| ar-desktop | Arabic RTL | French LTR |
| ar-mobile | Arabic RTL | French LTR |
| fr-desktop | French LTR | Arabic RTL |
| fr-mobile | French LTR | Arabic RTL |

The directory names are not mislabeled screenshots. Desktop views also visibly retain
the original organization default (`AR`/`FR`) while the shell uses the user's other
language. Mobile views show the actual responsive profile in the saved language; the
organization default is independently verified through the real API, not inferred from
a field below the screenshot viewport.

Fresh login, injected network failure and stale-conflict screenshots are the three
other PNGs/profile in the original artifact. Persistence, CSRF, concurrency, audit and
restoration results come from executed assertions, not screenshots alone.

No password, cookie/token, raw response, user/session ID, dump or key is exported by
the language result. Private saved state is mode 0600 and removed by runner cleanup.
curl validates the disposable CA; Chrome ignores trust for that fixture CA only.
This is isolated Linux technical acceptance, not institution/operator sign-off,
Windows-service installation, certificate distribution or production deployment.
