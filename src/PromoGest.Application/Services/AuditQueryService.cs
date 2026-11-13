using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Audit;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class AuditQueryService
{
    private readonly IUserRepository _userRepository;
    private readonly IAuditQueryRepository _auditQueryRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public AuditQueryService(
        IUserRepository userRepository,
        IAuditQueryRepository auditQueryRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _userRepository = userRepository;
        _auditQueryRepository = auditQueryRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<AuditLogDto>> ListRecentAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        int limit = 100,
        CancellationToken ct = default)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "AuditLog",
                    null,
                    $"Inactive account '{actor.Username}' attempted to query security audit logs.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");
        }

        var permissions = await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);
        if (!actor.IsSystemAdministrator && !permissions.Contains("audit.read", StringComparer.OrdinalIgnoreCase))
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "AuditLog",
                    null,
                    $"Unauthorized audit log read attempt by '{actor.Username}'.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _userRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException("FORBIDDEN_AUDIT_READ", "You do not have permission to view security audit logs.");
        }

        var clampedLimit = Math.Clamp(limit, 1, 250);
        var logs = await _auditQueryRepository.ListRecentAsync(clampedLimit, ct);
        return logs.Select(l => new AuditLogDto(
            l.Id,
            l.OccurredAtUtc,
            l.ActorUserId,
            l.ActorUsername,
            l.EventType,
            l.Severity.ToString(),
            l.TargetEntityType,
            l.TargetEntityId,
            l.Summary,
            l.IpAddress)).ToList();
    }
}
