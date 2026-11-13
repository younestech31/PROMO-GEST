#Requires -RunAsAdministrator
# PROMO GEST Windows Service installation and least-privilege ACL setup.
# Run from an elevated PowerShell session on the local Windows server.

param(
    [string]$InstallRoot = "C:\PromoGest",
    [string]$ServiceName = "PromoGestLocalErp",
    [string]$BindUrl = "http://127.0.0.1:5080",
    [string]$BackupRoot = "",
    [string]$ServiceAccount = "",
    [switch]$ConfigureFirewall
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ServiceAccount)) {
    $ServiceAccount = "NT SERVICE\" + $ServiceName
}

$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$AppDir = Join-Path $InstallRoot "app"
$StorageDir = Join-Path $InstallRoot "storage"
$DataProtectionDir = Join-Path $InstallRoot "dataprotection-keys"
$ScriptsDir = Join-Path $InstallRoot "scripts"
$LogsDir = Join-Path $InstallRoot "logs"
$BackupDir = if ([string]::IsNullOrWhiteSpace($BackupRoot)) { Join-Path $InstallRoot "backups" } else { [IO.Path]::GetFullPath($BackupRoot) }

$backupDirNormalized = $BackupDir.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$backupVolumeRoot = [IO.Path]::GetPathRoot($BackupDir).TrimEnd(
    [IO.Path]::DirectorySeparatorChar,
    [IO.Path]::AltDirectorySeparatorChar)
if ([string]::Equals($backupDirNormalized, $backupVolumeRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "BackupRoot must be a dedicated directory, not a volume root."
}

$pathComponent = $BackupDir
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

foreach ($protectedPath in @($AppDir, $StorageDir, $DataProtectionDir, $ScriptsDir, $LogsDir)) {
    $protectedNormalized = [IO.Path]::GetFullPath($protectedPath).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar)
    if ([string]::Equals($backupDirNormalized, $protectedNormalized, [StringComparison]::OrdinalIgnoreCase) -or
        $backupDirNormalized.StartsWith($protectedNormalized + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
        $protectedNormalized.StartsWith($backupDirNormalized + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "BackupRoot must not overlap application, storage, Data Protection, scripts, or logs directories."
    }
}
$ExePath = Join-Path $AppDir "PromoGest.Api.exe"

New-Item -ItemType Directory -Force -Path $InstallRoot, $AppDir, $StorageDir, $DataProtectionDir, $BackupDir, $ScriptsDir, $LogsDir | Out-Null
if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) {
    throw "PromoGest.Api.exe not found at $ExePath. Publish and copy the application before installing the service."
}

function Invoke-IcaclsChecked {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    & icacls.exe @Arguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "icacls failed (exit $LASTEXITCODE): $($Arguments -join ' ')"
    }
}

function Set-RestrictedDirectoryAcl {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][ValidateSet("RX", "M")][string]$ServiceRights,
        [switch]$Recursive
    )

    $pathArgs = @($Path)
    if ($Recursive) { $pathArgs += "/t" }
    $pathArgs += @("/c", "/q")

    Invoke-IcaclsChecked -Arguments ($pathArgs + @("/inheritance:r"))

    $serviceAce = $ServiceAccount + ":(OI)(CI)" + $ServiceRights
    $systemAce = "*S-1-5-18:(OI)(CI)F"
    $administratorsAce = "*S-1-5-32-544:(OI)(CI)F"

    Invoke-IcaclsChecked -Arguments ($pathArgs + @("/grant:r", $systemAce, $administratorsAce, $serviceAce))
}

function Set-MaintenanceOnlyDirectoryAcl {
    param([Parameter(Mandatory = $true)][string]$Path)

    $pathArgs = @($Path, "/t", "/c", "/q")
    Invoke-IcaclsChecked -Arguments ($pathArgs + @("/inheritance:r"))

    $systemAce = "*S-1-5-18:(OI)(CI)F"
    $administratorsAce = "*S-1-5-32-544:(OI)(CI)F"
    Invoke-IcaclsChecked -Arguments ($pathArgs + @("/grant:r", $systemAce, $administratorsAce))
}

$BinPath = '"' + $ExePath + '" --urls "' + $BindUrl + '"'
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($null -ne $existingService) {
    Write-Host "Stopping existing service $ServiceName..."
    & sc.exe stop $ServiceName | Out-Null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1062) {
        throw "sc.exe stop failed with exit code $LASTEXITCODE"
    }

    $timeout = 30
    do {
        Start-Sleep -Seconds 1
        $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        $timeout--
    } while ($timeout -gt 0 -and $null -ne $existingService -and $existingService.Status -ne "Stopped")

    if ($null -ne $existingService -and $existingService.Status -ne "Stopped") {
        throw "Service $ServiceName did not stop within 30 seconds."
    }

    & sc.exe config $ServiceName "binPath=" $BinPath "obj=" $ServiceAccount "password=" "" "start=" "auto" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc.exe config failed with exit code $LASTEXITCODE" }
}
else {
    Write-Host "Creating service $ServiceName under $ServiceAccount..."
    & sc.exe create $ServiceName "binPath=" $BinPath "obj=" $ServiceAccount "password=" "" "start=" "auto" "DisplayName=" "PROMO GEST Local ERP Server" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc.exe create failed with exit code $LASTEXITCODE" }

    & sc.exe description $ServiceName "Local-first ASP.NET Core 10 ERP server for Algerian real estate promotion." | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc.exe description failed with exit code $LASTEXITCODE" }
}

Invoke-IcaclsChecked -Arguments @($InstallRoot, "/reset", "/t", "/c", "/q")
Set-RestrictedDirectoryAcl -Path $InstallRoot -ServiceRights "RX"

Set-RestrictedDirectoryAcl -Path $AppDir -ServiceRights "RX" -Recursive
Set-RestrictedDirectoryAcl -Path $ScriptsDir -ServiceRights "RX" -Recursive

foreach ($directory in @($StorageDir, $DataProtectionDir, $LogsDir)) {
    Set-RestrictedDirectoryAcl -Path $directory -ServiceRights "M" -Recursive
}

# Backup archives contain the entire database and private Data Protection material.
# Only SYSTEM (the scheduled backup/restore identity) and local Administrators may access them.
Set-MaintenanceOnlyDirectoryAcl -Path $BackupDir

& sc.exe failure $ServiceName "reset=" "86400" "actions=" "restart/5000/restart/15000/restart/30000" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "sc.exe failure configuration failed with exit code $LASTEXITCODE" }

Write-Host "Starting service $ServiceName..."
& sc.exe start $ServiceName | Out-Null
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1056) {
    throw "sc.exe start failed with exit code $LASTEXITCODE"
}

$timeout = 30
$running = $false
while ($timeout -gt 0) {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($null -ne $service -and $service.Status -eq "Running") {
        $running = $true
        break
    }
    Start-Sleep -Seconds 1
    $timeout--
}
if (-not $running) {
    throw "Service $ServiceName failed to reach Running state within 30 seconds."
}

if ($ConfigureFirewall) {
    $ruleName = "PROMO GEST LAN HTTPS (443)"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -Profile Private,Domain | Out-Null
    }
}

Write-Host "Service $ServiceName is running as $ServiceAccount. Application files are read-only to the service; storage, key ring, backups, and logs are writable."
