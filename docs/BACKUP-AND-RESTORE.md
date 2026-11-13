# PROMO GEST — Backup and Restoration Procedures

## 1. Backup scope

A complete backup must preserve a consistent set of:

1. PostgreSQL 18 database dump.
2. Local document storage referenced by `stored_files`.
3. ASP.NET Core Data Protection key ring.
4. Sanitized installation configuration and local HTTPS configuration.
5. SHA-256 manifest covering every archive component.

Backing up only PostgreSQL leaves documents orphaned. Backing up database and documents without the Data Protection key ring can make previously protected payloads unreadable after restoration. Store backup bundles on encrypted media or an encrypted NAS and restrict access to the service and maintenance administrators.

## 2. Database identities

Use separate credentials:

- `promogest_app`: runtime database operations only. It must not create databases, alter schema, or run migrations.
- `promogest_owner`: owns the PROMO GEST database objects and applies EF Core migrations. It is not the Windows service identity.
- A PostgreSQL provisioning/maintenance account: creates a new empty restore database and assigns its owner. Use this account only for backup/restore maintenance.

Do not put production passwords in scripts, source control, command history, or backup archives. For PostgreSQL client tools, use a protected `pgpass` file or an approved secret-injection method. Because restore tools connect to a uniquely named scratch database, provisioner and owner entries in `pgpass` must use `*` in the database field (for example `127.0.0.1:5432:*:promogest_owner:...`); keep the file readable only by the maintenance account. The app role also needs a wildcard database entry for the runtime access test.

## 3. Creating backups

On Windows Server, run the backup script from an elevated maintenance session. By default it stops the `PromoGestLocalErp` Windows service before dumping PostgreSQL and archiving storage/key files, then restarts it in a `finally` block. This short maintenance window prevents database rows, document files, and the Data Protection key ring from being captured at different points while the application is writing. Do not use `-SkipServiceStop` unless the service has already been stopped and will remain stopped for the entire backup:

```powershell
.\scripts\backup-promogest.ps1 -DatabaseName promogest -StorageDir C:\PromoGest\storage -BackupRoot D:\PromoGestBackups
```

Confirm that the resulting bundle contains the database dump, storage archive, Data Protection key archive, sanitized configuration archive, and manifest.

## 4. Mandatory full restoration drill

A backup is not considered verified until it has been restored into a separate scratch database and all referenced files have been checked.

### Windows

Configure PostgreSQL client credentials for the provisioning user (`postgres`), migration owner (`promogest_owner`), and runtime role (`promogest_app`) in the protected pgpass file. The runtime identity is used for the post-restore access and privilege checks. The restore script deliberately refuses to overwrite an existing target database.

```powershell
.\scripts\restore-promogest.ps1 -BackupBundleDir D:\PromoGestBackups\promogest_backup_YYYYMMDD_HHMMSS -TargetDatabase promogest_restore_verify -ProvisionUser postgres -DatabaseUser promogest_owner
```

The script requires all four archive components and a complete SHA-256 manifest, validates the PostgreSQL dump, and refuses to reuse an existing target database or restore directory. It creates the new database with the migration owner, restores as that owner, then explicitly re-applies runtime `CONNECT`, schema, table, sequence, and default privileges for `promogest_app`. It reasserts the `audit_logs` restriction (runtime can `SELECT`/`INSERT`, not `UPDATE`/`DELETE`/`TRUNCATE`/manage triggers) and proves the restored database can be read by the runtime identity without schema/database creation privileges. It restores storage and Data Protection keys, rejects an unredacted connection-string password in the sanitized configuration, and verifies every stored file by existence, byte length, and SHA-256.

### Linux

Use `promogest_owner` for dump/restore and a provisioning account for creating/dropping the scratch database:

```bash
PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
  ./scripts/verify-backup-restore.sh promogest ./storage ./src/PromoGest.Api/appsettings.json ./dataprotection-keys
```

The Linux drill restores the database, storage, Data Protection keys, and sanitized configuration into temporary locations. It reapplies and tests runtime grants (including future-object default privileges and append-only audit restrictions), then verifies every database-referenced file. It removes only the uniquely named scratch database created by the drill; it never drops the source database.

## 5. Data Protection recovery

On Windows, DPAPI-protected key material is machine-bound. A byte-for-byte copy of the key-ring files to a different Windows machine does not by itself make them decryptable there. For same-machine recovery, restore the key ring on the same machine identity with the required filesystem ACLs intact. For a new-machine recovery, use a separately configured certificate-based key-protection strategy and securely preserve that certificate and its private key; validate the recovery procedure before relying on it.

Never treat a sanitized configuration archive as a substitute for the offline secret store. Re-enter the production database connection, HTTPS certificate configuration, and any platform key-protection secrets from the organization's protected vault before starting the recovered service.
