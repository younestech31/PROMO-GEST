# P1-02 — read-only staged reference inspection

## Delivered boundary

An active **System Administrator** can inspect a staged snapshot from the
territorial-reference screen, in Arabic or French, using the complete
`sheets-sha256-<64 lowercase hex characters>` ID in the import receipt. This is
an inspection tool, **not activation**. It does not enumerate private snapshots
for anonymous users, add a write endpoint or change setup/organization/project
validation. The anonymous `/api/reference/administrative-units` remains the
existing canonical 69-wilaya catalogue with zero published communes.

The database runtime role retains SELECT-only privileges on the six reference
tables. No new migration, reference grants, activation flag/pointer, legal date,
identity conversion or automatic import is introduced.

## Operator workflow

1. Stage a separately verified package using the [operator importer](P1-02-REFERENCE-IMPORT.md).
   Retain the package, identity map and import receipt. Do not treat synthetic CI
   fixtures as the adopted source or as an operational import.
2. Sign in as the active System Administrator and open the territorial reference.
3. Paste the complete receipt snapshot ID into the inspection panel.
4. Compare the canonical-content and manifest SHA-256 values, claimed workbook
   identifier, claimed capture timestamp and declared/stored counts with the
   retained package and receipt. Capture time is **not a legal effective date**.
5. Browse communes by explicit parent wilaya, literal code/name/observed daira or
   alias search, and pages of 50. Original AR/FR names remain separate from alias
   labels/evidence. Stable UUIDs are displayed separately from source codes.
   A null seat/date/evidence is displayed as unknown, never as false or a made-up
   date. Parent identities come from the stored relation, not code prefixes.
6. A missing/removed snapshot is an error, not a valid empty catalogue. Retry a
   transient read failure explicitly; no retry changes or activates data.

A successful count comparison only compares stored counts with the snapshot's
metadata, including per-wilaya commune counts, summed declared daira counts and
distinct observed `(wilaya identity, Arabic daira name, French daira name)` tuples.
It is **not** byte-by-byte package verification, hash recomputation, a source
signature, legal approval or publication approval. The accepted declared/observed
daira residual remains visible rather than being silently corrected.

## API and security

- `GET /api/reference/staged/{snapshotId}` returns provenance claims, declared and
  stored counts, count comparison and version-scoped wilayas.
- `GET /api/reference/staged/{snapshotId}/communes` accepts `wilayaCode`, `q`,
  `page` (default 1) and `pageSize` (default 50, maximum 100). `q` is at most 100
  characters after trimming; `%`, `_` and backslash are literal search input, not
  SQL wildcard controls. Ordering is source code then stable identity.
- Both endpoints require authentication and reload the actor from storage on
  every request. Only an active System Administrator is permitted; a role with
  audit/project permissions is not sufficient. Authorization precedes snapshot
  and filter validation. Denials are audited, and failed audit persistence fails
  closed. Responses use `no-store`; there is no browser persistent data cache.
- Each repository read runs inside a read-only repeatable-read transaction using
  the configured EF execution strategy. Metadata/counts or page/count cannot mix
  a removed/reimported version within one response. Separate HTTP requests can
  still observe an intervening removal and return 404; this is handled explicitly.
- The restricted panel never mounts for an inactive or non-system-admin session.
  Actor/stamp changes remount it; revocation unmounts it. Pending requests are
  aborted and late results ignored. A 401/403 clears all inspected data and shows
  a session/permission message. Language changes do not refetch or discard filters.
- Only GET endpoints are added; existing canonical CSRF handling is unchanged.

## Verification and remaining work

Added application tests cover authorization-before-validation, audited denials,
missing snapshots, bounds/overflow/ASCII-code validation and normalized literal
queries. Added PG18 integration coverage exercises the real authenticated API and
SELECT-only runtime role, provenance/counts, stable identity and original versus
alias labels, null seats/dates, literal/AR/FR filters, pages, missing/removed
versions, mismatch warning and unchanged anonymous catalogue. Fixtures are
synthetic and must not be represented as adopted-source import evidence.

Six rendered component tests cover AR/FR inspection, retry, paging/filter races,
late-result cleanup, permission/session changes, removal and language stability.
They are component tests, **not manual owner AR/FR acceptance**. The local sandbox
has no .NET SDK or PostgreSQL; new server/PG tests require exact-head CI. The
previous importer head `dcf04bdf5ebdfd3611f3a802d2b6681c2f3d887e` passed all checks
in PR307; that result does not validate this newer slice.

P1-02 remains In Progress. Full adopted Sheets capture and verifiable package,
reviewed retained identity map, actual-source staging/rehearsal, activation design
and shared server-owned published reference for setup/organization/project/preview
remain outstanding. Owner import approval is not being reopened; production
operations and deferred manual/legal acceptance retain their separate boundaries.
