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

Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-PromoGestZipFromDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDirectory,
        [Parameter(Mandatory = $true)][string]$DestinationArchive
    )

    # Reject a linked source root as well as nested junctions/symbolic links:
    # backups must not silently include data from outside configured directories.
    $sourceItem = Get-Item -LiteralPath $SourceDirectory -Force -ErrorAction Stop
    if (($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Backup source root must not be a junction or symbolic link: $SourceDirectory"
    }
    $reparsePoints = @(Get-ChildItem -LiteralPath $SourceDirectory -Force -Recurse -ErrorAction Stop |
        Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
    if ($reparsePoints.Count -gt 0) {
        $paths = ($reparsePoints | ForEach-Object { $_.FullName }) -join ", "
        throw "Reparse points are not allowed in backup source '$SourceDirectory': $paths"
    }

    # ZipFile traverses the directory directly and includes hidden files,
    # unlike Compress-Archive's wildcard-based input handling.
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $SourceDirectory,
        $DestinationArchive,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )
}

function Set-PromoGestBackupBundleAcl {
    param([Parameter(Mandatory = $true)][string]$Path)

    # Backup bundles contain the database and private Data Protection material.
    # Do not inherit potentially broad permissions from a custom backup volume.
    & icacls.exe $Path "/inheritance:r" "/grant:r" "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "/q" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not restrict backup bundle ACL for $Path (icacls exit $LASTEXITCODE)."
    }
}

$BackupRoot = [IO.Path]::GetFullPath($BackupRoot)
$backupRootNormalized = $BackupRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$backupVolumeRoot = [IO.Path]::GetPathRoot($BackupRoot).TrimEnd(
    [IO.Path]::DirectorySeparatorChar,
    [IO.Path]::AltDirectorySeparatorChar
)
if ([string]::Equals($backupRootNormalized, $backupVolumeRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "BackupRoot must be a dedicated directory, not a volume root."
}

$protectedSourceDirectories = @(
    $StorageDir,
    $DataProtectionDir,
    (Split-Path -Parent $AppConfigPath),
    (Split-Path -Parent $CaddyfilePath)
)
foreach ($sourceDirectory in $protectedSourceDirectories) {
    $sourceNormalized = [IO.Path]::GetFullPath($sourceDirectory).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
    if ([string]::Equals($backupRootNormalized, $sourceNormalized, [StringComparison]::OrdinalIgnoreCase) -or
        $backupRootNormalized.StartsWith($sourceNormalized + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
        $sourceNormalized.StartsWith($backupRootNormalized + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "BackupRoot must not overlap a database, storage, Data Protection, application configuration, or Caddy source directory."
    }
}
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$BackupLockStream = $null
$BackupLockPath = Join-Path $BackupRoot ".promogest-backup.lock"
try {
    $BackupLockStream = [IO.File]::Open(
        $BackupLockPath,
        [IO.FileMode]::OpenOrCreate,
        [IO.FileAccess]::ReadWrite,
        [IO.FileShare]::None
    )
}
catch [IO.IOException] {
    throw "Another PROMO GEST backup is already running (lock: $BackupLockPath)."
}

try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    if ($SkipServiceStop) {
        if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Stopped) {
            throw "-SkipServiceStop is permitted only when $ServiceName is already stopped."
        }
    }
    else {
        $serviceWasRunning = $service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running
        if ($serviceWasRunning) {
            Write-Host "Stopping $ServiceName to obtain a consistent database, storage, and Data Protection backup..."
            Stop-Service -Name $ServiceName -Force
            (Get-Service -Name $ServiceName).WaitForStatus(
                [System.ServiceProcess.ServiceControllerStatus]::Stopped,
                [TimeSpan]::FromSeconds(90))
        }
    }

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss_fff")
$UniqueSuffix = [Guid]::NewGuid().ToString("N").Substring(0, 8)
$BundleDir = Join-Path $BackupRoot ("promogest_backup_{0}_{1}" -f $Timestamp, $UniqueSuffix)
# No -Force: an existing destination is an error, never a reason to reuse old data.
New-Item -ItemType Directory -Path $BundleDir -ErrorAction Stop | Out-Null
Set-PromoGestBackupBundleAcl -Path $BundleDir

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

Write-Host "[2/5] Archiving local document storage (including hidden files)..."
if (-not (Test-Path -LiteralPath $StorageDir -PathType Container)) {
    throw "Storage directory not found: $StorageDir"
}
New-PromoGestZipFromDirectory -SourceDirectory $StorageDir -DestinationArchive $StorageArchivePath

Write-Host "[3/5] Archiving Data Protection keys..."
if (-not (Test-Path -LiteralPath $DataProtectionDir -PathType Container)) {
    throw "Data Protection key directory not found: $DataProtectionDir. Refusing to create a backup without the key ring."
}
$DpItems = @(Get-ChildItem -LiteralPath $DataProtectionDir -Force -File -Recurse)
if ($DpItems.Count -eq 0) {
    throw "Data Protection key directory is empty. Verify that the application has initialized its key ring."
}
New-PromoGestZipFromDirectory -SourceDirectory $DataProtectionDir -DestinationArchive $DpKeysArchivePath

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
New-PromoGestZipFromDirectory -SourceDirectory $SanitizedStage -DestinationArchive $ConfigArchivePath
Remove-Item -Recurse -Force $SanitizedStage

Write-Host "[5/5] Generating SHA-256 verification manifest..."
Get-ChildItem -LiteralPath $BundleDir -File | Sort-Object Name | ForEach-Object {
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $($_.Name)"
} | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

Write-Host "Backup bundle created at $BundleDir. Verify restoration before relying on it."
}
finally {
    try {
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
    finally {
        if ($null -ne $BackupLockStream) {
            $BackupLockStream.Dispose()
        }
    }
}
