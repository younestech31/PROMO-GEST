namespace PromoGest.Domain.Reference;

// Internal identities are application-owned UUIDs, not governmental codes.
// Codes/labels belong to a snapshot. Future imports must explicitly reuse reviewed identities;
// never match/reparent identities by names, aliases or commune-code prefixes.
// No daira identity is invented: daira names below are source observations only.

public sealed class AdministrativeReferenceVersion
{
    public string Id { get; set; } = string.Empty;
    public string CanonicalContentSha256 { get; set; } = string.Empty;
    public string ManifestSha256 { get; set; } = string.Empty;
    public string SourceSpreadsheetId { get; set; } = string.Empty;
    public DateTimeOffset ClaimedCaptureAtUtc { get; set; }
    public int WilayaCount { get; set; }
    public int CommuneCount { get; set; }
    public int AliasCount { get; set; }
    public int DeclaredDairaCount { get; set; }
    public int ObservedDairaCount { get; set; }
}

public sealed class AdministrativeWilayaIdentity
{
    public Guid Id { get; set; }
}

public sealed class AdministrativeCommuneIdentity
{
    public Guid Id { get; set; }
}

public sealed class AdministrativeWilayaVersion
{
    public string SnapshotId { get; set; } = string.Empty;
    public Guid WilayaId { get; set; }
    public string SystemCode { get; set; } = string.Empty;
    public string NameFr { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public int DeclaredDairaCount { get; set; }
    public int DeclaredCommuneCount { get; set; }
    public string NameArSource { get; set; } = string.Empty;
}

public sealed class AdministrativeCommuneVersion
{
    public string SnapshotId { get; set; } = string.Empty;
    public Guid CommuneId { get; set; }
    public string SystemCode { get; set; } = string.Empty;
    public string NameFr { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public Guid WilayaId { get; set; }
    public string DairaNameFr { get; set; } = string.Empty;
    public string DairaNameAr { get; set; } = string.Empty;
    public bool? IsDairaSeat { get; set; }
    public DateOnly? ParentEffectiveFrom { get; set; }
    public DateOnly? ParentEffectiveTo { get; set; }
    public string? ParentDateEvidence { get; set; }
}

public sealed class AdministrativeCommuneAlias
{
    public string SnapshotId { get; set; } = string.Empty;
    public Guid CommuneId { get; set; }
    public string ReferenceNameFr { get; set; } = string.Empty;
    public string AliasNameFr { get; set; } = string.Empty;
    public string ReferenceNameAr { get; set; } = string.Empty;
    public string RepositoryNameAr { get; set; } = string.Empty;
    public string Evidence { get; set; } = string.Empty;
}
