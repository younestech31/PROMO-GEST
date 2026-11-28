namespace PromoGest.Contracts.Reference;

// Operator inspection only. Counts/hash claims are not activation, source or legal approval.
public sealed record StagedAdministrativeWilayaDto(
    Guid Id, string Code, string NameAr, string NameFr, string NameArSource,
    int DeclaredCommuneCount, int StoredCommuneCount, int DeclaredDairaCount);

public sealed record StagedAdministrativeSnapshotDto(
    string SnapshotId, string CanonicalContentSha256, string ManifestSha256,
    string SourceSpreadsheetId, DateTimeOffset ClaimedCaptureAtUtc,
    string PublicationStatus,
    int DeclaredWilayaCount, int DeclaredCommuneCount, int DeclaredAliasCount,
    int DeclaredDairaCount, int RecordedObservedDairaCount,
    int StoredWilayaCount, int StoredCommuneCount, int StoredAliasCount, int StoredObservedDairaCount,
    bool CountsMatchMetadata, IReadOnlyList<StagedAdministrativeWilayaDto> Wilayas);

public sealed record StagedAdministrativeAliasDto(
    string ReferenceNameAr, string ReferenceNameFr, string AliasNameFr,
    string RepositoryNameAr, string Evidence);

public sealed record StagedAdministrativeCommuneDto(
    Guid Id, string Code, Guid WilayaId, string WilayaCode,
    string NameAr, string NameFr, string DairaNameAr, string DairaNameFr,
    bool? IsDairaSeat, DateOnly? ParentEffectiveFrom, DateOnly? ParentEffectiveTo,
    string? ParentDateEvidence, StagedAdministrativeAliasDto? Alias);

public sealed record StagedAdministrativeCommunePageDto(
    string SnapshotId, int Page, int PageSize, int TotalCount, int TotalPages,
    IReadOnlyList<StagedAdministrativeCommuneDto> Items);
