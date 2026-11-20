# PROMO GEST — Backup and Restoration Procedures

## 1. Backup scope

A complete backup must preserve a consistent set of:

1. PostgreSQL 18 database dump.
2. Local document storage referenced by `stored_files`.
3. ASP.NET Core Data Protection key ring.
4. Sanitized installation configuration and the Caddy site configuration (`Caddyfile`).
5. SHA-256 manifest covering every archive component.

Backing up only PostgreSQL leaves documents orphaned. Backing up database and documents without the Data Protection key ring can make previously protected payloads unreadable after restoration. Store backup bundles on encrypted media or an encrypted NAS and restrict access to the service and maintenance administrators.

**Linux production path (implemented 2026-11-20):** the backup job now seals, packs, and encrypts the bundle with an X.509 recipient certificate, writes it together with a SHA-256 sidecar, copies and verifies it on an independent offsite mount, applies a retention policy that never prunes below the newest configured artefacts, and removes the unencrypted bundle by default. Encryption and offsite replication are fail-closed: the job refuses to run without a recipient certificate and an offsite target unless an operator explicitly acknowledges the risk in configuration.

**Windows path (parity implemented 2026-11-20):** `backup-promogest.ps1` applies the same contract as the Linux job: seal, package as `promogest_backup_<UTC>.tar.gz`, CMS-envelope to an X.509 recipient certificate (AES-256-CBC, DER — the same artefact format the Linux tooling produces), write a `sha256sum`-compatible sidecar, copy to an independent offsite target and verify that copy, apply retention in both locations, and delete the plaintext bundle unless an operator asks to keep it. Encryption and offsite replication are fail-closed. The private key must not exist on the Windows server.

## 2. Database identities

Use separate credentials:

- `promogest_app`: runtime database operations only. It must not create databases, alter schema, or run migrations.
- `promogest_owner`: owns the PROMO GEST database objects and applies EF Core migrations. It is not the Windows service identity.
- A PostgreSQL provisioning/maintenance account: creates a new empty restore database and assigns its owner. Use this account only for backup/restore maintenance.

Do not put production passwords in scripts, source control, command history, or backup archives. For PostgreSQL client tools, use a protected `pgpass` file or an approved secret-injection method. Because restore tools connect to a uniquely named scratch database, provisioner and owner entries in `pgpass` must use `*` in the database field (for example `127.0.0.1:5432:*:promogest_owner:...`); keep the file readable only by the maintenance account. The app role also needs a wildcard database entry for the runtime access test.

## 3. Creating backups

On Windows Server, run the backup script from an elevated maintenance session. By default it stops the `PromoGestLocalErp` Windows service before dumping PostgreSQL and archiving storage/key files, restarts it as soon as the snapshot is sealed, and restarts it again from a `finally` block if it failed earlier. This short maintenance window prevents database rows, document files, and the Data Protection key ring from being captured at different points while the application is writing. Do not use `-SkipServiceStop` unless the service has already been stopped and will remain stopped for the entire backup:

```powershell
.\scripts\backup-promogest.ps1 `
  -DatabaseName promogest `
  -StorageDir C:\PromoGest\storage `
  -BackupRoot D:\PromoGestBackups `
  -RecipientCertPath C:\PromoGest\backup\backup-recipient.cer `
  -OffsiteDir E:\PromoGestOffsite
```

| Parameter / environment variable | Default | Meaning |
|---|---|---|
| `-RecipientCertPath` / `PROMOGEST_BACKUP_RECIPIENT_CERT` | none | Public X.509 certificate used for CMS enveloping. A file that contains or references a private key is rejected. |
| `-OffsiteDir` / `PROMOGEST_BACKUP_OFFSITE_DIR` | none | Existing independent destination; the copy is verified against the sidecar before success is reported. |
| `-EncryptionMode` / `PROMOGEST_BACKUP_ENCRYPTION` | `required` | `disabled` is honoured only with `-AllowPlaintext` |
| `-AllowPlaintext` / `PROMOGEST_BACKUP_ALLOW_PLAINTEXT` | off | Explicit acknowledgement when encryption is disabled |
| `-AllowLocalOnly` / `PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY` | off | Explicit acknowledgement when no offsite target exists |
| `-AllowSameDeviceOffsite` / `PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE` | off | Test/DR exception when the offsite path shares a volume with the backup root |
| `-RetentionDays` / `PROMOGEST_BACKUP_RETENTION_DAYS` | `30` | Minimum 7 |
| `-RetentionMinKeep` / `PROMOGEST_BACKUP_RETENTION_MIN_KEEP` | `3` | Newest artefacts are never pruned |
| `-KeepPlaintextBundle` / `PROMOGEST_BACKUP_KEEP_PLAINTEXT` | off | Test/diagnostic only; production keeps no plaintext bundle |

Execution order matches the Linux job: dump, archives, sanitized configuration, four-component manifest; restart the service once the snapshot is sealed; package into `promogest_backup_<UTC>.tar.gz`; CMS-envelope into `…tar.gz.cms`; write `…tar.gz.cms.sha256`; copy artefact and sidecar to the offsite target and verify; apply retention in both locations; remove the plaintext bundle. A sealed bundle is never deleted because encryption, offsite copy, or retention failed; only an incomplete bundle from an earlier stage is removed. Restrict the backup root to SYSTEM and Administrators — the script applies that ACL to the root and to every artefact it writes.

Provisioning the Windows recipient certificate (on the operator workstation, never on the server):

```powershell
$cert = New-SelfSignedCertificate -Type Custom -KeyAlgorithm RSA -KeyLength 3072 `
  -Subject "CN=PromoGest Backup Recipient" -KeyExportPolicy Exportable `
  -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(10)
Export-Certificate -Cert $cert -FilePath backup-recipient.cer          # server gets only this file
Export-PfxCertificate -Cert $cert -FilePath backup-recipient.pfx `
  -Password (Read-Host -AsSecureString "PFX password")                 # stays offline
```

The `.cms` file is the artefact of record. Because the private key is absent from the server, decryptability is proven by the restore drill on the operator workstation; the backup itself only performs a structural envelope check. The CMS container and the AES-256-CBC content algorithm are the same as the Linux job's, so either platform's artefact can be opened with standard CMS tooling; a cross-platform decrypt drill is not yet part of CI.

### Linux

The systemd job (`promogest-backup.service` + `promogest-backup.timer`, daily at 22:00 with a randomised delay) runs as root and enforces the following contract:

| Setting | Default | Meaning |
|---|---|---|
| `PROMOGEST_BACKUP_ENCRYPTION` | `required` | `disabled` is honoured only together with `PROMOGEST_BACKUP_ALLOW_PLAINTEXT=1` |
| `PROMOGEST_BACKUP_RECIPIENT_CERT` | `/etc/promogest/backup-recipient.pem` | Public X.509 certificate used for CMS enveloping; the private key must not exist on this host |
| `PROMOGEST_BACKUP_OFFSITE_DIR` | `/mnt/promogest-offsite` | Independent mount copied to and verified on every run |
| `PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY` | `0` | Explicit acknowledgement when no offsite target exists |
| `PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE` | `0` | Test/DR exception when the offsite path shares a filesystem with the primary root |
| `PROMOGEST_BACKUP_RETENTION_DAYS` | `30` | Minimum 7 |
| `PROMOGEST_BACKUP_RETENTION_MIN_KEEP` | `3` | Newest artefacts are never pruned |
| `PROMOGEST_BACKUP_KEEP_PLAINTEXT` | `0` | Test/diagnostic only; production keeps no plaintext bundle |

Execution order is deliberate:

1. PostgreSQL dump, storage and key-ring archives, sanitized configuration, then the four-component SHA-256 manifest — with the application service stopped for consistency.
2. **Service restart as soon as the snapshot is sealed.** Encryption, offsite copy and pruning therefore no longer extend the maintenance window. A sealed snapshot is never deleted because a later stage failed.
3. Packaging into `promogest_backup_<UTC timestamp>.tar.gz`, CMS enveloping (`openssl cms -encrypt -aes-256-cbc`) into `…tar.gz.cms`, structural validation of the envelope, and a `…tar.gz.cms.sha256` sidecar.
4. Copy of the `.cms` and its sidecar to the offsite mount, followed by `sha256sum -c` of the remote copy.
5. Retention pruning in both locations, then removal of the unencrypted bundle directory.

The `.cms` file is the artefact of record. The private key is deliberately absent from the server, so decryptability is proven only by the restore drill on the operator workstation; a structural check runs at backup time.

### Freshness monitoring

`promogest-backup.timer` writes; `promogest-backup-verify.timer` (06:00, `deploy/linux/promogest-backup-verify.*`) checks. `scripts/check-backup-freshness.sh` verifies that the newest local artefact is younger than `PROMOGEST_BACKUP_MAX_AGE_HOURS` (default 26), that its `.sha256` sidecar still matches, and that the newest offsite artefact does too when `PROMOGEST_BACKUP_MIN_OFFSITE_COPIES > 0`. Windows has the same contract in `scripts/check-backup-freshness.ps1`. Schedule it as a second daily task and alert on a non-zero exit; both scripts are covered by behavioural tests (`scripts/test_check-backup-freshness.sh`, `scripts/test-backup-freshness.ps1`) so the monitoring cannot rot silently.

```bash
sudo env PROMOGEST_BACKUP_ROOT=/var/backups/promogest \
  PROMOGEST_BACKUP_OFFSITE_DIR=/mnt/promogest-offsite \
  ./scripts/check-backup-freshness.sh
```

Provisioning on a new host:

```bash
# Operator workstation, not the server: create the recipient key pair.
openssl req -x509 -newkey rsa:3072 -days 3650 -nodes \
  -keyout promogest-backup-key.pem -out promogest-backup-recipient.pem \
  -subj "/CN=PromoGest Backup Recipient/O=<organisation>"
# Server: install only the public certificate.
sudo install -o root -g root -m 0644 promogest-backup-recipient.pem \
  /etc/promogest/backup-recipient.pem
# Server: the offsite target must be an independent, mounted filesystem.
sudo install -d -o root -g root -m 0700 /mnt/promogest-offsite
```

Never copy `promogest-backup-key.pem` to the server, into the repository, into the offsite backup directory, or into the same safe as the backups. Keep at least two offline copies in separate physical locations and record who can retrieve them.

### Key rotation

A recipient certificate is valid for years but must be rotated on staff change, suspected compromise, or before expiry. Rotation is additive: install the new certificate on the server and keep the previous private key available until every artefact encrypted with it has passed its retention window. Previously issued keys are never overwritten.


## 4. Mandatory full restoration drill

A backup is not considered verified until it has been restored into a separate scratch database and all referenced files have been checked.

### Windows

Configure PostgreSQL client credentials for the provisioning user (`postgres`), migration owner (`promogest_owner`), and runtime role (`promogest_app`) in the protected pgpass file. The runtime identity is used for the post-restore access and privilege checks. The restore script deliberately refuses to overwrite an existing target database.

```powershell
# Verify the production artefact directly (recommended): sidecar check, decrypt with the
# offline private key, validate archive paths, extract to a temporary directory.
.\scripts\restore-promogest.ps1 `
  -BackupArtifactPath E:\PromoGestOffsite\promogest_backup_YYYYMMDD_HHMMSS.tar.gz.cms `
  -RecipientPfxPath C:\Offline\backup-recipient.pfx `
  -RecipientPfxPassword (Read-Host -AsSecureString "PFX password" | ConvertFrom-SecureString -AsPlainText) `
  -TargetDatabase promogest_restore_verify -ProvisionUser postgres -DatabaseUser promogest_owner

# Already-materialized plaintext bundle (for example -KeepPlaintextBundle output):
.\scripts\restore-promogest.ps1 -BackupBundleDir D:\PromoGestBackups\promogest_backup_YYYYMMDD_HHMMSS_abcdef12 -TargetDatabase promogest_restore_verify
```

With `-BackupArtifactPath` the script first verifies the artifact's SHA-256 sidecar, decrypts the CMS envelope with the supplied PFX (an empty password is passed through unchanged for password-less PFX files), rejects absolute paths and `..` members in the archive, extracts into a per-invocation temporary directory, and deletes that plaintext directory on success and on failure. Encryption is never optional here: a `.cms` artifact without `-RecipientPfxPath` is refused. The script requires all four archive components and a complete SHA-256 manifest, validates the PostgreSQL dump, and refuses to reuse an existing target database or restore directory. It creates the new database with the migration owner, restores as that owner, then explicitly re-applies runtime `CONNECT`, schema, table, sequence, and default privileges for `promogest_app`. It reasserts the `audit_logs` restriction (runtime can `SELECT`/`INSERT`, not `UPDATE`/`DELETE`/`TRUNCATE`/manage triggers) and proves the restored database can be read by the runtime identity without schema/database creation privileges. It restores storage and Data Protection keys, requires the sanitized configuration to omit the entire `ConnectionStrings` object (not merely redact one password), validates the required configuration sections, and verifies every stored file by existence, byte length, and SHA-256. Re-enter the `promogest_app` runtime connection string and any environment-specific secrets from the protected secret store before starting the recovered service.

Restore output defaults to isolated directories under `C:\PromoGest-Restore\`, outside the live `C:\PromoGest\` installation. Pass `-ProtectedInstallRoot` when the actual installation root differs, and `-ServiceName` when the Windows service is not named `PromoGestLocalErp`. The script rejects overlapping destinations, destinations inside the live installation root, and paths traversing junctions/symbolic links. It applies SYSTEM/Administrators ACLs to all restored directories and grants the configured `NT SERVICE\PromoGestLocalErp` identity Modify access only to the restored document and Data Protection directories. Run the restore under an elevated maintenance account after the service identity has been installed. After a successful drill, the scratch database and restored output directories are deliberately retained for inspection; remove them manually after review. If the restore fails after creating its scratch database or any output directory, it attempts to remove only the database and directories created by that invocation.

### Linux

Use `promogest_owner` for the dump/restore operations, `postgres` (or another maintenance identity) to create and remove the uniquely named scratch database, and `promogest_app` only for the runtime-access checks.

To verify the **actual production artefact** created by the systemd job, pass the `.cms` file and the matching private key. Use the exact filename printed by `backup-promogest.sh`:

```bash
sudo env \
  PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
  PROMOGEST_APP_USER=promogest_app \
  PGPASSFILE=/etc/promogest/pgpass \
  PROMOGEST_DATA_PROTECTION_CERT_PASSWORD='<secret-from-vault>' \
  PROMOGEST_BACKUP_DECRYPT_KEY=/secure/offline/promogest-backup-key.pem \
  ./scripts/verify-backup-restore.sh promogest "" "" "" \
  /mnt/promogest-offsite/promogest_backup_YYYYMMDD_HHMMSS.tar.gz.cms
```

The drill first verifies the sidecar SHA-256 of the ciphertext, decrypts it with the offline key, rejects unsafe or linked archive members, extracts the bundle into a temporary directory, and then validates and restores the exact `database.dump`, `storage.tar.gz`, `dataprotection-keys.tar.gz`, and `config-sanitized.tar.gz` components exactly as before. A plaintext `.tar.gz` artefact can also be passed when encryption was explicitly disabled; `.cms` additionally requires `PROMOGEST_BACKUP_DECRYPT_KEY`. The backup job removes a partial bundle if any backup stage fails, and its exit handler attempts to restart the service if it had stopped it; an error restarting the service is a critical operational alert. It checks the SHA-256 manifest, rejects unsafe archive paths and links, verifies the restored Data Protection certificate, restores into temporary directories and a new scratch database, reapplies least-privilege grants, and checks each database-referenced document by path, byte length, and SHA-256. The drill removes only the uniquely named scratch database it created; it never drops the source database or changes the selected backup bundle.

For a source-based drill that builds a temporary verification payload instead of using a saved production bundle, omit the fifth argument and provide the storage, configuration, and Data Protection key directories:

```bash
PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
  ./scripts/verify-backup-restore.sh promogest ./storage \
  ./src/PromoGest.Api/appsettings.Production.json ./dataprotection-keys
```

For the Linux systemd backup service, store PostgreSQL client credentials in `/etc/promogest/pgpass`, owned by `root:root` with mode `0600`; the unit runs with `ProtectHome=true`, so `/root/.pgpass` is deliberately not used by that service. For a manual drill, set `PGPASSFILE` to a protected file readable only by the operator. The service's default destination is `/var/backups/promogest`. If you change `PROMOGEST_BACKUP_ROOT` or `PROMOGEST_BACKUP_OFFSITE_DIR`, pre-create dedicated root-owned directories, update the backup unit's `ReadWritePaths` to include both exact destinations, and add the offsite path to `RequiresMountsFor` so a missing mount fails the unit instead of silently producing a single local copy; do not use shared system directories, `/home`, `/root`, `/run/user` (hidden by `ProtectHome=true`), or a path overlapping storage, Data Protection keys, application configuration, or Caddy configuration.

## 5. Data Protection recovery

On Windows, PROMO GEST explicitly uses machine-scope DPAPI (`ProtectKeysWithDpapi(protectToLocalMachine: true)`). This allows the service's virtual account and local maintenance identities such as SYSTEM to decrypt the same key ring on this Windows installation. Machine-scope DPAPI means any local account that can read the key-ring files could decrypt them, so the installer restricts the key directory ACL to the service identity, SYSTEM, and local Administrators. Preserve those ACLs during same-machine recovery and do not copy the key ring to ordinary user-readable locations. A byte-for-byte copy to a different Windows installation does not make the keys decryptable there. For new-machine recovery, use a separately configured certificate-based key-protection strategy and securely preserve the certificate and private key; validate that procedure before relying on it.

Never treat a sanitized configuration archive as a substitute for the offline secret store. Both backup implementations omit the complete `ConnectionStrings` object and recursively remove configuration properties whose names indicate passwords, secrets, tokens, credentials, API keys, private keys, access keys, or signing keys, including nested objects and arrays. Re-enter the production `promogest_app` database connection, HTTPS certificate configuration, and any platform key-protection secrets from the organization's protected vault before starting the recovered service.

## 6. Caddy internal CA recovery

The backup bundles preserve the Caddy configuration file, but they do **not** currently include Caddy's internal PKI/data directory. A same-machine restore normally retains the existing Caddy state if that directory was not lost. During a full host replacement or after loss of Caddy state, expect Caddy to use a new local CA; export the new Caddy root certificate and reinstall it on every trusted LAN workstation before users rely on HTTPS. Do not assume that restoring `Caddyfile` alone preserves the previous trust relationship.
