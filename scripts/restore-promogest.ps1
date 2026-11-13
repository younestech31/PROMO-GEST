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
$StorageArchivePath = Join-Path $BackupBundleDir "storage.zip"
$DpKeysArchivePath = Join-Path $BackupBundleDir "dataprotection-keys.zip"
$ConfigArchivePath = Join-Path $BackupBundleDir "config-sanitized.zip"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [IO.Path]::GetFullPath($Path).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
}

function Assert-NoPathOverlap {
    param(
        [Parameter(Mandatory = $true)][string[]]$Paths,
        [Parameter(Mandatory = $true)][string]$Description
    )

    $normalized = @($Paths | ForEach-Object { Get-NormalizedPath -Path $_ })
    for ($i = 0; $i -lt $normalized.Count; $i++) {
        $volumeRoot = [IO.Path]::GetPathRoot($normalized[$i]).TrimEnd(
            [IO.Path]::DirectorySeparatorChar,
            [IO.Path]::AltDirectorySeparatorChar
        )
        if ([string]::Equals($normalized[$i], $volumeRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "$Description must not be a volume root: $($normalized[$i])"
        }

        for ($j = $i + 1; $j -lt $normalized.Count; $j++) {
            $left = $normalized[$i]
            $right = $normalized[$j]
            $overlaps = [string]::Equals($left, $right, [StringComparison]::OrdinalIgnoreCase) -or
                $left.StartsWith($right + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
                $right.StartsWith($left + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
            if ($overlaps) {
                throw "$Description paths must be distinct and non-overlapping: '$left' and '$right'."
            }
        }
    }
}

function Assert-SafeZipArchive {
    param([Parameter(Mandatory = $true)][string]$ArchivePath)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        foreach ($entry in $archive.Entries) {
            $entryName = $entry.FullName.Replace('\', '/')
            $segments = $entryName.Split("/")
            if ([string]::IsNullOrWhiteSpace($entryName) -or
                $entryName.StartsWith("/") -or
                $entryName -match '^[A-Za-z]:' -or
                $entryName.Contains(":") -or
                $segments -contains "..") {
                throw "Unsafe ZIP entry path in '$ArchivePath': $($entry.FullName)"
            }

            # Reject Unix symbolic-link entries even when the archive was produced
            # on a non-Windows host and later moved to this Windows restore server.
            $unixFileType = ($entry.ExternalAttributes -shr 16) -band 0xF000
            if ($unixFileType -eq 0xA000) {
                throw "Symbolic links are not allowed in backup ZIP archives: $($entry.FullName)"
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}

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
$restoreDestinations = @($RestoreStorageDir, $RestoreDataProtectionDir, $RestoreConfigDir)
Assert-NoPathOverlap -Paths (@($restoreDestinations) + @($BackupBundleDir)) -Description "Backup and restore"
foreach ($restorePath in $restoreDestinations) {
    if (Test-Path -LiteralPath $restorePath) {
        throw "Restore destination already exists. Choose a new path: $restorePath"
    }
}

Write-Host "[1/6] Verifying every required backup-bundle checksum..."
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

Write-Host "[2/6] Validating PostgreSQL dump..."
& pg_restore --list "$DbDumpPath" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL dump is invalid (pg_restore --list exit $LASTEXITCODE)." }

Write-Host "[3/6] Creating an isolated restore database with provisioning identity $ProvisionUser..."
$existing = & psql --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --dbname=postgres --tuples-only --no-align -c "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase';"
if ($LASTEXITCODE -ne 0) { throw "Could not query PostgreSQL database catalog using $ProvisionUser." }
if (-not [string]::IsNullOrWhiteSpace(($existing -join "").Trim())) {
    throw "Target database '$TargetDatabase' already exists. Choose another name; existing databases are never dropped automatically."
}

& createdb --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --owner=$DatabaseUser $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw "createdb failed with exit code $LASTEXITCODE." }

# Role/database identifiers are restricted above to safe ASCII characters. psql variables
# are not interpolated inside --command, so quote the validated identifiers directly.
$connectGrantSql = "GRANT CONNECT ON DATABASE `"$TargetDatabase`" TO `"$RuntimeDatabaseUser`";"
& psql --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --dbname=postgres --set=ON_ERROR_STOP=1 --command=$connectGrantSql
if ($LASTEXITCODE -ne 0) { throw "Could not grant runtime CONNECT on restored database." }

& pg_restore --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --no-owner --no-acl --dbname=$TargetDatabase "$DbDumpPath"
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }

$grantSql = @"
GRANT USAGE ON SCHEMA public TO "$RuntimeDatabaseUser";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "$RuntimeDatabaseUser";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "$RuntimeDatabaseUser";
ALTER DEFAULT PRIVILEGES FOR ROLE "$DatabaseUser" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "$RuntimeDatabaseUser";
ALTER DEFAULT PRIVILEGES FOR ROLE "$DatabaseUser" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO "$RuntimeDatabaseUser";
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE audit_logs FROM "$RuntimeDatabaseUser";
GRANT SELECT, INSERT ON TABLE audit_logs TO "$RuntimeDatabaseUser";
"@
& psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --set=ON_ERROR_STOP=1 --command=$grantSql
if ($LASTEXITCODE -ne 0) { throw "Could not reapply least-privilege runtime grants after restore." }

Write-Host "[4/6] Validating ZIP paths before extraction..."
Assert-SafeZipArchive -ArchivePath $StorageArchivePath
Assert-SafeZipArchive -ArchivePath $DpKeysArchivePath
Assert-SafeZipArchive -ArchivePath $ConfigArchivePath

Write-Host "[5/6] Restoring local document storage, Data Protection keys, and sanitized configuration..."
New-Item -ItemType Directory -Path $RestoreStorageDir, $RestoreDataProtectionDir, $RestoreConfigDir -ErrorAction Stop | Out-Null
Expand-Archive -LiteralPath $StorageArchivePath -DestinationPath $RestoreStorageDir -Force
Expand-Archive -LiteralPath $DpKeysArchivePath -DestinationPath $RestoreDataProtectionDir -Force
Expand-Archive -LiteralPath $ConfigArchivePath -DestinationPath $RestoreConfigDir -Force

$dpKeyFiles = @(Get-ChildItem -LiteralPath $RestoreDataProtectionDir -File -Recurse -Force)
if ($dpKeyFiles.Count -eq 0) { throw "Data Protection archive restored no key-ring files." }

$sanitizedConfig = Join-Path $RestoreConfigDir "appsettings.Production.sanitized.json"
if (-not (Test-Path -LiteralPath $sanitizedConfig -PathType Leaf)) {
    throw "Sanitized production configuration is missing from the backup archive."
}
if (Select-String -LiteralPath $sanitizedConfig -Pattern '(?i)Password\s*=\s*(?!REDACTED_FOR_BACKUP)[^;"]+' -Quiet) {
    throw "Sanitized configuration appears to contain an unredacted connection-string password."
}

Write-Host "[6/6] Verifying restored database access as the least-privileged runtime identity..."
$runtimeValidationSql = @'
DO $$
BEGIN
    IF NOT has_table_privilege(current_user, 'public.projects', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Runtime role is missing DML privileges on projects';
    END IF;
    IF NOT has_table_privilege(current_user, 'public.project_members', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Runtime role is missing DML privileges on project_members';
    END IF;
    IF has_table_privilege(current_user, 'public.audit_logs', 'UPDATE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'DELETE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE')
       OR has_table_privilege(current_user, 'public.audit_logs', 'TRIGGER') THEN
        RAISE EXCEPTION 'Runtime role has excessive audit_logs privileges';
    END IF;
    IF has_schema_privilege(current_user, 'public', 'CREATE')
       OR has_database_privilege(current_user, current_database(), 'CREATE') THEN
        RAISE EXCEPTION 'Runtime role has schema or database creation privileges';
    END IF;
END
$$;
SELECT count(*) FROM organization_settings;
SELECT count(*) FROM users;
SELECT count(*) FROM projects;
SELECT count(*) FROM stored_files;
'@
& psql --host=$DatabaseHost --port=$DatabasePort --username=$RuntimeDatabaseUser --dbname=$TargetDatabase --set=ON_ERROR_STOP=1 --command=$runtimeValidationSql
if ($LASTEXITCODE -ne 0) {
    throw "Restored database is not usable with runtime identity $RuntimeDatabaseUser."
}

Write-Host "[6/6] Verifying every restored stored file..."
$counts = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align --set=ON_ERROR_STOP=1 -c "SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users), (SELECT count(*) FROM projects), (SELECT count(*) FROM stored_files);"
if ($LASTEXITCODE -ne 0) { throw "Could not query restored database counts." }
Write-Host "Restored counts (organization|users|projects|stored_files): $counts"

$storedFiles = & psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --tuples-only --no-align --set=ON_ERROR_STOP=1 -c "SELECT stored_relative_path || '|' || sha256_checksum || '|' || size_bytes FROM stored_files;"
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
