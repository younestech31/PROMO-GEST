# PROMO GEST — Backup and Restoration Procedures

## 1. Backup Scope
A complete PROMO GEST backup bundle (`promogest_backup_YYYYMMDD_HHMMSS/`) consists of:
1. **PostgreSQL 18 database dump** (`database.dump`, `pg_dump --format=custom`)
2. **Local document storage archive** (`storage.zip` / `storage.tar.gz` from `Storage:RootDirectory`)
3. **Sanitized installation configuration** (`config-sanitized.zip` containing `appsettings.Production.sanitized.json` with database password redacted + `Caddyfile`)
4. **SHA-256 verification manifest** (`manifest.sha256` covering all archive files)

Backing up only the database without `storage/` leaves uploaded property deeds, building permits, and contracts orphaned. Scrubbing secrets from `config-sanitized.zip` preserves topology/port/DataProtection configuration without exposing database passwords in backup media.

## 2. Creating a Backup
On Windows Server:
```powershell
.\scripts\backup-promogest.ps1 -DatabaseName promogest -StorageDir C:\PromoGest\storage -BackupRoot D:\PromoGestBackups
```
Store copies on an external encrypted drive or secondary NAS inside the premises.

## 3. Mandatory Restoration Verification Rule
**A backup is NOT considered verified until a restoration test succeeds against a scratch database.**

Run the verification drill regularly:
- **Windows**:
  ```powershell
  createdb -U promogest_app promogest_restore_verify
  .\scripts\restore-promogest.ps1 -BackupBundleDir D:\PromoGestBackups\promogest_backup_YYYYMMDD_HHMMSS -TargetDatabase promogest_restore_verify
  ```
- **Linux**:
  ```bash
  ./scripts/verify-backup-restore.sh promogest ./storage ./src/PromoGest.Api/appsettings.json
  ```

Both restore scripts automatically verify:
1. `manifest.sha256` passes with zero checksum mismatches.
2. `pg_restore` exits with code `0`.
3. `organization_settings`, `users`, `projects`, and `stored_files` row counts are queried and printed.
4. Files referenced in `stored_files` exist in the restored storage directory and match their stored `sha256_checksum`.
5. Note: When performing a full disaster recovery cutover on a new machine, re-enter the PostgreSQL password in `appsettings.Production.json` from your offline password vault before starting the service.
