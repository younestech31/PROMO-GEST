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

function Remove-PromoGestSensitiveConfigProperties {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return $null
    }

    $sensitivePropertyPattern = '(?i)(^connectionstrings?$|(?:password|passwd|pwd|secret|tokens?|credentials?|private.?key|api.?key|access.?key|signing.?key)(?:value|text|string|hash)?$)'

    if ($Value -is [PSCustomObject]) {
        foreach ($property in @($Value.PSObject.Properties)) {
            if ($property.Name -match $sensitivePropertyPattern) {
                $Value.PSObject.Properties.Remove($property.Name)
            }
            else {
                $property.Value = Remove-PromoGestSensitiveConfigProperties -Value $property.Value
            }
        }
        return $Value
    }

    if ($Value -is [System.Collections.IDictionary]) {
        foreach ($key in @($Value.Keys)) {
            if ([string]$key -match $sensitivePropertyPattern) {
                $Value.Remove($key)
            }
            else {
                $Value[$key] = Remove-PromoGestSensitiveConfigProperties -Value $Value[$key]
            }
        }
        return $Value
    }

    if ($Value -is [System.Collections.IList] -and $Value -isnot [string]) {
        for ($index = 0; $index -lt $Value.Count; $index++) {
            $Value[$index] = Remove-PromoGestSensitiveConfigProperties -Value $Value[$index]
        }
    }

    return $Value
}

function Write-PromoGestSanitizedConfig {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Production configuration not found: $SourcePath"
    }

    $config = Get-Content -LiteralPath $SourcePath -Raw -ErrorAction Stop |
        ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $config -or $config -isnot [PSCustomObject]) {
        throw "Production configuration must contain a JSON object."
    }

    # Connection strings and named credentials are reintroduced from the
    # protected secret store after restore. Remove them recursively, including
    # future secret-bearing fields nested inside arrays or section objects.
    $config = Remove-PromoGestSensitiveConfigProperties -Value $config

    $config | ConvertTo-Json -Depth 32 |
        Set-Content -LiteralPath $DestinationPath -Encoding UTF8
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

# Resolve no existing path components through junctions/symlinks. Otherwise a
# lexically safe BackupRoot could redirect into live storage or another target.
$pathComponent = $BackupRoot
while (-not [string]::IsNullOrWhiteSpace($pathComponent)) {
    if (Test-Path -LiteralPath $pathComponent) {
        $pathItem = Get-Item -LiteralPath $pathComponent -Force -ErrorAction Stop
        if (($pathItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "BackupRoot must not traverse a junction or symbolic link: $pathComponent"
        }
    }

    $parentPath = Split-Path -Path $pathComponent -Parent
    if ([string]::IsNullOrWhiteSpace($parentPath) -or
        [string]::Equals($parentPath, $pathComponent, [StringComparison]::OrdinalIgnoreCase)) {
        break
    }
    $pathComponent = $parentPath
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
# The root directory itself protects the lock file and prevents other local
# users from deleting or replacing completed backup bundles.
Set-PromoGestBackupBundleAcl -Path $BackupRoot

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

$BundleDir = $null
$BackupBundleCreated = $false
$BackupBundleCompleted = $false

try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    if ($service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Stopped) {
        if ($SkipServiceStop) {
            Write-Host "$ServiceName is already stopped; proceeding with a stopped-service backup."
        }
    }
    elseif ($service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
        if ($SkipServiceStop) {
            throw "-SkipServiceStop is permitted only when $ServiceName is already stopped."
        }
        $serviceWasRunning = $true
        Write-Host "Stopping $ServiceName to obtain a consistent database, storage, and Data Protection backup..."
        Stop-Service -Name $ServiceName -Force
        (Get-Service -Name $ServiceName).WaitForStatus(
            [System.ServiceProcess.ServiceControllerStatus]::Stopped,
            [TimeSpan]::FromSeconds(90))
    }
    else {
        throw "Cannot create a consistent backup while $ServiceName is in state '$($service.Status)'. Stop or start the service first."
    }

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss_fff")
$UniqueSuffix = [Guid]::NewGuid().ToString("N").Substring(0, 8)
$BundleDir = Join-Path $BackupRoot ("promogest_backup_{0}_{1}" -f $Timestamp, $UniqueSuffix)
# No -Force: an existing destination is an error, never a reason to reuse old data.
New-Item -ItemType Directory -Path $BundleDir -ErrorAction Stop | Out-Null
$BackupBundleCreated = $true
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
Write-PromoGestSanitizedConfig -SourcePath $AppConfigPath -DestinationPath (Join-Path $SanitizedStage "appsettings.Production.sanitized.json")
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
$BackupBundleCompleted = $true

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
        if ($BackupBundleCreated -and -not $BackupBundleCompleted -and
            -not [string]::IsNullOrWhiteSpace($BundleDir) -and
            (Test-Path -LiteralPath $BundleDir -PathType Container)) {
            try {
                Write-Warning "Removing incomplete backup bundle after failure: $BundleDir"
                Remove-Item -LiteralPath $BundleDir -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Warning "Could not remove incomplete backup bundle '$BundleDir': $($_.Exception.Message)"
            }
        }

        if ($null -ne $BackupLockStream) {
            $BackupLockStream.Dispose()
        }
    }
}
