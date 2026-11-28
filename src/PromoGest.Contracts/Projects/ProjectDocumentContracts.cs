namespace PromoGest.Contracts.Projects;

public sealed record ProjectDocumentDto(
    Guid Id,
    string OriginalFileName,
    string Category,
    string? Description,
    string ContentType,
    long SizeBytes,
    string Sha256Checksum,
    Guid UploadedByUserId,
    string UploadedByFullName,
    DateTimeOffset CreatedAtUtc,
    bool IsCustomerIdentitySensitive,
    bool RequiresSensitivityReview,
    Guid ConcurrencyStamp);

public sealed record ReviewProjectDocumentSensitivityRequest(bool? IsCustomerIdentitySensitive, Guid ExpectedConcurrencyStamp);
