param(
    [Parameter(Mandatory = $true)]
    [string]$BackupBundleDir,
    [string]$TargetDatabase = "promogest_restore_verify",
    [string]$DatabaseHost = "127.0.0.1",
    [int]$DatabasePort = 5432,
    [string]$DatabaseUser = "promogest_owner",
    [string]$RestoreStorageDir = "C:\PromoGest\storage_restored",
    [string]$RestoreDataProtectionDir = "C:\PromoGest\dataprotection-keys_restored",
    [string]$RestoreConfigDir = "C:\PromoGest\config_restored"
)

$ErrorActionPreference = "Stop"

$ManifestPath = Join-Path $BackupBundleDir "manifest.sha256"
if (-not (Test-Path $ManifestPath)) {
    throw "Missing manifest.sha256 in $BackupBundleDir"
}

Write-Host "[1/6] Verifying SHA-256 checksums..."
foreach ($line in Get-Content $ManifestPath) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split "\s+", 2
    $expected = $parts[0].Trim().ToLowerInvariant()
    $file = Join-Path $BackupBundleDir $parts[1].Trim()
    if (-not (Test-Path $file)) {
        throw "Missing expected backup file: $file"
    }
    $actual = (Get-FileHash -Path $file -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expected -ne $actual) {
        throw "Checksum mismatch for $file (expected $expected, got $actual)"
    }
}

Write-Host "[2/6] Restoring PostgreSQL dump into $TargetDatabase using maintenance role $DatabaseUser..."
& pg_restore --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --clean --if-exists --dbname=$TargetDatabase "$DbDumpPath"
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE"
}

$StorageArchivePath = Join-Path $BackupBundleDir "storage.zip"
if (Test-Path $StorageArchivePath) {
    Write-Host "[3/6] Restoring local document storage into $RestoreStorageDir..."
    New-Item -ItemType Directory -Force -Path $RestoreStorageDir | Out-Null
    Expand-Archive -Path $StorageArchivePath -DestinationPath $RestoreStorageDir -Force
}

$DpKeysArchivePath = Join-Path $BackupBundleDir "dataprotection-keys.zip"
if (Test-Path $DpKeysArchivePath) {
    Write-Host "[4/6] Restoring Data Protection keys into $RestoreDataProtectionDir..."
    New-Item -ItemType Directory -Force -Path $RestoreDataProtectionDir | Out-Null
    Expand-Archive -Path $DpKeysArchivePath -DestinationPath $RestoreDataProtectionDir -Force
}

$ConfigArchivePath = Join-Path $BackupBundleDir "config-sanitized.zip"
if (Test-Path $ConfigArchivePath) {
    Write-Host "[5/6] Extracting sanitized config archive into $RestoreConfigDir..."
    New-Item -ItemType Directory -Force -Path $RestoreConfigDir | Out-Null
    Expand-Archive -Path $ConfigArchivePath -DestinationPath $RestoreConfigDir -Force
}

Write-Host "[6/6] Verifying restored table row counts & verifying EVERY stored_file..."
$counts = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align -c "SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users), (SELECT count(*) FROM projects), (SELECT count(*) FROM stored_files);"
if ($LASTEXITCODE -ne 0) {
    throw "Verification query failed on restored database $TargetDatabase"
}
Write-Host "Restored row counts (org|users|projects|stored_files): $counts"

$storedFiles = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align -c "SELECT stored_relative_path || '|' || sha256_checksum || '|' || size_bytes FROM stored_files;"
$verifiedCount = 0
foreach ($entry in $storedFiles) {
    if ([string]::IsNullOrWhiteSpace($entry)) { continue }
    $parts = $entry -split "\|", 3
    $relPath = $parts[0].Trim()
    $expectedHash = $parts[1].Trim().ToLowerInvariant()
    $expectedSize = [long]$parts[2].Trim()

    $fullFile = Join-Path $RestoreStorageDir ($relPath -replace '/', '\')
    if (-not (Test-Path $fullFile)) {
        throw "Restored storage missing file referenced by stored_files: $fullFile"
    }

    $fileInfo = Get-Item $fullFile
    if ($fileInfo.Length -ne $expectedSize) {
        throw "Restored file size mismatch for $relPath (expected $expectedSize bytes, got $($fileInfo.Length) bytes)"
    }

    $actualHash = (Get-FileHash -Path $fullFile -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) {
        throw "Restored file checksum mismatch for $relPath (expected $expectedHash, got $actualHash)"
    }
    $verifiedCount++
}

Write-Host "Restoration and integrity verification completed cleanly ($verifiedCount stored files verified successfully)."
