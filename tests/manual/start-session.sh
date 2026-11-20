#!/usr/bin/env bash
# From the extracted phase0-manual-linux-x64 kit; never connects to an existing database.
set -euo pipefail
umask 077
case ${1:-} in ar-desktop|fr-desktop|ar-mobile|fr-mobile) ;; *) echo 'Usage: bash start-session.sh {ar-desktop|fr-desktop|ar-mobile|fr-mobile}' >&2; exit 2;; esac
kit=$(cd "$(dirname "$0")" && pwd)
[[ $(uname -sm) == 'Linux x86_64' && -x "$kit/api/PromoGest.Api" && -s "$kit/api/wwwroot/index.html" ]] || { echo 'Use the extracted Linux x64 manual kit.' >&2; exit 1; }
# Only the local Unix socket: remote Docker endpoints are not test targets.
unset DOCKER_HOST DOCKER_CONTEXT
endpoint=$(docker context inspect --format '{{.Endpoints.docker.Host}}')
[[ $endpoint == unix://* ]] || { echo 'A local Docker Engine is required.' >&2; exit 1; }
work=$(mktemp -d); db=''; pid=''
cleanup() {
  if [[ -n $pid ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
  if [[ -n $db ]]; then docker rm -fv "$db" >/dev/null; fi
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP
owner=$(openssl rand -hex 24); app=$(openssl rand -hex 24)
# Publish to a dynamically allocated loopback port. PG18 data stays in RAM.
db=$(docker run -d --label promogest.role=manual-p0 --tmpfs /var/lib/postgresql \
  -e POSTGRES_PASSWORD="$(openssl rand -hex 32)" -p 127.0.0.1::5432 postgres:18-alpine)
for ((i=0; i<60; i++)); do
  # TCP is not listening during the image's temporary init server.
  if docker exec "$db" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$db" psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d "$1"; }
sql postgres <<SQL
CREATE ROLE p0_owner LOGIN PASSWORD '$owner';
CREATE ROLE p0_app LOGIN PASSWORD '$app';
CREATE DATABASE p0_manual OWNER p0_owner;
SQL
sql p0_manual <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO p0_app;
ALTER DEFAULT PRIVILEGES FOR ROLE p0_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO p0_app;
ALTER DEFAULT PRIVILEGES FOR ROLE p0_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO p0_app;
SQL
addr=$(docker port "$db" 5432/tcp); [[ $addr =~ ^127\.0\.0\.1:([0-9]+)$ ]]
conn="Host=127.0.0.1;Port=${BASH_REMATCH[1]};Database=p0_manual"
cd "$kit/api"
# Do not inherit production/cloud/bootstrap settings. Store keys/logs/files outside the kit.
clean=(env -i "PATH=$PATH" "HOME=$work" ASPNETCORE_ENVIRONMENT=Development "Storage__RootDirectory=$work/storage")
"${clean[@]}" "PROMOGEST_MIGRATE_DB_CONNECTION=$conn;Username=p0_owner;Password=$owner" ./PromoGest.Api --migrate >"$work/migrate.log"
counts() { sql p0_manual <<'SQL'
SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users),
       (SELECT count(*) FROM user_roles u JOIN roles r ON r.id=u.role_id WHERE r.code='SYSTEM_ADMIN');
SQL
}
[[ $(counts) == '0|0|0' ]]
"${clean[@]}" "ConnectionStrings__DefaultConnection=$conn;Username=p0_app;Password=$app" \
  ./PromoGest.Api --urls http://127.0.0.1:0 >"$work/api.log" 2>&1 & pid=$!
url=''
for ((i=0; i<60; i++)); do
  kill -0 "$pid" || { echo 'API startup failed.' >&2; exit 1; }
  url=$(sed -nE 's/.*Now listening on: (http:\/\/127\.0\.0\.1:[0-9]+).*/\1/p' "$work/api.log" | head -1)
  if [[ -n $url ]] && curl -fsS "$url/api/setup/status" >"$work/status.json"; then break; fi
  sleep 1
done
python3 -c 'import json,sys; sys.exit(json.load(open(sys.argv[1]))["isInitialized"] is not False)' "$work/status.json"
curl -fsS "$url/" | grep -qi '<!doctype html>'
printf 'Profile: %s | build: %s\nOpen on this machine: %s\nCounts: 0|0|0\n' "$1" "$(cat "$kit/BUILD_SHA")" "$url"
echo 'Use fictional data only. Enter counts to check the DB, or quit to destroy this session.'
while IFS= read -r cmd; do
  case $cmd in counts) printf 'Counts: %s\n' "$(counts)";; quit) break;; *) echo 'Commands: counts, quit';; esac
done
