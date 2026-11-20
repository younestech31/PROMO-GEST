[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$BackupRoot,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$OffsiteDir,

    [ValidateRange(1, 720)]
    [int]$MaxAgeHours = 26,

    [ValidateRange(1, 30)]
    [int]$MinOffsiteCopies = 1,

    [string]$CheckScriptPath = (Join-Path $PSScriptRoot "check-backup-freshness.ps1")
)

$ErrorActionPreference = "Stop"

function Get-PromoGestNormalizedDirectory {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [IO.Path]::GetFullPath($Path)
    $root = [IO.Path]::GetPathRoot($fullPath)
    if ([string]::Equals(
        $fullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar),
        $root.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar),
        [StringComparison]::OrdinalIgnoreCase
    )) {
        throw "Backup monitor paths must be dedicated directories, not volume roots: $fullPath"
    }

    if (-not (Test-Path -LiteralPath $fullPath -PathType Container)) {
        throw "Backup monitor directory does not exist or is not mounted: $fullPath"
    }

    $item = Get-Item -LiteralPath $fullPath -Force -ErrorAction Stop
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Backup monitor directories must not be junctions or symbolic links: $fullPath"
    }

    return $fullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
}

$BackupRoot = Get-PromoGestNormalizedDirectory -Path $BackupRoot
$OffsiteDir = Get-PromoGestNormalizedDirectory -Path $OffsiteDir
$CheckScriptPath = [IO.Path]::GetFullPath($CheckScriptPath)

if (-not (Test-Path -LiteralPath $CheckScriptPath -PathType Leaf)) {
    throw "Backup freshness check script is missing: $CheckScriptPath"
}

$separator = [IO.Path]::DirectorySeparatorChar
if ([string]::Equals($BackupRoot, $OffsiteDir, [StringComparison]::OrdinalIgnoreCase) -or
    $BackupRoot.StartsWith($OffsiteDir + $separator, [StringComparison]::OrdinalIgnoreCase) -or
    $OffsiteDir.StartsWith($BackupRoot + $separator, [StringComparison]::OrdinalIgnoreCase)) {
    throw "BackupRoot and OffsiteDir must be separate, non-overlapping directories."
}

# Task Scheduler runs the monitor as Local SYSTEM, which can read the protected
# backup tree written by the SYSTEM backup job. A non-zero script result is kept
# as the task's LastTaskResult and is visible in Task Scheduler history.
$arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -BackupRoot "{1}" -OffsiteDir "{2}" -MaxAgeHours {3} -MinOffsiteCopies {4}' -f $CheckScriptPath, $BackupRoot, $OffsiteDir, $MaxAgeHours, $MinOffsiteCopies

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours(6))
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([timespan]::FromMinutes(15)) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName "PromoGestBackupFreshnessMonitor" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily PROMO GEST backup freshness and SHA-256 sidecar verification." -Force | Out-Null

Write-Host "Registered PromoGestBackupFreshnessMonitor: daily at 06:00 as SYSTEM; failures remain visible as non-zero LastTaskResult."
