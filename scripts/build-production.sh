#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/local-web"
WWWROOT_DIR="$ROOT_DIR/src/PromoGest.Api/wwwroot"
PUBLISH_DIR="$ROOT_DIR/artifacts/publish"

echo "[1/4] Building React production frontend (monorepo root)..."
cd "$ROOT_DIR"
npm install --no-audit --no-fund
npm run lint
npm run test
npm run build

echo "[2/4] Copying compiled React static files into ASP.NET Core wwwroot..."
find "$WWWROOT_DIR" -mindepth 1 ! -name '.gitkeep' -exec rm -rf {} +
cp -R "$WEB_DIR/dist/"* "$WWWROOT_DIR/"

echo "[3/4] Running .NET unit tests..."
dotnet test src/PromoGest.sln --filter "FullyQualifiedName~Domain.Tests|FullyQualifiedName~Application.Tests" --configuration Release

echo "[4/4] Publishing self-contained ASP.NET Core 10 runtime..."
dotnet publish src/PromoGest.Api/PromoGest.Api.csproj --configuration Release --output "$PUBLISH_DIR"

echo "Production artifact ready at: $PUBLISH_DIR (no Node.js runtime required)."
