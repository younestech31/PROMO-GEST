#Requires -RunAsAdministrator
# Windows Service Installation for PROMO GEST (.NET 10 LTS Self-Hosted Kestrel)
# Run in an elevated PowerShell prompt on the organization's local Windows Server / Workstation.

param(
    [string]$InstallRoot = "C:\PromoGest",
    [string]$ServiceName = "PromoGestLocalErp",
    [string]$BindUrl = "http://127.0.0.1:5080",
    [string]$ServiceAccount = "NT AUTHORITY\NetworkService",
    [switch]$ConfigureFirewall
)

$ErrorActionPreference = "Stop"

$AppDir = Join-Path $InstallRoot "app"
$StorageDir = Join-Path $InstallRoot "storage"
$DataProtectionDir = Join-Path $InstallRoot "dataprotection-keys"
$BackupDir = Join-Path $InstallRoot "backups"
$LogsDir = Join-Path $InstallRoot "logs"
$ExePath = Join-Path $AppDir "PromoGest.Api.exe"

New-Item -ItemType Directory -Force -Path $AppDir, $StorageDir, $DataProtectionDir, $BackupDir, $LogsDir | Out-Null

if (-not (Test-Path $ExePath)) {
    throw "PromoGest.Api.exe not found at $ExePath. Run scripts/build-production.ps1 and copy publish output first."
}

Write-Host "Configuring least-privilege folder ACLs for $ServiceAccount..."
# Restrict AppDir: Read & Execute for service account
icacls $AppDir /inheritance:d /q | Out-Null
icacls $AppDir /grant "$ServiceAccount`:(OI)(CI)(RX)" /t /q | Out-Null

# Grant Modify to storage, dataprotection, backups, logs
foreach ($d in @($StorageDir, $DataProtectionDir, $BackupDir, $LogsDir)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
    icacls $d /inheritance:d /q | Out-Null
    icacls $d /grant "$ServiceAccount`:(OI)(CI)(M)" /t /q | Out-Null
}

$BinPath = "`"$ExePath`" --urls `"$BindUrl`""

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "Updating existing Windows service $ServiceName..."
    & sc.exe stop $ServiceName | Out-Null
    $timeout = 30
    while ($timeout -gt 0) {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $svc -or $svc.Status -eq 'Stopped') { break }
        Start-Sleep -Seconds 1
        $timeout--
    }
    & sc.exe config $ServiceName binPath= $BinPath obj= $ServiceAccount start= auto | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc.exe config failed with exit code $LASTEXITCODE" }
} else {
    Write-Host "Creating Windows service $ServiceName with restricted identity $ServiceAccount..."
    & sc.exe create $ServiceName binPath= $BinPath obj= $ServiceAccount start= auto DisplayName= "PROMO GEST Local ERP Server" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc.exe create failed with exit code $LASTEXITCODE" }
    & sc.exe description $ServiceName "Local-first ASP.NET Core 10 ERP server for Algerian real estate promotion." | Out-Null
}

& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/restart/30000 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "sc.exe failure configuration failed with exit code $LASTEXITCODE" }

Write-Host "Starting Windows service $ServiceName..."
& sc.exe start $ServiceName | Out-Null

# Wait for service state transition to Running
$timeout = 30
$running = $false
while ($timeout -gt 0) {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq 'Running') {
        $running = $true
        break
    }
    Start-Sleep -Seconds 1
    $timeout--
}

if (-not $running) {
    throw "Windows service $ServiceName failed to reach Running state within timeout."
}

if ($ConfigureFirewall) {
    Write-Host "Configuring Windows Firewall: allowing LAN HTTPS (443) for Caddy reverse proxy; keeping 5080 & 5432 loopback-only."
    if (-not (Get-NetFirewallRule -DisplayName "PROMO GEST LAN HTTPS (443)" -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule `
            -DisplayName "PROMO GEST LAN HTTPS (443)" `
            -Direction Inbound `
            -LocalPort 443 `
            -Protocol TCP `
            -Action Allow `
            -Profile Private,Domain | Out-Null
    }
}

Write-Host "Service $ServiceName successfully installed, running under $ServiceAccount, and bound to $BindUrl."
