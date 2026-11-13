#!/usr/bin/env bash
set -euo pipefail

# Full PostgreSQL + storage + Data Protection key restore drill.
# PGUSER must be the database owner/migration-maintenance identity.
# PGPROVISION_USER must be allowed to CREATE DATABASE and DROP DATABASE.
# Use ~/.pgpass for both identities; do not put passwords in command lines.
#
# Usage:
#   PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
#     ./scripts/verify-backup-restore.sh <source_db> <storage_dir> [config_path] [dataprotection_key_dir]

SOURCE_DB="\${1:-promogest}"
STORAGE_DIR="\${2:-./storage}"
CONFIG_PATH="\${3:-./src/PromoGest.Api/appsettings.json}"
DP_KEYS_DIR="\${4:-./dataprotection-keys}"
OWNER_USER="\${PGUSER:-promogest_owner}"
PROVISION_USER="\${PGPROVISION_USER:-postgres}"
PGHOST="\${PGHOST:-127.0.0.1}"
PGPORT="\${PGPORT:-5432}"
export PGHOST PGPORT

VERIFY_DB="\${SOURCE_DB}_restore_$(date +%s)_$RANDOM"
WORK_DIR="$(mktemp -d)"
RESTORE_STORAGE="$WORK_DIR/restored_storage"
RESTORE_KEYS="$WORK_DIR/restored_dataprotection_keys"
RESTORE_CONFIG="$WORK_DIR/restored_config"

cleanup() {
  if [[ -n "\${VERIFY_DB:-}" ]]; then
    dropdb --if-exists --host="$PGHOST" --port="$PGPORT" --username="$PROVISION_USER" "$VERIFY_DB" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

if [[ ! -d "$STORAGE_DIR" ]]; then
  echo "ERROR: Storage directory does not exist: $STORAGE_DIR" >&2
  exit 1
fi
if [[ ! -d "$DP_KEYS_DIR" ]]; then
  echo "ERROR: Data Protection key directory does not exist: $DP_KEYS_DIR" >&2
  exit 1
fi

echo "[1/7] Dumping PostgreSQL database '$SOURCE_DB' as '$OWNER_USER'..."
pg_dump --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --format=custom --file="$WORK_DIR/database.dump" "$SOURCE_DB"
pg_restore --list "$WORK_DIR/database.dump" >/dev/null

echo "[2/7] Archiving storage, Data Protection keys, and sanitized config..."
mkdir -p "$WORK_DIR/config_stage" "$RESTORE_STORAGE" "$RESTORE_KEYS" "$RESTORE_CONFIG"
tar -czf "$WORK_DIR/storage.tar.gz" -C "$STORAGE_DIR" .
tar -czf "$WORK_DIR/dataprotection-keys.tar.gz" -C "$DP_KEYS_DIR" .
if [[ -f "$CONFIG_PATH" ]]; then
  sed -E 's/(Password=)[^;"]+/\1REDACTED_FOR_BACKUP/g' "$CONFIG_PATH" > "$WORK_DIR/config_stage/appsettings.sanitized.json"
else
  echo "ERROR: Configuration file not found: $CONFIG_PATH" >&2
  exit 1
fi
tar -czf "$WORK_DIR/config-sanitized.tar.gz" -C "$WORK_DIR/config_stage" .
(
  cd "$WORK_DIR"
  sha256sum database.dump storage.tar.gz dataprotection-keys.tar.gz config-sanitized.tar.gz > manifest.sha256
)

echo "[3/7] Verifying complete backup manifest..."
(cd "$WORK_DIR" && sha256sum -c manifest.sha256)

echo "[4/7] Creating isolated restore database as '$PROVISION_USER' and restoring as '$OWNER_USER'..."
createdb --host="$PGHOST" --port="$PGPORT" --username="$PROVISION_USER" --owner="$OWNER_USER" "$VERIFY_DB"
pg_restore --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --no-owner --no-acl --dbname="$VERIFY_DB" "$WORK_DIR/database.dump"

tar -xzf "$WORK_DIR/storage.tar.gz" -C "$RESTORE_STORAGE"
tar -xzf "$WORK_DIR/dataprotection-keys.tar.gz" -C "$RESTORE_KEYS"
tar -xzf "$WORK_DIR/config-sanitized.tar.gz" -C "$RESTORE_CONFIG"

echo "[5/7] Checking restored database counts..."
psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 \
  -c "SELECT (SELECT count(*) FROM organization_settings) AS org_rows, (SELECT count(*) FROM users) AS user_rows, (SELECT count(*) FROM projects) AS project_rows, (SELECT count(*) FROM stored_files) AS file_rows;"

echo "[6/7] Enumerating every stored_files record..."
psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 \
  --tuples-only --no-align --field-separator=$'\t' \
  -c "SELECT stored_relative_path, sha256_checksum, size_bytes FROM stored_files ORDER BY stored_relative_path;" \
  > "$WORK_DIR/stored-files.tsv"

echo "[7/7] Verifying existence, byte length, and SHA-256 for every stored file..."
RESTORE_ROOT="$(realpath "$RESTORE_STORAGE")"
verified_count=0
while IFS=$'\t' read -r rel_path expected_hash expected_size; do
  [[ -z "$rel_path" ]] && continue

  if [[ "$rel_path" = /* || "$rel_path" == ".." || "$rel_path" == ../* || "$rel_path" == *$'\n'* ]]; then
    echo "ERROR: Unsafe stored_relative_path in database: $rel_path" >&2
    exit 1
  fi

  full_path="$(realpath -m -- "$RESTORE_ROOT/$rel_path")"
  case "$full_path" in
    "$RESTORE_ROOT"/*) ;;
    *)
      echo "ERROR: Stored path escapes restored storage root: $rel_path" >&2
      exit 1
      ;;
  esac

  if [[ ! -f "$full_path" ]]; then
    echo "ERROR: Missing restored file: $rel_path" >&2
    exit 1
  fi

  actual_size="$(stat -c '%s' -- "$full_path")"
  if [[ "$actual_size" != "$expected_size" ]]; then
    echo "ERROR: Byte-length mismatch for $rel_path (expected $expected_size, got $actual_size)" >&2
    exit 1
  fi

  actual_hash="$(sha256sum -- "$full_path" | awk '{print $1}')"
  if [[ "$actual_hash" != "$expected_hash" ]]; then
    echo "ERROR: SHA-256 mismatch for $rel_path" >&2
    exit 1
  fi

  verified_count=$((verified_count + 1))
done < "$WORK_DIR/stored-files.tsv"

expected_count="$(psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 --tuples-only --no-align -c "SELECT count(*) FROM stored_files;")"
if [[ "$verified_count" -ne "$expected_count" ]]; then
  echo "ERROR: Verified $verified_count files but database references $expected_count." >&2
  exit 1
fi

echo "Full restore drill passed: $verified_count/$expected_count stored files verified; database, storage, Data Protection keys, and sanitized configuration restored."
