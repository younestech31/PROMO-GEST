param(
    [Parameter(Mandatory = $true)]
    [string]$BackupBundleDir,
    [string]$TargetDatabase = "promogest_restore_verify",
    [string]$DatabaseHost = "127.0.0.1",
    [int]$DatabasePort = 5432,
    [string]$ProvisionUser = "postgres",
    [string]$DatabaseUser = "promogest_owner",
    [string]$RuntimeDatabaseUser = "promogest_app",
    [string]$ServiceName = "PromoGestLocalErp",
    [string]$ProtectedInstallRoot = "C:\PromoGest",
    [string]$RestoreStorageDir = "C:\PromoGest-Restore\storage",
    [string]$RestoreDataProtectionDir = "C:\PromoGest-Restore\dataprotection-keys",
    [string]$RestoreConfigDir = "C:\PromoGest-Restore\config"
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
    $fullPath = [IO.Path]::GetFullPath($Path)
    return $fullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
}

function Assert-NoPathOverlap {
    param(
        [Parameter(Mandatory = $true)][string[]]$Paths,
        [Parameter(Mandatory = $true)][string]$Description
    )

    $normalized = @($Paths | ForEach-Object { Get-NormalizedPath -Path $_ })
    for ($i = 0; $i -lt $normalized.Count; $i++) {
        $volumeRoot = [IO.Path]::GetPathRoot($normalized[$i])
        $volumeRoot = $volumeRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
        if ([string]::Equals($normalized[$i], $volumeRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "$Description must not be a volume root: $($normalized[$i])"
        }

        for ($j = $i + 1; $j -lt $normalized.Count; $j++) {
            $left = $normalized[$i]
            $right = $normalized[$j]
            $samePath = [string]::Equals($left, $right, [StringComparison]::OrdinalIgnoreCase)
            $rightRelativeToLeft = [IO.Path]::GetRelativePath($left, $right)
            $leftRelativeToRight = [IO.Path]::GetRelativePath($right, $left)
            $separator = [string][IO.Path]::DirectorySeparatorChar
            $rightInsideLeft = -not [IO.Path]::IsPathRooted($rightRelativeToLeft) -and
                $rightRelativeToLeft -ne "." -and
                $rightRelativeToLeft -ne ".." -and
                -not $rightRelativeToLeft.StartsWith(".." + $separator, [StringComparison]::Ordinal)
            $leftInsideRight = -not [IO.Path]::IsPathRooted($leftRelativeToRight) -and
                $leftRelativeToRight -ne "." -and
                $leftRelativeToRight -ne ".." -and
                -not $leftRelativeToRight.StartsWith(".." + $separator, [StringComparison]::Ordinal)
            if ($samePath -or $rightInsideLeft -or $leftInsideRight) {
                throw "$Description paths must be distinct and non-overlapping: '$left' and '$right'."
            }
        }
    }
}

function Assert-NoExistingReparsePoint {
    param([Parameter(Mandatory = $true)][string]$Path)

    $pathComponent = [IO.Path]::GetFullPath($Path)
    while (-not [string]::IsNullOrWhiteSpace($pathComponent)) {
        if (Test-Path -LiteralPath $pathComponent) {
            $pathItem = Get-Item -LiteralPath $pathComponent -Force -ErrorAction Stop
            if (($pathItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Restore destination must not traverse a junction or symbolic link: $pathComponent"
            }
        }

        $parentPath = Split-Path -Path $pathComponent -Parent
        if ([string]::IsNullOrWhiteSpace($parentPath) -or
            [string]::Equals($parentPath, $pathComponent, [StringComparison]::OrdinalIgnoreCase)) {
            break
        }
        $pathComponent = $parentPath
    }
}

function Set-PromoGestRestoreDirectoryAcl {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [switch]$GrantServiceModify
    )

    $systemAce = "*S-1-5-18:(OI)(CI)F"
    $administratorsAce = "*S-1-5-32-544:(OI)(CI)F"
    $accessEntries = @($systemAce, $administratorsAce)
    if ($GrantServiceModify) {
        $serviceAccount = "NT SERVICE\" + $ServiceName
        $accessEntries += ($serviceAccount + ":(OI)(CI)M")
    }

    & icacls.exe $Path "/inheritance:r" "/grant:r" @accessEntries "/q" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not apply restricted restore ACL to '$Path' (icacls exit $LASTEXITCODE)."
    }
}

function Assert-NoSensitiveConfigurationProperties {
    param(
        [AllowNull()][object]$Value,
        [string]$CurrentPath = "$"
    )

    if ($null -eq $Value) { return }
    $sensitivePropertyPattern = '(?i)(^connectionstrings?$|(?:password|passwd|pwd|secret|secret.?key|encryption.?key|master.?key|tokens?|credentials?|private.?key|api.?key|access.?key|signing.?key)(?:value|text|string|hash)?$)'

    if ($Value -is [PSCustomObject]) {
        foreach ($property in $Value.PSObject.Properties) {
            $propertyPath = "$CurrentPath.$($property.Name)"
            if ($property.Name -match $sensitivePropertyPattern) {
                throw "Sanitized configuration contains a secret-bearing property at $propertyPath."
            }
            Assert-NoSensitiveConfigurationProperties -Value $property.Value -CurrentPath $propertyPath
        }
        return
    }

    if ($Value -is [System.Collections.IList] -and $Value -isnot [string]) {
        for ($index = 0; $index -lt $Value.Count; $index++) {
            Assert-NoSensitiveConfigurationProperties -Value $Value[$index] -CurrentPath "$CurrentPath[$index]"
        }
    }
}

function Assert-SafeZipArchive {
    param([Parameter(Mandatory = $true)][string]$ArchivePath)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    $seenEntries = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    try {
        foreach ($entry in $archive.Entries) {
            $entryName = $entry.FullName.Replace([char]92, [char]47)
            if ([string]::IsNullOrWhiteSpace($entryName) -or
                $entryName.StartsWith("/") -or
                $entryName -match '^[A-Za-z]:' -or
                $entryName.Contains(":")) {
                throw "Unsafe ZIP entry path in '$ArchivePath': $($entry.FullName)"
            }

            $normalizedEntryName = $entryName.TrimEnd("/")
            $segments = $normalizedEntryName.Split("/")
            if ($segments.Count -eq 0 -or
                $segments -contains ".." -or
                $segments -contains "." -or
                $segments -contains "") {
                throw "Unsafe ZIP entry path in '$ArchivePath': $($entry.FullName)"
            }
            foreach ($segment in $segments) {
                if ($segment.EndsWith(" ") -or $segment.EndsWith(".") -or
                    $segment.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0 -or
                    $segment -match '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') {
                    throw "Windows-incompatible ZIP path segment in '$ArchivePath': $segment"
                }
            }
            if (-not $seenEntries.Add($normalizedEntryName)) {
                throw "Duplicate or case-colliding ZIP entry in '$ArchivePath': $($entry.FullName)"
            }

            # Allow only ordinary files and directories. Reject Unix links/devices
            # and Windows reparse points even when the archive came from another OS.
            $unixFileType = ($entry.ExternalAttributes -shr 16) -band 0xF000
            if ($unixFileType -ne 0 -and $unixFileType -ne 0x8000 -and $unixFileType -ne 0x4000) {
                throw "Non-regular ZIP entry type is not allowed: $($entry.FullName)"
            }
            $dosAttributes = $entry.ExternalAttributes -band 0xFFFF
            if (($dosAttributes -band [int][IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Windows reparse points are not allowed in backup ZIP archives: $($entry.FullName)"
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
Assert-NoExistingReparsePoint -Path $ProtectedInstallRoot
$protectedRoot = Get-NormalizedPath -Path $ProtectedInstallRoot
foreach ($restorePath in $restoreDestinations) {
    $normalizedRestorePath = Get-NormalizedPath -Path $restorePath
    $relativeToInstall = [IO.Path]::GetRelativePath($protectedRoot, $normalizedRestorePath)
    $installRelativeToRestore = [IO.Path]::GetRelativePath($normalizedRestorePath, $protectedRoot)
    $restoreInsideInstall = -not [IO.Path]::IsPathRooted($relativeToInstall) -and
        $relativeToInstall -ne "." -and
        $relativeToInstall -ne ".." -and
        -not $relativeToInstall.StartsWith(".." + [string][IO.Path]::DirectorySeparatorChar, [StringComparison]::Ordinal)
    $installInsideRestore = -not [IO.Path]::IsPathRooted($installRelativeToRestore) -and
        $installRelativeToRestore -ne "." -and
        $installRelativeToRestore -ne ".." -and
        -not $installRelativeToRestore.StartsWith(".." + [string][IO.Path]::DirectorySeparatorChar, [StringComparison]::Ordinal)
    if ([string]::Equals($normalizedRestorePath, $protectedRoot, [StringComparison]::OrdinalIgnoreCase) -or
        $restoreInsideInstall -or $installInsideRestore) {
        throw "Restore destinations must remain outside the live installation root '$protectedRoot': '$normalizedRestorePath'."
    }
}
foreach ($restorePath in $restoreDestinations) {
    Assert-NoExistingReparsePoint -Path $restorePath
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

Write-Host "[2/6] Validating ZIP archive paths and PostgreSQL dump before creating a restore database..."
Assert-SafeZipArchive -ArchivePath $StorageArchivePath
Assert-SafeZipArchive -ArchivePath $DpKeysArchivePath
Assert-SafeZipArchive -ArchivePath $ConfigArchivePath
& pg_restore --list "$DbDumpPath" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL dump is invalid (pg_restore --list exit $LASTEXITCODE)." }

$restoreDatabaseCreated = $false
$restoreStorageCreated = $false
$restoreKeysCreated = $false
$restoreConfigCreated = $false

try {
Write-Host "[3/6] Creating an isolated restore database with provisioning identity $ProvisionUser..."
$existing = & psql --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --dbname=postgres --tuples-only --no-align -c "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase';"
if ($LASTEXITCODE -ne 0) { throw "Could not query PostgreSQL database catalog using $ProvisionUser." }
if (-not [string]::IsNullOrWhiteSpace(($existing -join "").Trim())) {
    throw "Target database '$TargetDatabase' already exists. Choose another name; existing databases are never dropped automatically."
}

& createdb --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --owner=$DatabaseUser $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw "createdb failed with exit code $LASTEXITCODE." }
$restoreDatabaseCreated = $true

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
CREATE TABLE public.backup_restore_privilege_probe (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY
);
"@
& psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --set=ON_ERROR_STOP=1 --command=$grantSql
if ($LASTEXITCODE -ne 0) { throw "Could not reapply least-privilege runtime grants after restore." }

Write-Host "[5/6] Restoring local document storage, Data Protection keys, and sanitized configuration..."
New-Item -ItemType Directory -Path $RestoreStorageDir -ErrorAction Stop | Out-Null
$restoreStorageCreated = $true
Set-PromoGestRestoreDirectoryAcl -Path $RestoreStorageDir -GrantServiceModify
New-Item -ItemType Directory -Path $RestoreDataProtectionDir -ErrorAction Stop | Out-Null
$restoreKeysCreated = $true
Set-PromoGestRestoreDirectoryAcl -Path $RestoreDataProtectionDir -GrantServiceModify
New-Item -ItemType Directory -Path $RestoreConfigDir -ErrorAction Stop | Out-Null
$restoreConfigCreated = $true
Set-PromoGestRestoreDirectoryAcl -Path $RestoreConfigDir
Expand-Archive -LiteralPath $StorageArchivePath -DestinationPath $RestoreStorageDir -Force
Expand-Archive -LiteralPath $DpKeysArchivePath -DestinationPath $RestoreDataProtectionDir -Force
Expand-Archive -LiteralPath $ConfigArchivePath -DestinationPath $RestoreConfigDir -Force

$dpKeyFiles = @(Get-ChildItem -LiteralPath $RestoreDataProtectionDir -File -Recurse -Force)
if ($dpKeyFiles.Count -eq 0) { throw "Data Protection archive restored no key-ring files." }

$sanitizedConfig = Join-Path $RestoreConfigDir "appsettings.Production.sanitized.json"
if (-not (Test-Path -LiteralPath $sanitizedConfig -PathType Leaf)) {
    throw "Sanitized production configuration is missing from the backup archive."
}
$caddyfile = Join-Path $RestoreConfigDir "Caddyfile"
if (-not (Test-Path -LiteralPath $caddyfile -PathType Leaf)) {
    throw "Caddyfile is missing from the restored configuration archive."
}
if ((Get-Item -LiteralPath $caddyfile).Length -eq 0) {
    throw "Restored Caddyfile is empty."
}
try {
    $sanitizedConfigObject = Get-Content -LiteralPath $sanitizedConfig -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "Sanitized production configuration is not valid JSON: $($_.Exception.Message)"
}
Assert-NoSensitiveConfigurationProperties -Value $sanitizedConfigObject
if ($null -eq $sanitizedConfigObject.Storage -or $null -eq $sanitizedConfigObject.Security) {
    throw "Sanitized production configuration is missing required Storage or Security sections."
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
    IF NOT has_table_privilege(current_user, 'public.backup_restore_privilege_probe', 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Default table privileges were not restored for future tables';
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
INSERT INTO public.backup_restore_privilege_probe DEFAULT VALUES;
'@
& psql --host=$DatabaseHost --port=$DatabasePort --username=$RuntimeDatabaseUser --dbname=$TargetDatabase --set=ON_ERROR_STOP=1 --command=$runtimeValidationSql
if ($LASTEXITCODE -ne 0) {
    throw "Restored database is not usable with runtime identity $RuntimeDatabaseUser."
}
& psql --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --dbname=$TargetDatabase --set=ON_ERROR_STOP=1 --command="DROP TABLE public.backup_restore_privilege_probe;"
if ($LASTEXITCODE -ne 0) {
    throw "Could not remove the temporary default-privilege verification table."
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
}
catch {
    $restoreFailure = $_

    if ($restoreDatabaseCreated) {
        Write-Warning "Restore failed; removing only the scratch database created by this invocation: $TargetDatabase"
        try {
            & dropdb --host=$DatabaseHost --port=$DatabasePort --username=$ProvisionUser --if-exists --force $TargetDatabase
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Could not automatically remove scratch database '$TargetDatabase'. Remove it manually after checking active sessions."
            }
        }
        catch {
            Write-Warning "Scratch database cleanup raised an error: $($_.Exception.Message). Remove '$TargetDatabase' manually after checking active sessions."
        }
    }

    foreach ($cleanupTarget in @(
        @{ Path = $RestoreStorageDir; Created = $restoreStorageCreated },
        @{ Path = $RestoreDataProtectionDir; Created = $restoreKeysCreated },
        @{ Path = $RestoreConfigDir; Created = $restoreConfigCreated }
    )) {
        if ($cleanupTarget.Created -and (Test-Path -LiteralPath $cleanupTarget.Path)) {
            Remove-Item -LiteralPath $cleanupTarget.Path -Recurse -Force -ErrorAction Continue
        }
    }

    throw $restoreFailure
}
