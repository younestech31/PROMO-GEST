#!/usr/bin/env bash
# Disposable Linux Production-mode HTTPS rehearsal only; never an organization target.
set -euo pipefail
umask 077
[[ ${GITHUB_ACTIONS:-} == true && -n ${RUNNER_TEMP:-} && -n ${GITHUB_WORKSPACE:-} ]]
[[ $(uname -sm) == 'Linux x86_64' ]]
for key in SQL_HOST SQL_DB_NAME SQL_USER SQL_PASSWORD ASPNETCORE_URL DOCKER_HOST DOCKER_CONTEXT; do
  [[ -z ${!key:-} ]] || { echo "Refusing inherited external configuration: $key" >&2; exit 2; }
done
[[ $(docker context inspect --format '{{.Endpoints.docker.Host}}') == unix://* ]]
api="$GITHUB_WORKSPACE/artifacts/linux-x64/PromoGest.Api"
[[ -x $api && -s $(dirname "$api")/wwwroot/index.html ]]
work=$(mktemp -d "$RUNNER_TEMP/staging.XXXXXXXX")
out="$RUNNER_TEMP/staging-evidence"
mkdir "$out"
pid=''; proxy=''
cleanup() {
  if [[ -n $pid ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
  if [[ -n $proxy ]]; then docker rm -fv "$proxy" >/dev/null; fi
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP
# These are generated fixture secrets, never echoed, committed or uploaded.
openssl rand -hex 24 > "$work/cert-password"
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$work/dp.key" -out "$work/dp.crt" \
  -days 1 -subj '/CN=PROMO GEST disposable staging DP' >/dev/null 2>&1
openssl pkcs12 -export -inkey "$work/dp.key" -in "$work/dp.crt" -out "$work/dp.pfx" \
  -passout "file:$work/cert-password" >/dev/null 2>&1
cat > "$work/Caddyfile" <<'CADDY'
{
  admin off
  auto_https disable_redirects
}
https://staging.promogest.test:8443 {
  bind 127.0.0.1
  tls internal
  reverse_proxy 127.0.0.1:5080 {
    header_up X-Forwarded-Proto {scheme}
    header_up X-Forwarded-For {remote_host}
  }
}
CADDY
# Isolated runner-local TLS proxy; not an external deployment or public listener.
proxy=$(docker run -d --network host --label promogest.role=disposable-staging \
  -v "$work/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10.2-alpine)
printf '127.0.0.1 staging.promogest.test\n' | sudo tee -a /etc/hosts >/dev/null
for ((i=0; i<40; i++)); do
  if docker cp "$proxy:/data/caddy/pki/authorities/local/root.crt" "$work/root.crt" 2>/dev/null; then break; fi
  sleep 1
done
[[ -s $work/root.crt ]]
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=promogest_app PGPASSWORD=app_pass
export STAGING_EVIDENCE_DIR="$out" STAGING_PRIVATE_DIR="$work"
export STAGING_BASE_URL='https://staging.promogest.test:8443'
export STAGING_PROXY_VERSION="$(docker exec "$proxy" caddy version)"
for lang in ar fr; do
  for device in desktop mobile; do
    export PGDATABASE="stg_${lang}_${device}"
    PGPASSWORD=postgres_password createdb -U postgres -O promogest_owner "$PGDATABASE"
    PGUSER=promogest_owner PGPASSWORD=owner_pass psql -X -v ON_ERROR_STOP=1 <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO promogest_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO promogest_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO promogest_app;
SQL
    profile="$lang-$device"
    mkdir "$work/$profile"
    export PROMOGEST_SETUP_TOKEN="$(openssl rand -hex 24)"
    clean=(env -i "PATH=$PATH" "HOME=$work" ASPNETCORE_ENVIRONMENT=Production DOTNET_ENVIRONMENT=Production
      "Storage__RootDirectory=$work/$profile/storage"
      "Security__DataProtectionKeyDirectory=$work/$profile/keys"
      "Security__DataProtectionCertificatePath=$work/dp.pfx"
      "PROMOGEST_DATA_PROTECTION_CERT_PASSWORD=$(cat "$work/cert-password")"
      "PROMOGEST_SETUP_TOKEN=$PROMOGEST_SETUP_TOKEN")
    "${clean[@]}" "PROMOGEST_MIGRATE_DB_CONNECTION=Host=127.0.0.1;Database=$PGDATABASE;Username=promogest_owner;Password=owner_pass" \
      "$api" --migrate > "$work/$profile/migrate.log" 2>&1
    start_api() {
      "${clean[@]}" "ConnectionStrings__DefaultConnection=Host=127.0.0.1;Database=$PGDATABASE;Username=promogest_app;Password=app_pass" \
        "$api" --urls http://127.0.0.1:5080 > "$work/$profile/api.log" 2>&1 &
      pid=$!
      curl --silent --fail --cacert "$work/root.crt" --retry 30 --retry-all-errors --retry-delay 1 \
        "$STAGING_BASE_URL/health/ready" > /dev/null
    }
    start_api
    python3 "$GITHUB_WORKSPACE/tests/browser/staging.py" "$lang" "$device" exercise
    kill "$pid"; wait "$pid" || true; pid=''
    # Same DB, files, certificate and encrypted key ring, but a new API process.
    [[ -n $(find "$work/$profile/keys" -name '*.xml' -print -quit) ]]
    grep -q 'encryptedSecret' "$work/$profile/keys/"*.xml
    export STAGING_DP_ENCRYPTED=true
    start_api
    python3 "$GITHUB_WORKSPACE/tests/browser/staging.py" "$lang" "$device" verify
    kill "$pid"; wait "$pid" || true; pid=''
    unset PROMOGEST_SETUP_TOKEN
  done
done
python3 "$GITHUB_WORKSPACE/scripts/export-staging-evidence.py" "$out"
