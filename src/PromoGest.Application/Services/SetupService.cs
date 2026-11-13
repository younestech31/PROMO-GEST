using PromoGest.Application.Interfaces;
using PromoGest.Application.Validators;
using PromoGest.Contracts.Setup;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed record RequestMetadata(string? IpAddress, string? UserAgent);

public sealed class SetupService
{
    private readonly IInstallationRepository _installationRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public SetupService(
        IInstallationRepository installationRepository,
        IPasswordHasher passwordHasher,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _installationRepository = installationRepository;
        _passwordHasher = passwordHasher;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<SetupStatusResponse> GetStatusAsync(CancellationToken ct = default)
    {
        var org = await _installationRepository.GetOrganizationSettingsAsync(ct);
        if (org is null || !org.IsInitialized)
        {
            return new SetupStatusResponse(false, null, "ar", null);
        }

        return new SetupStatusResponse(
            true,
            org.LegalName,
            org.DefaultLanguage,
            org.InitializedAtUtc);
    }

    public async Task<InitializeInstallationResponse> InitializeAsync(
        InitializeInstallationRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        PasswordPolicyValidator.EnsureValid(request.AdminPassword);

        OrganizationSettings? createdOrg = null;
        User? createdAdmin = null;
        var nowUtc = _clock.UtcNow;

        await _installationRepository.ExecuteInSerializableTransactionAsync(async innerCt =>
        {
            var alreadyInitialized = await _installationRepository.IsInitializedAsync(innerCt);
            var hasAdmin = await _installationRepository.HasSystemAdministratorAsync(innerCt);

            if (alreadyInitialized || hasAdmin)
            {
                throw new ConflictDomainException(
                    "SETUP_ALREADY_INITIALIZED",
                    "Installation has already been initialized and cannot be re-initialized.");
            }

            var adminRole = await _installationRepository.GetRoleByCodeAsync(Role.SystemAdminCode, innerCt)
                ?? throw new DomainException("SYSTEM_ADMIN_ROLE_MISSING", "System Administrator role seed is missing.");

            createdOrg = OrganizationSettings.Initialize(
                request.LegalName,
                request.TradeName,
                request.LegalForm,
                request.Nif,
                request.Nis,
                request.TradeRegisterNumber,
                request.TaxArticleNumber,
                request.ShareCapitalDzd,
                request.WilayaCode,
                request.WilayaName,
                request.Address,
                request.OrganizationPhone,
                request.OrganizationEmail,
                request.DefaultLanguage,
                nowUtc);

            var passwordHash = _passwordHasher.HashPassword(request.AdminPassword);
            createdAdmin = User.CreateSystemAdministrator(
                request.AdminUsername,
                request.AdminFullName,
                request.AdminEmail,
                request.AdminPhone,
                passwordHash,
                request.DefaultLanguage,
                nowUtc);

            await _installationRepository.AddOrganizationSettingsAsync(createdOrg, innerCt);
            await _installationRepository.AddUserAsync(createdAdmin, innerCt);
            await _installationRepository.AddUserRoleAsync(
                UserRole.Create(createdAdmin.Id, adminRole.Id, createdAdmin.Id, nowUtc),
                innerCt);

            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    createdAdmin.Id,
                    createdAdmin.Username,
                    "SETUP_INITIALIZED",
                    AuditSeverity.Security,
                    "OrganizationSettings",
                    createdOrg.Id.ToString(),
                    $"Installation initialized for '{createdOrg.LegalName}' with single System Administrator '{createdAdmin.Username}'.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                innerCt);

            await _installationRepository.SaveChangesAsync(innerCt);
        }, ct);

        return new InitializeInstallationResponse(
            createdOrg!.Id,
            createdOrg.LegalName,
            createdAdmin!.Id,
            createdAdmin.Username,
            nowUtc);
    }
}
