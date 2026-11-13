namespace PromoGest.Contracts.Setup;

public sealed record SetupStatusResponse(
    bool IsInitialized,
    string? OrganizationLegalName,
    string? DefaultLanguage,
    DateTimeOffset? InitializedAtUtc);

public sealed record InitializeInstallationRequest(
    string LegalName,
    string? TradeName,
    string LegalForm,
    string? Nif,
    string? Nis,
    string? TradeRegisterNumber,
    string? TaxArticleNumber,
    decimal? ShareCapitalDzd,
    string WilayaCode,
    string WilayaName,
    string Address,
    string? OrganizationPhone,
    string? OrganizationEmail,
    string DefaultLanguage,
    string AdminUsername,
    string AdminFullName,
    string AdminEmail,
    string? AdminPhone,
    string AdminPassword);

public sealed record InitializeInstallationResponse(
    Guid OrganizationId,
    string OrganizationLegalName,
    Guid SystemAdminUserId,
    string SystemAdminUsername,
    DateTimeOffset InitializedAtUtc);
