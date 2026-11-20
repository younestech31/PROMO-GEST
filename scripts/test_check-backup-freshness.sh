#!/usr/bin/env bash
set -Eeuo pipefail

# Behavioural tests for scripts/check-backup-freshness.sh.
# They build synthetic, correctly-hashed artefacts and assert the exit codes and
# messages the monitoring unit depends on.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="${SCRIPT_DIR}/check-backup-freshness.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

checks=0
failures=0

report() {
  local status="$1" name="$2"
  checks=$((checks + 1))
  if [[ "$status" == "ok" ]]; then
    echo "ok $checks - $name"
  else
    echo "not ok $checks - $name"
    failures=$((failures + 1))
  fi
}

make_artifact() {
  local directory="$1" name="$2"
  mkdir -p "$directory"
  printf 'backup payload %s\n' "$name" > "$directory/$name"
  ( cd "$directory" && sha256sum "$name" > "$name.sha256" )
}

expect_pass() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then report ok "$name"; else report fail "$name"; fi
}

expect_failure() {
  local name="$1" pattern="$2"
  shift 2
  local output status=0
  output="$("$@" 2>&1)" || status=$?
  if (( status != 0 )) && grep -q -- "$pattern" <<<"$output"; then
    report ok "$name"
  else
    echo "  exit=$status output=$output" >&2
    report fail "$name"
  fi
}

fresh_root="$WORK/fresh-root"
fresh_offsite="$WORK/fresh-offsite"
make_artifact "$fresh_root" "promogest_backup_20261120_220000.tar.gz.cms"
make_artifact "$fresh_offsite" "promogest_backup_20261120_220000.tar.gz.cms"

expect_pass "a fresh local and offsite artefact passes" \
  env PROMOGEST_BACKUP_ROOT="$fresh_root" PROMOGEST_BACKUP_OFFSITE_DIR="$fresh_offsite" \
  "$CHECK"

expect_pass "an explicitly local-only deployment is allowed when no offsite copy is required" \
  env PROMOGEST_BACKUP_ROOT="$fresh_root" PROMOGEST_BACKUP_MIN_OFFSITE_COPIES=0 "$CHECK"

expect_failure "a missing offsite directory fails when a copy is required" "offsite copies are required" \
  env PROMOGEST_BACKUP_ROOT="$fresh_root" PROMOGEST_BACKUP_MIN_OFFSITE_COPIES=1 "$CHECK"

stale_root="$WORK/stale-root"
make_artifact "$stale_root" "promogest_backup_20261101_220000.tar.gz.cms"
touch -d '3 days ago' "$stale_root/promogest_backup_20261101_220000.tar.gz.cms"

expect_failure "a stale artefact fails the freshness window" "is stale" \
  env PROMOGEST_BACKUP_ROOT="$stale_root" PROMOGEST_BACKUP_OFFSITE_DIR="$stale_root" "$CHECK"

corrupt_root="$WORK/corrupt-root"
make_artifact "$corrupt_root" "promogest_backup_20261120_220000.tar.gz.cms"
printf 'tampered\n' >> "$corrupt_root/promogest_backup_20261120_220000.tar.gz.cms"

expect_failure "a tampered artefact fails sidecar verification" "failed SHA-256 verification" \
  env PROMOGEST_BACKUP_ROOT="$corrupt_root" PROMOGEST_BACKUP_OFFSITE_DIR="$corrupt_root" "$CHECK"

no_sidecar_root="$WORK/no-sidecar-root"
make_artifact "$no_sidecar_root" "promogest_backup_20261120_220000.tar.gz.cms"
rm -f "$no_sidecar_root/promogest_backup_20261120_220000.tar.gz.cms.sha256"

expect_failure "an artefact without a sidecar is rejected" "no SHA-256 sidecar" \
  env PROMOGEST_BACKUP_ROOT="$no_sidecar_root" PROMOGEST_BACKUP_OFFSITE_DIR="$no_sidecar_root" "$CHECK"

empty_root="$WORK/empty-root"
mkdir -p "$empty_root"

expect_failure "an empty backup root is rejected" "No PROMO GEST backup artefact" \
  env PROMOGEST_BACKUP_ROOT="$empty_root" PROMOGEST_BACKUP_MIN_OFFSITE_COPIES=0 "$CHECK"

expect_failure "an out-of-range freshness window is rejected" "MAX_AGE_HOURS must be an integer" \
  env PROMOGEST_BACKUP_ROOT="$fresh_root" PROMOGEST_BACKUP_MAX_AGE_HOURS=0 "$CHECK"

mixed_root="$WORK/mixed-root"
make_artifact "$mixed_root" "promogest_backup_20261101_220000.tar.gz"
touch -d '5 days ago' "$mixed_root/promogest_backup_20261101_220000.tar.gz"
make_artifact "$mixed_root" "promogest_backup_20261120_221500.tar.gz"
# The newest artefact wins even when an older, stale one is still inside retention.
expect_pass "the newest artefact decides freshness, not an older retained one" \
  env PROMOGEST_BACKUP_ROOT="$mixed_root" PROMOGEST_BACKUP_MIN_OFFSITE_COPIES=0 "$CHECK"

if (( failures > 0 )); then
  echo "FAILED: $failures of $checks backup freshness checks failed." >&2
  exit 1
fi

echo "All $checks backup freshness checks passed."
