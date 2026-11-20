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

$script:checks = 0
$script:failures = 0
$script:captured = @{
    RegisterCalls = 0
    Action = $null
    Trigger = $null
    Principal = $null
    Settings = $null
    Registration = $null
}

function Write-Result {
    param([bool]$Passed, [string]$Name)
    $script:checks++
    if ($Passed) {
        Write-Host "ok $($script:checks) - $Name"
    }
    else {
        Write-Host "not ok $($script:checks) - $Name"
        $script:failures++
    }
}

function New-ScheduledTaskAction {
    param([string]$Execute, [string]$Argument)
    $script:captured.Action = [PSCustomObject]@{ Execute = $Execute; Argument = $Argument }
    return $script:captured.Action
}

function New-ScheduledTaskTrigger {
    param([switch]$Daily, [datetime]$At)
    $script:captured.Trigger = [PSCustomObject]@{ Daily = $Daily.IsPresent; At = $At }
    return $script:captured.Trigger
}

function New-ScheduledTaskPrincipal {
    param([string]$UserId, [string]$LogonType, [string]$RunLevel)
    $script:captured.Principal = [PSCustomObject]@{
        UserId = $UserId; LogonType = $LogonType; RunLevel = $RunLevel
    }
    return $script:captured.Principal
}

function New-ScheduledTaskSettingsSet {
    param([switch]$StartWhenAvailable, [string]$MultipleInstances)
    $script:captured.Settings = [PSCustomObject]@{
        StartWhenAvailable = $StartWhenAvailable.IsPresent
        MultipleInstances = $MultipleInstances
    }
    return $script:captured.Settings
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
    $script:captured.RegisterCalls++
    $script:captured.Registration = [PSCustomObject]@{
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

    $arguments = $script:captured.Action.Argument
    Write-Result ($script:captured.RegisterCalls -eq 1 -and
        $script:captured.Registration.TaskName -eq "PromoGestBackupFreshnessMonitor" -and
        $script:captured.Registration.Force) "registration is idempotent and uses the stable monitor task name"

    Write-Result ($script:captured.Action.Execute -eq "PowerShell.exe" -and
        $arguments.Contains('-File "' + $checkScript + '"') -and
        $arguments.Contains('-BackupRoot "' + $backupRoot + '"') -and
        $arguments.Contains('-OffsiteDir "' + $offsiteDir + '"') -and
        $arguments.Contains("-MaxAgeHours 26") -and
        $arguments.Contains("-MinOffsiteCopies 1")) "task action passes the exact local/offsite roots and fail-closed freshness policy"

    Write-Result ($script:captured.Trigger.Daily -and
        $script:captured.Trigger.At.Hour -eq 6 -and
        $script:captured.Trigger.At.Minute -eq 0) "monitor is scheduled every day at 06:00 local time"

    Write-Result ($script:captured.Principal.UserId -eq "SYSTEM" -and
        $script:captured.Principal.LogonType -eq "ServiceAccount" -and
        $script:captured.Principal.RunLevel -eq "Highest") "monitor runs under the SYSTEM service identity at highest task level"

    Write-Result ($script:captured.Settings.StartWhenAvailable -and
        $script:captured.Settings.MultipleInstances -eq "IgnoreNew") "missed runs are recovered and overlapping monitor instances are prevented"

    $installerPath = Join-Path $scriptRoot "..\deploy\windows\install-service.ps1"
    $installerText = Get-Content -LiteralPath $installerPath -Raw
    $installerWiresMonitor = $installerText.Contains('$BackupFreshnessScriptPath = Join-Path $ScriptsDir "check-backup-freshness.ps1"') -and
        $installerText.Contains('$BackupMonitorRegistrationScriptPath = Join-Path $ScriptsDir "register-backup-freshness-task.ps1"') -and
        $installerText.Contains('& $BackupMonitorRegistrationScriptPath -BackupRoot $BackupDir -OffsiteDir $BackupOffsiteDir')
    Write-Result $installerWiresMonitor "Windows service installer requires both monitor scripts and registers the task with configured roots"

    $callsBeforeInvalid = $script:captured.RegisterCalls
    $overlapRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir (Join-Path $backupRoot "nested-offsite") -CheckScriptPath $checkScript
    } "separate, non-overlapping"
    Write-Result ($overlapRejected -and $script:captured.RegisterCalls -eq $callsBeforeInvalid) "overlapping primary and offsite directories are rejected before registration"

    $missingOffsiteRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir (Join-Path $workRoot "missing-offsite") -CheckScriptPath $checkScript
    } "does not exist or is not mounted"
    Write-Result ($missingOffsiteRejected -and $script:captured.RegisterCalls -eq $callsBeforeInvalid) "an unmounted or missing offsite target is rejected before registration"

    $missingScriptRejected = Test-ThrowsContaining {
        & $registerScript -BackupRoot $backupRoot -OffsiteDir $offsiteDir -CheckScriptPath (Join-Path $workRoot "missing-check.ps1")
    } "check script is missing"
    Write-Result ($missingScriptRejected -and $script:captured.RegisterCalls -eq $callsBeforeInvalid) "a missing monitor script is rejected before registration"

    if ($script:failures -gt 0) {
        throw "FAILED: $($script:failures) of $($script:checks) Task Scheduler registration checks failed."
    }

    Write-Host "All $($script:checks) Task Scheduler registration checks passed."
}
catch {
    Write-Host "::error title=Windows backup monitor registration contract::$($_.Exception.GetType().Name): $($_.Exception.Message)"
    throw
}
finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction Continue
    }
}

exit 0
