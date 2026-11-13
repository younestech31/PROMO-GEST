using PromoGest.Application.Interfaces;
using PromoGest.Application.Validators;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

/// <summary>
/// Local-server-console-only recovery workflow for the single System Administrator account.
/// Never exposed via HTTP endpoints.
/// </summary>
public sealed class AdminRecoveryService
{
    private readonly IInstallationRepository _installationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public AdminRecoveryService(
        IInstallationRepository installationRepository,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _installationRepository = installationRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<string> UnlockSystemAdministratorAsync(string localOperator, CancellationToken ct = default)
    {
        var nowUtc = _clock.UtcNow;
        var username = string.Empty;

        await _installationRepository.ExecuteInSerializableTransactionAsync(async innerCt =>
        {
            var isInitialized = await _installationRepository.IsInitializedAsync(innerCt);
            if (!isInitialized)
                throw new ConflictDomainException("SETUP_REQUIRED", "Installation is not initialized yet.");

            var admin = await _userRepository.GetSystemAdministratorAsync(innerCt)
                ?? throw new NotFoundDomainException("SYSTEM_ADMIN_NOT_FOUND", "Single System Administrator account was not found.");

            admin.UnlockAccount(nowUtc);
            username = admin.Username;

            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    admin.Id,
                    admin.Username,
                    "ADMIN_LOCAL_UNLOCK",
                    AuditSeverity.Security,
                    "User",
                    admin.Id.ToString(),
                    $"System Administrator '{admin.Username}' unlocked via local server console by OS operator '{localOperator}'.",
                    null,
                    "127.0.0.1",
                    "PromoGest.LocalConsoleRecovery"),
                innerCt);

            await _userRepository.SaveChangesAsync(innerCt);
        }, ct);

        return username;
    }

    public async Task<string> ResetSystemAdministratorPasswordAsync(
        string newPassword,
        string localOperator,
        CancellationToken ct = default)
    {
        PasswordPolicyValidator.EnsureValid(newPassword);

        var nowUtc = _clock.UtcNow;
        var username = string.Empty;

        await _installationRepository.ExecuteInSerializableTransactionAsync(async innerCt =>
        {
            var isInitialized = await _installationRepository.IsInitializedAsync(innerCt);
            if (!isInitialized)
                throw new ConflictDomainException("SETUP_REQUIRED", "Installation is not initialized yet.");

            var admin = await _userRepository.GetSystemAdministratorAsync(innerCt)
                ?? throw new NotFoundDomainException("SYSTEM_ADMIN_NOT_FOUND", "Single System Administrator account was not found.");

            var passwordHash = _passwordHasher.HashPassword(newPassword);
            admin.ResetPassword(passwordHash, nowUtc);
            await _userRepository.RevokeAllUserSessionsAsync(admin.Id, nowUtc, innerCt);
            username = admin.Username;

            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    admin.Id,
                    admin.Username,
                    "ADMIN_LOCAL_PASSWORD_RECOVERY",
                    AuditSeverity.Security,
                    "User",
                    admin.Id.ToString(),
                    $"System Administrator '{admin.Username}' password recovered and active sessions revoked via local server console by OS operator '{localOperator}'.",
                    null,
                    "127.0.0.1",
                    "PromoGest.LocalConsoleRecovery"),
                innerCt);

            await _userRepository.SaveChangesAsync(innerCt);
        }, ct);

        return username;
    }
}
