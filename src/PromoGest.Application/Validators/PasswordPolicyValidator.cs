using PromoGest.Domain.Exceptions;

namespace PromoGest.Application.Validators;

public static class PasswordPolicyValidator
{
    public const int MinimumLength = 10;
    public const int MaximumLength = 128;

    public static void EnsureValid(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumLength)
            throw new DomainException("PASSWORD_TOO_SHORT", $"Password must be at least {MinimumLength} characters.");

        if (password.Length > MaximumLength)
            throw new DomainException("PASSWORD_TOO_LONG", $"Password must not exceed {MaximumLength} characters.");

        var hasUpper = password.Any(char.IsUpper);
        var hasLower = password.Any(char.IsLower);
        var hasDigit = password.Any(char.IsDigit);

        if (!hasUpper || !hasLower || !hasDigit)
            throw new DomainException("PASSWORD_COMPLEXITY_UNMET", "Password must contain uppercase, lowercase, and numeric characters.");
    }
}
