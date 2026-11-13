namespace PromoGest.Contracts.Audit;

public sealed record AuditLogDto(
    Guid Id,
    DateTimeOffset OccurredAtUtc,
    Guid? ActorUserId,
    string? ActorUsername,
    string EventType,
    string Severity,
    string? TargetEntityType,
    string? TargetEntityId,
    string Summary,
    string? IpAddress);

public sealed record HealthStatusResponse(
    string Status,
    bool DatabaseConnected,
    bool IsInitialized,
    DateTimeOffset TimestampUtc,
    string EnvironmentMode);
