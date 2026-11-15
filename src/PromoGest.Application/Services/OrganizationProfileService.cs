using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Organization;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Application.Services;

public sealed class OrganizationProfileService
{
    private const string ManagePermission = "org.manage";

    private readonly IInstallationRepository _installationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly PromoGest.Domain.Interfaces.IClock _clock;

    public OrganizationProfileService(
        IInstallationRepository installationRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        PromoGest.Domain.Interfaces.IClock clock)
    {
        _installationRepository = installationRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<OrganizationSummaryResponse> UpdateAsync(
        Guid actorUserId,
        UpdateOrganizationProfileRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
        {
            await RecordAccessDeniedAsync(
                actor,
                "Inactive account attempted to update organization profile.",
                metadata,
                ct);
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");
        }

        if (!actor.IsSystemAdministrator)
        {
            var permissions = await _userRepository.GetEffectivePermissionsAsync(actor.Id, ct);
            if (!permissions.Contains(ManagePermission, StringComparer.OrdinalIgnoreCase))
            {
                await RecordAccessDeniedAsync(
                    actor,
                    "User attempted to update organization profile without org.manage permission.",
                    metadata,
                    ct);
                throw new ForbiddenDomainException(
                    "FORBIDDEN_ORGANIZATION_MANAGE",
                    "You do not have permission to manage the organization profile.");
            }
        }

        var organization = await _installationRepository.GetOrganizationSettingsAsync(ct)
            ?? throw new NotFoundDomainException(
                "ORGANIZATION_NOT_FOUND",
                "Organization settings have not been initialized.");

        if (request.ExpectedConcurrencyStamp == Guid.Empty ||
            request.ExpectedConcurrencyStamp != organization.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "ORG_CONCURRENCY_CONFLICT",
                "The organization profile changed after it was loaded. Reload the latest data before saving.");
        }

        var nowUtc = _clock.UtcNow;
        organization.UpdateProfile(
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
            request.Phone,
            request.Email,
            request.DefaultLanguage,
            nowUtc);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "ORGANIZATION_PROFILE_UPDATED",
                AuditSeverity.Info,
                "OrganizationSettings",
                organization.Id.ToString(),
                "Updated organization legal, fiscal, and contact profile fields.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _installationRepository.SaveChangesAsync(ct);

        return MapOrganization(organization);
    }

    private async Task RecordAccessDeniedAsync(
        User actor,
        string reason,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                "ACCESS_DENIED",
                AuditSeverity.Security,
                "OrganizationSettings",
                null,
                reason,
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _installationRepository.SaveChangesAsync(ct);
    }

    private static OrganizationSummaryResponse MapOrganization(OrganizationSettings organization)
        => new(
            organization.Id,
            organization.LegalName,
            organization.TradeName,
            organization.LegalForm,
            organization.Nif,
            organization.Nis,
            organization.TradeRegisterNumber,
            organization.TaxArticleNumber,
            organization.ShareCapitalDzd,
            organization.WilayaCode,
            organization.WilayaName,
            organization.Address,
            organization.Phone,
            organization.Email,
            organization.DefaultLanguage,
            organization.CurrencyCode,
            organization.ConcurrencyStamp);
}
