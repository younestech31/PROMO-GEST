namespace PromoGest.Contracts.Reference;

public sealed record AdministrativeWilayaDto(
    string Code,
    string NameAr,
    string NameFr,
    string CanonicalDisplayName);

public sealed record AdministrativeUnitsReferenceDto(
    string Version,
    string EffectiveDate,
    string LegalSource,
    string CommuneDatasetStatus,
    int CommuneLegalBaselineCount,
    int CommunesCount,
    IReadOnlyList<AdministrativeWilayaDto> Wilayas);
