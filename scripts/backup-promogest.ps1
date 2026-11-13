param(
    [string]$DatabaseName = "promogest",
    [string]$DatabaseHost = "127.0.0.1",
    [int]$DatabasePort = 5432,
    [string]$DatabaseUser = "promogest_owner",
    [string]$StorageDir = "C:\PromoGest\storage",
    [string]$DataProtectionDir = "C:\PromoGest\dataprotection-keys",
    [string]$AppConfigPath = "C:\PromoGest\app\appsettings.Production.json",
    [string]$CaddyfilePath = "C:\PromoGest\caddy\Caddyfile",
    [string]$BackupRoot = "C:\PromoGest\backups"
)

$ErrorActionPreference = "Stop"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BundleDir = Join-Path $BackupRoot "promogest_backup_$Timestamp"
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null

$DbDumpPath = Join-Path $BundleDir "database.dump"
$StorageArchivePath = Join-Path $BundleDir "storage.zip"
$DpKeysArchivePath = Join-Path $BundleDir "dataprotection-keys.zip"
$ConfigArchivePath = Join-Path $BundleDir "config-sanitized.zip"
$ManifestPath = Join-Path $BundleDir "manifest.sha256"

Write-Host "[1/5] Creating PostgreSQL 18 custom-format backup..."
& pg_dump --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --format=custom --compress=9 --file="$DbDumpPath" $DatabaseName
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

Write-Host "[2/5] Archiving local document storage..."
if (Test-Path $StorageDir) {
    $StorageItems = Get-ChildItem -Path $StorageDir
    if ($StorageItems.Count -gt 0) {
        Compress-Archive -Path (Join-Path $StorageDir "*") -DestinationPath $StorageArchivePath -Force
    } else {
        $EmptyDir = Join-Path $BundleDir "_empty_storage"
        New-Item -ItemType Directory -Force -Path $EmptyDir | Out-Null
        Compress-Archive -Path $EmptyDir -DestinationPath $StorageArchivePath -Force
        Remove-Item -Recurse -Force $EmptyDir
    }
}

Write-Host "[3/5] Archiving Data Protection keys (same-machine DPAPI recovery or certificate-protected cross-machine restoration)..."
if (Test-Path $DataProtectionDir) {
    $DpItems = Get-ChildItem -Path $DataProtectionDir
    if ($DpItems.Count -gt 0) {
        Compress-Archive -Path (Join-Path $DataProtectionDir "*") -DestinationPath $DpKeysArchivePath -Force
    } else {
        $EmptyDp = Join-Path $BundleDir "_empty_dp"
        New-Item -ItemType Directory -Force -Path $EmptyDp | Out-Null
        Compress-Archive -Path $EmptyDp -DestinationPath $DpKeysArchivePath -Force
        Remove-Item -Recurse -Force $EmptyDp
    }
}

Write-Host "[4/5] Archiving sanitized installation configuration (secrets redacted)..."
$SanitizedStage = Join-Path $BundleDir "_config_stage"
New-Item -ItemType Directory -Force -Path $SanitizedStage | Out-Null
if (Test-Path $AppConfigPath) {
    $cfgJson = Get-Content -Path $AppConfigPath -Raw | ConvertFrom-Json
    if ($cfgJson.ConnectionStrings -and $cfgJson.ConnectionStrings.DefaultConnection) {
        $cfgJson.ConnectionStrings.DefaultConnection = ($cfgJson.ConnectionStrings.DefaultConnection -replace '(Password\s*=\s*)[^;]+', '$1REDACTED_FOR_BACKUP')
    }
    $cfgJson | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $SanitizedStage "appsettings.Production.sanitized.json") -Encoding UTF8
}
if (Test-Path $CaddyfilePath) {
    Copy-Item -Path $CaddyfilePath -Destination (Join-Path $SanitizedStage "Caddyfile") -Force
}
if ((Get-ChildItem -Path $SanitizedStage).Count -gt 0) {
    Compress-Archive -Path (Join-Path $SanitizedStage "*") -DestinationPath $ConfigArchivePath -Force
}
Remove-Item -Recurse -Force $SanitizedStage

Write-Host "[5/5] Generating SHA-256 verification manifest..."
Get-ChildItem -Path $BundleDir -File | Sort-Object Name | ForEach-Object {
    $hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $($_.Name)"
} | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "Backup bundle created at $BundleDir. IMPORTANT: Test restoration with restore-promogest.ps1 before relying on backup."
