#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/local-web"
WWWROOT_DIR="$ROOT_DIR/src/PromoGest.Api/wwwroot"
PUBLISH_DIR="$ROOT_DIR/artifacts/publish"

echo "[1/4] Installing locked dependencies and building the React frontend..."
cd "$ROOT_DIR"
npm ci --no-audit --no-fund
npm run lint
npm test
npm run build

DIST_DIR="$WEB_DIR/dist"
if [[ ! -s "$DIST_DIR/index.html" ]]; then
  echo "ERROR: frontend build did not produce dist/index.html" >&2
  exit 1
fi
if ! find "$DIST_DIR" -type f \( -name '*.js' -o -name '*.css' \) -print -quit | grep -q .; then
  echo "ERROR: frontend build did not produce JavaScript or CSS assets" >&2
  exit 1
fi

echo "[2/4] Copying verified frontend assets into ASP.NET Core wwwroot..."
mkdir -p "$WWWROOT_DIR"
find "$WWWROOT_DIR" -mindepth 1 ! -name '.gitkeep' -exec rm -rf {} +
cp -R "$DIST_DIR/." "$WWWROOT_DIR/"
test -s "$WWWROOT_DIR/index.html"
if ! find "$WWWROOT_DIR" -type f \( -name '*.js' -o -name '*.css' \) -print -quit | grep -q .; then
  echo "ERROR: ASP.NET Core wwwroot is missing JavaScript or CSS assets" >&2
  exit 1
fi

echo "[3/4] Running .NET unit and integration tests..."
dotnet test src/PromoGest.sln --configuration Release

echo "[4/4] Publishing ASP.NET Core application..."
dotnet publish src/PromoGest.Api/PromoGest.Api.csproj --configuration Release --runtime linux-x64 --self-contained true --output "$PUBLISH_DIR"

echo "Production artifact ready at: $PUBLISH_DIR"
