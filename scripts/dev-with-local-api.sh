#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export PATH="$HOME/.dotnet:$PATH"

API_PORT="${PROMOGEST_AI_STUDIO_API_PORT:-5055}"
API_PROJECT="$ROOT_DIR/src/PromoGest.Api/PromoGest.Api.csproj"
API_DLL="$ROOT_DIR/src/PromoGest.Api/bin/Debug/net10.0/PromoGest.Api.dll"
API_LOG="/tmp/promogest-api-dev.log"
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

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required to verify the ASP.NET Core API before starting Vite." >&2
  exit 1
fi

# Resolve Vite's effective development environment so a target in .env is
# treated exactly like an exported ASPNETCORE_URL value.
CONFIGURED_API_URL="$(node --input-type=module -e 'import { loadEnv } from "vite"; const env = loadEnv("development", process.cwd(), ""); process.stdout.write((process.env.ASPNETCORE_URL || env.ASPNETCORE_URL || "").trim());')"
CONFIGURED_VITE_ONLY="$(node --input-type=module -e 'import { loadEnv } from "vite"; const env = loadEnv("development", process.cwd(), ""); process.stdout.write((process.env.PROMOGEST_VITE_ONLY ?? env.PROMOGEST_VITE_ONLY ?? "").trim());')"

is_loopback_api_url() {
  local host_part
  host_part="${1#http://}"
  host_part="${host_part#https://}"
  case "$host_part" in
    127.0.0.1:*|localhost:*|127.0.0.1/*|localhost/*|127.0.0.1|localhost)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

api_is_live() {
  curl --silent --show-error --fail --connect-timeout 2 --max-time 4 \
    "${API_URL%/}/health/live" >/dev/null 2>&1
}

api_is_ready() {
  curl --silent --show-error --fail --connect-timeout 2 --max-time 4 \
    "${API_URL%/}/health/ready" >/dev/null 2>&1
}

API_STARTUP_WAIT_SECONDS="${PROMOGEST_API_STARTUP_WAIT_SECONDS:-60}"
SQL_SOCKET_WAIT_SECONDS="${PROMOGEST_SQL_SOCKET_WAIT_SECONDS:-60}"
if [[ ! "$API_STARTUP_WAIT_SECONDS" =~ ^[1-9][0-9]*$ ]] || [[ ! "$SQL_SOCKET_WAIT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: API and SQL socket startup wait settings must be positive whole seconds." >&2
  exit 1
fi

SQL_ENV_PRESENT=false
for variable in SQL_HOST SQL_DB_NAME SQL_USER SQL_PASSWORD SQL_ADMIN_USER SQL_ADMIN_PASSWORD; do
  if [[ -n "${!variable:-}" ]]; then
    SQL_ENV_PRESENT=true
  fi
done

if [[ "${PROMOGEST_VITE_ONLY:-$CONFIGURED_VITE_ONLY}" == "1" ]]; then
  # Explicit frontend-only mode. Vite config also honors this flag and will
  # use the in-memory development simulator rather than proxying a dead API.
  export PROMOGEST_VITE_ONLY=1
  echo "Starting explicit Vite-only demo mode; no ASP.NET Core API or persistent database is used."
elif [[ -n "$CONFIGURED_API_URL" || "$SQL_ENV_PRESENT" == true ]]; then
  API_URL="${CONFIGURED_API_URL:-http://127.0.0.1:$API_PORT}"
  API_URL="${API_URL%/}"

  # The default AI Studio command is `npm run dev`. When it targets the local
  # ASP.NET Core API with Cloud SQL configured, prepare the database here too:
  # apply pending migrations with the separate admin identity and re-apply the
  # restricted runtime grants before the API can report ready.
  if [[ "$SQL_ENV_PRESENT" == true ]] && is_loopback_api_url "$API_URL"; then
    if [[ "${PROMOGEST_CLOUDSQL_MIGRATIONS_APPLIED:-}" == "1" ]]; then
      echo "Cloud SQL migrations and runtime grants were already applied by the dedicated runner."
    else
      missing_sql_vars=()
      for variable in SQL_HOST SQL_DB_NAME SQL_USER SQL_PASSWORD SQL_ADMIN_USER SQL_ADMIN_PASSWORD; do
        if [[ -z "${!variable:-}" ]]; then
          missing_sql_vars+=("$variable")
        fi
      done
      if [[ "${#missing_sql_vars[@]}" -gt 0 ]]; then
        echo "ERROR: Cloud SQL development configuration is incomplete. Missing: ${missing_sql_vars[*]}." >&2
        echo "The real API requires both the runtime identity and the separate migration identity." >&2
        exit 1
      fi

      if [[ ! -S "$SQL_HOST/.s.PGSQL.5432" ]]; then
        echo "Waiting up to $SQL_SOCKET_WAIT_SECONDS seconds for the Google AI Studio Cloud SQL socket..."
        socket_ready=false
        for _ in $(seq 1 "$SQL_SOCKET_WAIT_SECONDS"); do
          if [[ -S "$SQL_HOST/.s.PGSQL.5432" ]]; then
            socket_ready=true
            break
          fi
          sleep 1
        done
        if [[ "$socket_ready" != true ]]; then
          echo "ERROR: Cloud SQL socket did not become available. Vite was not started." >&2
          exit 1
        fi
      fi

      source "$ROOT_DIR/scripts/ensure-dotnet10.sh"
      promogest_ensure_dotnet10

      echo "Applying pending Cloud SQL migrations and least-privilege runtime grants..."
      ASPNETCORE_ENVIRONMENT=Development \
      DOTNET_ENVIRONMENT=Development \
        dotnet run --project "$API_PROJECT" --configuration Debug --no-launch-profile -- --migrate
      export PROMOGEST_CLOUDSQL_MIGRATIONS_APPLIED=1
      echo "Cloud SQL schema and runtime grants are ready."
    fi
  fi

  if api_is_ready; then
    echo "ASP.NET Core API is already ready at the configured target."
  elif is_loopback_api_url "$API_URL"; then
    # A loopback proxy target must be backed by a live API process started by
    # this launcher. Never start Vite in proxy mode while that process is absent.
    if ! api_is_live; then
      source "$ROOT_DIR/scripts/ensure-dotnet10.sh"
      promogest_ensure_dotnet10

      if [[ ! -s "$API_DLL" ]]; then
        echo "Building the ASP.NET Core API..."
        dotnet build "$API_PROJECT" --configuration Debug
      fi

      : > "$API_LOG"
      echo "Starting ASP.NET Core API at $API_URL..."
      ASPNETCORE_ENVIRONMENT=Development \
      DOTNET_ENVIRONMENT=Development \
      ASPNETCORE_URLS="$API_URL" \
        dotnet "$API_DLL" >"$API_LOG" 2>&1 &
      API_PID=$!
    else
      echo "ASP.NET Core is live but not ready; waiting for database-backed readiness without starting a duplicate API process."
    fi
  else
    echo "Configured ASP.NET Core target is external; checking its readiness before starting Vite."
  fi

  api_ready=false
  for _ in $(seq 1 "$API_STARTUP_WAIT_SECONDS"); do
    if api_is_ready; then
      api_ready=true
      break
    fi
    if [[ -n "$API_PID" ]] && ! kill -0 "$API_PID" 2>/dev/null; then
      echo "ERROR: PromoGest.Api exited before becoming ready. Recent backend log:" >&2
      tail -n 100 "$API_LOG" >&2 || true
      exit 1
    fi
    sleep 1
  done

  if [[ "$api_ready" != true ]]; then
    echo "ERROR: ASP.NET Core did not pass /health/ready within $API_STARTUP_WAIT_SECONDS seconds. Vite was not started." >&2
    if [[ -n "$API_PID" ]]; then
      tail -n 100 "$API_LOG" >&2 || true
    fi
    exit 1
  fi

  # This export is essential: Vite must use the same API target that this
  # launcher has actually verified, including the default loopback target.
  export ASPNETCORE_URL="$API_URL"
  export PROMOGEST_VITE_ONLY=0
  echo "API readiness verified. Starting React UI with /api and /health proxy to $API_URL."
else
  # No API target and no database integration were requested: choose the
  # simulator deliberately instead of inheriting an unrelated loopback URL.
  export PROMOGEST_VITE_ONLY=1
  echo "No API target or Cloud SQL integration configured; starting explicit Vite-only demo mode."
fi

if [[ ! -x "$ROOT_DIR/node_modules/.bin/vite" ]]; then
  echo "ERROR: Vite is not installed. Run npm ci --no-audit --no-fund first." >&2
  exit 1
fi

"$ROOT_DIR/node_modules/.bin/vite" --port=3000 --host=0.0.0.0 "$@" &
VITE_PID=$!

# If this launcher owns the API process and it exits unexpectedly, stop the
# proxy server too. The host supervisor can then restart the complete stack;
# we never leave a healthy-looking Vite shell proxying to a dead child process.
if [[ -n "$API_PID" ]]; then
  while kill -0 "$VITE_PID" 2>/dev/null; do
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "ERROR: PromoGest.Api stopped while Vite was running. Recent backend log:" >&2
      tail -n 100 "$API_LOG" >&2 || true
      kill "$VITE_PID" 2>/dev/null || true
      wait "$VITE_PID" 2>/dev/null || true
      exit 1
    fi
    sleep 2
  done
fi

wait "$VITE_PID"
