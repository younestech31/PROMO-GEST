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
    [string]$EncryptionMode = $(if ($env:PROMOGEST_BACKUP_ENCRYPTION) { $env:PROMOGEST_BACKUP_ENCRYPTION } else { "required" }),
    [string]$RecipientCertPath = $(if ($env:PROMOGEST_BACKUP_RECIPIENT_CERT) { $env:PROMOGEST_BACKUP_RECIPIENT_CERT } else { "" }),
    [string]$OffsiteDir = $(if ($env:PROMOGEST_BACKUP_OFFSITE_DIR) { $env:PROMOGEST_BACKUP_OFFSITE_DIR } else { "" }),
    [int]$RetentionDays = $(if ($env:PROMOGEST_BACKUP_RETENTION_DAYS) { [int]$env:PROMOGEST_BACKUP_RETENTION_DAYS } else { 30 }),
    [int]$RetentionMinKeep = $(if ($env:PROMOGEST_BACKUP_RETENTION_MIN_KEEP) { [int]$env:PROMOGEST_BACKUP_RETENTION_MIN_KEEP } else { 3 }),
    [switch]$AllowPlaintext,
    [switch]$AllowLocalOnly,
    [switch]$AllowSameDeviceOffsite,
    [switch]$KeepPlaintextBundle,
    [switch]$SkipServiceStop
)

$ErrorActionPreference = "Stop"
$serviceWasRunning = $false

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security.Cryptography.Pkcs

# Windows point-in-time backup for the local-first PROMO GEST server.
# The bundle is sealed (SHA-256 manifest), packed as tar.gz, and encrypted with an
# X.509 recipient certificate before it leaves the host. The matching private key
# must NOT exist on this server; the restore drill supplies it. Encryption is
# required unless -AllowPlaintext acknowledges the risk explicitly, and an
# independent offsite copy is required unless -AllowLocalOnly says otherwise.

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

    $sensitivePropertyPattern = '(?i)(^connectionstrings?$|(?:password|passwd|pwd|secret|secret.?key|encryption.?key|master.?key|tokens?|credentials?|private.?key|api.?key|access.?key|signing.?key)(?:value|text|string|hash)?$)'

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

    if ($null -eq $config.Storage -or $null -eq $config.Security) {
        throw "Production configuration is missing required Storage or Security sections."
    }

    # Connection strings and named credentials are reintroduced from the
    # protected secret store after restore. Remove them recursively, including
    # future secret-bearing fields nested inside arrays or section objects.
    $config = Remove-PromoGestSensitiveConfigProperties -Value $config

    $config | ConvertTo-Json -Depth 32 |
        Set-Content -LiteralPath $DestinationPath -Encoding UTF8
}

function Set-PromoGestBackupFileAcl {
    param([Parameter(Mandatory = $true)][string]$Path)

    & icacls.exe $Path "/inheritance:r" "/grant:r" "*S-1-5-18:F" "*S-1-5-32-544:F" "/q" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not restrict backup artifact ACL for $Path (icacls exit $LASTEXITCODE)."
    }
}

function New-PromoGestCertificateFromBytes {
    param(
        [Parameter(Mandatory = $true)][byte[]]$Bytes,
        [string]$Password,
        [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]$KeyFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::DefaultKeySet
    )

    # .NET 9+ replaced the obsolete X509Certificate2 import constructors with
    # X509CertificateLoader; fall back to the legacy API on older runtimes.
    $loaderType = [type]::GetType(
        "System.Security.Cryptography.X509Certificates.X509CertificateLoader, System.Security.Cryptography",
        $false)
    if ($null -ne $loaderType) {
        if ($null -ne $Password) {
            return [System.Security.Cryptography.X509Certificates.X509CertificateLoader]::LoadPkcs12($Bytes, $Password, $KeyFlags)
        }
        return [System.Security.Cryptography.X509Certificates.X509CertificateLoader]::LoadCertificate($Bytes)
    }

    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    if ($null -ne $Password) {
        $certificate.Import($Bytes, $Password, $KeyFlags)
    }
    else {
        $certificate.Import($Bytes)
    }
    return $certificate
}

function Assert-PromoGestRecipientCertificate {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Backup recipient certificate not found: $Path"
    }

    $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Backup recipient certificate must not be a junction or symbolic link: $Path"
    }

    # Encrypting to a key that also lives on this server protects nothing: the
    # server would be able to decrypt its own backups after a compromise.
    $text = [IO.File]::ReadAllText($item.FullName)
    if ($text -match 'PRIVATE\s+KEY') {
        throw "Backup recipient certificate contains a private key. Only the public certificate may exist on this server."
    }

    try {
        $certificate = New-PromoGestCertificateFromBytes -Bytes ([IO.File]::ReadAllBytes($item.FullName))
    }
    catch {
        throw "Backup recipient certificate is not a readable X.509 certificate: $Path ($($_.Exception.GetType().Name): $($_.Exception.Message))"
    }

    if ($certificate.HasPrivateKey) {
        throw "Backup recipient certificate has an associated private key on this server; export only the public certificate."
    }
    if ($certificate.NotAfter -lt (Get-Date)) {
        throw "Backup recipient certificate expired on $($certificate.NotAfter.ToString('u')): $Path"
    }

    return $certificate
}

function Protect-PromoGestFileToCms {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [Parameter(Mandatory = $true)][System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate
    )

    $content = [IO.File]::ReadAllBytes($SourcePath)
    $enveloped = New-Object System.Security.Cryptography.Pkcs.EnvelopedCms
    $recipient = New-Object System.Security.Cryptography.Pkcs.CmsRecipient -ArgumentList $Certificate
    # 2.16.840.1.101.3.4.1.42 = AES-256-CBC, matching `openssl cms -aes-256-cbc`
    # on the Linux host so one artifact format works for either platform.
    $algorithm = New-Object System.Security.Cryptography.Pkcs.AlgorithmIdentifier `
        -ArgumentList (New-Object System.Security.Cryptography.Oid -ArgumentList "2.16.840.1.101.3.4.1.42")
    $enveloped.Encrypt($recipient, $algorithm)
    $encoded = $enveloped.Encode()
    [IO.File]::WriteAllBytes($DestinationPath, $encoded)

    # Structural check only: the private key deliberately does not exist on this
    # host, so decryptability is proven by the restore drill on the workstation.
    $verification = New-Object System.Security.Cryptography.Pkcs.EnvelopedCms
    $verification.Decode($encoded)
    if ($null -eq $verification.RecipientInfos -or $verification.RecipientInfos.Count -ne 1) {
        throw "Encrypted backup must address exactly one recipient certificate."
    }
}

function New-PromoGestTarGzFromDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDirectory,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    # bsdtar ships with Windows 10+ and produces GNU-tar-readable archives, so the
    # Linux restore/verify tooling can consume a Windows backup unchanged.
    & tar.exe -czf $DestinationPath -C $SourceDirectory .
    if ($LASTEXITCODE -ne 0) {
        throw "tar failed with exit code $LASTEXITCODE while packaging the sealed bundle."
    }
}

function Get-PromoGestSha256Hex {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-PromoGestSha256Sidecar {
    param([Parameter(Mandatory = $true)][string]$FilePath)

    # "<hash>  <name>" matches sha256sum(1) output so the same sidecar verifies on Linux.
    $hash = Get-PromoGestSha256Hex -Path $FilePath
    "$hash  $([IO.Path]::GetFileName($FilePath))" |
        Set-Content -LiteralPath ($FilePath + ".sha256") -Encoding ASCII
}

function Test-PromoGestSha256Sidecar {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string]$FileName
    )

    $sidecar = Join-Path $Directory ($FileName + ".sha256")
    if (-not (Test-Path -LiteralPath $sidecar -PathType Leaf)) {
        throw "Missing SHA-256 sidecar: $sidecar"
    }

    $entries = @(Get-Content -LiteralPath $sidecar | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($entries.Count -ne 1) {
        throw "SHA-256 sidecar must contain exactly one entry: $sidecar"
    }
    if ($entries[0] -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
        throw "Invalid SHA-256 sidecar entry in $sidecar"
    }

    $expected = $Matches[1].ToLowerInvariant()
    $listedName = $Matches[2].Trim()
    if (-not [string]::Equals($listedName, $FileName, [StringComparison]::Ordinal)) {
        throw "SHA-256 sidecar describes '$listedName' but '$FileName' was verified."
    }

    $actual = Get-PromoGestSha256Hex -Path (Join-Path $Directory $FileName)
    if (-not [string]::Equals($actual, $expected, [StringComparison]::Ordinal)) {
        throw "SHA-256 mismatch for ${FileName}: expected $expected, got $actual."
    }
}

function Get-PromoGestVolumeIdentity {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [IO.Path]::GetFullPath($Path)
    $root = [IO.Path]::GetPathRoot($fullPath)
    if ([string]::IsNullOrWhiteSpace($root)) {
        return ("path:{0}" -f $fullPath.ToLowerInvariant())
    }
    if ($root.StartsWith("\\", [StringComparison]::Ordinal)) {
        return ("unc:{0}" -f $root.TrimEnd([char[]]("\", "/")).ToLowerInvariant())
    }

    $driveLetter = $root.TrimEnd([char[]]("\", ":", "/"))
    try {
        $volume = Get-Volume -DriveLetter $driveLetter -ErrorAction Stop
        if ($null -ne $volume -and -not [string]::IsNullOrWhiteSpace($volume.UniqueId)) {
            return "volume:" + $volume.UniqueId.ToLowerInvariant()
        }
    }
    catch { }

    try {
        $drive = New-Object System.IO.DriveInfo -ArgumentList $root
        return "drive:" + $drive.Name.ToLowerInvariant()
    }
    catch {
        return "path:" + $fullPath.ToLowerInvariant()
    }
}

function Invoke-PromoGestBackupRetention {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][int]$Days,
        [Parameter(Mandatory = $true)][int]$MinKeep
    )

    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return
    }

    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$Days)
    $artifacts = @(Get-ChildItem -LiteralPath $Directory -File -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^promogest_backup_.*\.tar\.gz(\.cms)?$' } |
        Sort-Object LastWriteTimeUtc -Descending)
    if ($artifacts.Count -le $MinKeep) {
        return
    }

    for ($index = $MinKeep; $index -lt $artifacts.Count; $index++) {
        $artifact = $artifacts[$index]
        if ($artifact.LastWriteTimeUtc -ge $cutoff) {
            continue
        }
        Write-Host "Pruning expired backup artifact: $($artifact.Name)"
        Remove-Item -LiteralPath $artifact.FullName -Force
        $sidecar = $artifact.FullName + ".sha256"
        if (Test-Path -LiteralPath $sidecar -PathType Leaf) {
            Remove-Item -LiteralPath $sidecar -Force
        }
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

# --- Retention / encryption / offsite policy (validated before the service stops) ---

if ($EncryptionMode -notin @("required", "disabled")) {
    throw "EncryptionMode must be 'required' or 'disabled' (got '$EncryptionMode')."
}
$allowPlaintext = $AllowPlaintext.IsPresent -or $env:PROMOGEST_BACKUP_ALLOW_PLAINTEXT -eq "1"
$allowLocalOnly = $AllowLocalOnly.IsPresent -or $env:PROMOGEST_BACKUP_ALLOW_LOCAL_ONLY -eq "1"
$allowSameDeviceOffsite = $AllowSameDeviceOffsite.IsPresent -or $env:PROMOGEST_BACKUP_ALLOW_SAME_DEVICE_OFFSITE -eq "1"

$RecipientCertificate = $null
if ($EncryptionMode -eq "disabled") {
    if (-not $allowPlaintext) {
        throw "Disabling backup encryption stores database, document, and Data Protection key material in cleartext. Configure -RecipientCertPath, or pass -AllowPlaintext to acknowledge the risk explicitly."
    }
    Write-Warning "Backup encryption is disabled by explicit configuration; artifacts are NOT encrypted at rest."
}
else {
    if ([string]::IsNullOrWhiteSpace($RecipientCertPath)) {
        throw "A backup recipient certificate is required when encryption is enabled (-RecipientCertPath or PROMOGEST_BACKUP_RECIPIENT_CERT)."
    }
    $RecipientCertificate = Assert-PromoGestRecipientCertificate -Path $RecipientCertPath
}

if ($RetentionDays -lt 7) {
    throw "RetentionDays must be an integer >= 7 (got $RetentionDays)."
}
if ($RetentionMinKeep -lt 1) {
    throw "RetentionMinKeep must be an integer >= 1 (got $RetentionMinKeep)."
}

if (-not [string]::IsNullOrWhiteSpace($OffsiteDir)) {
    $OffsiteDir = [IO.Path]::GetFullPath($OffsiteDir).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
    if (-not (Test-Path -LiteralPath $OffsiteDir -PathType Container)) {
        throw "The offsite directory must be an existing mounted directory: $OffsiteDir"
    }
    $offsiteItem = Get-Item -LiteralPath $OffsiteDir -Force -ErrorAction Stop
    if (($offsiteItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "The offsite directory must not be a junction or symbolic link: $OffsiteDir"
    }

    # Never place the independent copy inside the primary root (or vice versa).
    $separator = [IO.Path]::DirectorySeparatorChar
    if ($OffsiteDir.StartsWith($backupRootNormalized + $separator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "The offsite directory must not be inside the primary backup root: $OffsiteDir"
    }
    if ($backupRootNormalized.StartsWith($OffsiteDir + $separator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "The primary backup root must not be inside the offsite directory: $OffsiteDir"
    }
    foreach ($sourceDirectory in @($StorageDir, $DataProtectionDir)) {
        $sourceNormalized = [IO.Path]::GetFullPath($sourceDirectory)
        if ($OffsiteDir.StartsWith($sourceNormalized + $separator, [StringComparison]::OrdinalIgnoreCase) -or
            $sourceNormalized.StartsWith($OffsiteDir + $separator, [StringComparison]::OrdinalIgnoreCase)) {
            throw "The offsite directory overlaps a protected source directory: $sourceNormalized"
        }
    }

    if (-not $allowSameDeviceOffsite -and
        (Get-PromoGestVolumeIdentity -Path $BackupRoot) -eq (Get-PromoGestVolumeIdentity -Path $OffsiteDir)) {
        throw "The offsite directory resides on the same volume as the backup root, so it is not an independent copy. Mount independent storage, or pass -AllowSameDeviceOffsite only for a documented test/DR exception."
    }
}
elseif (-not $allowLocalOnly) {
    throw "An offsite directory is required so that a second copy survives loss of this host (-OffsiteDir or PROMOGEST_BACKUP_OFFSITE_DIR). Pass -AllowLocalOnly to acknowledge a single-copy risk."
}

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
$TarTemp = $null
$CmsTemp = $null
$DistributedPath = $null
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

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss")
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

Write-Host "[1/7] Creating PostgreSQL 18 custom-format backup..."
& pg_dump --host=$DatabaseHost --port=$DatabasePort --username=$DatabaseUser --format=custom --compress=9 --file="$DbDumpPath" $DatabaseName
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}
& pg_restore --list "$DbDumpPath" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore could not read the database dump (exit code $LASTEXITCODE)."
}

Write-Host "[2/7] Archiving local document storage (including hidden files)..."
if (-not (Test-Path -LiteralPath $StorageDir -PathType Container)) {
    throw "Storage directory not found: $StorageDir"
}
New-PromoGestZipFromDirectory -SourceDirectory $StorageDir -DestinationArchive $StorageArchivePath

Write-Host "[3/7] Archiving Data Protection keys..."
if (-not (Test-Path -LiteralPath $DataProtectionDir -PathType Container)) {
    throw "Data Protection key directory not found: $DataProtectionDir. Refusing to create a backup without the key ring."
}
$DpItems = @(Get-ChildItem -LiteralPath $DataProtectionDir -Force -File -Recurse)
if ($DpItems.Count -eq 0) {
    throw "Data Protection key directory is empty. Verify that the application has initialized its key ring."
}
New-PromoGestZipFromDirectory -SourceDirectory $DataProtectionDir -DestinationArchive $DpKeysArchivePath

Write-Host "[4/7] Writing sanitized configuration and local HTTPS configuration..."
if (-not (Test-Path -LiteralPath $AppConfigPath -PathType Leaf)) {
    throw "Production configuration not found: $AppConfigPath"
}
if (-not (Test-Path -LiteralPath $CaddyfilePath -PathType Leaf)) {
    throw "Local HTTPS Caddyfile not found: $CaddyfilePath"
}
$SanitizedStage = Join-Path $BundleDir "_config_stage"
New-Item -ItemType Directory -Force -Path $SanitizedStage | Out-Null
Write-PromoGestSanitizedConfig -SourcePath $AppConfigPath -DestinationPath (Join-Path $SanitizedStage "appsettings.Production.sanitized.json")
Copy-Item -LiteralPath $CaddyfilePath -Destination (Join-Path $SanitizedStage "Caddyfile") -Force
New-PromoGestZipFromDirectory -SourceDirectory $SanitizedStage -DestinationArchive $ConfigArchivePath
Remove-Item -Recurse -Force $SanitizedStage

Write-Host "[5/7] Verifying the four archive components and writing the SHA-256 manifest..."
foreach ($component in @($DbDumpPath, $StorageArchivePath, $DpKeysArchivePath, $ConfigArchivePath)) {
    if (-not (Test-Path -LiteralPath $component -PathType Leaf) -or (Get-Item -LiteralPath $component).Length -eq 0) {
        throw "Backup component is missing or empty: $component"
    }
}
$manifestLines = Get-ChildItem -LiteralPath $BundleDir -File |
    Where-Object { $_.Name -ne "manifest.sha256" } |
    Sort-Object Name |
    ForEach-Object {
        "$((Get-PromoGestSha256Hex -Path $_.FullName))  $($_.Name)"
    }
$manifestLines | Set-Content -LiteralPath $ManifestPath -Encoding ASCII
foreach ($entry in $manifestLines) {
    $entryHash, $entryName = $entry -split '\s+', 2
    $entryName = $entryName.Trim()
    if (-not [string]::Equals((Get-PromoGestSha256Hex -Path (Join-Path $BundleDir $entryName)), $entryHash, [StringComparison]::Ordinal)) {
        throw "Sealed bundle failed its own SHA-256 verification: $entryName"
    }
}
foreach ($bundleFile in @(Get-ChildItem -LiteralPath $BundleDir -File)) {
    Set-PromoGestBackupFileAcl -Path $bundleFile.FullName
}

# From this point the snapshot is complete and self-verifying. A later failure
# (encryption, offsite copy, retention) must never delete the sealed bundle.
$BackupBundleCompleted = $true

if ($serviceWasRunning) {
    Write-Host "Restarting $ServiceName now that the snapshot is sealed..."
    Start-Service -Name $ServiceName
    (Get-Service -Name $ServiceName).WaitForStatus(
        [System.ServiceProcess.ServiceControllerStatus]::Running,
        [TimeSpan]::FromSeconds(90))
    $serviceWasRunning = $false
}

Write-Host "[6/7] Packaging and sealing the bundle for distribution..."
$ArtifactName = "promogest_backup_$Timestamp.tar.gz"
$ArtifactPath = Join-Path $BackupRoot $ArtifactName
if (Test-Path -LiteralPath $ArtifactPath) {
    throw "Backup artifact already exists: $ArtifactPath"
}
$TarTemp = Join-Path $BackupRoot (".promogest-backup-$Timestamp.tar.gz.partial")
$CmsTemp = Join-Path $BackupRoot (".promogest-backup-$Timestamp.tar.gz.cms.partial")
New-PromoGestTarGzFromDirectory -SourceDirectory $BundleDir -DestinationPath $TarTemp
Set-PromoGestBackupFileAcl -Path $TarTemp

if ($EncryptionMode -eq "required") {
    $DistributedPath = "$ArtifactPath.cms"
    Protect-PromoGestFileToCms -SourcePath $TarTemp -DestinationPath $CmsTemp -Certificate $RecipientCertificate
    Move-Item -LiteralPath $CmsTemp -Destination $DistributedPath -Force
    Remove-Item -LiteralPath $TarTemp -Force
}
else {
    $DistributedPath = $ArtifactPath
    Move-Item -LiteralPath $TarTemp -Destination $ArtifactPath -Force
}
Set-PromoGestBackupFileAcl -Path $DistributedPath
Write-PromoGestSha256Sidecar -FilePath $DistributedPath
Set-PromoGestBackupFileAcl -Path ($DistributedPath + ".sha256")

if (-not [string]::IsNullOrWhiteSpace($OffsiteDir)) {
    Write-Host "[7/7] Copying the artifact to the independent offsite target..."
    $DistributedName = [IO.Path]::GetFileName($DistributedPath)
    Copy-Item -LiteralPath $DistributedPath -Destination (Join-Path $OffsiteDir $DistributedName) -Force
    Copy-Item -LiteralPath ($DistributedPath + ".sha256") -Destination (Join-Path $OffsiteDir ($DistributedName + ".sha256")) -Force
    Set-PromoGestBackupFileAcl -Path (Join-Path $OffsiteDir $DistributedName)
    Set-PromoGestBackupFileAcl -Path (Join-Path $OffsiteDir ($DistributedName + ".sha256"))
    Test-PromoGestSha256Sidecar -Directory $OffsiteDir -FileName $DistributedName
}
else {
    Write-Host "[7/7] Offsite copy explicitly disabled (-AllowLocalOnly); a single copy exists on this host."
}

Write-Host "Applying the retention policy ($RetentionDays days, newest $RetentionMinKeep always kept)..."
Invoke-PromoGestBackupRetention -Directory $BackupRoot -Days $RetentionDays -MinKeep $RetentionMinKeep
if (-not [string]::IsNullOrWhiteSpace($OffsiteDir)) {
    Invoke-PromoGestBackupRetention -Directory $OffsiteDir -Days $RetentionDays -MinKeep $RetentionMinKeep
}

if ($KeepPlaintextBundle.IsPresent -or $env:PROMOGEST_BACKUP_KEEP_PLAINTEXT -eq "1") {
    Write-Warning "Keeping the unencrypted bundle directory because plaintext retention was requested (test/diagnostic only): $BundleDir"
}
else {
    Remove-Item -LiteralPath $BundleDir -Recurse -Force
    $BackupBundleCreated = $false
}

Write-Host "Backup artifact created: $DistributedPath"
if (-not [string]::IsNullOrWhiteSpace($OffsiteDir)) {
    Write-Host "Offsite copy verified: $(Join-Path $OffsiteDir ([IO.Path]::GetFileName($DistributedPath)))"
}
Write-Host "The service was restarted before encryption. Run the restore drill with the recipient private key before relying on this backup."
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
        foreach ($temporaryPath in @($TarTemp, $CmsTemp)) {
            if (-not [string]::IsNullOrWhiteSpace($temporaryPath) -and
                (Test-Path -LiteralPath $temporaryPath -PathType Leaf)) {
                try {
                    Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction Stop
                }
                catch {
                    Write-Warning "Could not remove temporary packaging file '$temporaryPath': $($_.Exception.Message)"
                }
            }
        }

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
