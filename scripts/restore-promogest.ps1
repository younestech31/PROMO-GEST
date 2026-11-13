param(
    [Parameter(Mandatory = $true)]
    [string]$BackupBundleDir,
    [string]$TargetDatabase = "promogest_restore_verify",
    [string]$DatabaseHost = "127.0.0.1",
    [int]$DatabasePort = 5432,
    [string]$ProvisionUser = "postgres",
    [string]$DatabaseUser = "promogest_owner",
    [string]$RuntimeDatabaseUser = "promogest_app",
    [string]$RestoreStorageDir = "C:\PromoGest\storage_restored",
    [string]$RestoreDataProtectionDir = "C:\PromoGest\dataprotection-keys_restored",
    [string]$RestoreConfigDir = "C:\PromoGest\config_restored"
)

$ErrorActionPreference = "Stop"
$BackupBundleDir = (Resolve-Path -LiteralPath $BackupBundleDir).Path
$ManifestPath = Join-Path $BackupBundleDir "manifest.sha256"
$DbDumpPath = Join-Path $BackupBundleDir "database.dump"

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw "Missing manifest.sha256 in $BackupBundleDir"
}
if (-not (Test-Path -LiteralPath $DbDumpPath -PathType Leaf)) {
    throw "Missing database.dump in $BackupBundleDir"
}
if ($TargetDatabase -notmatch '^[A-Za-z_][A-Za-z0-9_]{0,62}$') {
    throw "TargetDatabase must be a safe PostgreSQL identifier."
}

$requiredFiles = @("database.dump", "storage.zip", "dataprotection-keys.zip", "config-sanitized.zip")
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $BackupBundleDir $requiredFile) -PathType Leaf)) {
        throw "Required backup component is missing: $requiredFile"
    }
}
foreach ($roleName in @($ProvisionUser, $DatabaseUser, $RuntimeDatabaseUser)) {
    if ($roleName -notmatch '^[A-Za-z_][A-Za-z0-9_]{0,62}$') {
        throw "PostgreSQL role names must be simple identifiers."
    }
}
if ([string]::Equals($DatabaseUser, $RuntimeDatabaseUser, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Migration owner and runtime application role must be different identities."
}
foreach ($restorePath in @($RestoreStorageDir, $RestoreDataProtectionDir, $RestoreConfigDir)) {
    if (Test-Path -LiteralPath $restorePath) {
        throw "Restore destination already exists. Choose a new path: $restorePath"
    }
}

Write-Host "[1/8] Verifying every required backup-bundle checksum..."
$manifestEntries = @{}
foreach ($line in Get-Content -LiteralPath $ManifestPath) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -notmatch '^\s*([0-9a-fA-F]{64})\s{2}(.+?)\s*$') {
        throw "Invalid SHA-256 manifest entry: $line"
    }
    $expected = $Matches[1].ToLowerInvariant()
    $relativePath = $Matches[2].Trim()
    if ([IO.Path]::IsPathRooted($relativePath) -or $relativePath -match '[\\/]' -or
        $relativePath -match '(^|[\\/])\.\.([\\/]|$)') {
        throw "Unsafe path in backup manifest: $relativePath"
    }
    if ($manifestEntries.ContainsKey($relativePath)) {
        throw "Duplicate manifest entry: $relativePath"
    }
    $backupFile = Join-Path $BackupBundleDir $relativePath
    if (-not (Test-Path -LiteralPath $backupFile -PathType Leaf)) {
        throw "Missing expected backup file: $backupFile"
    }
    $actual = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { throw "Checksum mismatch for $backupFile" }
    $manifestEntries[$relativePath] = $expected
}
if ($manifestEntries.Count -ne $requiredFiles.Count) {
    throw "Manifest must cover exactly the four required backup components."
}
foreach ($requiredFile in $requiredFiles) {
    if (-not $manifestEntries.ContainsKey($requiredFile)) {
        throw "Manifest does not cover required component: $requiredFile"
    }
}

Write-Host "[2/7] Validating PostgreSQL dump..."
& pg_restore --list "$DbDumpPath" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL dump is invalid (pg_restore --list exit $LASTEXITCODE)." }

Write-Host "[3/7] Creating an isolated restore database with provisioning identity $ProvisionUser..."
$existing = & psql --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --dbname=postgres --tuples-only --no-align -c "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase';"
if ($LASTEXITCODE -ne 0) { throw "Could not query PostgreSQL database catalog using $ProvisionUser." }
if (-not [string]::IsNullOrWhiteSpace(($existing -join "").Trim())) {
    throw "Target database '$TargetDatabase' already exists. Choose another name; existing databases are never dropped automatically."
}

& createdb --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --owner=$DatabaseUser $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw "createdb failed with exit code $LASTEXITCODE." }

& pg_restore --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --no-owner --no-acl --dbname=$TargetDatabase "$DbDumpPath"
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }

$StorageArchivePath = Join-Path $BackupBundleDir "storage.zip"
if (Test-Path -LiteralPath $StorageArchivePath -PathType Leaf) {
    Write-Host "[4/7] Restoring local document storage..."
    New-Item -ItemType Directory -Force -Path $RestoreStorageDir | Out-Null
    Expand-Archive -LiteralPath $StorageArchivePath -DestinationPath $RestoreStorageDir -Force
} else {
    New-Item -ItemType Directory -Force -Path $RestoreStorageDir | Out-Null
}

$DpKeysArchivePath = Join-Path $BackupBundleDir "dataprotection-keys.zip"
if (Test-Path -LiteralPath $DpKeysArchivePath -PathType Leaf) {
    Write-Host "[5/7] Restoring Data Protection keys..."
    New-Item -ItemType Directory -Force -Path $RestoreDataProtectionDir | Out-Null
    Expand-Archive -LiteralPath $DpKeysArchivePath -DestinationPath $RestoreDataProtectionDir -Force
} else {
    Write-Warning "No Data Protection key archive was found. Existing protected payloads may not be decryptable after recovery."
}

$ConfigArchivePath = Join-Path $BackupBundleDir "config-sanitized.zip"
if (Test-Path -LiteralPath $ConfigArchivePath -PathType Leaf) {
    Write-Host "[6/7] Restoring sanitized configuration..."
    New-Item -ItemType Directory -Force -Path $RestoreConfigDir | Out-Null
    Expand-Archive -LiteralPath $ConfigArchivePath -DestinationPath $RestoreConfigDir -Force
}

Write-Host "[7/7] Verifying every restored stored file..."
$counts = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align -c "SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users), (SELECT count(*) FROM projects), (SELECT count(*) FROM stored_files);"
if ($LASTEXITCODE -ne 0) { throw "Could not query restored database counts." }
Write-Host "Restored counts (organization|users|projects|stored_files): $counts"

$storedFiles = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align -c "SELECT stored_relative_path || '|' || sha256_checksum || '|' || size_bytes FROM stored_files;"
if ($LASTEXITCODE -ne 0) { throw "Could not enumerate stored_files in restored database." }

$root = [IO.Path]::GetFullPath($RestoreStorageDir)
New-Item -ItemType Directory -Force -Path $root | Out-Null
$verifiedCount = 0

foreach ($entry in $storedFiles) {
    if ([string]::IsNullOrWhiteSpace($entry)) { continue }
    $parts = $entry -split "\|", 3
    if ($parts.Count -ne 3) { throw "Invalid stored_files result row: $entry" }

    $relativeFile = $parts[0].Trim()
    $expectedHash = $parts[1].Trim().ToLowerInvariant()
    $expectedSize = [long]$parts[2].Trim()

    if ([IO.Path]::IsPathRooted($relativeFile)) { throw "Rooted stored file path rejected: $relativeFile" }
    $fullPath = [IO.Path]::GetFullPath((Join-Path $root $relativeFile))
    $relativeCheck = [IO.Path]::GetRelativePath($root, $fullPath)
    if ($relativeCheck -eq ".." -or
        $relativeCheck.StartsWith(".." + [IO.Path]::DirectorySeparatorChar, [StringComparison]::Ordinal) -or
        $relativeCheck.StartsWith(".." + [IO.Path]::AltDirectorySeparatorChar, [StringComparison]::Ordinal) -or
        [IO.Path]::IsPathRooted($relativeCheck)) {
        throw "Stored file path escapes restore storage root: $relativeFile"
    }

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        throw "Restored storage is missing: $relativeFile"
    }
    $fileInfo = Get-Item -LiteralPath $fullPath
    if ($fileInfo.Length -ne $expectedSize) {
        throw "File length mismatch for $relativeFile (expected $expectedSize, actual $($fileInfo.Length))."
    }
    $actualHash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) {
        throw "SHA-256 mismatch for $relativeFile."
    }
    $verifiedCount++
}

$fileCountText = ($counts -join "").Trim().Split("|")[-1].Trim()
$fileCount = [int]$fileCountText
if ($verifiedCount -ne $fileCount) {
    throw "Stored file count mismatch: database has $fileCount records; verified $verifiedCount files."
}

Write-Host "Restore verified: $verifiedCount of $fileCount stored files match size and SHA-256."
Write-Host "Restore operation completed. Review Data Protection recovery notes before switching production traffic."
