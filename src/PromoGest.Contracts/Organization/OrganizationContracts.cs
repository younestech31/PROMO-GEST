namespace PromoGest.Contracts.Organization;

public sealed record UpdateOrganizationProfileRequest(
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
    string? Phone,
    string? Email,
    string DefaultLanguage,
    Guid ExpectedConcurrencyStamp);
