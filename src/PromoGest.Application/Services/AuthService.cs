using PromoGest.Application.Interfaces;
using PromoGest.Application.Validators;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed record AuthLoginResult(
    SessionResponse Session,
    string OpaqueSessionToken,
    DateTimeOffset ExpiresAtUtc);

public sealed class AuthService
{
    // Precomputed PBKDF2-SHA512 hash (310,000 iterations) used strictly for constant-time dummy verification
    // when an account does not exist or is locked/inactive, preventing timing-based username enumeration.
    private const string DummyTimingResistanceHash =
        "PBKDF2-SHA512$310000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

    private readonly IUserRepository _userRepository;
    private readonly IInstallationRepository _installationRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ISessionTokenGenerator _tokenGenerator;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly SessionPolicy _sessionPolicy;

    public AuthService(
        IUserRepository userRepository,
        IInstallationRepository installationRepository,
        IPasswordHasher passwordHasher,
        ISessionTokenGenerator tokenGenerator,
        IAuditWriter auditWriter,
        IClock clock,
        SessionPolicy? sessionPolicy = null)
    {
        _userRepository = userRepository;
        _installationRepository = installationRepository;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _auditWriter = auditWriter;
        _clock = clock;
        _sessionPolicy = sessionPolicy ?? SessionPolicy.Default;
    }

    public async Task<AuthLoginResult> LoginAsync(
        LoginRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrWhiteSpace(request.Password))
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");

        var nowUtc = _clock.UtcNow;
        var identifier = request.UsernameOrEmail.Trim();
        if (request.Password.Length > PasswordPolicyValidator.MaximumLength)
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    null,
                    identifier.Length > 32 ? identifier[..32] : identifier,
                    "AUTH_LOGIN_FAILED",
                    AuditSeverity.Security,
                    "User",
                    null,
                    "Failed login attempt exceeded password length limit.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        var org = await _installationRepository.GetOrganizationSettingsAsync(ct);
        if (org is null || !org.IsInitialized)
            throw new ConflictDomainException("SETUP_REQUIRED", "System installation must be initialized before signing in.");

        var user = await _userRepository.GetByUsernameOrEmailWithRolesAsync(identifier, ct);

        if (user is null)
        {
            _passwordHasher.VerifyPassword(request.Password, DummyTimingResistanceHash);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    null,
                    identifier.Length > 32 ? identifier[..32] : identifier,
                    "AUTH_LOGIN_FAILED",
                    AuditSeverity.Security,
                    "User",
                    null,
                    "Failed login attempt for unknown account identifier.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        if (!user.IsActive)
        {
            _passwordHasher.VerifyPassword(request.Password, DummyTimingResistanceHash);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "AUTH_LOGIN_BLOCKED_INACTIVE",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    $"Deactivated account '{user.Username}' attempted to sign in.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        if (user.IsLockedOut(nowUtc))
        {
            _passwordHasher.VerifyPassword(request.Password, DummyTimingResistanceHash);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "AUTH_LOGIN_BLOCKED_LOCKED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    $"Locked account '{user.Username}' attempted to sign in before lockout expiry.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            var lockedNow = user.RecordFailedLogin(nowUtc);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    lockedNow ? "AUTH_LOCKOUT" : "AUTH_LOGIN_FAILED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    lockedNow
                        ? $"Account '{user.Username}' locked for {User.LockoutDuration.TotalMinutes} minutes after {User.MaxFailedLoginAttempts} failed attempts."
                        : $"Failed login attempt {user.FailedLoginAttempts}/{User.MaxFailedLoginAttempts} for '{user.Username}'.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);

            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        if (user.MustChangePasswordAtNextLogin &&
            (!user.PasswordChangeRequiredUntilUtc.HasValue ||
             user.PasswordChangeRequiredUntilUtc.Value <= nowUtc))
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "AUTH_TEMPORARY_PASSWORD_EXPIRED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    "Temporary password authentication was rejected after its mandatory-change deadline.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        user.RecordSuccessfulLogin(nowUtc);

        var opaqueToken = _tokenGenerator.GenerateOpaqueToken();
        var tokenHash = _tokenGenerator.HashToken(opaqueToken);
        var expiresAtUtc = nowUtc.Add(_sessionPolicy.AbsoluteLifetime);
        if (user.MustChangePasswordAtNextLogin &&
            user.PasswordChangeRequiredUntilUtc is { } passwordChangeDeadline &&
            passwordChangeDeadline < expiresAtUtc)
        {
            expiresAtUtc = passwordChangeDeadline;
        }

        var session = UserSession.Create(
            user.Id,
            tokenHash,
            user.SecurityStamp,
            nowUtc,
            expiresAtUtc,
            metadata.IpAddress,
            metadata.UserAgent);

        await _userRepository.AddSessionAsync(session, ct);
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                user.Id,
                user.Username,
                "AUTH_LOGIN_SUCCESS",
                AuditSeverity.Info,
                "UserSession",
                session.Id.ToString(),
                $"User '{user.Username}' signed in.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _userRepository.SaveChangesAsync(ct);

        var permissions = await _userRepository.GetEffectivePermissionsAsync(user.Id, ct);
        var response = BuildSessionResponse(user, org, permissions);
        return new AuthLoginResult(response, opaqueToken, expiresAtUtc);
    }

    public async Task<SessionResponse?> ValidateSessionAsync(string? opaqueToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(opaqueToken))
            return null;

        var nowUtc = _clock.UtcNow;
        var tokenHash = _tokenGenerator.HashToken(opaqueToken);
        var session = await _userRepository.GetSessionByTokenHashAsync(tokenHash, ct);
        if (session is null || !session.IsValid(nowUtc))
            return null;

        if (session.IsIdleExpired(nowUtc, _sessionPolicy.IdleTimeout))
        {
            session.Revoke(nowUtc);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    session.UserId,
                    null,
                    "AUTH_SESSION_IDLE_EXPIRED",
                    AuditSeverity.Security,
                    "UserSession",
                    session.Id.ToString(),
                    $"Session was revoked after {_sessionPolicy.IdleTimeout.TotalMinutes:0} minutes without activity.",
                    null,
                    null,
                    null),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            return null;
        }

        var user = await _userRepository.GetByIdWithRolesAsync(session.UserId, ct);
        if (user is null || !user.IsActive || user.SecurityStamp != session.SecurityStamp)
        {
            session.Revoke(nowUtc);
            await _userRepository.SaveChangesAsync(ct);
            return null;
        }

        if (user.MustChangePasswordAtNextLogin &&
            (!user.PasswordChangeRequiredUntilUtc.HasValue ||
             user.PasswordChangeRequiredUntilUtc.Value <= nowUtc))
        {
            await _userRepository.RevokeAllUserSessionsAsync(user.Id, nowUtc, ct);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "AUTH_TEMPORARY_PASSWORD_EXPIRED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    "All sessions were revoked after the mandatory temporary-password deadline.",
                    null,
                    null,
                    null),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            return null;
        }

        var org = await _installationRepository.GetOrganizationSettingsAsync(ct);
        if (org is null || !org.IsInitialized)
            return null;

        if (nowUtc - session.LastSeenAtUtc >= _sessionPolicy.TouchInterval)
        {
            session.Touch(nowUtc);
            await _userRepository.SaveChangesAsync(ct);
        }

        var permissions = await _userRepository.GetEffectivePermissionsAsync(user.Id, ct);
        return BuildSessionResponse(user, org, permissions);
    }

    public async Task<SessionResponse> UpdatePreferredLanguageAsync(
        Guid actorUserId,
        UpdatePreferredLanguageRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!user.IsActive)
        {
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");
        }

        if (user.MustChangePasswordAtNextLogin)
        {
            throw new ForbiddenDomainException(
                "PASSWORD_CHANGE_REQUIRED",
                "Change the temporary password before updating account preferences.");
        }

        if (request.ExpectedConcurrencyStamp == Guid.Empty ||
            request.ExpectedConcurrencyStamp != user.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "USER_CONCURRENCY_CONFLICT",
                "This account changed after it was loaded. Reload the session before saving your preference.");
        }

        var organization = await _installationRepository.GetOrganizationSettingsAsync(ct);
        if (organization is null || !organization.IsInitialized)
        {
            throw new ConflictDomainException(
                "SETUP_REQUIRED",
                "System installation must be initialized before updating account preferences.");
        }

        var previousLanguage = user.PreferredLanguage;
        var nowUtc = _clock.UtcNow;
        user.SetPreferredLanguage(request.PreferredLanguage, nowUtc);

        if (!string.Equals(previousLanguage, user.PreferredLanguage, StringComparison.Ordinal))
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "USER_PREFERRED_LANGUAGE_UPDATED",
                    AuditSeverity.Info,
                    "User",
                    user.Id.ToString(),
                    $"Updated the preferred language for '{user.Username}' from '{previousLanguage}' to '{user.PreferredLanguage}'.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);

            // The user mutation and its audit record share the scoped AppDbContext and
            // SaveChanges transaction. A concurrency failure therefore rolls both back.
            await _userRepository.SaveChangesAsync(ct);
        }

        var permissions = await _userRepository.GetEffectivePermissionsAsync(user.Id, ct);
        return BuildSessionResponse(user, organization, permissions);
    }

    public async Task ChangePasswordAsync(
        Guid actorUserId,
        ChangePasswordRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!user.IsActive)
            throw new UnauthorizedDomainException("AUTH_INVALID_CREDENTIALS", "Invalid username or password.");

        var nowUtc = _clock.UtcNow;
        var isForcedRotation = user.MustChangePasswordAtNextLogin;

        if (isForcedRotation &&
            (!user.PasswordChangeRequiredUntilUtc.HasValue ||
             user.PasswordChangeRequiredUntilUtc.Value <= nowUtc))
        {
            await _userRepository.RevokeAllUserSessionsAsync(user.Id, nowUtc, ct);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    "AUTH_TEMPORARY_PASSWORD_EXPIRED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    "Password change was rejected after the temporary credential deadline.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("TEMPORARY_PASSWORD_EXPIRED", "The temporary password has expired. Contact your System Administrator for a new reset.");
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
            !_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            var lockedNow = user.RecordFailedLogin(nowUtc);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    user.Id,
                    user.Username,
                    lockedNow ? "AUTH_LOCKOUT" : "AUTH_PASSWORD_CHANGE_FAILED",
                    AuditSeverity.Security,
                    "User",
                    user.Id.ToString(),
                    lockedNow
                        ? $"Account '{user.Username}' locked for {User.LockoutDuration.TotalMinutes} minutes after {User.MaxFailedLoginAttempts} failed password change attempts."
                        : "A failed current-password verification was recorded during a password change.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            if (lockedNow)
            {
                await _userRepository.RevokeAllUserSessionsAsync(user.Id, nowUtc, ct);
            }
            await _userRepository.SaveChangesAsync(ct);
            throw new UnauthorizedDomainException("PASSWORD_CURRENT_INVALID", "The current password is incorrect.");
        }

        PasswordPolicyValidator.EnsureValid(request.NewPassword);
        if (_passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
            throw new DomainException("PASSWORD_REUSE_NOT_ALLOWED", "Choose a password different from the current password.");

        user.ChangePassword(_passwordHasher.HashPassword(request.NewPassword), nowUtc);
        await _userRepository.RevokeAllUserSessionsAsync(user.Id, nowUtc, ct);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                user.Id,
                user.Username,
                "USER_PASSWORD_CHANGED",
                AuditSeverity.Security,
                "User",
                user.Id.ToString(),
                isForcedRotation
                    ? "User completed the mandatory temporary-password change; all sessions were revoked."
                    : "User changed their own password; all sessions were revoked.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task LogoutAsync(string? opaqueToken, RequestMetadata metadata, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(opaqueToken))
            return;

        var nowUtc = _clock.UtcNow;
        var tokenHash = _tokenGenerator.HashToken(opaqueToken);
        var session = await _userRepository.GetSessionByTokenHashAsync(tokenHash, ct);
        if (session is null || session.IsRevoked)
            return;

        session.Revoke(nowUtc);
        var user = await _userRepository.GetByIdWithRolesAsync(session.UserId, ct);
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                session.UserId,
                user?.Username,
                "AUTH_LOGOUT",
                AuditSeverity.Info,
                "UserSession",
                session.Id.ToString(),
                $"User '{user?.Username ?? session.UserId.ToString()}' signed out.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _userRepository.SaveChangesAsync(ct);
    }

    private static SessionResponse BuildSessionResponse(
        User user,
        OrganizationSettings org,
        IReadOnlyList<string> permissions)
    {
        if (user.MustChangePasswordAtNextLogin)
        {
            var restrictedUser = new AuthenticatedUserResponse(
                user.Id,
                user.Username,
                user.FullName,
                string.Empty,
                null,
                user.IsSystemAdministrator,
                user.IsActive,
                user.PreferredLanguage,
                Array.Empty<string>(),
                Array.Empty<string>(),
                user.LastLoginAtUtc,
                true,
                user.PasswordChangeRequiredUntilUtc)
            {
                ConcurrencyStamp = user.ConcurrencyStamp
            };

            var restrictedOrganization = new OrganizationSummaryResponse(
                Guid.Empty,
                string.Empty,
                null,
                string.Empty,
                null,
                null,
                null,
                null,
                null,
                string.Empty,
                string.Empty,
                string.Empty,
                null,
                null,
                user.PreferredLanguage,
                "DZD");

            return new SessionResponse(restrictedUser, restrictedOrganization);
        }

        var roleCodes = user.UserRoles.Select(ur => ur.Role.Code).Distinct().ToList();
        var canReadOrg = user.IsSystemAdministrator ||
            permissions.Contains("org.read", StringComparer.OrdinalIgnoreCase) ||
            permissions.Contains("org.manage", StringComparer.OrdinalIgnoreCase);
        var canManageOrg = user.IsSystemAdministrator ||
            permissions.Contains("org.manage", StringComparer.OrdinalIgnoreCase);

        return new SessionResponse(
            new AuthenticatedUserResponse(
                user.Id,
                user.Username,
                user.FullName,
                user.Email,
                user.Phone,
                user.IsSystemAdministrator,
                user.IsActive,
                user.PreferredLanguage,
                roleCodes,
                permissions,
                user.LastLoginAtUtc,
                user.MustChangePasswordAtNextLogin,
                user.PasswordChangeRequiredUntilUtc)
            {
                ConcurrencyStamp = user.ConcurrencyStamp
            },
            new OrganizationSummaryResponse(
                org.Id,
                org.LegalName,
                org.TradeName,
                org.LegalForm,
                canReadOrg ? org.Nif : null,
                canReadOrg ? org.Nis : null,
                canReadOrg ? org.TradeRegisterNumber : null,
                canReadOrg ? org.TaxArticleNumber : null,
                canReadOrg ? org.ShareCapitalDzd : null,
                org.WilayaCode,
                org.WilayaName,
                canReadOrg ? org.Address : string.Empty,
                canReadOrg ? org.Phone : null,
                canReadOrg ? org.Email : null,
                org.DefaultLanguage,
                org.CurrencyCode)
            {
                ConcurrencyStamp = canManageOrg ? org.ConcurrencyStamp : Guid.Empty
            });
    }
}
