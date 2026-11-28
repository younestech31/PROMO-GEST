using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Reference;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

/// <summary>
/// Read-only preactivation inspection for the existing active System Administrator.
/// Never publishes a staged version or changes the public setup/project reference.
/// </summary>
public sealed class StagedAdministrativeReferenceService(
    IUserRepository users, IAdministrativeReferenceReadRepository references,
    IAuditWriter audit, IClock clock)
{
    public async Task<StagedAdministrativeSnapshotDto> GetSnapshotAsync(
        Guid actorId, string snapshotId, RequestMetadata metadata, CancellationToken ct = default)
    {
        await RequireAdministratorAsync(actorId, metadata, ct);
        ValidateSnapshotId(snapshotId);
        return await references.GetSnapshotAsync(snapshotId, ct)
            ?? throw MissingSnapshot();
    }

    public async Task<StagedAdministrativeCommunePageDto> GetCommunesAsync(
        Guid actorId, string snapshotId, string? wilayaCode, string? query, int page, int pageSize,
        RequestMetadata metadata, CancellationToken ct = default)
    {
        await RequireAdministratorAsync(actorId, metadata, ct);
        ValidateSnapshotId(snapshotId);
        wilayaCode = string.IsNullOrWhiteSpace(wilayaCode) ? null : wilayaCode.Trim();
        query = string.IsNullOrWhiteSpace(query) ? null : query.Trim();
        if (page < 1 || pageSize is < 1 or > 100 || (long)(page - 1) * pageSize > int.MaxValue
            || query?.Length > 100
            || (wilayaCode is not null && (wilayaCode.Length != 2 || wilayaCode.Any(c => c is < '0' or > '9'))))
            throw new DomainException("REFERENCE_QUERY_INVALID", "Reference filters or pagination are invalid.");
        return await references.GetCommunesAsync(snapshotId, wilayaCode, query, page, pageSize, ct)
            ?? throw MissingSnapshot();
    }

    private async Task RequireAdministratorAsync(Guid actorId, RequestMetadata metadata, CancellationToken ct)
    {
        var actor = await users.GetByIdWithRolesAsync(actorId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");
        if (actor.IsActive && actor.IsSystemAdministrator) return;
        await audit.WriteAsync(AuditLog.Record(
            clock.UtcNow, actor.Id, actor.Username, "ACCESS_DENIED", AuditSeverity.Security,
            "AdministrativeReference", null,
            "Staged reference inspection requires the active System Administrator.",
            null, metadata.IpAddress, metadata.UserAgent), ct);
        await users.SaveChangesAsync(ct);
        throw new ForbiddenDomainException("FORBIDDEN_REFERENCE_INSPECTION",
            "Only the active System Administrator can inspect staged administrative references.");
    }

    private static void ValidateSnapshotId(string value)
    {
        const string prefix = "sheets-sha256-";
        if (value.Length != 78 || !value.StartsWith(prefix, StringComparison.Ordinal)
            || value.AsSpan(prefix.Length).ContainsAnyExcept("0123456789abcdef"))
            throw new DomainException("REFERENCE_SNAPSHOT_INVALID", "A complete canonical reference snapshot ID is required.");
    }

    private static NotFoundDomainException MissingSnapshot() => new(
        "REFERENCE_SNAPSHOT_NOT_FOUND", "The requested staged snapshot was not found. It may have been removed.");
}
