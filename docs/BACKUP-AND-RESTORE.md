# PROMO GEST — Backup and Restoration Procedures

## 1. Backup scope

A complete backup must preserve a consistent set of:

1. PostgreSQL 18 database dump.
2. Local document storage referenced by `stored_files`.
3. ASP.NET Core Data Protection key ring.
4. Sanitized installation configuration and the Caddy site configuration (`Caddyfile`).
5. SHA-256 manifest covering every archive component.

Backing up only PostgreSQL leaves documents orphaned. Backing up database and documents without the Data Protection key ring can make previously protected payloads unreadable after restoration. Store backup bundles on encrypted media or an encrypted NAS and restrict access to the service and maintenance administrators.

**Operational limitation:** the scripts do not automatically delete old bundles or replicate them off the server. The configured destination is the first local copy, not a disaster-recovery copy. Monitor free space, define the organization's retention period, and copy each successful bundle to a separate encrypted disk or NAS before relying on it for disaster recovery. Automatic pruning is intentionally not enabled until that retention policy is explicitly selected.

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

Restore output defaults to isolated directories under `C:\PromoGest-Restore\`, outside the live `C:\PromoGest\` installation. The script rejects overlapping destinations, destinations inside the live installation root, and paths traversing junctions/symbolic links. After a successful drill, the scratch database and restored output directories are deliberately retained for inspection; remove them manually after review. If the restore fails after creating its scratch database or any output directory, it attempts to remove only the database and directories created by that invocation.

### Linux

Use `promogest_owner` for the dump/restore operations, `postgres` (or another maintenance identity) to create and remove the uniquely named scratch database, and `promogest_app` only for the runtime-access checks.

To verify the **actual production backup bundle** created by the systemd job, pass its directory as the fifth argument. Use the exact path printed by `backup-promogest.sh`:

```bash
sudo env \
  PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
  PROMOGEST_APP_USER=promogest_app \
  PGPASSFILE=/etc/promogest/pgpass \
  PROMOGEST_DATA_PROTECTION_CERT_PASSWORD='<secret-from-vault>' \
  ./scripts/verify-backup-restore.sh promogest "" "" "" \
  /var/backups/promogest/promogest_backup_YYYYMMDD_HHMMSS
```

The fifth argument makes the drill validate and restore the exact `database.dump`, `storage.tar.gz`, `dataprotection-keys.tar.gz`, and `config-sanitized.tar.gz` files from that bundle. It checks the SHA-256 manifest, rejects unsafe archive paths and links, verifies the restored Data Protection certificate, restores into temporary directories and a new scratch database, reapplies least-privilege grants, and checks each database-referenced document by path, byte length, and SHA-256. The drill removes only the uniquely named scratch database it created; it never drops the source database or changes the selected backup bundle.

For a source-based drill that builds a temporary verification payload instead of using a saved production bundle, omit the fifth argument and provide the storage, configuration, and Data Protection key directories:

```bash
PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
  ./scripts/verify-backup-restore.sh promogest ./storage \
  ./src/PromoGest.Api/appsettings.Production.json ./dataprotection-keys
```

For the Linux systemd backup service, store PostgreSQL client credentials in `/etc/promogest/pgpass`, owned by `root:root` with mode `0600`; the unit runs with `ProtectHome=true`, so `/root/.pgpass` is deliberately not used by that service. For a manual drill, set `PGPASSFILE` to a protected file readable only by the operator. The service's default destination is `/var/backups/promogest`. If you change `PROMOGEST_BACKUP_ROOT`, pre-create a dedicated root-owned directory and update the backup unit's `ReadWritePaths` to include that exact destination; do not use shared system directories, `/home`, `/root`, `/run/user` (hidden by `ProtectHome=true`), or a path overlapping storage, Data Protection keys, application configuration, or Caddy configuration.

## 5. Data Protection recovery

On Windows, PROMO GEST explicitly uses machine-scope DPAPI (`ProtectKeysWithDpapi(protectToLocalMachine: true)`). This allows the service's virtual account and local maintenance identities such as SYSTEM to decrypt the same key ring on this Windows installation. Machine-scope DPAPI means any local account that can read the key-ring files could decrypt them, so the installer restricts the key directory ACL to the service identity, SYSTEM, and local Administrators. Preserve those ACLs during same-machine recovery and do not copy the key ring to ordinary user-readable locations. A byte-for-byte copy to a different Windows installation does not make the keys decryptable there. For new-machine recovery, use a separately configured certificate-based key-protection strategy and securely preserve the certificate and private key; validate that procedure before relying on it.

Never treat a sanitized configuration archive as a substitute for the offline secret store. Re-enter the production database connection, HTTPS certificate configuration, and any platform key-protection secrets from the organization's protected vault before starting the recovered service.

## 6. Caddy internal CA recovery

The backup bundles preserve the Caddy configuration file, but they do **not** currently include Caddy's internal PKI/data directory. A same-machine restore normally retains the existing Caddy state if that directory was not lost. During a full host replacement or after loss of Caddy state, expect Caddy to use a new local CA; export the new Caddy root certificate and reinstall it on every trusted LAN workstation before users rely on HTTPS. Do not assume that restoring `Caddyfile` alone preserves the previous trust relationship.
