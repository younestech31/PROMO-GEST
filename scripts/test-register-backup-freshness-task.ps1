#!/usr/bin/env pwsh
# Behavioural tests for Task Scheduler registration without creating a real task.
# The ScheduledTasks cmdlets are replaced with test doubles and all arguments are captured.

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$registerScript = Join-Path $scriptRoot "register-backup-freshness-task.ps1"
$checkScript = Join-Path $scriptRoot "check-backup-freshness.ps1"
$workRoot = Join-Path ([IO.Path]::GetTempPath()) ("promogest monitor contract " + [Guid]::NewGuid().ToString("N"))
$backupRoot = Join-Path $workRoot "primary backups"
$offsiteDir = Join-Path $workRoot "offsite backups"
New-Item -ItemType Directory -Force -Path $backupRoot, $offsiteDir | Out-Null

$global:PromoGestBackupMonitorTestChecks = 0
$global:PromoGestBackupMonitorTestFailures = 0
$global:PromoGestBackupMonitorTestCaptured = @{
    RegisterCalls = 0
    Action = $null
    Trigger = $null
    Principal = $null
    Settings = $null
    Registration = $null
}

function Write-Result {
    param([bool]$Passed, [string]$Name)
    $global:PromoGestBackupMonitorTestChecks++
    if ($Passed) {
        Write-Host "ok $($global:PromoGestBackupMonitorTestChecks) - $Name"
    }
    else {
        Write-Host "not ok $($global:PromoGestBackupMonitorTestChecks) - $Name"
        $global:PromoGestBackupMonitorTestFailures++
    }
}

function New-ScheduledTaskAction {
    param([string]$Execute, [string]$Argument)
    $global:PromoGestBackupMonitorTestCaptured.Action = [PSCustomObject]@{ Execute = $Execute; Argument = $Argument }
    return $global:PromoGestBackupMonitorTestCaptured.Action
}

function New-ScheduledTaskTrigger {
    param([switch]$Daily, [datetime]$At)
    $global:PromoGestBackupMonitorTestCaptured.Trigger = [PSCustomObject]@{ Daily = $Daily.IsPresent; At = $At }
    return $global:PromoGestBackupMonitorTestCaptured.Trigger
}

function New-ScheduledTaskPrincipal {
    param([string]$UserId, [string]$LogonType, [string]$RunLevel)
    $global:PromoGestBackupMonitorTestCaptured.Principal = [PSCustomObject]@{
        UserId = $UserId; LogonType = $LogonType; RunLevel = $RunLevel
    }
    return $global:PromoGestBackupMonitorTestCaptured.Principal
}

function New-ScheduledTaskSettingsSet {
    param([switch]$StartWhenAvailable, [string]$MultipleInstances)
    $global:PromoGestBackupMonitorTestCaptured.Settings = [PSCustomObject]@{
        StartWhenAvailable = $StartWhenAvailable.IsPresent
        MultipleInstances = $MultipleInstances
    }
    return $global:PromoGestBackupMonitorTestCaptured.Settings
}

function Register-ScheduledTask {
    param(
        [string]$TaskName,
        [object]$Action,
        [object]$Trigger,
        [object]$Principal,
        [object]$Settings,
        [string]$Description,
        [switch]$Force
    )
    $global:PromoGestBackupMonitorTestCaptured.RegisterCalls++
    $global:PromoGestBackupMonitorTestCaptured.Registration = [PSCustomObject]@{
        TaskName = $TaskName
        Action = $Action
        Trigger = $Trigger
        Principal = $Principal
        Settings = $Settings
        Description = $Description
        Force = $Force.IsPresent
    }
}

function Test-ThrowsContaining {
    param([scriptblock]$Command, [string]$ExpectedText)
    try {
        & $Command
        return $false
    }
    catch {
        return ($_.Exception.Message.IndexOf($ExpectedText, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    }
}

try {
    & $registerScript -BackupRoot $backupRoot -OffsiteDir $offsiteDir -CheckScriptPath $checkScript

    $arguments = $global:PromoGestBackupMonitorTestCaptured.Action.Argument
    Write-Result ($global:PromoGestBackupMonitorTestCaptured.RegisterCalls -eq 1 -and
        $global:PromoGestBackupMonitorTestCaptured.Registration.TaskName -eq "PromoGestBackupFreshnessMonitor" -and
        $global:PromoGestBackupMonitorTestCaptured.Registration.Force) "registration is idempotent and uses the stable monitor task name"

    Write-Result ($global:PromoGestBackupMonitorTestCaptured.Action.Execute -eq "PowerShell.exe" -and
        $arguments.Contains('-File "' + $checkScript + '"') -and
        $arguments.Contains('-BackupRoot "' + $backupRoot + '"') -and
        $arguments.Contains('-OffsiteDir "' + $offsiteDir + '"') -and
        $arguments.Contains("-MaxAgeHours 26") -and
        $arguments.Contains("-MinOffsiteCopies 1")) "task action passes the exact local/offsite roots and fail-closed freshness policy"

    Write-Result ($global:PromoGestBackupMonitorTestCaptured.Trigger.Daily -and
        $global:PromoGestBackupMonitorTestCaptured.Trigger.At.Hour -eq 6 -and
        $global:PromoGestBackupMonitorTestCaptured.Trigger.At.Minute -eq 0) "monitor is scheduled every day at 06:00 local time"

    Write-Result ($global:PromoGestBackupMonitorTestCaptured.Principal.UserId -eq "SYSTEM" -and
        $global:PromoGestBackupMonitorTestCaptured.Principal.LogonType -eq "ServiceAccount" -and
        $global:PromoGestBackupMonitorTestCaptured.Principal.RunLevel -eq "Highest") "monitor runs under the SYSTEM service identity at highest task level"

    Write-Result ($global:PromoGestBackupMonitorTestCaptured.Settings.StartWhenAvailable -and
        $global:PromoGestBackupMonitorTestCaptured.Settings.MultipleInstances -eq "IgnoreNew") "missed runs are recovered and overlapping monitor instances are prevented"

    $installerPath = Join-Path $scriptRoot "..\deploy\windows\install-service.ps1"
    $installerText = Get-Content -LiteralPath $installerPath -Raw
    $installerWiresMonitor = $installerText.Contains('$BackupFreshnessScriptPath = Join-Path $ScriptsDir "check-backup-freshness.ps1"') -and
        $installerText.Contains('$BackupMonitorRegistrationScriptPath = Join-Path $ScriptsDir "register-backup-freshness-task.ps1"') -and
        $installerText.Contains('& $BackupMonitorRegistrationScriptPath -BackupRoot $BackupDir -OffsiteDir $BackupOffsiteDir')
    Write-Result $installerWiresMonitor "Windows service installer requires both monitor scripts and registers the task with configured roots"

    $nestedOffsite = Join-Path $backupRoot "nested-offsite"
    New-Item -ItemType Directory -Path $nestedOffsite | Out-Null
    $callsBeforeInvalid = $global:PromoGestBackupMonitorTestCaptured.RegisterCalls
    $overlapRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir $nestedOffsite -CheckScriptPath $checkScript
    } "separate, non-overlapping"
    Write-Result ($overlapRejected -and $global:PromoGestBackupMonitorTestCaptured.RegisterCalls -eq $callsBeforeInvalid) "overlapping primary and offsite directories are rejected before registration"

    $missingOffsiteRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir (Join-Path $workRoot "missing-offsite") -CheckScriptPath $checkScript
    } "does not exist or is not mounted"
    Write-Result ($missingOffsiteRejected -and $global:PromoGestBackupMonitorTestCaptured.RegisterCalls -eq $callsBeforeInvalid) "an unmounted or missing offsite target is rejected before registration"

    $missingScriptRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir $offsiteDir -CheckScriptPath (Join-Path $workRoot "missing-check.ps1")
    } "check script is missing"
    Write-Result ($missingScriptRejected -and $global:PromoGestBackupMonitorTestCaptured.RegisterCalls -eq $callsBeforeInvalid) "a missing monitor script is rejected before registration"

    if ($global:PromoGestBackupMonitorTestFailures -gt 0) {
        throw "FAILED: $($global:PromoGestBackupMonitorTestFailures) of $($global:PromoGestBackupMonitorTestChecks) Task Scheduler registration checks failed."
    }

    Write-Host "All $($global:PromoGestBackupMonitorTestChecks) Task Scheduler registration checks passed."
}
catch {
    Write-Host "::error title=Windows backup monitor registration contract::$($_.Exception.GetType().Name): $($_.Exception.Message)"
    throw
}
finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction Continue
    }
    Remove-Variable -Scope Global -Name PromoGestBackupMonitorTestChecks, PromoGestBackupMonitorTestFailures, PromoGestBackupMonitorTestCaptured -ErrorAction SilentlyContinue
}

exit 0
