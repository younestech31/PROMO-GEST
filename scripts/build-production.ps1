$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$WebDir = Join-Path $RootDir "apps\local-web"
$WwwrootDir = Join-Path $RootDir "src\PromoGest.Api\wwwroot"
$PublishDir = Join-Path $RootDir "artifacts\publish"

Write-Host "[1/4] Building React production frontend (monorepo root)..."
Push-Location $RootDir
try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw "npm run lint failed" }
    npm run test
    if ($LASTEXITCODE -ne 0) { throw "npm run test failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
} finally {
    Pop-Location
}

Write-Host "[2/4] Copying compiled React static files into ASP.NET Core wwwroot..."
Get-ChildItem -Path $WwwrootDir -Exclude ".gitkeep" | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $WebDir "dist\*") -Destination $WwwrootDir -Recurse -Force

Write-Host "[3/4] Running .NET unit tests..."
Push-Location $RootDir
try {
    dotnet test src\PromoGest.sln --filter "FullyQualifiedName~Domain.Tests|FullyQualifiedName~Application.Tests" --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "dotnet test failed" }
    Write-Host "[4/4] Publishing ASP.NET Core 10 application..."
    dotnet publish src\PromoGest.Api\PromoGest.Api.csproj --configuration Release --runtime win-x64 --self-contained true --output $PublishDir
    if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }
} finally {
    Pop-Location
}

Write-Host "Production bundle ready at $PublishDir. Zero Node.js runtime dependency."
