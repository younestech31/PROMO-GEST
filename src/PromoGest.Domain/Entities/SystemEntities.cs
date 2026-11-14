using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed class AuditLog
{
    private AuditLog() { }

    public Guid Id { get; private set; } = Guid.NewGuid();
    public DateTimeOffset OccurredAtUtc { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string? ActorUsername { get; private set; }
    public string EventType { get; private set; } = string.Empty;
    public AuditSeverity Severity { get; private set; }
    public string? TargetEntityType { get; private set; }
    public string? TargetEntityId { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string? MetadataJson { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }

    public static AuditLog Record(
        DateTimeOffset occurredAtUtc,
        Guid? actorUserId,
        string? actorUsername,
        string eventType,
        AuditSeverity severity,
        string? targetEntityType,
        string? targetEntityId,
        string summary,
        string? metadataJson = null,
        string? ipAddress = null,
        string? userAgent = null)
    {
        return new AuditLog
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = occurredAtUtc,
            ActorUserId = actorUserId,
            ActorUsername = SanitizeAndTruncate(actorUsername, 64),
            EventType = (SanitizeAndTruncate(eventType, 64) ?? "UNKNOWN").ToUpperInvariant(),
            Severity = severity,
            TargetEntityType = SanitizeAndTruncate(targetEntityType, 64),
            TargetEntityId = SanitizeAndTruncate(targetEntityId, 64),
            Summary = SanitizeAndTruncate(summary, 500) ?? string.Empty,
            MetadataJson = metadataJson,
            IpAddress = SanitizeAndTruncate(ipAddress, 64),
            UserAgent = SanitizeAndTruncate(userAgent, 300)
        };
    }

    internal static string? SanitizeAndTruncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var cleaned = value.Trim()
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal);

        return cleaned.Length <= maxLength ? cleaned : cleaned[..maxLength];
    }
}

public sealed class SystemSetting : BaseEntity
{
    private SystemSetting() { }

    public string Key { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public string Category { get; private set; } = "General";
    public bool IsEncrypted { get; private set; }
    public string? Description { get; private set; }

    public static SystemSetting Create(
        string key,
        string value,
        string category,
        bool isEncrypted,
        string? description,
        DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new DomainException("SETTING_KEY_REQUIRED", "Setting key is required.");

        return new SystemSetting
        {
            Id = Guid.NewGuid(),
            Key = key.Trim(),
            Value = value,
            Category = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim(),
            IsEncrypted = isEncrypted,
            Description = description,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdateValue(string value, DateTimeOffset nowUtc)
    {
        Value = value;
        Touch(nowUtc);
    }
}

public sealed class StoredFile : BaseEntity
{
    private StoredFile() { }

    public string OriginalFileName { get; private set; } = string.Empty;
    public string StoredRelativePath { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string Sha256Checksum { get; private set; } = string.Empty;
    public string Category { get; private set; } = "Other";
    public string? Description { get; private set; }
    public StoredFileScope Scope { get; private set; }
    public Guid? ProjectId { get; private set; }
    public Guid UploadedByUserId { get; private set; }

    public static StoredFile Create(
        string originalFileName,
        string storedRelativePath,
        string contentType,
        long sizeBytes,
        string sha256Checksum,
        string category,
        string? description,
        StoredFileScope scope,
        Guid? projectId,
        Guid uploadedByUserId,
        DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(originalFileName))
            throw new DomainException("FILE_NAME_REQUIRED", "Original file name is required.");
        if (string.IsNullOrWhiteSpace(storedRelativePath))
            throw new DomainException("FILE_PATH_REQUIRED", "Stored relative path is required.");
        if (sizeBytes <= 0)
            throw new DomainException("FILE_SIZE_INVALID", "Stored file size must be greater than zero.");
        if (string.IsNullOrWhiteSpace(sha256Checksum) || sha256Checksum.Length != 64)
            throw new DomainException("FILE_CHECKSUM_INVALID", "Valid SHA-256 checksum is required.");
        if (string.IsNullOrWhiteSpace(category) || category.Trim().Length > 40)
            throw new DomainException("FILE_CATEGORY_INVALID", "A valid document category is required.");
        if (description is not null && description.Trim().Length > 500)
            throw new DomainException("FILE_DESCRIPTION_TOO_LONG", "Document description must not exceed 500 characters.");

        var safeName = originalFileName.Trim().Replace('\\', '/');
        return new StoredFile
        {
            Id = Guid.NewGuid(),
            OriginalFileName = Path.GetFileName(safeName),
            StoredRelativePath = storedRelativePath.Trim(),
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim(),
            SizeBytes = sizeBytes,
            Sha256Checksum = sha256Checksum.ToLowerInvariant(),
            Category = category.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            Scope = scope,
            ProjectId = projectId,
            UploadedByUserId = uploadedByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }
}

public sealed class UserSession
{
    private UserSession() { }

    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public string TokenHash { get; private set; } = string.Empty;
    public Guid SecurityStamp { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset LastSeenAtUtc { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public bool IsRevoked { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }

    public static UserSession Create(
        Guid userId,
        string tokenHash,
        Guid securityStamp,
        DateTimeOffset createdAtUtc,
        DateTimeOffset expiresAtUtc,
        string? ipAddress,
        string? userAgent)
    {
        return new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            SecurityStamp = securityStamp,
            CreatedAtUtc = createdAtUtc,
            ExpiresAtUtc = expiresAtUtc,
            LastSeenAtUtc = createdAtUtc,
            IpAddress = AuditLog.SanitizeAndTruncate(ipAddress, 64),
            UserAgent = AuditLog.SanitizeAndTruncate(userAgent, 300),
            IsRevoked = false
        };
    }

    public bool IsValid(DateTimeOffset nowUtc)
        => !IsRevoked && ExpiresAtUtc > nowUtc;

    public void Touch(DateTimeOffset nowUtc)
    {
        LastSeenAtUtc = nowUtc;
    }

    public void Revoke(DateTimeOffset nowUtc)
    {
        IsRevoked = true;
        RevokedAtUtc = nowUtc;
    }
}
