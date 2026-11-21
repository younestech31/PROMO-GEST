# P1-11 — Local PostgreSQL 18 Preflight, Rehearsal and Migration Runbook

**Status:** Operator acceptance guide — not evidence that an organization database has been inspected or changed.  
**Feature merge:** PR #184, main SHA `1914703bce77aaeda49830a396d39acce04ea58f`.  
**Migration:** #15, `20261121120000_CanonicalizeAlgerianProjectCustomerPhones`.  
**Previous migration:** #14, `20261120130000_RequirePasswordChangeAfterAdminReset`.

## 1. Purpose and exact rule

The canonical duplicate key is derived from the preserved `project_customers.phone` value:

- Strip formatting characters and keep ASCII digits only.
- If the result is exactly 10 digits and begins with `0`, replace that national prefix with `213` (the final nine digits are preserved).
- Existing `+213` / `213` values converge to the same digit sequence.
- Other international prefixes are not interpreted or rewritten as Algerian.

Only `project_customers.normalized_phone` is recalculated. The original `phone`, Party identity, Party name, ProjectCustomer identifiers, project links, status, email, notes and interactions are not changed. No Party or ProjectCustomer is merged or deleted.

## 2. Preconditions — mandatory stop gates

Perform this procedure only on the organization's authorized local/on-premises PostgreSQL 18 installation. Do not use Cloud SQL or a shared development database for business data.

Before touching the database:

1. Obtain the organization's change approval and agree a maintenance window with the database/operator owner.
2. Confirm the deployed application/repository baseline contains Migration #15 and the matching release artifacts.
3. Stop or quiesce all business writes to the customer registry for the full preflight-to-migration window. A preflight report alone is not a lock against new customer writes.
4. Create a complete, fresh, independently restorable backup using the organization's approved PROMO-GEST backup process. Verify the backup freshness, integrity and restoreability on a separate disposable database. Record backup ID, timestamp and restore evidence outside this report.
5. Ensure the migration-owner PostgreSQL identity is available through the approved local service/secret mechanism. Never use the restricted `promogest_app` runtime identity for schema migrations; never place passwords in command history or commit them.

**Stop immediately** if the backup cannot be restored, writes cannot be quiesced, migration-owner access is uncertain, the server is not PostgreSQL 18, or the installed migration history is not understood.

## 3. Read-only preflight

Run the committed report against the organization's local database using the approved migration-owner connection mechanism:

```bash
psql -X --set ON_ERROR_STOP=1 \
  --file scripts/p1-11-phone-normalization-preflight.sql \
  "$PROMOGEST_MIGRATE_DB_CONNECTION"
```

The report opens a `REPEATABLE READ READ ONLY` transaction. It emits:
- total ProjectCustomer rows;
- rows whose derived key would change;
- rows where the current key has drifted from the previous digits-only derivation;
- rows with an invalid canonical digit length;
- collision groups by project, normalized Party name and proposed canonical phone, using project/customer/Party UUIDs only.

It deliberately does not return phone numbers, Party names, email addresses, or other contact values.

### Preflight decision

Proceed to rehearsal only when all of the following are true:

- `invalid_phone_rows = 0`;
- the collision query returns zero rows;
- `legacy_key_drift_rows = 0`, or every non-zero case has a documented and approved explanation;
- the row counts match the operator's independently recorded baseline.

Any collision group is a **hard stop**. Do not run Migration #15. Do not merge, delete, rename, or rewrite customer records to make the migration pass. Provide the opaque IDs to the authorized business/data steward through the organization's protected process, reconcile the source records manually, retain audit evidence, then repeat the preflight from the beginning.

Migration #15 repeats the invalid-length and collision checks inside its own transaction. This second check is intentional protection against stale preflight results; it is not permission to leave writers active.

## 4. Disposable rehearsal

Before the organization database is changed:

1. Restore the verified backup to a separate disposable PostgreSQL 18 database.
2. Keep its database identities and permissions separate from production.
3. Run the same preflight and record its summary/collision result.
4. Apply Migration #15 to the disposable copy using the supported migration-owner maintenance path.
5. Verify that `20261121120000_CanonicalizeAlgerianProjectCustomerPhones` appears in `__EFMigrationsHistory`.
6. Re-run the preflight report. Expected result: `rows_to_rewrite = 0`, `invalid_phone_rows = 0`, no collision rows, and unchanged total ProjectCustomer row count.
7. Verify source `phone` values, Party IDs, ProjectCustomer IDs, project links, statuses and audit rows are unchanged.
8. Exercise customer create/update duplicate rejection and Party-name update behavior through the supported application/API test path.
9. Test the migration's Down path on the disposable copy only. It returns the derived key to the previous digits-only rule and targets migration #14. It can fail closed if legacy-key collisions would be recreated; do not disable that guard.
10. Restore the disposable database again from the verified backup and confirm the backup recovery process remains usable.

Do not use a production database as a rehearsal target.

## 5. Approved local migration window

After the disposable rehearsal has passed and the organization owner has approved the change:

1. Confirm customer writes remain quiesced and the fresh backup is still within the approved freshness window.
2. Run the read-only preflight one final time against the local organization database.
3. Stop if any preflight condition above is not satisfied.
4. Invoke the packaged PROMO-GEST maintenance migration path with the local migration-owner connection supplied securely as `PROMOGEST_MIGRATE_DB_CONNECTION` and the `--migrate` maintenance argument. The API runtime identity must not perform this operation.
5. Capture the maintenance process exit status and protected operator logs. Do not expose connection strings or customer data in the logs.
6. Re-run the preflight and verify the zero-rewrite / zero-invalid / zero-collision result, expected row counts, and Migration #15 history entry.
7. Start the application and verify local health, authorized customer registry read/write, duplicate rejection, Party rename protection, audit behavior and normal backup freshness.
8. Re-enable business writes only after the organization owner accepts the verification evidence.

If Migration #15 raises an invalid-length or collision exception, its transaction must fail closed and no customer row should be updated. Keep writes quiesced, inspect the protected logs, and return to manual reconciliation; never bypass the check.

## 6. Rollback and recovery

- Do not roll back solely because the command returned an error. First inspect `__EFMigrationsHistory` and confirm whether Migration #15 committed.
- If it did not commit, preserve the database and investigate the reported failure; do not rerun repeatedly without resolving the cause.
- If it committed and rollback is approved, use the reviewed EF Core migration rollback procedure to target the preceding migration `20261120130000_RequirePasswordChangeAfterAdminReset` (#14), provided no later migration has been applied.
- The Down migration recalculates only `normalized_phone` from the unchanged source `phone`. It checks for invalid lengths and collisions under the legacy digits-only key before updating. If a legacy collision would be recreated, Down fails closed; do not remove the check or force the update.
- If a safe rollback is not possible, keep writes stopped and restore the verified backup under the organization's approved recovery procedure.
- Preserve migration logs, preflight summaries, backup/restore evidence, approval and final decision in the organization's audit/change record.

## 7. Evidence required to close P1-11 operational acceptance

Attach all of the following to the Notion P1-11 task:
- organization approval and maintenance window record;
- PostgreSQL 18 version and local/on-premises environment confirmation;
- backup identifier, freshness/integrity check and successful disposable restore evidence;
- preflight report before migration (counts and collision outcome; no phone/name values);
- disposable rehearsal result, including Up, verification, Down and restore;
- authorized on-premises migration result and Migration #15 history proof;
- post-migration preflight summary and unchanged customer/Party identity counts;
- operator acceptance and any exceptions.

The CI runs prove the code/test behavior on disposable PostgreSQL 18 test databases. They do **not** prove that an organization's existing database has zero collisions or that its migration has been run. Until the above evidence is attached and accepted, keep P1-11 **In Review / Pending** and classify the capability as `IMPLEMENTED_NOT_VERIFIED`.
