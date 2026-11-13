namespace PromoGest.Contracts.Users;

public sealed record RoleDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameFr,
    string DescriptionAr,
    string DescriptionFr,
    bool IsSystemRole);

public sealed record UserDto(
    Guid Id,
    string Username,
    string FullName,
    string Email,
    string? Phone,
    bool IsSystemAdministrator,
    bool IsActive,
    string PreferredLanguage,
    int FailedLoginAttempts,
    DateTimeOffset? LockoutEndUtc,
    DateTimeOffset? LastLoginAtUtc,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<string> RoleCodes);

public sealed record CreateEmployeeRequest(
    string Username,
    string FullName,
    string Email,
    string? Phone,
    string Password,
    string PreferredLanguage,
    IReadOnlyList<string> RoleCodes);

public sealed record UpdateEmployeeRequest(
    string FullName,
    string Email,
    string? Phone,
    string PreferredLanguage,
    IReadOnlyList<string> RoleCodes);

public sealed record SetUserStatusRequest(bool IsActive);

public sealed record ResetUserPasswordRequest(string NewPassword);
