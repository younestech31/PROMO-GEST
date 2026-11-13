using System.Text.RegularExpressions;
using PromoGest.Domain.Common;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed partial class User : BaseEntity
{
    public const int MaxFailedLoginAttempts = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly List<UserRole> _userRoles = new();
    private readonly List<ProjectMember> _projectMemberships = new();

    private User() { }

    public string Username { get; private set; } = string.Empty;
    public string NormalizedUsername { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string NormalizedEmail { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string PasswordHash { get; private set; } = string.Empty;
    public bool IsSystemAdministrator { get; private set; }
    public bool IsActive { get; private set; }
    public string PreferredLanguage { get; private set; } = "ar";
    public int FailedLoginAttempts { get; private set; }
    public DateTimeOffset? LockoutEndUtc { get; private set; }
    public DateTimeOffset? LastLoginAtUtc { get; private set; }
    public Guid SecurityStamp { get; private set; } = Guid.NewGuid();

    public IReadOnlyCollection<UserRole> UserRoles => _userRoles.AsReadOnly();
    public IReadOnlyCollection<ProjectMember> ProjectMemberships => _projectMemberships.AsReadOnly();

    public static User CreateSystemAdministrator(
        string username,
        string fullName,
        string email,
        string? phone,
        string passwordHash,
        string preferredLanguage,
        DateTimeOffset nowUtc)
    {
        return CreateInternal(
            username,
            fullName,
            email,
            phone,
            passwordHash,
            isSystemAdministrator: true,
            preferredLanguage,
            nowUtc);
    }

    public static User CreateEmployee(
        string username,
        string fullName,
        string email,
        string? phone,
        string passwordHash,
        string preferredLanguage,
        DateTimeOffset nowUtc)
    {
        return CreateInternal(
            username,
            fullName,
            email,
            phone,
            passwordHash,
            isSystemAdministrator: false,
            preferredLanguage,
            nowUtc);
    }

    private static User CreateInternal(
        string username,
        string fullName,
        string email,
        string? phone,
        string passwordHash,
        bool isSystemAdministrator,
        string preferredLanguage,
        DateTimeOffset nowUtc)
    {
        var trimmedUsername = username?.Trim() ?? string.Empty;
        if (!UsernameRegex().IsMatch(trimmedUsername))
            throw new DomainException("USER_USERNAME_INVALID", "Username must be 3-64 characters using letters, digits, '.', '_', or '-'.");
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("USER_FULLNAME_REQUIRED", "Full name is required.");

        var trimmedEmail = email?.Trim() ?? string.Empty;
        if (trimmedEmail.Length > 160 || !EmailRegex().IsMatch(trimmedEmail))
            throw new DomainException("USER_EMAIL_INVALID", "Valid email address is required.");
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("USER_PASSWORD_HASH_REQUIRED", "Password hash is required.");

        return new User
        {
            Id = Guid.NewGuid(),
            Username = trimmedUsername,
            NormalizedUsername = trimmedUsername.ToUpperInvariant(),
            FullName = fullName.Trim(),
            Email = trimmedEmail,
            NormalizedEmail = trimmedEmail.ToUpperInvariant(),
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
            PasswordHash = passwordHash,
            IsSystemAdministrator = isSystemAdministrator,
            IsActive = true,
            PreferredLanguage = preferredLanguage is "fr" or "ar" ? preferredLanguage : "ar",
            FailedLoginAttempts = 0,
            SecurityStamp = Guid.NewGuid(),
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public bool IsLockedOut(DateTimeOffset nowUtc)
        => LockoutEndUtc.HasValue && LockoutEndUtc.Value > nowUtc;

    public bool RecordFailedLogin(DateTimeOffset nowUtc)
    {
        FailedLoginAttempts++;
        var lockedNow = false;
        if (FailedLoginAttempts >= MaxFailedLoginAttempts)
        {
            LockoutEndUtc = nowUtc.Add(LockoutDuration);
            lockedNow = true;
        }

        Touch(nowUtc);
        return lockedNow;
    }

    public void RecordSuccessfulLogin(DateTimeOffset nowUtc)
    {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
        LastLoginAtUtc = nowUtc;
        Touch(nowUtc);
    }

    public void UnlockAccount(DateTimeOffset nowUtc)
    {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
        Touch(nowUtc);
    }

    public void UpdateProfile(string fullName, string email, string? phone, string preferredLanguage, DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("USER_FULLNAME_REQUIRED", "Full name is required.");

        var trimmedEmail = email?.Trim() ?? string.Empty;
        if (trimmedEmail.Length > 160 || !EmailRegex().IsMatch(trimmedEmail))
            throw new DomainException("USER_EMAIL_INVALID", "Valid email address is required.");

        FullName = fullName.Trim();
        Email = trimmedEmail;
        NormalizedEmail = Email.ToUpperInvariant();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        if (preferredLanguage is "fr" or "ar")
        {
            PreferredLanguage = preferredLanguage;
        }
        Touch(nowUtc);
    }

    public void SetActiveStatus(bool isActive, DateTimeOffset nowUtc)
    {
        if (IsSystemAdministrator && !isActive)
            throw new DomainException("CANNOT_DEACTIVATE_SYSTEM_ADMIN", "The single System Administrator account cannot be deactivated.");

        IsActive = isActive;
        if (!isActive)
        {
            SecurityStamp = Guid.NewGuid();
        }
        else
        {
            FailedLoginAttempts = 0;
            LockoutEndUtc = null;
        }
        Touch(nowUtc);
    }

    public void ResetPassword(string newPasswordHash, DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException("USER_PASSWORD_HASH_REQUIRED", "Password hash is required.");

        PasswordHash = newPasswordHash;
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
        SecurityStamp = Guid.NewGuid();
        Touch(nowUtc);
    }

    [GeneratedRegex(@"^[a-zA-Z0-9._-]{3,64}$")]
    private static partial Regex UsernameRegex();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();
}
