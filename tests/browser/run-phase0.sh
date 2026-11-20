#!/usr/bin/env bash
# Only run on the isolated GitHub Actions PostgreSQL service. Never reset/reuse a DB.
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true ]]
export PGHOST=127.0.0.1 PGPORT=5432
api="$PWD/artifacts/linux-x64"
cd "$api"
for lang in ar fr; do
  for device in desktop mobile; do (
    export PGDATABASE="p0_${lang}_${device}"
    PGPASSWORD=postgres_password createdb -U postgres -O promogest_owner "$PGDATABASE"
    export PGPASSWORD=owner_pass PGUSER=promogest_owner
    psql -X -v ON_ERROR_STOP=1 <<'SQL'
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO promogest_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO promogest_app;
SQL
    export ASPNETCORE_ENVIRONMENT=Development
    PROMOGEST_MIGRATE_DB_CONNECTION="Host=$PGHOST;Database=$PGDATABASE;Username=$PGUSER;Password=$PGPASSWORD" ./PromoGest.Api --migrate
    export PGUSER=promogest_app PGPASSWORD=app_pass
    ConnectionStrings__DefaultConnection="Host=$PGHOST;Database=$PGDATABASE;Username=$PGUSER;Password=$PGPASSWORD" \
      ./PromoGest.Api --urls http://127.0.0.1:5173 > "$RUNNER_TEMP/p0-api.log" 2>&1 &
    pid=$!
    trap 'kill "$pid" 2>/dev/null || true; wait "$pid" || true' EXIT
    curl --silent --fail --retry 25 --retry-connrefused --retry-delay 1 http://127.0.0.1:5173/api/setup/status >/dev/null
    python3 "$GITHUB_WORKSPACE/tests/browser/phase0.py" "$lang" "$device"
  ); done
done
