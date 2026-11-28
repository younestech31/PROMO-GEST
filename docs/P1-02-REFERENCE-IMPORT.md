# P1-02 — transactional reference import (non-activating)

## Delivered code and boundary

`scripts/import_administrative_reference.py` provides an operator path from a
verified offline package to the six versioned reference tables. It uses Python's
standard library and the PostgreSQL 18 `psql` client. No Python database driver,
new web endpoint, schema migration, source-fetching credential or runtime grant
is introduced by this slice.

**This is importer implementation, not a claim of capturing/importing the full
adopted Sheets source.** Owner operational source acceptance is already satisfied;
it is not reopened. The complete source capture/package/checksum and actual
full-source import rehearsal remain outstanding. Synthetic fixtures are never
source evidence. Runtime remains 69 wilayas / zero communes; API/UI activation is
separate. No real organization database or production operation was performed.

The preceding schema head `a66de0cbb759f8d80d03af8500909dbefc23350b` passed all
eight PR checks: CI46152628132 and CodeQL46152628129. That historical green does
not establish the checks for this newer importer implementation.

## Commands

Use a newly created, private operator workspace under ignored `storage/` for
packages, maps, SQL plans and receipts. Do not commit generated copies or put
credentials in files/command-line URLs. Paths below are **examples**, not claimed
captured source assets. Obtain `SNAPSHOT_ID` by reviewing the verified manifest;
do not use a synthetic fixture's hash.

```bash
# Verify the complete captured source package first.
python3 scripts/package_administrative_reference.py verify "$SNAPSHOT_DIRECTORY"

# FIRST import only: allocate internal UUIDs and retain this exact map with backup.
python3 scripts/import_administrative_reference.py init-identities \
  --snapshot "$SNAPSHOT_DIRECTORY" --output storage/reference-identities.json

# Offline: verify again and prepare an auditable SQL plan; does not connect.
python3 scripts/import_administrative_reference.py plan \
  --snapshot "$SNAPSHOT_DIRECTORY" \
  --identity-map storage/reference-identities.json \
  --expected-snapshot-id "$SNAPSHOT_ID" \
  --output storage/reference-stage.sql

# Separately authorized execution against an explicitly identified database.
# Supply owner login/host/SSL via normal libpq PG* variables/PGSERVICE/PGPASSFILE.
# PGPASSFILE must be protected; no password or connection URI in command arguments.
python3 scripts/import_administrative_reference.py execute \
  --snapshot "$SNAPSHOT_DIRECTORY" \
  --identity-map storage/reference-identities.json \
  --expected-snapshot-id "$SNAPSHOT_ID" \
  --database "$AUTHORIZED_DATABASE_NAME" \
  --confirm-database "$AUTHORIZED_DATABASE_NAME"
```

The default action of `plan`/`execute` is **stage**, never activation. `execute`
rebuilds the plan from freshly verified bytes; it does not execute an arbitrary
saved SQL file. A plan is review material, not an authorization token/signature.
Offline outputs are exclusively created and never overwrite existing paths. A
failed write may leave a partial output: discard/review it, never treat it as a
valid receipt or automatically execute it.

A stage success receipt binds snapshot/content/manifest/identity-map hashes and
counts, reports whether the snapshot previously existed, and explicitly records
`activated=false` / `historicalTextRewritten=false`. Source origin and claimed
capture time remain independently unverified; no hash grants import authority.

## Identity and source preservation

- First-import IDs are internal nonzero UUIDs, not government codes or hashes of
  names. **Retain the map. Do not rerun init as identity recovery or for each new
  snapshot.** The DB registry is intentionally independent of display labels.
- For a later reviewed snapshot, retain the original map as evidence and create
  a reviewed successor map bound to the new snapshot ID. Reuse UUIDs for the same
  administrative identity; explicitly reconcile any code/identity changes. Maps
  must exactly cover the snapshot's codes and contain no duplicate JSON keys,
  duplicate/zero/invalid UUIDs or unknown fields.
- Reusing a known system code with a different UUID is rejected against *all*
  retained versions. Unreferenced retained identities must be covered by the map,
  so deleting the last snapshot does not make regeneration silently acceptable.
  Legitimate future code reuse/identity retirement requires an explicit reviewed
  reconciliation path; the script deliberately fails closed rather than deciding.
- Parent selection uses the explicit source `wilaya_code` mapped to a stable
  wilaya UUID, never the commune-code prefix. No name/alias-based matching.
- Original AR/FR labels, Arabic-name evidence and alias reference/display labels
  are stored separately and unchanged. Data that exceeds storage limits is
  rejected offline, not truncated. Blank/yes/no seat markers map to null/true/false.
- Parent legal dates/evidence remain null: these exports do not contain dated
  parent relationships. Capture time is never converted to a legal date. Daira
  names are observations, not newly invented daira identities. Declared/observed
  daira counts remain separate, including the accepted 550/549 residual.

## Database transaction and retry semantics

1. Verify package byte hashes, COMPLETE marker and recomputed full preflight;
   validate the retained identity map and expected snapshot ID **before connecting**.
   Import rows come from the same immutable bytes that passed verification, not
   reopened paths after a verify/use race.
2. Require PG18 and an owner/member-of-owner identity for all six reference
   tables. The runtime `promogest_app` identity is explicitly rejected. The
   existing schema must already be installed through the normal migration path.
3. Begin one transaction, fix string escaping/search path, bound lock/statement
   timeouts, and take write-conflicting table locks on the six reference tables.
   Normal reference reads remain possible. Concurrent import attempts serialize;
   a lock timeout is a safe failure, not a reason for blind retry.
4. Populate private temporary tables from safely quoted JSON using fixed SQL
   identifiers. Spreadsheet values are never SQL identifiers or shell commands.
5. If the snapshot exists, compare **all metadata and version-scoped rows in both
   directions** (including nulls/aliases/UUIDs), not just counts or saved hashes.
   Any drift/incomplete earlier import/repackaged manifest is rejected, not repaired.
6. Validate identity lineage; insert only missing rows with `ON CONFLICT DO NOTHING`.
   No UPDATE/UPSERT overwrite or historical text conversion. Recompare complete
   staged versus stored rows before COMMIT. A matching retry is a no-op.

A repackaged file with the same canonical content but different capture metadata
or manifest hash is not silently substituted for an already stored snapshot. Use
the original frozen package for retries/removal; separately reconcile provenance.

`psql` runs without startup files or password prompting, with ON_ERROR_STOP and a
180-second process timeout. Login settings use libpq's normal environment/service
facilities. No fallback to a default database: execution requires a matching,
simple explicit database name, not a connection URL. Review PGHOST/PGSERVICE/SSL
settings independently: a matching name does not authenticate the intended host.

A receipt is emitted only after `psql` reports successful completion/commit. Raw
DB stderr/stdout errors are not echoed because diagnostics may contain row values
or connection information. **A lost connection/timeout during COMMIT can leave an
unknown outcome.** The failure response does not falsely promise rollback; inspect
the target and exact snapshot first. A subsequent *authorized* matching stage is
idempotent, but the program never automatically retries or deletes after an error.

## Reversible removal, not destructive identity cleanup

Before removal in any real environment: verify backup/restore and obtain separate
authorization. Prepare/review the remove plan first by adding `--operation remove`
to `plan`. Execution uses the same verified package/map/expected-ID/database
confirmation plus `--operation remove`:

```bash
python3 scripts/import_administrative_reference.py execute \
  --operation remove --snapshot "$SNAPSHOT_DIRECTORY" \
  --identity-map storage/reference-identities.json \
  --expected-snapshot-id "$SNAPSHOT_ID" \
  --database "$AUTHORIZED_DATABASE_NAME" \
  --confirm-database "$AUTHORIZED_DATABASE_NAME"
```

It first proves exact stored equality, then deletes only that snapshot's aliases,
commune versions, wilaya versions and metadata in dependency order, and verifies
absence before commit. Other snapshots and **all stable identity registry rows**
remain. An absent snapshot is a no-op. FK restrictions abort removal if later
schema consumers refer to the version; no cascade/force bypass is attempted.
There is no activation pointer in this slice; future activation work must retain
this protection. Schema Down remains a separate, more destructive operation.

## Verification

Local standard-library tests exercise 1541/69/151 **synthetic** packages, map
validation, storage limits, same-byte verification, escaping, offline/nonclobber
commands and sanitized interrupted execution. PostgreSQL tests require CI or the
explicit dedicated database `promogest_reference_import_test`; the test file
refuses destructive resets under any other database name.

CI separately creates and migrates that disposable PG18 database. Eight DB cases
cover full-size stage/retry/readback with unknowns and SQL-like labels; retained
UUIDs across versions/non-prefix parents; exact-match removal/re-stage; drift and
repackaged-provenance rejection; new-map lineage rejection; injected late failure
with total transaction rollback and untouched historical text; runtime-role
rejection; last-snapshot identity retention; and concurrent idempotent imports
(the version/retry case includes several related assertions).

These do **not** prove the adopted source was captured or imported, do not replace
AR/FR UI acceptance, and do not authorize production. No local PG18/.NET run is
claimed in the sandbox. Next: full adopted-source snapshot/capture provenance,
reviewed retained map and full-source rehearsal, then explicit version activation
and shared API/setup/organization/project/preview integration.

The [read-only staged inspection panel/API](P1-02-STAGED-REFERENCE-INSPECTION.md)
lets the active System Administrator inspect an exact imported snapshot and its
communes without activating it. Count comparison is not a replacement for the
importer's full-package equality checks or actual-source acceptance.
