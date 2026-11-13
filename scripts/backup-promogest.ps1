param(
    [string]$DatabaseName = "promogest",
    [string]$DatabaseHost = "127.0.0.1",
    [int]$DatabasePort = 5432,
    [string]$DatabaseUser = "promogest_owner",
    [string]$StorageDir = "C:\PromoGest\storage",
    [string]$DataProtectionDir = "C:\PromoGest\dataprotection-keys",
    [string]$AppConfigPath = "C:\PromoGest\app\appsettings.Production.json",
    [string]$CaddyfilePath = "C:\PromoGest\caddy\Caddyfile",
    [string]$BackupRoot = "C:\PromoGest\backups",
    [string]$ServiceName = "PromoGestLocalErp",
    [switch]$SkipServiceStop
)

$ErrorActionPreference = "Stop"
$serviceWasRunning = $false

try {
    if (-not $SkipServiceStop) {
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        $serviceWasRunning = $service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running
        if ($serviceWasRunning) {
            Write-Host "Stopping $ServiceName to obtain a consistent database, storage, and Data Protection backup..."
            Stop-Service -Name $ServiceName -Force
            (Get-Service -Name $ServiceName).WaitForStatus(
                [System.ServiceProcess.ServiceControllerStatus]::Stopped,
                [TimeSpan]::FromSeconds(90))
        }
    }

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
if (-not (Test-Path -LiteralPath $StorageDir -PathType Container)) {
    throw "Storage directory not found: $StorageDir"
}
$StorageItems = @(Get-ChildItem -LiteralPath $StorageDir -Force)
if ($StorageItems.Count -gt 0) {
    Compress-Archive -Path (Join-Path $StorageDir "*") -DestinationPath $StorageArchivePath -Force
} else {
    $EmptyDir = Join-Path $BundleDir "_empty_storage"
    New-Item -ItemType Directory -Force -Path $EmptyDir | Out-Null
    Compress-Archive -Path $EmptyDir -DestinationPath $StorageArchivePath -Force
    Remove-Item -Recurse -Force $EmptyDir
}

Write-Host "[3/5] Archiving Data Protection keys..."
if (-not (Test-Path -LiteralPath $DataProtectionDir -PathType Container)) {
    throw "Data Protection key directory not found: $DataProtectionDir. Refusing to create a backup without the key ring."
}
$DpItems = @(Get-ChildItem -LiteralPath $DataProtectionDir -Force)
if ($DpItems.Count -gt 0) {
    Compress-Archive -Path (Join-Path $DataProtectionDir "*") -DestinationPath $DpKeysArchivePath -Force
} else {
    throw "Data Protection key directory is empty. Verify that the application has initialized its key ring."
}

Write-Host "[4/5] Archiving sanitized installation configuration..."
if (-not (Test-Path -LiteralPath $AppConfigPath -PathType Leaf)) {
    throw "Production configuration not found: $AppConfigPath"
}
$SanitizedStage = Join-Path $BundleDir "_config_stage"
New-Item -ItemType Directory -Force -Path $SanitizedStage | Out-Null
$cfgJson = Get-Content -LiteralPath $AppConfigPath -Raw | ConvertFrom-Json
if ($cfgJson.ConnectionStrings -and $cfgJson.ConnectionStrings.DefaultConnection) {
    # Use the .NET parser so quoted passwords and escaped semicolons are redacted as a whole value.
    $connectionBuilder = [System.Data.Common.DbConnectionStringBuilder]::new()
    $connectionBuilder.ConnectionString = [string]$cfgJson.ConnectionStrings.DefaultConnection
    foreach ($key in @($connectionBuilder.Keys)) {
        if ([string]$key -match '^(?i:Password|Pwd)$') {
            $connectionBuilder[$key] = "REDACTED_FOR_BACKUP"
        }
    }
    $cfgJson.ConnectionStrings.DefaultConnection = $connectionBuilder.ConnectionString
}
$cfgJson | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $SanitizedStage "appsettings.Production.sanitized.json") -Encoding UTF8
if (-not (Test-Path -LiteralPath $CaddyfilePath -PathType Leaf)) {
    throw "Local HTTPS Caddyfile not found: $CaddyfilePath"
}
Copy-Item -LiteralPath $CaddyfilePath -Destination (Join-Path $SanitizedStage "Caddyfile") -Force
Compress-Archive -Path (Join-Path $SanitizedStage "*") -DestinationPath $ConfigArchivePath -Force
Remove-Item -Recurse -Force $SanitizedStage

Write-Host "[5/5] Generating SHA-256 verification manifest..."
Get-ChildItem -LiteralPath $BundleDir -File | Sort-Object Name | ForEach-Object {
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $($_.Name)"
} | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

Write-Host "Backup bundle created at $BundleDir. Verify restoration before relying on it."
}
finally {
    if ($serviceWasRunning) {
        Write-Host "Restarting $ServiceName after backup..."
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
            Start-Service -Name $ServiceName
            (Get-Service -Name $ServiceName).WaitForStatus(
                [System.ServiceProcess.ServiceControllerStatus]::Running,
                [TimeSpan]::FromSeconds(90))
        }
    }
}
