namespace PromoGest.Contracts.Auth;

public sealed record LoginRequest(
    string UsernameOrEmail,
    string Password);

public sealed record AuthenticatedUserResponse(
    Guid Id,
    string Username,
    string FullName,
    string Email,
    string? Phone,
    bool IsSystemAdministrator,
    bool IsActive,
    string PreferredLanguage,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions,
    DateTimeOffset? LastLoginAtUtc);

public sealed record OrganizationSummaryResponse(
    Guid Id,
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
    string CurrencyCode);

public sealed record SessionResponse(
    AuthenticatedUserResponse User,
    OrganizationSummaryResponse Organization);

public sealed record CsrfTokenResponse(
    string HeaderName,
    string Token);
