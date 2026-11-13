#!/usr/bin/env bash
set -euo pipefail

# Full PostgreSQL + storage + Data Protection key restore drill.
# PGUSER must be the database owner/migration identity.
# PGPROVISION_USER must be allowed to CREATE DATABASE and DROP DATABASE.
# PROMOGEST_APP_USER is the restricted runtime role (default: promogest_app).
# Use a protected PGPASSFILE; never put database passwords in command lines.
#
# Usage:
#   PGHOST=127.0.0.1 PGUSER=promogest_owner PGPROVISION_USER=postgres \
#   PGPASSFILE="$HOME/.pgpass" \
#     ./scripts/verify-backup-restore.sh <source_db> <storage_dir> [config_path] [dataprotection_key_dir]

SOURCE_DB="${1:-promogest}"
STORAGE_DIR="${2:-./storage}"
CONFIG_PATH="${3:-./src/PromoGest.Api/appsettings.json}"
DP_KEYS_DIR="${4:-./dataprotection-keys}"
OWNER_USER="${PGUSER:-promogest_owner}"
PROVISION_USER="${PGPROVISION_USER:-postgres}"
APP_USER="${PROMOGEST_APP_USER:-promogest_app}"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
export PGHOST PGPORT

for identifier in "$SOURCE_DB" "$OWNER_USER" "$PROVISION_USER" "$APP_USER"; do
  if [[ ! "$identifier" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
    echo "ERROR: Unsafe PostgreSQL identifier: $identifier" >&2
    exit 1
  fi
done
if [[ "$OWNER_USER" == "$APP_USER" ]]; then
  echo "ERROR: Migration owner and runtime role must be different identities." >&2
  exit 1
fi
[[ -d "$STORAGE_DIR" ]] || { echo "ERROR: Storage directory missing: $STORAGE_DIR" >&2; exit 1; }
[[ -f "$CONFIG_PATH" ]] || { echo "ERROR: Configuration file missing: $CONFIG_PATH" >&2; exit 1; }
if [[ ! -d "$DP_KEYS_DIR" ]] || ! find "$DP_KEYS_DIR" -type f -print -quit | grep -q .; then
  echo "ERROR: Data Protection key directory is missing or empty: $DP_KEYS_DIR" >&2
  exit 1
fi

SOURCE_PREFIX="${SOURCE_DB:0:32}"
VERIFY_DB="${SOURCE_PREFIX}_restore_$(date +%s)_$RANDOM"
VERIFY_DB_CREATED=0
WORK_DIR="$(mktemp -d)"
RESTORE_STORAGE="$WORK_DIR/restored_storage"
RESTORE_KEYS="$WORK_DIR/restored_dataprotection_keys"
RESTORE_CONFIG="$WORK_DIR/restored_config"

cleanup() {
  if [[ "$VERIFY_DB_CREATED" -eq 1 ]]; then
    dropdb --host="$PGHOST" --port="$PGPORT" --username="$PROVISION_USER" "$VERIFY_DB" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "[1/8] Dumping PostgreSQL database '$SOURCE_DB' as '$OWNER_USER'..."
pg_dump --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --format=custom --file="$WORK_DIR/database.dump" "$SOURCE_DB"
pg_restore --list "$WORK_DIR/database.dump" >/dev/null

echo "[2/8] Archiving storage, Data Protection keys, and sanitized config..."
mkdir -p "$WORK_DIR/config_stage" "$RESTORE_STORAGE" "$RESTORE_KEYS" "$RESTORE_CONFIG"
tar -czf "$WORK_DIR/storage.tar.gz" -C "$STORAGE_DIR" .
tar -czf "$WORK_DIR/dataprotection-keys.tar.gz" -C "$DP_KEYS_DIR" .
perl -pe 's/(\bPassword\s*=\s*)(?:"(?:[^"\\]|\\.)*"|[^;"]+)/\1REDACTED_FOR_BACKUP/ig' \
  "$CONFIG_PATH" > "$WORK_DIR/config_stage/appsettings.sanitized.json"

python3 - "$WORK_DIR/config_stage/appsettings.sanitized.json" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig")
values = re.findall(r'(?i)\bPassword\s*=\s*(?:"([^"]*)"|([^;"]+))', text)
leaked = [quoted or unquoted for quoted, unquoted in values
          if (quoted or unquoted).strip().casefold() != "redacted_for_backup"]
if leaked:
    raise SystemExit("ERROR: Sanitized config still contains a connection-string password.")
PY

tar -czf "$WORK_DIR/config-sanitized.tar.gz" -C "$WORK_DIR/config_stage" .
(
  cd "$WORK_DIR"
  sha256sum database.dump storage.tar.gz dataprotection-keys.tar.gz config-sanitized.tar.gz > manifest.sha256
)

echo "[3/8] Verifying every backup component checksum..."
(cd "$WORK_DIR" && sha256sum -c manifest.sha256)

echo "[4/8] Creating an isolated restore database as '$PROVISION_USER'..."
createdb --host="$PGHOST" --port="$PGPORT" --username="$PROVISION_USER" --owner="$OWNER_USER" "$VERIFY_DB"
VERIFY_DB_CREATED=1

psql --host="$PGHOST" --port="$PGPORT" --username="$PROVISION_USER" --dbname=postgres \
  --set=ON_ERROR_STOP=1 --set=verify_db="$VERIFY_DB" --set=app_role="$APP_USER" \
  --command='GRANT CONNECT ON DATABASE :"verify_db" TO :"app_role";'

pg_restore --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --no-owner --no-acl --dbname="$VERIFY_DB" "$WORK_DIR/database.dump"

# --no-acl intentionally omits original ACLs; rebuild the runtime role grants in this DB.
psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" \
  --set=ON_ERROR_STOP=1 --set=app_role="$APP_USER" --set=owner_role="$OWNER_USER" <<'SQL'
GRANT USAGE ON SCHEMA public TO :"app_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_role";
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE audit_logs FROM :"app_role";
GRANT SELECT, INSERT ON TABLE audit_logs TO :"app_role";
CREATE TABLE public.backup_restore_privilege_probe (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY
);
SQL

tar -xzf "$WORK_DIR/storage.tar.gz" -C "$RESTORE_STORAGE"
tar -xzf "$WORK_DIR/dataprotection-keys.tar.gz" -C "$RESTORE_KEYS"
tar -xzf "$WORK_DIR/config-sanitized.tar.gz" -C "$RESTORE_CONFIG"
find "$RESTORE_KEYS" -type f -print -quit | grep -q . || {
  echo "ERROR: Data Protection archive restored no key files." >&2
  exit 1
}

echo "[5/8] Verifying restored database access as runtime role '$APP_USER'..."
psql --host="$PGHOST" --port="$PGPORT" --username="$APP_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
    IF NOT has_table_privilege(current_user, 'public.projects', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Runtime role is missing DML privileges on projects';
    END IF;
    IF NOT has_table_privilege(current_user, 'public.project_members', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Runtime role is missing DML privileges on project_members';
    END IF;
    IF NOT has_table_privilege(current_user, 'public.backup_restore_privilege_probe', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Default table privileges were not restored';
    END IF;
    IF has_table_privilege(current_user, 'public.audit_logs', 'UPDATE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'DELETE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'TRIGGER') THEN
        RAISE EXCEPTION 'Runtime role has excessive audit_logs privileges';
    END IF;
    IF has_schema_privilege(current_user, 'public', 'CREATE')
       OR has_database_privilege(current_user, current_database(), 'CREATE') THEN
        RAISE EXCEPTION 'Runtime role has schema or database creation privileges';
    END IF;
END
$$;
INSERT INTO public.backup_restore_privilege_probe DEFAULT VALUES;
SELECT count(*) FROM organization_settings;
SELECT count(*) FROM users;
SELECT count(*) FROM projects;
SELECT count(*) FROM stored_files;
SQL

psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" \
  --set=ON_ERROR_STOP=1 -c "DROP TABLE public.backup_restore_privilege_probe;"

echo "[6/8] Enumerating every restored stored_files record..."
psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 \
  --tuples-only --no-align --field-separator=$'\t' \
  -c "SELECT stored_relative_path, sha256_checksum, size_bytes FROM stored_files ORDER BY stored_relative_path;" \
  > "$WORK_DIR/stored-files.tsv"

echo "[7/8] Verifying existence, byte length, and SHA-256 for every restored stored file..."
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
    *) echo "ERROR: Stored path escapes restored storage root: $rel_path" >&2; exit 1 ;;
  esac
  [[ -f "$full_path" ]] || { echo "ERROR: Missing restored file: $rel_path" >&2; exit 1; }
  actual_size="$(stat -c '%s' -- "$full_path")"
  [[ "$actual_size" == "$expected_size" ]] || {
    echo "ERROR: Byte-length mismatch for $rel_path (expected $expected_size, got $actual_size)" >&2
    exit 1
  }
  actual_hash="$(sha256sum -- "$full_path" | awk '{print $1}')"
  [[ "$actual_hash" == "$expected_hash" ]] || {
    echo "ERROR: SHA-256 mismatch for $rel_path" >&2
    exit 1
  }
  verified_count=$((verified_count + 1))
done < "$WORK_DIR/stored-files.tsv"

expected_count="$(psql --host="$PGHOST" --port="$PGPORT" --username="$OWNER_USER" --dbname="$VERIFY_DB" --set=ON_ERROR_STOP=1 --tuples-only --no-align -c "SELECT count(*) FROM stored_files;")"
[[ "$verified_count" -eq "$expected_count" ]] || {
  echo "ERROR: Verified $verified_count files but database references $expected_count." >&2
  exit 1
}

echo "[8/8] Full restore drill passed: $verified_count/$expected_count stored files verified; runtime grants and audit-log restrictions verified; database, storage, Data Protection keys, and sanitized configuration restored."
