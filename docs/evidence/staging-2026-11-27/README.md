# Verified synthetic Production HTTPS staging evidence — 27 November 2026

Source head: `d7768c42ab8c837a9cc5b9abcec6e4f4fd718b1f`.
Tested merge checkout: `842cb296e25f1839a47df001ac21345b92593157`.
[Successful CI run](https://github.com/younestech31/PROMO-GEST/actions/runs/45988658013).

Four compact **actual browser screenshots**, not generated illustrations, show the
organization profile after an API-process restart. Arabic/French × desktop/mobile
all passed 15 named checks, including the P1-05 Production budget matrix. The main
[Arabic report](../../STAGING-ACCEPTANCE-2026-11-27.ar.md) embeds all four review images
and describes the exact scope, results, TLS trust limitation and outstanding gates.

`manifest.json` records the source, tested checkout, environment, results and SHA-256
of each JPEG. `provenance.json` identifies the run/job and retrieval method. CI had
no repository-write permission. Images were imported through bounded check notices,
SHA-256 verified, and opened/reviewed by the agent. Existing directories are never
overwritten by the importer.

```bash
python3 scripts/import-staging-evidence.py --run 45988658013 --out /path/to/new-evidence-directory
```

The normal `staging-https-evidence` artifact contains 40 original PNGs (ten/profile)
plus full results. The permanent JPEGs here are compressed review copies, not a
replacement for those full-resolution originals. No cookie, password, bootstrap
token, certificate/private key, browser-state file or real organization data is
included. Do not treat the synthetic Linux rehearsal as a customer installation,
certificate-trust rollout, Windows service acceptance or human operator signature.
