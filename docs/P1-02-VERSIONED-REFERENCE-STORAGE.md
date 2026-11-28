# P1-02 — versioned reference storage (implementation slice)

## Boundary

This change implements the additive persistence layer for the owner-adopted
Sheets reference. It does **not** reopen P1-01/P1-35 source acceptance. It does not
seed, import or activate data, change the administrative-reference controller, or
rewrite organization/project/setup text. The runtime still has 69 wilayas and
zero communes until the separately validated import and shared API/UI work lands.

Migration: `20261127120000_AddVersionedAdministrativeReference`.

## Model

| Table | Purpose |
| --- | --- |
| `admin_reference_versions` | Canonical snapshot ID/hash, manifest hash, claimed source workbook/capture timestamp, distinct declared/observed counts |
| `admin_wilaya_identities` | Internal stable UUID, independent of snapshot codes/names |
| `admin_commune_identities` | Internal stable UUID, independent of snapshot codes/names |
| `admin_wilaya_versions` | Per-snapshot source code, original AR/FR names, declared counts and Arabic-name evidence |
| `admin_commune_versions` | Per-snapshot source code, original AR/FR names, explicit parent identity, observed daira names, nullable seat and dated-parent evidence |
| `admin_commune_aliases` | Original reference labels alongside display alias/repository label and source evidence, never replacement of source labels |

UUIDs are application identities, not official administrative identifiers. No
identity or hierarchy is inferred from names, aliases or code prefixes. First
import must allocate and retain an explicit source-code→UUID map; subsequent
imports must reuse reviewed identities, not regenerate them from a snapshot hash.
Different source codes may refer to the same identity in different snapshots.

The composite commune→wilaya foreign key requires the parent **in the same
snapshot**, not merely somewhere in the identity registry. Code uniqueness is
scoped to a snapshot. Source codes are strings retaining leading zeroes. Foreign
keys restrict accidental parent/version deletion. No cascade can erase children.

Daira names are observations, **not invented stable daira identities**. Declared
550 dairas and observed 549 remain distinct metadata values; the accepted residual
is not silently fixed. A blank seat marker maps to `null`; an explicit yes/no maps
to true/false. Unknown is not false.

`ClaimedCaptureAtUtc` is capture provenance only, not independently authenticated
publication time or a legal effective date. Hashes are integrity checks, not
signatures. Source acceptance/import authority remains in its separate owner
record, not inferred from a row's existence. The canonical hash and manifest hash
bind the stored snapshot to the offline package; they do not replace checking all
CSV byte hashes and rerunning preflight before ingestion.

Parent dates are nullable. A completely unknown interval has no date/evidence
values. A populated interval requires an explicit start and nonblank evidence;
its optional end is exclusive and must be later than the start. Capture time must
never be substituted for a legal date. These columns do not assert that the
adopted source supplies legal effective dates: the inspected Sheets headers do
not. Each snapshot describes one parent observation per commune; a later reviewed
parent change belongs to another version. Cross-version legal reconciliation
remains an import/review responsibility.

## Security and rollback

No write endpoint, runtime import or active-version selector is introduced. Both
the migration and the Cloud SQL development grant bootstrap restrict the runtime
role to SELECT on all six tables, overriding earlier broad DML defaults. Imports
must run through a separately authorized operator/migration identity, not the API
role. Cloud SQL bootstrap reapplies these exceptions on each run. Existing audit
and migration-history restrictions remain unchanged.

Up creates only the six reference tables/indexes/constraints and their grants.
No existing application row/column is changed. Down removes these six tables in
dependency order; it leaves organization/project/setup schema and values intact.
**Down deletes any staged reference data** and must be preceded by a verified
backup/export and separate authorization in a real environment. This is not a
zero-data-loss production rollback or permission to apply it to production.

## Verification and remaining delivery

Four PostgreSQL integration tests are added to the existing PG18 fixture:

- Up/Down/Up with populated reference dependencies, unchanged historical
  organization AR/FR text, zero implicit seed/activation and no EF model drift;
- stable UUID reuse across versions, explicit non-prefix parent, original labels
  versus aliases, unknown seat/date preservation and explicit false;
- unique source codes, same-version parents, hash/code/date checks and restricted
  parent deletion;
- read-only runtime privileges immediately after migration and after repair of
  deliberately broadened grants by the Cloud SQL bootstrap.

Fixtures are explicitly synthetic, **not 1541/69/151 source-import evidence**.
Local sandbox has no .NET SDK/PostgreSQL executable. Added tests require CI;
no local .NET/PG18 success or manual/institutional acceptance is claimed here.

Schema head `a66de0cbb759f8d80d03af8500909dbefc23350b` subsequently passed all
eight PR checks (CI46152628132 / CodeQL46152628129), including these four tests.
The [transactional operator importer](P1-02-REFERENCE-IMPORT.md) now implements
staging/retry/removal and retained-map validation; its newer exact-head CI must be
checked separately. Complete adopted-source capture/package/checksum, reviewed
identity map/full-source import and PG18 rehearsal remain outstanding, followed by
explicit activation and one server-owned version consumed by
setup/organization/project/preview with AR/FR parity and preserved historical text.
Schema/importer code alone does not mark P1-02 Done.

The subsequent [staged reference inspection slice](P1-02-STAGED-REFERENCE-INSPECTION.md)
adds active-system-admin-only read endpoints and an AR/FR inspection panel. It
uses the SELECT-only runtime role and does not publish a version or replace the
existing anonymous catalogue. Its exact-head tests must be checked independently.
