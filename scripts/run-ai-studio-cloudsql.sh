#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PROJECT="$ROOT_DIR/src/PromoGest.Api/PromoGest.Api.csproj"
API_PORT="${PROMOGEST_AI_STUDIO_API_PORT:-5055}"
API_URL="http://127.0.0.1:${API_PORT}"
API_LOG="$(mktemp "${TMPDIR:-/tmp}/promogest-cloudsql-api.XXXXXX.log")"
API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  rm -f "$API_LOG"
}
trap cleanup EXIT INT TERM

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "ERROR: the AI Studio Cloud SQL Unix socket runner requires Linux." >&2
  exit 1
fi

for variable in SQL_HOST SQL_DB_NAME SQL_USER SQL_PASSWORD SQL_ADMIN_USER SQL_ADMIN_PASSWORD; do
  if [[ -z "${!variable:-}" ]]; then
    echo "ERROR: required Google AI Studio Cloud SQL variable $variable is missing." >&2
    exit 1
  fi
done

if ! command -v dotnet >/dev/null 2>&1; then
  echo "ERROR: .NET 10 SDK is not installed in this AI Studio container." >&2
  echo "Install it with the official dotnet-install.sh script; see docs/GOOGLE-AI-STUDIO-CLOUD-SQL.md." >&2
  exit 127
fi

DOTNET_SDK_VERSION="$(dotnet --version)"
if [[ "$DOTNET_SDK_VERSION" != 10.* ]]; then
  echo "ERROR: PROMO GEST requires the .NET 10 SDK; detected $DOTNET_SDK_VERSION." >&2
  exit 1
fi

if [[ ! -S "$SQL_HOST/.s.PGSQL.5432" ]]; then
  echo "ERROR: Cloud SQL Unix socket is not active at SQL_HOST/.s.PGSQL.5432." >&2
  echo "Check the Cloud SQL & Auth integration status in Google AI Studio." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required for the local API readiness check." >&2
  exit 1
fi

export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_ENVIRONMENT=Development
export ASPNETCORE_URLS="$API_URL"
export ASPNETCORE_URL="$API_URL"

cd "$ROOT_DIR"

if [[ ! -x "$ROOT_DIR/node_modules/.bin/vite" ]]; then
  echo "[1/4] Installing locked frontend dependencies..."
  npm ci --no-audit --no-fund
fi

echo "[2/4] Applying EF Core migrations with the Cloud SQL migration identity..."
dotnet run --project "$API_PROJECT" --configuration Debug --no-launch-profile -- --migrate

echo "[3/4] Starting ASP.NET Core with the restricted runtime identity..."
dotnet run --project "$API_PROJECT" --configuration Debug --no-build --no-launch-profile >"$API_LOG" 2>&1 &
API_PID=$!

ready=false
for attempt in $(seq 1 40); do
  if curl --silent --show-error --fail "$API_URL/health/ready" >/dev/null 2>&1; then
    ready=true
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "ERROR: ASP.NET Core did not become ready. Recent backend log:" >&2
  tail -n 80 "$API_LOG" >&2 || true
  exit 1
fi

echo "[4/4] Starting the React UI; Vite proxies /api and /health to $API_URL."
echo "Cloud SQL credentials are not printed. Use fictional test data only."
npm run dev
