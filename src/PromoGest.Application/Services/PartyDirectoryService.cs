using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class PartyDirectoryService
{
    private const string DirectoryReadPermission = "parties.directory.read";
    private const string IdentityManagePermission = "parties.identity.manage";
    private const int MaximumSearchResults = 25;

    private readonly IPartyRepository _partyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public PartyDirectoryService(
        IPartyRepository partyRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _partyRepository = partyRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<PartyDirectoryItemDto>> SearchAsync(
        Guid actorUserId,
        string? query,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, permissions) = await GetActorAsync(actorUserId, metadata, ct);
        await EnsurePermissionAsync(
            actor, permissions, DirectoryReadPermission, "PARTY_DIRECTORY_ACCESS_DENIED",
            "PartyDirectory", null, metadata, ct);

        var normalizedQuery = NormalizeSearchQuery(query);
        var parties = await _partyRepository.SearchDirectoryAsync(
            normalizedQuery.ToUpperInvariant(),
            MaximumSearchResults,
            ct);

        await WriteAuditAsync(
            actor,
            "PARTY_DIRECTORY_SEARCHED",
            "PartyDirectory",
            null,
            "Searched the organization-wide Party directory.",
            new { resultCount = parties.Count },
            metadata,
            ct);

        return parties.Select(MapDirectoryItem).ToList();
    }

    public async Task<PartyDirectoryItemDto> UpdateIdentityAsync(
        Guid actorUserId,
        Guid partyId,
        UpdatePartyIdentityRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, permissions) = await GetActorAsync(actorUserId, metadata, ct);
        await EnsurePermissionAsync(
            actor, permissions, IdentityManagePermission, "PARTY_IDENTITY_MANAGE_REQUIRED",
            "Party", partyId.ToString(), metadata, ct);

        var party = await _partyRepository.GetByIdAsync(partyId, ct)
            ?? throw new NotFoundDomainException("PARTY_NOT_FOUND", "Party identity was not found.");

        if (request.ConcurrencyStamp == Guid.Empty ||
            request.ConcurrencyStamp != party.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "PARTY_CONCURRENCY_CONFLICT",
                "The Party identity changed after it was loaded. Reload the directory entry before saving.");
        }

        if (!Enum.TryParse<PartyKind>(request.Kind, true, out var kind) || !Enum.IsDefined(kind))
            throw new DomainException("PARTY_KIND_INVALID", "Select a person or legal entity.");

        var nowUtc = _clock.UtcNow;
        var normalizedDisplayName = NormalizeIdentityName(request.DisplayName);
        var hasChanged = party.Kind != kind ||
            !string.Equals(party.NormalizedDisplayName, normalizedDisplayName.ToUpperInvariant(), StringComparison.Ordinal);

        if (hasChanged)
        {
            var previousKind = party.Kind;
            party.UpdateIdentity(kind, normalizedDisplayName, nowUtc);
            await WriteAuditAsync(
                actor,
                "PARTY_IDENTITY_UPDATED",
                "Party",
                party.Id.ToString(),
                "Updated a canonical Party identity.",
                new { partyId = party.Id, previousKind = previousKind.ToString(), newKind = kind.ToString() },
                metadata,
                ct);
        }

        return MapDirectoryItem(party);
    }

    private async Task<(User Actor, IReadOnlyList<string> Permissions)> GetActorAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");

        var permissions = actor.IsSystemAdministrator
            ? Array.Empty<string>()
            : await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);

        return (actor, permissions);
    }

    private async Task EnsurePermissionAsync(
        User actor,
        IReadOnlyList<string> permissions,
        string requiredPermission,
        string errorCode,
        string targetEntityType,
        string? targetEntityId,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        if (actor.IsSystemAdministrator ||
            permissions.Contains(requiredPermission, StringComparer.OrdinalIgnoreCase))
        {
            return;
        }

        await WriteAuditAsync(
            actor,
            "ACCESS_DENIED",
            targetEntityType,
            targetEntityId,
            $"Denied Party directory operation; required permission '{requiredPermission}'.",
            new { requiredPermission, errorCode },
            metadata,
            ct);

        throw new ForbiddenDomainException(
            errorCode,
            "You do not have permission to access or manage the organization-wide Party directory.");
    }

    private async Task WriteAuditAsync(
        User actor,
        string eventType,
        string targetEntityType,
        string? targetEntityId,
        string summary,
        object auditMetadata,
        RequestMetadata requestMetadata,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                eventType,
                eventType == "ACCESS_DENIED" ? AuditSeverity.Security : AuditSeverity.Info,
                targetEntityType,
                targetEntityId,
                summary,
                JsonSerializer.Serialize(auditMetadata),
                requestMetadata.IpAddress,
                requestMetadata.UserAgent),
            ct);
        await _partyRepository.SaveChangesAsync(ct);
    }

    private static string NormalizeSearchQuery(string? query)
    {
        var value = Regex.Replace(
            (query ?? string.Empty).Normalize(NormalizationForm.FormKC).Trim(),
            @"\s+",
            " ");

        if (value.Length < 2 || value.Length > 100)
            throw new DomainException(
                "PARTY_SEARCH_QUERY_INVALID",
                "Enter between 2 and 100 characters to search the Party directory.");

        return value;
    }

    private static string NormalizeIdentityName(string? displayName)
    {
        var value = Regex.Replace(
            (displayName ?? string.Empty).Normalize(NormalizationForm.FormKC).Trim(),
            @"\s+",
            " ");
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("PARTY_NAME_REQUIRED", "A Party display name is required.");
        if (value.Length > 200)
            throw new DomainException("PARTY_NAME_TOO_LONG", "A Party display name must not exceed 200 characters.");
        return value;
    }

    private static PartyDirectoryItemDto MapDirectoryItem(Party party)
        => new(
            party.Id,
            party.Kind.ToString(),
            party.DisplayName,
            party.ConcurrencyStamp);
}
