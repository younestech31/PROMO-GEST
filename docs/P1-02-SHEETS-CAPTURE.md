# P1-02 — resumable captured-cell journal

## Purpose and boundary

`scripts/capture_administrative_reference.py` bridges bounded read-only Sheets
connector responses to the existing CSV package/preflight. Large connector
responses can be truncated; aggregate inspection is not a captured dataset.
The tool accepts only complete, explicit row-range responses and reports gaps
rather than filling them from fixtures, archives or the application's catalogue.

The tool is entirely offline: **no credentials, network, Sheets writes, database,
import or activation**. Owner operational-source/import approval is not reopened.
The direct complete CSV export/packager path remains supported unchanged; this
journal's two-pass rule applies only to this captured-cell adapter, not to source
approval or all future import methods.

## Capture protocol

Use one new journal per capture. Use one operator/process at a time; concurrent
writers are not supported. Keep the journal under ignored `storage/`, backed up
alongside the retained source package and identity map. Do not commit raw captures
or pretend a partial journal is an application dataset.

1. Confirm the adopted spreadsheet and the three sheet IDs/titles with the
   connected Sheets app. The fixed profile is the existing 1541 communes / 69
   wilayas / 151 aliases; header row 1 is additional to those data-row counts.
2. Request `batch_get_values` with `major_dimension=ROWS`,
   `value_render_option=UNFORMATTED_VALUE`,
   `date_time_render_option=FORMATTED_STRING`, and **one** explicit A1 range.
   Restrict it to the named table's columns, starting at A. Read enough bounded
   chunks to cover rows 1–1542, 1–70, and 1–152 respectively. Chunk boundaries need
   not be the same on the two passes. Request smaller chunks if truncated.
3. Save the complete underlying response object, not the surrounding escaped
   tool-result wrapper. Its keys are `spreadsheet_id`, `value_ranges`; the sole
   range has `range`, `major_dimension`, `values`. The quoted sheet title and exact
   physical start/end rows must match. **Never parse or reconstruct a truncated
   response**, concatenate its head/tail, coerce numeric codes, infer omitted
   records or normalize Arabic/PDF presentation forms. If values are transcribed
   from tool output, retain that limitation explicitly; the journal does not
   authenticate the transcription or original response bytes.
4. Add each first-pass read with its connector request ID and a claimed UTC read/
   recording timestamp. Neither that ID nor timestamp is independently attested
   by this offline program. Separate reads require distinct request IDs (also
   checked on journal reload); this prevents accidental reuse but cannot attest
   that an ID came from the connector. These are provenance claims, not legal dates.
5. After the *entire* first pass is complete, perform fresh second-pass connector
   reads over all three tables. Do not make the second pass by copying files from
   the first. It must have later claimed times and exact per-row string equality;
   any changed row requires a **new** capture journal, not silently choosing one.
6. Recheck live table counts/titles/ranges before finalization, including unexpected
   rows outside the fixed adopted ranges. This adapter captures those named tables,
   not an archival export of the whole workbook, formulas, formatting or history.
   A changed source profile needs explicit reconciliation, not weakened counts.
7. `freeze` refuses gaps, overlaps, missing headers, mismatched passes or damaged
   chunks, then generates deterministic UTF-8/LF CSVs and invokes the **existing
   full production-profile preflight and packager**. Two matching but structurally
   invalid passes still fail, before creating a package. Existing destinations are
   never overwritten.

Example shape (one header-only chunk, **not** a complete capture):

```json
{
  "spreadsheet_id": "1vQFc-Ww6V76nUYiqfsgmxkdD32Eu4I6lR7THBbhiikk",
  "value_ranges": [{
    "range": "'الولايات 69'!A1:F1",
    "major_dimension": "ROWS",
    "values": [["wilaya_code", "wilaya_fr", "wilaya_ar", "dairas", "communes", "wilaya_ar_source"]]
  }]
}
```

```bash
python3 scripts/capture_administrative_reference.py init storage/new-reference-capture
python3 scripts/capture_administrative_reference.py add-read storage/new-reference-capture \
  --table wilayas --read-pass first --start-row 1 --end-row 1 \
  --response "$SAVED_COMPLETE_RESPONSE" --read-at-utc "$CLAIMED_READ_AT_UTC" \
  --connector-request-id "$ACTUAL_CONNECTOR_REQUEST_ID"
python3 scripts/capture_administrative_reference.py status storage/new-reference-capture
# Only after two complete fresh matching passes; save this receipt separately:
python3 scripts/capture_administrative_reference.py freeze storage/new-reference-capture \
  --output storage/new-reference-package
python3 scripts/package_administrative_reference.py verify storage/new-reference-package
```

Each immutable chunk has fixed table/pass/row-bound naming and a SHA-256 over its
canonical envelope body. Status exposes a digest over the ordered chunk envelope
hashes, captured/missing row counts and the next missing physical row per pass.
These are **journal hashes, not an adopted-source snapshot ID**. Hashes detect
accidental changes, not maliciously re-signed files or source authenticity. A crash
may leave an invalid partial chunk: do not overwrite it or claim completion; keep
the failed journal for diagnosis and start a fresh one. A concurrent modification
between status and freeze is rejected by comparing the reloaded journal digest;
CSV generation consumes only the already-loaded values, not reopened input files.

Only a missing *trailing commune seat cell* is padded with an empty string, per
Sheets' trailing-empty-cell convention. All requested rows and other columns are
mandatory. Explicit blank and omitted trailing blank are semantically equal;
unknown stays unknown, explicit `لا` stays false. Original source names, separate
alias/evidence, Arabic presentation forms and leading-zero system codes remain
unchanged. Generated CSV hashes cover the **derived CSV encoding**, not original
Google export bytes. Final capture time is the latest claimed read/recording time,
not a simultaneous workbook revision or legal effective date. Matching passes
cannot prove there were no intervening source edits or replace source acceptance.

## Current actual-source checkpoint

The durable aggregate checkpoint is
[`reference-data/P1-02-CAPTURE-PROGRESS.json`](reference-data/P1-02-CAPTURE-PROGRESS.json).
It records a **partial first pass only**, with local transcriptions of complete
connector ValueRanges: **69 wilayas, 250 communes and all 151 aliases** (470 data
rows plus three headers, in 12 non-overlapping checksummed chunks). The initial
checkpoint contained 139 data rows; 331 further rows were captured directly from
nine fresh complete bounded connector responses, not from repository fixtures.

| Table | Captured data rows, first pass | Next missing physical row | Second pass |
| --- | ---: | ---: | --- |
| Wilayas | 69 / 69 | None | Not started |
| Aliases | 151 / 151 | None | Not started |
| Communes | 250 / 1541 | 252 | Not started |

The next commune request starts at `A252`; 1291 commune data rows remain in the
first pass. Do not reread and append a table that is already complete in that pass.
Once the whole first pass is complete, read **all three tables** afresh for the
second pass. The initial combined 69-wilaya/100-commune response was truncated and
was **not used**; complete smaller responses were read instead.

Original cell strings remain unnormalized, including U+06A8, Arabic presentation
forms, tatweel counts, diacritics, doubled spaces, punctuation and curved versus
ASCII apostrophes. All 18 captured commune/alias intersections have exact original
AR/FR equality. This is only a consistency check on the captured subset; it neither
validates the remaining alias targets nor replaces the full structural preflight.

No second pass, complete adopted-source content hash/package, retained UUID map,
actual-source import or activation is claimed. Continue from the journal's
`nextMissingRow`, never from assumed source-code sequencing. Raw journal files
remain in ignored `storage/p1-02-sheets-capture/`; the aggregate file commits only
ranges, request IDs, claimed recording times, digests and counts, not the source
cell dataset. Timestamps are local recording-clock claims, not attested connector
read times or legal effective dates. Transcription is not independently verified.
Recompute the journal status and check its digest against the committed checkpoint
before resuming. If the ignored journal is unavailable in another checkout, the
aggregate JSON cannot reconstruct source rows: recover the retained journal or
start a new capture; never infer cells from the checkpoint.

## Verification

Fourteen offline synthetic tests cover resumed gaps/header completeness; complete
1541/69/151 matching passes through the existing package verifier; no overwrite;
second-pass ordering, missing first-pass chunks on reload, reused request IDs and
source drift; structural failure despite matching reads;
unknown trailing seats and Unicode preservation; wrong workbook/range/dimension,
truncation, numeric-code rejection and malformed columns; checksum/symlink/extra
file refusal; freeze read-race detection; and sanitized duplicate-key CLI errors.
They are not evidence of complete actual-source capture or legal/manual acceptance.

Capture-adapter implementation head `d9690095372d980e27241d0f6488534bb3b1bcf0`
subsequently passed every reported PR307 check: PR CI46166417214, push CI46166411601
and CodeQL46166417218, including .NET/PG18, frontend, Windows and production HTTPS
evidence export. The later progress checkpoint changes only documentation and
aggregate capture metadata; that historical green does not attest live source
transcriptions, complete capture, actual-source import or manual/legal acceptance.
