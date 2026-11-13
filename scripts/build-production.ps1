$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$WebDir = Join-Path $RootDir "apps\local-web"
$WwwrootDir = Join-Path $RootDir "src\PromoGest.Api\wwwroot"
$PublishDir = Join-Path $RootDir "artifacts\publish"

Write-Host "[1/4] Building React production frontend (monorepo root)..."
Push-Location $RootDir
try {
    npm ci --no-audit --no-fund
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

Write-Host "[2/4] Verifying and copying compiled React static files into ASP.NET Core wwwroot..."
$DistDir = Join-Path $WebDir "dist"
if (-not (Test-Path (Join-Path $DistDir "index.html") -PathType Leaf)) { throw "Frontend dist/index.html is missing." }
if (-not (Get-ChildItem -Path $DistDir -Recurse -File | Where-Object { $_.Extension -in @(".js", ".css") })) { throw "Frontend dist has no JS or CSS assets." }
New-Item -ItemType Directory -Force -Path $WwwrootDir | Out-Null
Get-ChildItem -Path $WwwrootDir -Exclude ".gitkeep" | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $DistDir "*") -Destination $WwwrootDir -Recurse -Force
if (-not (Test-Path (Join-Path $WwwrootDir "index.html") -PathType Leaf)) { throw "ASP.NET Core wwwroot/index.html was not copied." }

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
