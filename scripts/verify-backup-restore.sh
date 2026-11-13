#!/usr/bin/env bash
set -euo pipefail

# Automated PostgreSQL 18 + Local File Storage + Sanitized Config Backup & Restore Verification Drill
# Usage: PGHOST=127.0.0.1 PGUSER=promogest_app ./scripts/verify-backup-restore.sh <source_db> <storage_dir> [config_path]

SOURCE_DB="${1:-promogest}"
STORAGE_DIR="${2:-./storage}"
CONFIG_PATH="${3:-./src/PromoGest.Api/appsettings.json}"
VERIFY_DB="${SOURCE_DB}_restore_drill"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "[1/6] Dumping $SOURCE_DB..."
pg_dump --format=custom --file="$WORK_DIR/database.dump" "$SOURCE_DB"

echo "[2/6] Archiving local storage ($STORAGE_DIR) and sanitized config..."
mkdir -p "$STORAGE_DIR" "$WORK_DIR/config_stage"
tar -czf "$WORK_DIR/storage.tar.gz" -C "$STORAGE_DIR" .
if [ -f "$CONFIG_PATH" ]; then
  sed -E 's/(Password=)[^;"]+/\1REDACTED_FOR_BACKUP/g' "$CONFIG_PATH" > "$WORK_DIR/config_stage/appsettings.sanitized.json"
fi
tar -czf "$WORK_DIR/config-sanitized.tar.gz" -C "$WORK_DIR/config_stage" .
(cd "$WORK_DIR" && sha256sum database.dump storage.tar.gz config-sanitized.tar.gz > manifest.sha256)

echo "[3/6] Verifying checksums..."
(cd "$WORK_DIR" && sha256sum -c manifest.sha256)

echo "[4/6] Recreating scratch database $VERIFY_DB and restoring..."
dropdb --if-exists "$VERIFY_DB"
createdb "$VERIFY_DB"
pg_restore --dbname="$VERIFY_DB" "$WORK_DIR/database.dump"

mkdir -p "$WORK_DIR/restored_storage" "$WORK_DIR/restored_config"
tar -xzf "$WORK_DIR/storage.tar.gz" -C "$WORK_DIR/restored_storage"
tar -xzf "$WORK_DIR/config-sanitized.tar.gz" -C "$WORK_DIR/restored_config"

echo "[5/6] Checking restored table counts..."
psql -d "$VERIFY_DB" -c "SELECT (SELECT count(*) FROM organization_settings) AS org_rows, (SELECT count(*) FROM users) AS user_rows, (SELECT count(*) FROM projects) AS project_rows, (SELECT count(*) FROM stored_files) AS file_rows;"

echo "[6/6] Spot-checking stored_files SHA-256 checksums against restored storage..."
while IFS='|' read -r rel_path expected_hash; do
  [ -z "$rel_path" ] && continue
  actual_hash="$(sha256sum "$WORK_DIR/restored_storage/$rel_path" | awk '{print $1}')"
  if [ "$actual_hash" != "$expected_hash" ]; then
    echo "ERROR: Checksum mismatch for $rel_path" >&2
    exit 1
  fi
done < <(psql -d "$VERIFY_DB" -Atc "SELECT stored_relative_path || '|' || sha256_checksum FROM stored_files;")

echo "Backup and restoration drill succeeded cleanly."
