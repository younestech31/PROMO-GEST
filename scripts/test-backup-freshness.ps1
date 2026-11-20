#!/usr/bin/env pwsh
# Behavioural tests for scripts/check-backup-freshness.ps1.
# Synthetic artefacts with correct and incorrect sidecars prove the exit codes that
# the scheduled monitoring task depends on.

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$checkScript = Join-Path $scriptRoot "check-backup-freshness.ps1"
$workRoot = Join-Path ([IO.Path]::GetTempPath()) ("promogest-freshness-test-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workRoot -ErrorAction Stop | Out-Null

$script:checks = 0
$script:failures = 0

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

function New-Artifact {
    param([string]$Directory, [string]$Name, [int]$AgeDays = 0)

    New-Item -ItemType Directory -Force -Path $Directory | Out-Null
    $path = Join-Path $Directory $Name
    "backup payload $Name" | Set-Content -LiteralPath $path
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $Name" | Set-Content -LiteralPath ($path + ".sha256")
    if ($AgeDays -gt 0) {
        (Get-Item -LiteralPath $path).LastWriteTimeUtc = (Get-Date).ToUniversalTime().AddDays(-$AgeDays)
    }
    return $path
}

function Invoke-Check {
    param([hashtable]$Environment, [string[]]$Arguments)

    $previous = @{}
    foreach ($key in $Environment.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key)
        [Environment]::SetEnvironmentVariable($key, $Environment[$key])
    }
    try {
        $output = & pwsh -NoProfile -File $checkScript @Arguments 2>&1 | Out-String
        return [PSCustomObject]@{ ExitCode = $LASTEXITCODE; Output = $output }
    }
    finally {
        foreach ($key in $Environment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $previous[$key])
        }
        $global:LASTEXITCODE = 0
    }
}

try {
    $freshRoot = Join-Path $workRoot "fresh-root"
    $freshOffsite = Join-Path $workRoot "fresh-offsite"
    New-Artifact -Directory $freshRoot -Name "promogest_backup_20261120_220000.tar.gz.cms" | Out-Null
    New-Artifact -Directory $freshOffsite -Name "promogest_backup_20261120_220000.tar.gz.cms" | Out-Null

    $pass = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $freshRoot, "-OffsiteDir", $freshOffsite)
    Write-Result -Passed ($pass.ExitCode -eq 0) -Name "a fresh local and offsite artefact passes"

    $localOnly = Invoke-Check -Environment @{} -Arguments @(
        "-BackupRoot", $freshRoot, "-MinOffsiteCopies", "0")
    Write-Result -Passed ($localOnly.ExitCode -eq 0) -Name "a local-only deployment is allowed when no offsite copy is required"

    $missingOffsite = Invoke-Check -Environment @{} -Arguments @(
        "-BackupRoot", $freshRoot, "-MinOffsiteCopies", "1")
    Write-Result `
        -Passed ($missingOffsite.ExitCode -ne 0 -and $missingOffsite.Output -match "offsite copies are required") `
        -Name "a missing offsite copy fails when one is required"

    $staleRoot = Join-Path $workRoot "stale-root"
    New-Artifact -Directory $staleRoot -Name "promogest_backup_20261101_220000.tar.gz.cms" -AgeDays 3 | Out-Null
    $stale = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $staleRoot, "-OffsiteDir", $staleRoot)
    Write-Result -Passed ($stale.ExitCode -ne 0 -and $stale.Output -match "is stale") -Name "a stale artefact fails the freshness window"

    $corruptRoot = Join-Path $workRoot "corrupt-root"
    $corruptPath = New-Artifact -Directory $corruptRoot -Name "promogest_backup_20261120_220000.tar.gz.cms"
    Add-Content -LiteralPath $corruptPath -Value "tampered"
    $corrupt = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $corruptRoot, "-OffsiteDir", $corruptRoot)
    Write-Result `
        -Passed ($corrupt.ExitCode -ne 0 -and $corrupt.Output -match "failed SHA-256 verification") `
        -Name "a tampered artefact fails sidecar verification"

    $noSidecarRoot = Join-Path $workRoot "no-sidecar-root"
    $noSidecarPath = New-Artifact -Directory $noSidecarRoot -Name "promogest_backup_20261120_220000.tar.gz.cms"
    Remove-Item -LiteralPath ($noSidecarPath + ".sha256") -Force
    $noSidecar = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $noSidecarRoot, "-OffsiteDir", $noSidecarRoot)
    Write-Result -Passed ($noSidecar.ExitCode -ne 0 -and $noSidecar.Output -match "no SHA-256 sidecar") `
        -Name "an artefact without a sidecar is rejected"

    $emptyRoot = Join-Path $workRoot "empty-root"
    New-Item -ItemType Directory -Path $emptyRoot | Out-Null
    $empty = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $emptyRoot, "-MinOffsiteCopies", "0")
    Write-Result -Passed ($empty.ExitCode -ne 0 -and $empty.Output -match "No PROMO GEST backup artefact") `
        -Name "an empty backup root is rejected"

    $badWindow = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $freshRoot, "-MaxAgeHours", "0")
    Write-Result -Passed ($badWindow.ExitCode -ne 0 -and $badWindow.Output -match "MaxAgeHours must be between") `
        -Name "an out-of-range freshness window is rejected"

    $mixedRoot = Join-Path $workRoot "mixed-root"
    New-Artifact -Directory $mixedRoot -Name "promogest_backup_20261101_220000.tar.gz" -AgeDays 5 | Out-Null
    New-Artifact -Directory $mixedRoot -Name "promogest_backup_20261120_221500.tar.gz" | Out-Null
    $mixed = Invoke-Check -Environment @{} -Arguments @("-BackupRoot", $mixedRoot, "-MinOffsiteCopies", "0")
    Write-Result -Passed ($mixed.ExitCode -eq 0) -Name "the newest artefact decides freshness, not an older retained one"

    if ($script:failures -gt 0) {
        throw "FAILED: $($script:failures) of $($script:checks) backup freshness checks failed."
    }

    Write-Host "All $($script:checks) backup freshness checks passed."
}
catch {
    Write-Host "::error title=Backup freshness contract::$($_.Exception.GetType().Name): $($_.Exception.Message)"
    throw
}
finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction Continue
    }
}

exit 0
