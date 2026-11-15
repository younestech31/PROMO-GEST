namespace PromoGest.Contracts.Projects;

public sealed record ProjectCustomerListItemDto(
    Guid Id,
    Guid PartyId,
    string CustomerType,
    string DisplayName,
    string? ContactPerson,
    string Phone,
    string? Email,
    string Status,
    string Source,
    DateTimeOffset UpdatedAtUtc,
    int InteractionCount,
    bool HasIdentityDocument,
    Guid ConcurrencyStamp);

public sealed record CustomerIdentityDocumentDto(
    Guid Id,
    string OriginalFileName,
    string Category,
    long SizeBytes);

public sealed record CustomerInteractionDto(
    Guid Id,
    string Type,
    string Subject,
    string Summary,
    DateTimeOffset OccurredAtUtc,
    DateTimeOffset? NextFollowUpAtUtc,
    string CreatedByFullName);

public sealed record ProjectCustomerDto(
    Guid Id,
    Guid PartyId,
    Guid PartyConcurrencyStamp,
    Guid ProjectId,
    string CustomerType,
    string DisplayName,
    string? ContactPerson,
    string Phone,
    string? Email,
    string? Address,
    string PreferredLanguage,
    string Source,
    string Status,
    CustomerIdentityDocumentDto? IdentityDocument,
    IReadOnlyList<CustomerInteractionDto> Interactions,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    Guid ConcurrencyStamp);

public sealed record CreateProjectCustomerRequest(
    string CustomerType,
    string DisplayName,
    string? ContactPerson,
    string Phone,
    string? Email,
    string? Address,
    string PreferredLanguage,
    string Source,
    Guid? IdentityDocumentStoredFileId,
    Guid? PartyId = null);

public sealed record PartyDirectoryItemDto(
    Guid Id,
    string Kind,
    string DisplayName,
    Guid ConcurrencyStamp);

public sealed record UpdatePartyIdentityRequest(
    string Kind,
    string DisplayName,
    Guid ConcurrencyStamp);

public sealed record UpdateProjectCustomerRequest(
    string CustomerType,
    string DisplayName,
    string? ContactPerson,
    string Phone,
    string? Email,
    string? Address,
    string PreferredLanguage,
    string Source,
    string Status,
    Guid? IdentityDocumentStoredFileId,
    Guid ConcurrencyStamp,
    Guid PartyConcurrencyStamp);

public sealed record AddCustomerInteractionRequest(
    string Type,
    string Subject,
    string Summary,
    DateTimeOffset? OccurredAtUtc,
    DateTimeOffset? NextFollowUpAtUtc);