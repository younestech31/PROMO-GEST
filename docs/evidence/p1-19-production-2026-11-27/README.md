# P1-19 Production session evidence — 27 November 2026

Actual Chrome screenshots of the React SPA against the published Production API,
PostgreSQL 18 and Caddy 2.10.2 HTTPS. All accounts, organizations, IP/device metadata
are synthetic or runner-local. No mock or in-memory preview.

- PR: [#274](https://github.com/younestech31/PROMO-GEST/pull/274), open at capture.
- Source head: `2433962fb5f06875b32d118353786ff688ffd895`.
- Tested synthetic PR merge: `4fa168d562393e9171f95f3b6ccc07688c7388f4`.
- [CI 45999710383](https://github.com/younestech31/PROMO-GEST/actions/runs/45999710383): **4/4 PASS**.
- [CodeQL 45999710123](https://github.com/younestech31/PROMO-GEST/actions/runs/45999710123): **2/2 PASS**.
- [Original artifact 15197598552](https://github.com/younestech31/PROMO-GEST/actions/runs/45999710383/artifacts/15197598552): `staging-https-evidence`, 5,392,818 bytes, 30-day retention. Includes eight original session PNGs, four session-result JSON files, and the existing organization/budget/baseline evidence.

`manifest.json` binds source/tested revisions, the original baseline 15 checks/profile,
the five organization checks/profile, and **eight session checks/profile (32 results)**
under `sessionEvidence`. `provenance.json` records the successful run/job/transport.
Four compact JPEGs were reconstructed via bounded read-only check annotations,
SHA-256 rechecked, and each opened for visual review.

Each review JPEG is derived from `sessions-02-confirmation.png`, after another session
was revoked and before current-device sign-out was confirmed. Desktop images show
the privacy note, current-device marker and confirmation. Mobile images deliberately
scroll inside the modal to show the actual confirmation and its confirm/cancel buttons;
the privacy note above the scroll position is captured in the original
`sessions-01-inventory.png` and independently asserted. The runner checks the prompt
is in the viewport before capture, not merely CSS-visible outside the screenshot.

Images illustrate the confirmation state, not API authorization or post-revocation
behavior. Those are proved by executed assertions and the eight-check matrix. For
current-cookie replay, an independent pre-revocation cookie jar was authenticated
before the action and denied afterward, not just emptied by the UI logout handler.

Earlier source `ef84570` passed the technical matrix, but its mobile confirmation
capture was below the viewport. Those images were not accepted or committed; this
folder contains only the corrected, actually reviewed capture run above.

Private cookie state, passwords, token values/hashes, session IDs, SQL dumps and key
material are absent from exported JSON. Screenshot IP/User-Agent fields are synthetic
fixture metadata. curl validates the disposable CA; Chrome ignores that local CA's
trust error only. No workstation certificate rollout, Windows-service installation,
production deployment or institution/operator sign-off is inferred.


## Final closure verification (not image recapture)

PR #285 merged as `42f8831fa33e28dde9031eef14b6c1a0efe8b6c1` at21:30:45Z.
Final head1b1af8c CI46069417557 PASS5/5 + CodeQL46069417572 PASS2/2;
independent exact-main CI46070780952 PASS5/5 + CodeQL46070780950 PASS2/2.
[`closure-checks.json`](closure-checks.json) archives those four workflows with
job/step identities and outcomes; [`preservation-checks.json`](preservation-checks.json)
retains the original0fd301a regression runs. These do not replace original image
provenance, add omitted screenshots or claim local execution.
