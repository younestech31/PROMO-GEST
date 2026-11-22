#!/usr/bin/env bash
set -Eeuo pipefail

# Backup freshness assertion for the local-first PROMO GEST server.
#
# A backup job that fails silently is indistinguishable from no backup at all: the
# first time anyone notices is during a restore. This check answers one question on
# a schedule: "is there a verifiable artefact from the last N hours, locally and
# offsite?" Run it from a systemd timer; a non-zero exit marks the unit failed and
# shows up in `systemctl --failed` / journal monitoring.
#
# Environment contract:
#   PROMOGEST_BACKUP_ROOT=<dir>                     (default /var/backups/promogest)
#   PROMOGEST_BACKUP_OFFSITE_DIR=<dir>              (optional; required when MIN_OFFSITE > 0)
#   PROMOGEST_BACKUP_MAX_AGE_HOURS=26               (allowed 1..720)
#   PROMOGEST_BACKUP_MIN_OFFSITE_COPIES=1           (allowed 0..30)

BACKUP_ROOT="${PROMOGEST_BACKUP_ROOT:-/var/backups/promogest}"
OFFSITE_DIR="${PROMOGEST_BACKUP_OFFSITE_DIR:-}"
MAX_AGE_HOURS="${PROMOGEST_BACKUP_MAX_AGE_HOURS:-26}"
MIN_OFFSITE_COPIES="${PROMOGEST_BACKUP_MIN_OFFSITE_COPIES:-1}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ "$MAX_AGE_HOURS" =~ ^[0-9]+$ ]] && (( MAX_AGE_HOURS >= 1 && MAX_AGE_HOURS <= 720 )) ||
  fail "PROMOGEST_BACKUP_MAX_AGE_HOURS must be an integer between 1 and 720 (got '$MAX_AGE_HOURS')."
[[ "$MIN_OFFSITE_COPIES" =~ ^[0-9]+$ ]] && (( MIN_OFFSITE_COPIES >= 0 && MIN_OFFSITE_COPIES <= 30 )) ||
  fail "PROMOGEST_BACKUP_MIN_OFFSITE_COPIES must be an integer between 0 and 30 (got '$MIN_OFFSITE_COPIES')."
[[ -d "$BACKUP_ROOT" ]] || fail "Backup root does not exist: $BACKUP_ROOT"

newest_artifact() {
  local directory="$1"
  local newest=""
  if [[ -d "$directory" ]]; then
    newest="$(find "$directory" -maxdepth 1 -type f \
      \( -name 'promogest_backup_*.tar.gz.cms' -o -name 'promogest_backup_*.tar.gz' \) \
      -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  fi
  printf '%s' "$newest"
}

verify_artifact() {
  local artifact="$1"
  local label="$2"
  local directory
  directory="$(dirname "$artifact")"
  local filename
  filename="$(basename "$artifact")"
  local sidecar="$artifact.sha256"

  [[ -f "$sidecar" ]] || fail "$label artifact has no SHA-256 sidecar: $filename"
  ( cd "$directory" && sha256sum -c --status "$filename.sha256" ) ||
    fail "$label artifact failed SHA-256 verification: $filename"

  local modified now age_seconds
  modified="$(stat -c '%Y' "$artifact")"
  now="$(date +%s)"
  age_seconds=$(( now - modified ))
  (( age_seconds >= 0 )) || age_seconds=0
  local age_hours
  age_hours=$(( age_seconds / 3600 ))
  if (( age_seconds > MAX_AGE_HOURS * 3600 )); then
    fail "$label backup is stale: $filename is ${age_hours}h old (limit ${MAX_AGE_HOURS}h)."
  fi
  echo "OK: $label backup $filename is ${age_hours}h old and matches its sidecar."
}

local_artifact="$(newest_artifact "$BACKUP_ROOT")"
[[ -n "$local_artifact" ]] || fail "No PROMO GEST backup artefact found in $BACKUP_ROOT."
verify_artifact "$local_artifact" "Local"

if [[ -n "$OFFSITE_DIR" ]]; then
  [[ -d "$OFFSITE_DIR" ]] || fail "Offsite directory does not exist: $OFFSITE_DIR"
  offsite_artifact="$(newest_artifact "$OFFSITE_DIR")"
  [[ -n "$offsite_artifact" ]] || fail "No PROMO GEST backup artefact found in $OFFSITE_DIR."
  verify_artifact "$offsite_artifact" "Offsite"
else
  if (( MIN_OFFSITE_COPIES > 0 )); then
    fail "PROMOGEST_BACKUP_OFFSITE_DIR is not configured but ${MIN_OFFSITE_COPIES} offsite copies are required."
  fi
  echo "WARNING: no offsite directory configured; only a local copy was verified." >&2
fi

echo "Backup freshness verified (limit ${MAX_AGE_HOURS}h, minimum offsite copies ${MIN_OFFSITE_COPIES})."
