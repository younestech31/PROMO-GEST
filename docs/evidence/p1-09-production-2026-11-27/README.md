# P1-09 Production HTTPS evidence — 27 November 2026

These are actual Chrome screenshots of the shipped React SPA against the published
Production API, PostgreSQL 18, and disposable Caddy 2.10.2 HTTPS fixture. No mock or
in-memory preview. Every name/address/account is synthetic.

- PR: [#273](https://github.com/younestech31/PROMO-GEST/pull/273), not merged at capture.
- Source head: `a4b48765a9149b843dd42e40e585968d4ae52893`.
- Tested synthetic PR merge: `433b506db22cb0d0562f7a009c2b792b7d2d027e`.
- [CI 45994447145](https://github.com/younestech31/PROMO-GEST/actions/runs/45994447145): **4/4 PASS**.
- [CodeQL 45994447199](https://github.com/younestech31/PROMO-GEST/actions/runs/45994447199): **2/2 PASS**.
- [Full original artifact 15195088601](https://github.com/younestech31/PROMO-GEST/actions/runs/45994447145/artifacts/15195088601): `staging-https-evidence`, 4,559,157 bytes, 30-day retention; includes eight original organization PNGs, per-profile organization JSON, and the baseline staging/budget evidence.

`manifest.json` binds source/tested revisions, the baseline 15 checks per profile,
**five additional P1-09 checks per profile (20 results)** under `organizationEvidence`,
and the four JPEG SHA-256 hashes. `provenance.json` records the successful run and job.
The import helper reconstructed bounded read-only check annotations and verified hashes;
all four JPEGs were opened for visual review and independently rehashed.

Each compact JPEG is derived from `org-02-authorized-saved.png`: after real non-admin
SPA save and reload, before temporary fixture permission revocation. Desktop shows the
non-admin VIEWER identity and canonical organization edit control; mobile shows the
responsive profile and saved name with RTL/LTR direction. These four images illustrate
the authorized state only. Read-only, denial, audit and revocation outcomes are supported
by executed assertions/JSON, not inferred from a screenshot of another state. Full
read-only screenshots are `org-01-readonly.png` in the artifact.

The explicit `--suite organization` export requires every new check to pass. It does
not reinterpret the earlier staging-only screenshots. No credentials, cookies, session
state, database dumps or private key material are included.

Technical isolated Linux acceptance is not an institution signature, workstation
certificate-trust rollout, Windows-service installation or production deployment.
