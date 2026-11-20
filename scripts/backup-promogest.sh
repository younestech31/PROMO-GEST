#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Linux point-in-time backup for the local-first PROMO GEST server.
# Run as root from a root-owned systemd oneshot service. PostgreSQL credentials
# belong in a root-owned 0600 PGPASSFILE; never pass passwords on command lines.
#
# The bundle is sealed (SHA-256 manifest), packed, and encrypted with an X.509
# recipient certificate before it leaves the server. The matching private key must
# NOT exist on this host; the restore drill supplies it. Encryption is required
# unless PROMOGEST_BACKUP_ALLOW_PLAINTEXT=1 explicitly acknowledges the risk.
#
# Environment contract:
#   PROMOGEST_BACKUP_ENCRYPTION=required|disabled   (default required)
#   PROMOGEST_BACKUP_RECIPIENT_CERT=<pem path>      (required unless disabled)
#   PROMOGEST_BACKUP_OFFSITE_DIR=<existing dir>     (required unless ALLOW_LOCAL_ONLY=1)
#   PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY=1             (explicit acknowledgement)
#   PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE=1    (test/DR only; refuses silently co-located offsite)
#   PROMOGEST_BACKUP_RETENTION_DAYS=30              (minimum 7)
#   PROMOGEST_BACKUP_RETENTION_MIN_KEEP=3           (never prune below this many newest artifacts)
#   PROMOGEST_BACKUP_KEEP_PLAINTEXT=1               (test/diagnostic only)

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
BACKUP_ENCRYPTION="${PROMOGEST_BACKUP_ENCRYPTION:-required}"
ALLOW_PLAINTEXT="${PROMOGEST_BACKUP_ALLOW_PLAINTEXT:-0}"
RECIPIENT_CERT="${PROMOGEST_BACKUP_RECIPIENT_CERT:-}"
OFFSITE_DIR="${PROMOGEST_BACKUP_OFFSITE_DIR:-}"
ALLOW_LOCAL_ONLY="${PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY:-0}"
ALLOW_SAME_DEVICE_OFFSITE="${PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE:-0}"
RETENTION_DAYS="${PROMOGEST_BACKUP_RETENTION_DAYS:-30}"
RETENTION_MIN_KEEP="${PROMOGEST_BACKUP_RETENTION_MIN_KEEP:-3}"
KEEP_PLAINTEXT="${PROMOGEST_BACKUP_KEEP_PLAINTEXT:-0}"

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

case "$BACKUP_ENCRYPTION" in
  required|disabled) ;;
  *)
    echo "ERROR: PROMOGEST_BACKUP_ENCRYPTION must be 'required' or 'disabled' (got '$BACKUP_ENCRYPTION')." >&2
    exit 1
    ;;
esac

if [[ "$BACKUP_ENCRYPTION" == "disabled" ]]; then
  if [[ "$ALLOW_PLAINTEXT" != "1" ]]; then
    echo "ERROR: Disabling backup encryption stores database, document, and Data Protection key material in cleartext." >&2
    echo "Configure PROMOGEST_BACKUP_RECIPIENT_CERT, or set PROMOGEST_BACKUP_ALLOW_PLAINTEXT=1 to acknowledge the risk explicitly." >&2
    exit 1
  fi
  echo "WARNING: Backup encryption is disabled by explicit configuration; artifacts are NOT encrypted at rest." >&2
else
  [[ -n "$RECIPIENT_CERT" ]] || {
    echo "ERROR: PROMOGEST_BACKUP_RECIPIENT_CERT is required when backup encryption is enabled." >&2
    exit 1
  }
  [[ -f "$RECIPIENT_CERT" ]] || { echo "ERROR: Backup recipient certificate not found: $RECIPIENT_CERT" >&2; exit 1; }
  [[ ! -L "$RECIPIENT_CERT" ]] || { echo "ERROR: Backup recipient certificate must not be a symbolic link: $RECIPIENT_CERT" >&2; exit 1; }
  RECIPIENT_CERT="$(realpath -- "$RECIPIENT_CERT")"
  openssl x509 -in "$RECIPIENT_CERT" -noout >/dev/null 2>&1 || {
    echo "ERROR: Backup recipient certificate is not a readable PEM X.509 certificate: $RECIPIENT_CERT" >&2
    exit 1
  }
fi

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS >= 7 )) || {
  echo "ERROR: PROMOGEST_BACKUP_RETENTION_DAYS must be an integer >= 7 (got '$RETENTION_DAYS')." >&2
  exit 1
}
[[ "$RETENTION_MIN_KEEP" =~ ^[0-9]+$ ]] && (( RETENTION_MIN_KEEP >= 1 )) || {
  echo "ERROR: PROMOGEST_BACKUP_RETENTION_MIN_KEEP must be an integer >= 1 (got '$RETENTION_MIN_KEEP')." >&2
  exit 1
}

if [[ -n "$OFFSITE_DIR" ]]; then
  OFFSITE_DIR="$(realpath -m -- "$OFFSITE_DIR")"
  [[ -d "$OFFSITE_DIR" ]] || {
    echo "ERROR: PROMOGEST_BACKUP_OFFSITE_DIR must be an existing mounted directory: $OFFSITE_DIR" >&2
    exit 1
  }
  [[ -w "$OFFSITE_DIR" ]] || { echo "ERROR: PROMOGEST_BACKUP_OFFSITE_DIR is not writable: $OFFSITE_DIR" >&2; exit 1; }
  case "$OFFSITE_DIR/" in
    "$BACKUP_ROOT/"*)
      echo "ERROR: The offsite directory must not be inside the primary backup root: $OFFSITE_DIR" >&2
      exit 1
      ;;
  esac
  case "$BACKUP_ROOT/" in
    "$OFFSITE_DIR/"*)
      echo "ERROR: The primary backup root must not be inside the offsite directory: $BACKUP_ROOT" >&2
      exit 1
      ;;
  esac
  for source_directory in "$STORAGE_DIR" "$DP_KEYS_DIR"; do
    source_absolute="$(realpath -m -- "$source_directory")"
    case "$OFFSITE_DIR/" in
      "$source_absolute/"*)
        echo "ERROR: The offsite directory overlaps a protected source directory: $source_absolute" >&2
        exit 1
        ;;
    esac
  done
  if [[ "$ALLOW_SAME_DEVICE_OFFSITE" != "1" ]] && \
     [[ "$(stat -c '%d' -- "$BACKUP_ROOT")" == "$(stat -c '%d' -- "$OFFSITE_DIR")" ]]; then
    echo "ERROR: The offsite directory resides on the same filesystem as the backup root, so it is not an independent copy." >&2
    echo "Mount independent storage, or set PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE=1 only for a documented test/DR exception." >&2
    exit 1
  fi
elif [[ "$ALLOW_LOCAL_ONLY" != "1" ]]; then
  echo "ERROR: PROMOGEST_BACKUP_OFFSITE_DIR is required so that a second copy survives loss of this host." >&2
  echo "Configure an independent mounted target, or set PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY=1 to acknowledge a single-copy risk." >&2
  exit 1
fi

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
tar_tmp=""
cms_tmp=""

restart_service_if_needed() {
  if [[ "$service_was_running" -eq 1 ]]; then
    echo "Restarting $SERVICE_NAME now that the snapshot is sealed..."
    if ! systemctl start "$SERVICE_NAME"; then
      echo "ERROR: The sealed backup was retained, but $SERVICE_NAME could not be restarted. Check systemd immediately." >&2
      exit 1
    fi
    service_was_running=0
  fi
}

prune_backups() {
  local directory="$1"
  local -a artifacts=()
  mapfile -t artifacts < <(
    find "$directory" -maxdepth 1 -type f \
      \( -name 'promogest_backup_*.tar.gz.cms' -o -name 'promogest_backup_*.tar.gz' \) \
      -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-
  )
  local total="${#artifacts[@]}"
  (( total > RETENTION_MIN_KEEP )) || return 0
  local index path_name
  for (( index=RETENTION_MIN_KEEP; index<total; index++ )); do
    path_name="${artifacts[$index]}"
    [[ -f "$path_name" ]] || continue
    if [[ -n "$(find "$path_name" -maxdepth 0 -mtime +"$RETENTION_DAYS" -print -quit)" ]]; then
      echo "Pruning expired backup artifact: $(basename "$path_name")"
      rm -f -- "$path_name" "$path_name.sha256"
    fi
  done
}

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
  [[ -n "$tar_tmp" ]] && rm -f -- "$tar_tmp"
  [[ -n "$cms_tmp" ]] && rm -f -- "$cms_tmp"
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

echo "[4/7] Verifying all four archive components and writing the SHA-256 manifest..."
(
  cd "$bundle_dir"
  sha256sum database.dump storage.tar.gz dataprotection-keys.tar.gz config-sanitized.tar.gz > manifest.sha256
  sha256sum -c manifest.sha256
)
chmod 0600 "$bundle_dir"/*
chmod 0700 "$bundle_dir"
# From this point on the snapshot is complete and self-verifying: a later failure
# (encryption, offsite copy, retention) must never delete it.
backup_completed=1

restart_service_if_needed

echo "[5/7] Packaging the sealed bundle and preparing the encrypted artifact..."
artifact_name="promogest_backup_$timestamp.tar.gz"
artifact_path="$BACKUP_ROOT/$artifact_name"
tar_tmp="$BACKUP_ROOT/.promogest-backup-$timestamp.tar.gz.partial"
cms_tmp="$BACKUP_ROOT/.promogest-backup-$timestamp.tar.gz.cms.partial"
tar -czf "$tar_tmp" -C "$BACKUP_ROOT" "$(basename "$bundle_dir")"
chmod 0600 "$tar_tmp"

if [[ "$BACKUP_ENCRYPTION" == "required" ]]; then
  distributed_path="$artifact_path.cms"
  openssl cms -encrypt -binary -aes-256-cbc -outform DER \
    -in "$tar_tmp" -out "$cms_tmp" -recip "$RECIPIENT_CERT"
  # Structural check only: the private key deliberately does not exist on this host,
  # so decryptability is proven by the restore drill on the operator workstation.
  openssl cms -cmsout -inform DER -in "$cms_tmp" -out /dev/null
  mv -f -- "$cms_tmp" "$distributed_path"
  rm -f -- "$tar_tmp"
else
  distributed_path="$artifact_path"
  mv -f -- "$tar_tmp" "$distributed_path"
fi
chmod 0600 "$distributed_path"
(cd "$BACKUP_ROOT" && sha256sum "$(basename "$distributed_path")" > "$(basename "$distributed_path").sha256")
chmod 0600 "$distributed_path.sha256"

if [[ -n "$OFFSITE_DIR" ]]; then
  echo "[6/7] Copying the artifact to the independent offsite target..."
  install -m 0600 "$distributed_path" "$OFFSITE_DIR/"
  install -m 0600 "$distributed_path.sha256" "$OFFSITE_DIR/"
  (cd "$OFFSITE_DIR" && sha256sum -c "$(basename "$distributed_path").sha256")
else
  echo "[6/7] Offsite copy explicitly disabled (PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY=1); a single copy exists on this host."
fi

echo "[7/7] Applying the retention policy (${RETENTION_DAYS} days, minimum ${RETENTION_MIN_KEEP} newest kept)..."
prune_backups "$BACKUP_ROOT"
if [[ -n "$OFFSITE_DIR" ]]; then
  prune_backups "$OFFSITE_DIR"
fi

if [[ "$KEEP_PLAINTEXT" == "1" ]]; then
  echo "WARNING: Keeping the unencrypted bundle directory because PROMOGEST_BACKUP_KEEP_PLAINTEXT=1 (test/diagnostic only): $bundle_dir" >&2
else
  rm -rf -- "$bundle_dir"
fi

echo "Backup artifact created: $distributed_path"
if [[ -n "$OFFSITE_DIR" ]]; then
  echo "Offsite copy verified: $OFFSITE_DIR/$(basename "$distributed_path")"
fi
echo "The service was restarted before encryption. Run the restore drill (verify-backup-restore.sh) with the private key before relying on this backup."
