# P1-02 — operational reference snapshot boundary

## Delivered in this slice

Two offline commands implement the input boundary for the **owner-selected Sheets
reference**, without re-opening P1-01/P1-35 operational acceptance:

- `scripts/administrative_reference_preflight.py`: validates three complete CSV
  exports together and emits a machine-readable assessment and checksums.
- `scripts/package_administrative_reference.py`: creates a new, self-contained
  snapshot directory, or verifies every byte and recomputes the assessment of an
  existing package. It never replaces an existing destination.

This is working preflight/packaging code, **not an imported dataset, a database
migration, an activated API version, or completion of P1-02**. The current runtime
still reports `communesCount=0`. No organization/project/setup historical fields
are changed. No writes were made to Sheets or the task tracker.

## Source actually inspected

The owner identified the adopted reference in Sheets. Read-only inspection of
[the workbook](https://docs.google.com/spreadsheets/d/1vQFc-Ww6V76nUYiqfsgmxkdD32Eu4I6lR7THBbhiikk/edit)
confirmed the three tabs and the following aggregates:

| Observation | Result |
| --- | ---: |
| Complete commune rows / distinct commune system codes | 1541 / 1541 |
| Wilayas / per-wilaya commune counts | 69 / match child counts |
| Alias rows | 151 |
| Sum of declared daira counts in the wilaya tab | 550 |
| Distinct `(wilaya, daira)` groups, FR / AR / bilingual | 549 / 549 / 549 |
| Seat marker `نعم` / blank / explicit `لا` | 460 / 1081 / 0 |

The previous metadata-only statement is superseded by these content/aggregate
reads. This establishes an adopted **operational source**, not byte identity with
an earlier attachment. A subsequent [resumable captured-cell adapter](P1-02-SHEETS-CAPTURE.md)
now persists bounded actual-source reads and reports exact gaps. The initial
checkpoint contained 69 wilayas, 50 communes and 20 aliases. The current first-pass
checkpoint contains **69 wilayas, 600 communes and all 151 aliases**, from complete
connector responses, with transcription/provenance limitations explicitly retained.
Only wilayas and aliases have a complete first pass; the next missing commune row
is physical sheet row **602** (941 commune rows still missing). No independent
second pass has been recorded. The 49 captured commune/alias intersections have
exact original AR/FR equality; this subset check is not complete source verification.
The complete 1541/69/151 files have **not yet been captured and packaged**; there
is no claimed source-snapshot checksum yet. A partial journal digest is not a
source snapshot ID. Do not treat hashes of synthetic inputs as source evidence.

Sample cells were also read, including `0101`/`01`, a blank seat marker at `0102`,
and aliases such as reference FR `Chief` → alias FR `Chlef`. Original labels,
Arabic spellings and evidence text must remain distinct from display aliases.

### Residuals, not invented data

- Keep declared 550 and observed 549 separately. A successful preflight may carry
  `KNOWN_DAIRA_549_550_RESIDUAL` with the actual per-wilaya differences. It does not
  synthesize the missing group or reverse the owner's operational acceptance.
- A blank seat flag is **unknown**, never implicitly `false`. An explicit `لا`
  is counted separately; the raw input bytes and content digest retain it.
- The source columns contain no dated parent relationship or legal effective-date
  field. Preflight always reports `legalEffectiveDatesVerified=false`; the export
  timestamp must not become a legal effective date.
- System codes stay strings, including leading zeros. Parent selection uses the
  explicit `wilaya_code`; no parent is inferred from a commune-code prefix, an
  older archive, a name, or an alias. No claim of official statutory status for
  these system codes is introduced by the packager.

## Input contract

Export each tab as a complete UTF-8 CSV with exactly the following header/order:

```text
communes.csv: code,wilaya_code,commune_fr,commune_ar,daira_fr,daira_ar,is_daira_seat
wilayas.csv: wilaya_code,wilaya_fr,wilaya_ar,dairas,communes,wilaya_ar_source
aliases.csv: code,ref_fr,alias_fr_2026,ref_ar,repo_ar,evidence
```

The accepted production profile is 1541 communes, 69 wilayas (01–69), 151 aliases,
550 declared dairas and 549 or 550 observed groups. Require all named columns;
only the commune seat marker may be blank. Export all seven commune columns,
including the trailing blank cell. These are **validation rules**, not a claim
that every individual source row has already passed the new program.

The preflight rejects duplicates, orphan parents/aliases, stale alias reference
names, missing names/evidence, invalid codes, non-decimal count declarations,
per-wilaya commune-count drift, unsupported seat markers, inconsistent bilingual
daira pairings, invalid UTF-8/CSV, surrounding whitespace and control characters.
It does not silently trim, translate, correct OCR or approve linguistic/legal
correctness. Errors identify table/record/field, not the raw cell or local path.

Each input is bounded to 4 MiB. UTF-8 BOM and CRLF are supported. Empty CSV lines
are ignored; partial records are rejected. Byte SHA-256 hashes cover the exact
supplied CSV files. The canonical content SHA-256 sorts records by source code
and serializes parsed strings as UTF-8 JSON with sorted keys, no whitespace and
no Unicode/name normalization. Thus BOM, line-ending and row-order differences
change byte hashes but not canonical content identity. Source labels, evidence,
seat states and alias changes do change canonical content identity.

## Operator commands

Use an existing local parent such as ignored `storage/`. The paths below are
examples, **not files claimed to exist or to have been validated**:

```bash
python3 scripts/administrative_reference_preflight.py \
  --communes storage/source-export/communes.csv \
  --wilayas storage/source-export/wilayas.csv \
  --aliases storage/source-export/aliases.csv

# Replace CAPTURED_AT_UTC with the real capture time, e.g. an ISO UTC value ending in Z.
python3 scripts/package_administrative_reference.py create \
  --communes storage/source-export/communes.csv \
  --wilayas storage/source-export/wilayas.csv \
  --aliases storage/source-export/aliases.csv \
  --captured-at-utc "$CAPTURED_AT_UTC" \
  --output storage/p1-02-operational-snapshot

python3 scripts/package_administrative_reference.py verify \
  storage/p1-02-operational-snapshot
```

Outputs: exact `communes.csv`, `wilayas.csv`, `aliases.csv`, `preflight.json`,
`manifest.json`, and a `COMPLETE` marker containing the manifest's SHA-256. The
manifest's `snapshotId` is `sheets-sha256-<canonical-content-hash>`. File hashes
and byte lengths cover all inputs and the preflight. Verification rejects missing,
extra or symlinked entries, mismatched hashes/lengths and a forged saved PASS
assessment even when the package hashes have been recomputed. It reruns all
structural checks. Partial output is removed on a handled write failure; consumers
must never accept a directory without a valid `COMPLETE` marker.

Exit 0 means structurally valid, possibly **with warnings**. Exit 1 means invalid
input/package or an I/O failure. Neither status authorizes import. Hashes are
integrity checks, **not signatures or proof of publisher identity**. CSV origin and
capture time remain explicitly unverified claims supplied by the caller; an offline
command cannot establish them from bytes alone. Even a recomputed malicious
package cannot be treated as approval. The manifest always records
`originalAttachmentByteIdentityVerified=false` and `databaseImportAuthorized=false`.
Keep generated exports/packages out of Git unless deliberately reviewed as small
reference assets; the ordinary output location is already ignored.

## Verification and remaining delivery

Local: **21 tests PASS**, including synthetic full-size 1541/69/151 inputs,
549/550 residuals, tri-state flags, code/parent/alias failures, deterministic hashes,
actual CLI create/verify/non-overwrite, byte tampering, failed writes, missing
completion and symlink refusal. CI runs the same tests. These are synthetic
structural/integrity tests, not a test result against the full adopted source.
No local .NET/PostgreSQL run or new manual/institutional acceptance is claimed.

Next implementation sequence:

1. Capture all three exact source exports together; retain capture provenance,
   verify completeness and package them with these commands. Review/report any
   rejected source records instead of silently fixing them.
2. The additive server-owned version/identity/dated-parent schema is now implemented
   in `20261127120000_AddVersionedAdministrativeReference`; see
   [storage design and verification boundary](P1-02-VERSIONED-REFERENCE-STORAGE.md).
   It preserves original labels and unknown values, adds no seed/activation and
   passed all eight checks at schema head `a66de0c` (CI46152628132 /
   CodeQL46152628129). Do not derive effective dates from capture time,
   or invent stable daira IDs from names without review.
3. A [transactional importer and reversible removal path](P1-02-REFERENCE-IMPORT.md)
   now implements retained identities, strict retries and full row readback.
   Its CI uses synthetic full-size fixtures, not the adopted source. Complete
   source capture and source-bound PG18 import/rollback rehearsal are still needed;
   no automatic historical text rewriting.
4. Consume one activated reference version in the API, setup, organization,
   projects and preview; verify AR/FR selection/display parity and preserve old
   text values. Current endpoint behavior is unchanged until that work lands.

Phase 1 remains **IN_PROGRESS**. P1-02 remains in progress; P1-06/P1-20/P1-49
manual/institutional gates are not replaced by this work.
