param(
    [string]$BackupRoot = $(if ($env:PROMOGEST_BACKUP_ROOT) { $env:PROMOGEST_BACKUP_ROOT } else { "C:\PromoGest\backups" }),
    [string]$OffsiteDir = $(if ($env:PROMOGEST_BACKUP_OFFSITE_DIR) { $env:PROMOGEST_BACKUP_OFFSITE_DIR } else { "" }),
    [int]$MaxAgeHours = $(if ($env:PROMOGEST_BACKUP_MAX_AGE_HOURS) { [int]$env:PROMOGEST_BACKUP_MAX_AGE_HOURS } else { 26 }),
    [int]$MinOffsiteCopies = $(if ($env:PROMOGEST_BACKUP_MIN_OFFSITE_COPIES) { [int]$env:PROMOGEST_BACKUP_MIN_OFFSITE_COPIES } else { 1 })
)

# Windows counterpart of scripts/check-backup-freshness.sh.
#
# A backup job that fails silently looks exactly like a healthy one until the day a
# restore is needed. This check asserts that the newest artefact is recent and that
# its SHA-256 sidecar still verifies, locally and (when required) offsite. Schedule
# it as a second daily task; a non-zero exit is the alert.
#
# Environment contract mirrors the Linux check:
#   PROMOGEST_BACKUP_ROOT / PROMOGEST_BACKUP_OFFSITE_DIR
#   PROMOGEST_BACKUP_MAX_AGE_HOURS (1-720) / PROMOGEST_BACKUP_MIN_OFFSITE_COPIES (0-30)

$ErrorActionPreference = "Stop"

function New-PromoGestFreshnessFailure {
    param([Parameter(Mandatory = $true)][string]$Message)
    throw $Message
}

if ($MaxAgeHours -lt 1 -or $MaxAgeHours -gt 720) {
    New-PromoGestFreshnessFailure "MaxAgeHours must be between 1 and 720 (got $MaxAgeHours)."
}
if ($MinOffsiteCopies -lt 0 -or $MinOffsiteCopies -gt 30) {
    New-PromoGestFreshnessFailure "MinOffsiteCopies must be between 0 and 30 (got $MinOffsiteCopies)."
}
if (-not (Test-Path -LiteralPath $BackupRoot -PathType Container)) {
    New-PromoGestFreshnessFailure "Backup root does not exist: $BackupRoot"
}

function Get-PromoGestNewestArtifact {
    param([Parameter(Mandatory = $true)][string]$Directory)

    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return $null
    }

    return @(Get-ChildItem -LiteralPath $Directory -File -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^promogest_backup_.*\.tar\.gz(\.cms)?$' } |
            Sort-Object LastWriteTimeUtc -Descending |
            Select-Object -First 1)[0]
}

function Assert-PromoGestArtifactIsFresh {
    param(
        [Parameter(Mandatory = $true)][System.IO.FileInfo]$Artifact,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $sidecar = $Artifact.FullName + ".sha256"
    if (-not (Test-Path -LiteralPath $sidecar -PathType Leaf)) {
        New-PromoGestFreshnessFailure "$Label artifact has no SHA-256 sidecar: $($Artifact.Name)"
    }

    $entries = @(Get-Content -LiteralPath $sidecar | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($entries.Count -ne 1 -or $entries[0] -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
        New-PromoGestFreshnessFailure "$Label sidecar is malformed: $($Artifact.Name).sha256"
    }

    $expected = $Matches[1].ToLowerInvariant()
    $listedName = $Matches[2].Trim()
    if (-not [string]::Equals($listedName, $Artifact.Name, [StringComparison]::Ordinal)) {
        New-PromoGestFreshnessFailure "$Label sidecar describes '$listedName' but the artefact is '$($Artifact.Name)'."
    }

    $actual = (Get-FileHash -LiteralPath $Artifact.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) {
        New-PromoGestFreshnessFailure "$Label artifact failed SHA-256 verification: $($Artifact.Name)"
    }

    $age = (Get-Date).ToUniversalTime() - $Artifact.LastWriteTimeUtc
    if ($age.TotalHours -gt $MaxAgeHours) {
        New-PromoGestFreshnessFailure(
            "$Label backup is stale: $($Artifact.Name) is $([int]$age.TotalHours)h old (limit ${MaxAgeHours}h).")
    }

    Write-Host "OK: $Label backup $($Artifact.Name) is $([int][Math]::Max(0, $age.TotalHours))h old and matches its sidecar."
}

$localArtifact = Get-PromoGestNewestArtifact -Directory $BackupRoot
if ($null -eq $localArtifact) {
    New-PromoGestFreshnessFailure "No PROMO GEST backup artefact found in $BackupRoot."
}
Assert-PromoGestArtifactIsFresh -Artifact $localArtifact -Label "Local"

if (-not [string]::IsNullOrWhiteSpace($OffsiteDir)) {
    if (-not (Test-Path -LiteralPath $OffsiteDir -PathType Container)) {
        New-PromoGestFreshnessFailure "Offsite directory does not exist: $OffsiteDir"
    }
    $offsiteArtifact = Get-PromoGestNewestArtifact -Directory $OffsiteDir
    if ($null -eq $offsiteArtifact) {
        New-PromoGestFreshnessFailure "No PROMO GEST backup artefact found in $OffsiteDir."
    }
    Assert-PromoGestArtifactIsFresh -Artifact $offsiteArtifact -Label "Offsite"
}
else {
    if ($MinOffsiteCopies -gt 0) {
        New-PromoGestFreshnessFailure(
            "OffsiteDir is not configured but $MinOffsiteCopies offsite copies are required.")
    }
    Write-Warning "No offsite directory configured; only a local copy was verified."
}

Write-Host "Backup freshness verified (limit ${MaxAgeHours}h, minimum offsite copies $MinOffsiteCopies)."
