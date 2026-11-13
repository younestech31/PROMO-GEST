namespace PromoGest.Contracts.Common;

public sealed record ApiErrorResponse(
    string Code,
    string Message,
    IDictionary<string, string[]>? ValidationErrors = null);
