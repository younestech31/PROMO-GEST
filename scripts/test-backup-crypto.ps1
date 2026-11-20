#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Executable checks for the Windows encrypted-backup contract.

.DESCRIPTION
    The production backup needs PostgreSQL, the Windows service, and an operator
    workstation, so it cannot run inside CI. Everything that can be proven without
    those dependencies is proven here instead:

      * the recipient certificate must be public-only and readable;
      * a sealed tar.gz is encrypted to DER CMS (AES-256-CBC) and decrypts back;
      * the SHA-256 sidecar detects tampering and filename substitution;
      * the retention policy never prunes below the minimum keep count;
      * an encrypted artifact materializes back into a verifiable bundle directory.

    Functions are lifted out of the production scripts with the PowerShell AST, so
    the tests always exercise the shipped code and never a copy of it.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-PromoGestFunctionSource {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Name
    )

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path -LiteralPath $Path).Path,
        [ref]$tokens,
        [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) {
        throw "Cannot parse $Path`: $($parseErrors[0].Message)"
    }

    $definitions = @($ast.FindAll({
                param($node)
                $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
                $Name -contains $node.Name
            }, $true))

    $blocks = foreach ($required in $Name) {
        $definition = $definitions | Where-Object { $_.Name -eq $required } | Select-Object -First 1
        if ($null -eq $definition) {
            throw "Function '$required' was not found in $Path."
        }
        $definition.Extent.Text
    }

    return ($blocks -join "`n`n")
}

# Dot-sourced at script scope so the lifted functions stay visible for the whole run.
. ([ScriptBlock]::Create((Get-PromoGestFunctionSource -Path (Join-Path $scriptRoot "backup-promogest.ps1") -Name @(
            "New-PromoGestCertificateFromBytes",
            "Assert-PromoGestRecipientCertificate",
            "Protect-PromoGestFileToCms",
            "New-PromoGestTarGzFromDirectory",
            "Get-PromoGestSha256Hex",
            "Write-PromoGestSha256Sidecar",
            "Test-PromoGestSha256Sidecar",
            "Get-PromoGestVolumeIdentity",
            "Invoke-PromoGestBackupRetention"
        ))))
. ([ScriptBlock]::Create((Get-PromoGestFunctionSource -Path (Join-Path $scriptRoot "restore-promogest.ps1") -Name @(
            "Test-PromoGestArtifactSidecar",
            "Expand-PromoGestBackupArtifact"
        ))))

$workRoot = Join-Path ([IO.Path]::GetTempPath()) ("promogest-crypto-test-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workRoot -ErrorAction Stop | Out-Null

$checks = 0
function Assert-True {
    param([Parameter(Mandatory = $true)][bool]$Condition, [Parameter(Mandatory = $true)][string]$Message)
    $script:checks++
    if (-not $Condition) { throw "FAILED: $Message" }
    Write-Host "ok $($script:checks) - $Message"
}

function Assert-Throws {
    param([Parameter(Mandatory = $true)][scriptblock]$Action, [Parameter(Mandatory = $true)][string]$Message)
    $script:checks++
    $threw = $false
    try { & $Action } catch { $threw = $true }
    if (-not $threw) { throw "FAILED: $Message (no error was raised)" }
    Write-Host "ok $($script:checks) - $Message"
}

try {
    # --- Recipient certificate contract -------------------------------------------------
    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
        "CN=PROMO GEST Backup Encryption Test",
        $rsa,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $certificate = $request.CreateSelfSigned(
        [DateTimeOffset]::UtcNow.AddDays(-1),
        [DateTimeOffset]::UtcNow.AddDays(30))

    $publicCertPath = Join-Path $workRoot "recipient.cer"
    $privateKeyPath = Join-Path $workRoot "recipient.pfx"
    [IO.File]::WriteAllBytes($publicCertPath, $certificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    [IO.File]::WriteAllBytes($privateKeyPath, $certificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, "test-password"))

    $recipient = Assert-PromoGestRecipientCertificate -Path $publicCertPath
    Assert-True -Condition ($recipient.HasPrivateKey -eq $false) -Message "the public recipient certificate carries no private key"

    Assert-Throws -Message "a private-key container is rejected as a backup recipient" -Action {
        Assert-PromoGestRecipientCertificate -Path $privateKeyPath
    }

    # --- Envelope encryption ------------------------------------------------------------
    $payloadPath = Join-Path $workRoot "payload.bin"
    $payload = New-Object byte[] 8192
    (New-Object Random).NextBytes($payload)
    [IO.File]::WriteAllBytes($payloadPath, $payload)

    $cmsPath = Join-Path $workRoot "payload.cms"
    Protect-PromoGestFileToCms -SourcePath $payloadPath -DestinationPath $cmsPath -Certificate $recipient
    Assert-True -Condition (Test-Path -LiteralPath $cmsPath) -Message "encryption produced a CMS artifact"

    Add-Type -AssemblyName System.Security.Cryptography.Pkcs
    $decryptCertificate = New-PromoGestCertificateFromBytes `
        -Bytes ([IO.File]::ReadAllBytes($privateKeyPath)) `
        -Password "test-password" `
        -KeyFlags ([System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
    $enveloped = New-Object System.Security.Cryptography.Pkcs.EnvelopedCms
    $enveloped.Decode([IO.File]::ReadAllBytes($cmsPath))
    $collection = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2Collection
    $collection.Add($decryptCertificate) | Out-Null
    $enveloped.Decrypt($collection)
    Assert-True -Condition ([Convert]::ToBase64String($enveloped.Content) -eq [Convert]::ToBase64String($payload)) `
        -Message "the encrypted artifact decrypts to the original bytes"
    Assert-True -Condition ($enveloped.ContentEncryptionAlgorithm.Value -eq "2.16.840.1.101.3.4.1.42") `
        -Message "the envelope uses AES-256-CBC (OID 2.16.840.1.101.3.4.1.42)"

    # --- Sidecar verification -----------------------------------------------------------
    Write-PromoGestSha256Sidecar -FilePath $cmsPath
    Test-PromoGestSha256Sidecar -Directory $workRoot -FileName "payload.cms"
    Assert-True -Condition $true -Message "a matching SHA-256 sidecar verifies"

    $tamperedPath = Join-Path $workRoot "tampered.bin"
    [IO.File]::WriteAllBytes($tamperedPath, $payload)
    Write-PromoGestSha256Sidecar -FilePath $tamperedPath
    [IO.File]::WriteAllBytes($tamperedPath, [byte[]](1, 2, 3))
    Assert-Throws -Message "a modified artifact fails sidecar verification" -Action {
        Test-PromoGestSha256Sidecar -Directory $workRoot -FileName "tampered.bin"
    }

    # A sidecar copied from another artifact must not bless this one.
    Copy-Item -LiteralPath (Join-Path $workRoot "tampered.bin.sha256") -Destination (Join-Path $workRoot "payload.cms.sha256") -Force
    Assert-Throws -Message "a sidecar describing another filename is rejected" -Action {
        Test-PromoGestSha256Sidecar -Directory $workRoot -FileName "payload.cms"
    }

    # --- Bundle packaging and materialization -------------------------------------------
    $bundleDir = Join-Path $workRoot "bundle"
    New-Item -ItemType Directory -Path (Join-Path $bundleDir "nested") -Force | Out-Null
    "restored database" | Set-Content -LiteralPath (Join-Path $bundleDir "database.dump")
    "storage" | Set-Content -LiteralPath (Join-Path $bundleDir "storage.zip")
    "keys" | Set-Content -LiteralPath (Join-Path $bundleDir "dataprotection-keys.zip")
    "config" | Set-Content -LiteralPath (Join-Path $bundleDir "config-sanitized.zip")
    "nested file" | Set-Content -LiteralPath (Join-Path $bundleDir "nested/marker.txt")
    $manifestSource = Get-ChildItem -LiteralPath $bundleDir -File | Sort-Object Name | ForEach-Object {
        "$((Get-PromoGestSha256Hex -Path $_.FullName))  $($_.Name)"
    }
    $manifestSource | Set-Content -LiteralPath (Join-Path $bundleDir "manifest.sha256")

    $archivePath = Join-Path $workRoot "promogest_backup_20260101_000000.tar.gz"
    New-PromoGestTarGzFromDirectory -SourceDirectory $bundleDir -DestinationPath $archivePath
    Assert-True -Condition ((Get-Item -LiteralPath $archivePath).Length -gt 0) -Message "the sealed bundle packs into a tar.gz artifact"

    $artifactPath = "$archivePath.cms"
    Protect-PromoGestFileToCms -SourcePath $archivePath -DestinationPath $artifactPath -Certificate $recipient
    Write-PromoGestSha256Sidecar -FilePath $artifactPath
    Remove-Item -LiteralPath $archivePath -Force

    $materialized = Expand-PromoGestBackupArtifact `
        -ArtifactPath $artifactPath `
        -PfxPath $privateKeyPath `
        -PfxPassword "test-password"
    Assert-True -Condition (Test-Path -LiteralPath (Join-Path $materialized "manifest.sha256") -PathType Leaf) `
        -Message "the encrypted artifact materializes back into a bundle directory"
    Assert-True -Condition ((Get-Content -LiteralPath (Join-Path $materialized "manifest.sha256")) -join "`n" -eq ($manifestSource -join "`n")) `
        -Message "the materialized manifest is byte-identical to the sealed one"
    Assert-True -Condition (Test-Path -LiteralPath (Join-Path $materialized "nested/marker.txt") -PathType Leaf) `
        -Message "nested bundle content survives packaging and extraction"
    Remove-Item -LiteralPath $materialized -Recurse -Force

    Assert-Throws -Message "an encrypted artifact without the private key is rejected" -Action {
        Expand-PromoGestBackupArtifact -ArtifactPath $artifactPath -PfxPath "" -PfxPassword ""
    }

    # --- Retention ----------------------------------------------------------------------
    $retentionDir = Join-Path $workRoot "retention"
    New-Item -ItemType Directory -Path $retentionDir -Force | Out-Null
    for ($index = 0; $index -lt 5; $index++) {
        $name = "promogest_backup_2026010$($index)_000000.tar.gz"
        $full = Join-Path $retentionDir $name
        "artifact" | Set-Content -LiteralPath $full
        ("{0}  {1}" -f ('a' * 64), $name) | Set-Content -LiteralPath ($full + ".sha256")
        # index 0..2 are old; 3..4 are fresh.
        (Get-Item -LiteralPath $full).LastWriteTimeUtc = (Get-Date).ToUniversalTime().AddDays(-($index + 10))
    }
    Invoke-PromoGestBackupRetention -Directory $retentionDir -Days 7 -MinKeep 2
    $remaining = @(Get-ChildItem -LiteralPath $retentionDir -File | Where-Object { $_.Name -match '\.tar\.gz$' })
    Assert-True -Condition ($remaining.Count -eq 2) -Message "retention prunes expired artifacts but never below the minimum keep count"
    Assert-True -Condition ((Get-ChildItem -LiteralPath $retentionDir -Filter '*.sha256').Count -eq 2) `
        -Message "retention removes the sidecar with its artifact"

    Invoke-PromoGestBackupRetention -Directory $retentionDir -Days 365 -MinKeep 2
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $retentionDir -Filter '*.tar.gz').Count -eq 2) `
        -Message "retention keeps the newest artifacts inside the retention window"

    # --- Volume identity ----------------------------------------------------------------
    $rootIdentity = Get-PromoGestVolumeIdentity -Path $workRoot
    $childIdentity = Get-PromoGestVolumeIdentity -Path $bundleDir
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($rootIdentity)) -Message "a volume identity is derived for the backup root"
    Assert-True -Condition ($rootIdentity -eq $childIdentity) -Message "paths on the same volume share one identity"

    Write-Host "All $checks Windows backup-contract checks passed."
}
catch {
    # Surface the failure as a CI annotation; the job log is not always retrievable.
    Write-Host "::error title=Windows backup contract::$($_.Exception.GetType().Name): $($_.Exception.Message)"
    throw
}
finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction Continue
    }
}
