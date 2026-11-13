#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Linux point-in-time backup for the local-first PROMO GEST server.
# Run as root from a root-owned systemd oneshot service. PostgreSQL credentials
# belong in a root-owned 0600 PGPASSFILE; never pass passwords on command lines.

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: Run this backup script as root." >&2
  exit 1
fi

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-promogest_owner}"
PGPASSFILE="${PGPASSFILE:-/etc/promogest/pgpass}"
DB_NAME="${PROMOGEST_DB_NAME:-promogest}"
SERVICE_NAME="${PROMOGEST_SERVICE_NAME:-promogest.service}"
STORAGE_DIR="${PROMOGEST_STORAGE_DIR:-/var/lib/promogest/storage}"
DP_KEYS_DIR="${PROMOGEST_DATA_PROTECTION_KEY_DIR:-/var/lib/promogest/dataprotection-keys}"
CONFIG_PATH="${PROMOGEST_CONFIG_PATH:-/opt/promogest/app/appsettings.Production.json}"
CADDYFILE_PATH="${PROMOGEST_CADDYFILE_PATH:-/etc/caddy/Caddyfile}"
BACKUP_ROOT="${PROMOGEST_BACKUP_ROOT:-/var/backups/promogest}"

for identifier in "$DB_NAME" "$PGUSER"; do
  if [[ ! "$identifier" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
    echo "ERROR: Unsafe PostgreSQL identifier: $identifier" >&2
    exit 1
  fi
done

[[ -r "$PGPASSFILE" ]] || { echo "ERROR: PGPASSFILE is not readable: $PGPASSFILE" >&2; exit 1; }
[[ "$(stat -c '%u' "$PGPASSFILE")" == "0" ]] || { echo "ERROR: PGPASSFILE must be owned by root." >&2; exit 1; }
pgpass_mode="$(stat -c '%a' "$PGPASSFILE")"
[[ "$pgpass_mode" == "600" || "$pgpass_mode" == "400" ]] || {
  echo "ERROR: PGPASSFILE must have mode 0600 or 0400 (got $pgpass_mode)." >&2
  exit 1
}
export PGHOST PGPORT PGUSER PGPASSFILE

[[ -d "$STORAGE_DIR" ]] || { echo "ERROR: Storage directory missing: $STORAGE_DIR" >&2; exit 1; }
[[ -d "$DP_KEYS_DIR" ]] || { echo "ERROR: Data Protection key directory missing: $DP_KEYS_DIR" >&2; exit 1; }
[[ -f "$CONFIG_PATH" ]] || { echo "ERROR: Production configuration missing: $CONFIG_PATH" >&2; exit 1; }
[[ -f "$CADDYFILE_PATH" ]] || { echo "ERROR: Caddyfile missing: $CADDYFILE_PATH" >&2; exit 1; }
[[ -n "${PROMOGEST_DATA_PROTECTION_CERT_PASSWORD:-}" ]] || {
  echo "ERROR: PROMOGEST_DATA_PROTECTION_CERT_PASSWORD is required." >&2
  exit 1
}

DP_CERTIFICATE_PATH="$DP_KEYS_DIR/protection.pfx"
[[ -f "$DP_CERTIFICATE_PATH" ]] || {
  echo "ERROR: Linux Data Protection certificate missing: $DP_CERTIFICATE_PATH" >&2
  exit 1
}
command -v openssl >/dev/null || {
  echo "ERROR: Required command not found: openssl" >&2
  exit 1
}
openssl pkcs12 -in "$DP_CERTIFICATE_PATH" -noout \
  -passin env:PROMOGEST_DATA_PROTECTION_CERT_PASSWORD >/dev/null

for command_name in openssl pg_dump pg_restore tar sha256sum flock systemctl python3 realpath find; do
  command -v "$command_name" >/dev/null || {
    echo "ERROR: Required command not found: $command_name" >&2
    exit 1
  }
done

# The backup root must be a dedicated directory. Never chmod a shared system
# directory or place a backup inside the data it is meant to protect.
BACKUP_ROOT="$(realpath -m -- "$BACKUP_ROOT")"
case "$BACKUP_ROOT" in
  /|/var|/var/backups|/tmp|/run|/run/lock)
    echo "ERROR: PROMOGEST_BACKUP_ROOT must be a dedicated subdirectory, not a shared system directory: $BACKUP_ROOT" >&2
    exit 1
    ;;
esac

if [[ "${PROMOGEST_SYSTEMD_PROTECT_HOME:-false}" == "true" ]]; then
  case "$BACKUP_ROOT" in
    /home|/home/*|/root|/root/*|/run/user|/run/user/*)
      echo "ERROR: PROMOGEST_BACKUP_ROOT cannot be under a protected home directory because the systemd backup unit uses ProtectHome=true: $BACKUP_ROOT" >&2
      exit 1
      ;;
  esac
fi

for source_directory in "$STORAGE_DIR" "$DP_KEYS_DIR" "$(dirname "$CONFIG_PATH")" "$(dirname "$CADDYFILE_PATH")"; do
  source_absolute="$(realpath -m -- "$source_directory")"
  case "$BACKUP_ROOT/" in
    "$source_absolute/"*)
      echo "ERROR: Backup root overlaps a protected source directory: $source_absolute" >&2
      exit 1
      ;;
  esac
  case "$source_absolute/" in
    "$BACKUP_ROOT/"*)
      echo "ERROR: Backup root overlaps a protected source directory: $source_absolute" >&2
      exit 1
      ;;
  esac
done

for source_directory in "$STORAGE_DIR" "$DP_KEYS_DIR"; do
  [[ ! -L "$source_directory" ]] || {
    echo "ERROR: Backup source root must not be a symbolic link: $source_directory" >&2
    exit 1
  }
  if find "$source_directory" -type l -print -quit | grep -q .; then
    echo "ERROR: Symbolic links are not allowed inside backup source: $source_directory" >&2
    exit 1
  fi
done

install -d -o root -g root -m 0700 "$BACKUP_ROOT"
LOCK_FILE="$BACKUP_ROOT/.promogest-backup.lock"
exec 9>"$LOCK_FILE"
chmod 0600 "$LOCK_FILE"
flock -n 9 || { echo "ERROR: Another PROMO GEST backup is already running." >&2; exit 1; }

timestamp="$(date -u +%Y%m%d_%H%M%S)"
bundle_dir="$BACKUP_ROOT/promogest_backup_$timestamp"
if [[ -e "$bundle_dir" ]]; then
  echo "ERROR: Backup destination already exists: $bundle_dir" >&2
  exit 1
fi
install -d -o root -g root -m 0700 "$bundle_dir"

service_was_running=0
backup_completed=0
restore_service() {
  status=$?
  if [[ "$service_was_running" -eq 1 ]]; then
    echo "Restarting $SERVICE_NAME after backup..."
    if ! systemctl start "$SERVICE_NAME"; then
      echo "ERROR: Backup finished, but $SERVICE_NAME could not be restarted. Check systemd immediately." >&2
      status=1
    fi
  fi

  if [[ "$backup_completed" -eq 0 && -d "$bundle_dir" ]]; then
    echo "Removing incomplete backup bundle after failure: $bundle_dir" >&2
    rm -rf -- "$bundle_dir"
  fi
  exit "$status"
}
trap restore_service EXIT

service_state="$(systemctl show -p ActiveState --value "$SERVICE_NAME")"
case "$service_state" in
  active)
    service_was_running=1
    echo "Stopping $SERVICE_NAME to obtain a consistent database, file, and key-ring snapshot..."
    systemctl stop "$SERVICE_NAME"
    stopped_state="$(systemctl show -p ActiveState --value "$SERVICE_NAME")"
    if [[ "$stopped_state" != "inactive" ]]; then
      echo "ERROR: $SERVICE_NAME did not reach the inactive state after stop (state: $stopped_state)." >&2
      exit 1
    fi
    ;;
  inactive|failed)
    echo "$SERVICE_NAME is $service_state; proceeding without a restart requirement."
    ;;
  *)
    echo "ERROR: Cannot create a consistent backup while $SERVICE_NAME is in transitional state '$service_state'." >&2
    exit 1
    ;;
esac

echo "[1/5] Dumping PostgreSQL database '$DB_NAME' as '$PGUSER'..."
pg_dump --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" \
  --format=custom --file="$bundle_dir/database.dump" "$DB_NAME"
pg_restore --list "$bundle_dir/database.dump" >/dev/null

echo "[2/5] Archiving local document storage and the complete Data Protection key directory..."
tar -czf "$bundle_dir/storage.tar.gz" -C "$STORAGE_DIR" .
tar -czf "$bundle_dir/dataprotection-keys.tar.gz" -C "$DP_KEYS_DIR" .

echo "[3/5] Writing sanitized configuration and local HTTPS configuration..."
stage_dir="$(mktemp -d "$bundle_dir/.config-stage.XXXXXX")"
python3 - "$CONFIG_PATH" "$stage_dir/appsettings.Production.sanitized.json" <<'PY'
import json
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1])
destination = pathlib.Path(sys.argv[2])
data = json.loads(source.read_text(encoding="utf-8-sig"))
if not isinstance(data, dict):
    raise SystemExit("ERROR: Production configuration must be a JSON object.")
if not isinstance(data.get("Storage"), dict) or not isinstance(data.get("Security"), dict):
    raise SystemExit("ERROR: Production configuration is missing required Storage or Security sections.")

sensitive_name = re.compile(
    r"(?i)(^connectionstrings?$|(?:password|passwd|pwd|secret|secret.?key|encryption.?key|master.?key|tokens?|credentials?|private.?key|api.?key|access.?key|signing.?key)(?:value|text|string|hash)?$)"
)

def strip_sensitive(value):
    if isinstance(value, dict):
        return {
            key: strip_sensitive(item)
            for key, item in value.items()
            if not sensitive_name.search(str(key))
        }
    if isinstance(value, list):
        return [strip_sensitive(item) for item in value]
    return value

sanitized = strip_sensitive(data)
serialized = json.dumps(sanitized, ensure_ascii=False, indent=2) + "\n"
if sensitive_name.search(serialized):
    raise SystemExit("ERROR: Secret-bearing property name remained in sanitized configuration.")
destination.write_text(serialized, encoding="utf-8")
PY
cp -- "$CADDYFILE_PATH" "$stage_dir/Caddyfile"
tar -czf "$bundle_dir/config-sanitized.tar.gz" -C "$stage_dir" .
rm -rf -- "$stage_dir"

echo "[4/5] Verifying all four archive components and writing the SHA-256 manifest..."
(
  cd "$bundle_dir"
  sha256sum database.dump storage.tar.gz dataprotection-keys.tar.gz config-sanitized.tar.gz > manifest.sha256
  sha256sum -c manifest.sha256
)
chmod 0600 "$bundle_dir"/*
chmod 0700 "$bundle_dir"
backup_completed=1

echo "[5/5] Backup bundle created: $bundle_dir"
echo "The service will be restarted automatically. Run the separate restore drill before relying on this backup."
