#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.dotnet:$PATH"

API_PORT="${PROMOGEST_AI_STUDIO_API_PORT:-5055}"
API_URL="${ASPNETCORE_URL:-http://127.0.0.1:${API_PORT}}"
API_PROJECT="$ROOT_DIR/src/PromoGest.Api/PromoGest.Api.csproj"
API_DLL="$ROOT_DIR/src/PromoGest.Api/bin/Debug/net10.0/PromoGest.Api.dll"

API_PID=""
VITE_PID=""

cleanup() {
  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
    wait "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

should_start_cloudsql_api() {
  [[ "${PROMOGEST_VITE_ONLY:-0}" != "1" ]] &&
  [[ -n "${SQL_HOST:-}" ]] &&
  [[ -n "${SQL_DB_NAME:-}" ]] &&
  [[ -n "${SQL_USER:-}" ]] &&
  [[ -n "${SQL_PASSWORD:-}" ]] &&
  command -v dotnet >/dev/null 2>&1
}

if should_start_cloudsql_api; then
  for _ in $(seq 1 15); do
    if [[ -S "$SQL_HOST/.s.PGSQL.5432" ]]; then
      break
    fi
    sleep 1
  done

  if [[ -S "$SQL_HOST/.s.PGSQL.5432" ]] && ! curl --silent --fail "$API_URL/health/ready" >/dev/null 2>&1; then
    if [[ ! -s "$API_DLL" ]]; then
      dotnet build "$API_PROJECT" --configuration Debug >/dev/null
    fi

    ASPNETCORE_ENVIRONMENT=Development \
    DOTNET_ENVIRONMENT=Development \
    ASPNETCORE_URLS="$API_URL" \
      dotnet "$API_DLL" >/tmp/promogest-api-dev.log 2>&1 &
    API_PID=$!

    for _ in $(seq 1 30); do
      if curl --silent --fail "$API_URL/health/ready" >/dev/null 2>&1; then
        break
      fi
      if ! kill -0 "$API_PID" 2>/dev/null; then
        echo "ERROR: PromoGest.Api exited during startup. Log:" >&2
        tail -n 40 /tmp/promogest-api-dev.log >&2 || true
        break
      fi
      sleep 1
    done
  fi
fi

"$ROOT_DIR/node_modules/.bin/vite" --port=3000 --host=0.0.0.0 "$@" &
VITE_PID=$!
wait "$VITE_PID"
