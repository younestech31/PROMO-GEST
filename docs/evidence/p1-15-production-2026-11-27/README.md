# P1-15 Production project team evidence — 27 November 2026

Actual Chrome screenshots of the shipped React SPA and published ASP.NET Core API,
PostgreSQL 18 and Caddy HTTPS fixture. Names/accounts/projects are synthetic. No mock
API or permission grant. Existing budget actors are reused with no additional login.

- PR: [#277](https://github.com/younestech31/PROMO-GEST/pull/277), open at capture.
- Source head: `278bf415403cbf6ed6296ee54a39c02241e09c15`.
- Tested PR merge: `ddf5d2dadc24d2b8235e4e5249ffd00f9ff56e03`.
- [CI 46036066204](https://github.com/younestech31/PROMO-GEST/actions/runs/46036066204): **4/4 jobs PASS**.
- [CodeQL 46036066221](https://github.com/younestech31/PROMO-GEST/actions/runs/46036066221): **2/2 PASS**.
- [Original artifact 15219535051](https://github.com/younestech31/PROMO-GEST/actions/runs/46036066204/artifacts/15219535051): `staging-https-evidence`, 7,870,567 bytes, 30-day retention.

The artifact contains 12 original team PNGs (three/profile), four `project-team.json`
files and originals for earlier acceptance suites. Permanent `manifest.json` binds all
four profiles, source/tested revision, baseline/organization/session/language assertions
and **eight team assertions/profile (32 results)** under `teamEvidence`.
`provenance.json` records the successful run/job and read-only annotation transport.

## What the four review images show

All four compact JPEGs derive from `team-03-replacement-protected.png`. The initial
manager was assigned, its sole-manager removal/demotion refused, then a replacement
manager was assigned. Only afterward did original-manager demotion and revocation
succeed. The image shows the final remaining replacement (`QA Budget finance`) and the
localized alert from an actual refused attempt to remove that now-sole manager.
Both the dialog heading and alert are asserted in the viewport before capture; each
actual imported image was opened for visual review. SHA-256 was independently compared
against the manifest after numbered-chunk import; no archive was overwritten.

The lower assignment form shows **unsubmitted default draft capability flags** following
full navigation. These are not the remaining member's saved grants. Every successful
assignment request is asserted to have all four flags false, and the current member row
has no granted-capability labels. Screenshots do not independently establish API status,
CSRF denial, persistence or audit; executed assertions provide those results.

The other PNGs show the original sole-manager removal and demotion refusal. Full-size
originals retain normal artifact expiry; these four bounded JPEGs and JSON are permanent.
No password, cookie/token, user/session ID, raw response or SQL dump is exported by the
team JSON. curl validates the disposable CA; Chrome ignores trust for that fixture CA
only. This is isolated Linux sequential technical acceptance, not an operator signature,
Windows-service installation, certificate rollout, production deployment or a concurrent
race proof. Existing PostgreSQL integration tests remain the separate race coverage.
