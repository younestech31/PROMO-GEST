using System.Text;
using System.Text.RegularExpressions;
using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed class ProjectCustomer : BaseEntity
{
    private readonly List<CustomerInteraction> _interactions = new();

    private ProjectCustomer() { }

    public Guid ProjectId { get; private set; }
    public CustomerType CustomerType { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string NormalizedDisplayName { get; private set; } = string.Empty;
    public string? ContactPerson { get; private set; }
    public string Phone { get; private set; } = string.Empty;
    public string NormalizedPhone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? NormalizedEmail { get; private set; }
    public string? Address { get; private set; }
    public string PreferredLanguage { get; private set; } = "ar";
    public CustomerSource Source { get; private set; }
    public ProjectCustomerStatus Status { get; private set; } = ProjectCustomerStatus.Prospect;
    public Guid? IdentityDocumentStoredFileId { get; private set; }
    public StoredFile? IdentityDocumentFile { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public IReadOnlyCollection<CustomerInteraction> Interactions => _interactions.AsReadOnly();

    public static ProjectCustomer Create(
        Guid projectId,
        CustomerType customerType,
        string displayName,
        string? contactPerson,
        string phone,
        string? email,
        string? address,
        string preferredLanguage,
        CustomerSource source,
        Guid? identityDocumentStoredFileId,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (projectId == Guid.Empty || createdByUserId == Guid.Empty)
            throw new DomainException("CUSTOMER_REFERENCE_INVALID", "A valid project and creator are required.");

        var normalized = NormalizeAndValidate(
            customerType, displayName, contactPerson, phone, email, address, preferredLanguage, source);

        return new ProjectCustomer
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            CustomerType = customerType,
            DisplayName = normalized.DisplayName,
            NormalizedDisplayName = normalized.NormalizedDisplayName,
            ContactPerson = normalized.ContactPerson,
            Phone = normalized.Phone,
            NormalizedPhone = normalized.NormalizedPhone,
            Email = normalized.Email,
            NormalizedEmail = normalized.NormalizedEmail,
            Address = normalized.Address,
            PreferredLanguage = normalized.PreferredLanguage,
            Source = source,
            Status = ProjectCustomerStatus.Prospect,
            IdentityDocumentStoredFileId = identityDocumentStoredFileId,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdateDetails(
        CustomerType customerType,
        string displayName,
        string? contactPerson,
        string phone,
        string? email,
        string? address,
        string preferredLanguage,
        CustomerSource source,
        ProjectCustomerStatus status,
        Guid? identityDocumentStoredFileId,
        DateTimeOffset nowUtc)
    {
        var normalized = NormalizeAndValidate(
            customerType, displayName, contactPerson, phone, email, address, preferredLanguage, source);

        if (!Enum.IsDefined(status))
            throw new DomainException("CUSTOMER_STATUS_INVALID", "Select a valid customer status.");

        CustomerType = customerType;
        DisplayName = normalized.DisplayName;
        NormalizedDisplayName = normalized.NormalizedDisplayName;
        ContactPerson = normalized.ContactPerson;
        Phone = normalized.Phone;
        NormalizedPhone = normalized.NormalizedPhone;
        Email = normalized.Email;
        NormalizedEmail = normalized.NormalizedEmail;
        Address = normalized.Address;
        PreferredLanguage = normalized.PreferredLanguage;
        Source = source;
        Status = status;
        IdentityDocumentStoredFileId = identityDocumentStoredFileId;
        Touch(nowUtc);
    }

    private static (
        string DisplayName,
        string NormalizedDisplayName,
        string? ContactPerson,
        string Phone,
        string NormalizedPhone,
        string? Email,
        string? NormalizedEmail,
        string? Address,
        string PreferredLanguage) NormalizeAndValidate(
            CustomerType customerType,
            string displayName,
            string? contactPerson,
            string phone,
            string? email,
            string? address,
            string preferredLanguage,
            CustomerSource source)
    {
        if (!Enum.IsDefined(customerType))
            throw new DomainException("CUSTOMER_TYPE_INVALID", "Select an individual or legal entity.");
        if (!Enum.IsDefined(source))
            throw new DomainException("CUSTOMER_SOURCE_INVALID", "Select a valid customer source.");

        var name = NormalizeWhitespace(displayName);
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("CUSTOMER_NAME_REQUIRED", "Customer or legal-entity name is required.");
        if (name.Length > 200)
            throw new DomainException("CUSTOMER_NAME_TOO_LONG", "Customer name must not exceed 200 characters.");

        var normalizedPhone = NormalizePhone(phone);
        var cleanedPhone = (phone ?? string.Empty).Trim();
        if (cleanedPhone.Length > 40 || normalizedPhone.Length is < 7 or > 15)
            throw new DomainException("CUSTOMER_PHONE_INVALID", "Enter a valid contact phone number containing 7 to 15 digits.");

        var cleanedContactPerson = string.IsNullOrWhiteSpace(contactPerson) ? null : NormalizeWhitespace(contactPerson);
        if (cleanedContactPerson is { Length: > 150 })
            throw new DomainException("CUSTOMER_CONTACT_TOO_LONG", "Contact person must not exceed 150 characters.");

        var cleanedEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        if (cleanedEmail is not null &&
            (cleanedEmail.Length > 254 || cleanedEmail.Any(char.IsWhiteSpace) ||
             cleanedEmail.Count(character => character == '@') != 1 ||
             cleanedEmail.StartsWith('@') || cleanedEmail.EndsWith('@')))
        {
            throw new DomainException("CUSTOMER_EMAIL_INVALID", "Enter a valid email address.");
        }

        var cleanedAddress = string.IsNullOrWhiteSpace(address) ? null : address.Trim();
        if (cleanedAddress is { Length: > 300 })
            throw new DomainException("CUSTOMER_ADDRESS_TOO_LONG", "Address must not exceed 300 characters.");

        var language = (preferredLanguage ?? string.Empty).Trim().ToLowerInvariant();
        if (language is not ("ar" or "fr"))
            throw new DomainException("CUSTOMER_LANGUAGE_INVALID", "Preferred language must be Arabic or French.");

        return (
            name,
            NormalizeName(name),
            cleanedContactPerson,
            cleanedPhone,
            normalizedPhone,
            cleanedEmail,
            cleanedEmail?.ToUpperInvariant(),
            cleanedAddress,
            language);
    }

    private static string NormalizeWhitespace(string? value)
        => Regex.Replace((value ?? string.Empty).Normalize(NormalizationForm.FormKC).Trim(), @"\s+", " ");

    private static string NormalizeName(string value)
        => NormalizeWhitespace(value).ToUpperInvariant();

    private static string NormalizePhone(string? value)
        => new((value ?? string.Empty).Where(char.IsAsciiDigit).ToArray());
}

public sealed class CustomerInteraction : BaseEntity
{
    private CustomerInteraction() { }

    public Guid ProjectCustomerId { get; private set; }
    public ProjectCustomer ProjectCustomer { get; private set; } = null!;
    public CustomerInteractionType Type { get; private set; }
    public string Subject { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; private set; }
    public DateTimeOffset? NextFollowUpAtUtc { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public User CreatedByUser { get; private set; } = null!;

    public static CustomerInteraction Create(
        Guid projectCustomerId,
        CustomerInteractionType type,
        string subject,
        string summary,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset? nextFollowUpAtUtc,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (projectCustomerId == Guid.Empty || createdByUserId == Guid.Empty)
            throw new DomainException("CUSTOMER_INTERACTION_REFERENCE_INVALID", "A valid customer and employee are required.");
        if (!Enum.IsDefined(type))
            throw new DomainException("CUSTOMER_INTERACTION_TYPE_INVALID", "Select a valid interaction type.");

        var normalizedSubject = NormalizeWhitespace(subject);
        var normalizedSummary = NormalizeWhitespace(summary);
        if (string.IsNullOrWhiteSpace(normalizedSubject))
            throw new DomainException("CUSTOMER_INTERACTION_SUBJECT_REQUIRED", "Interaction subject is required.");
        if (normalizedSubject.Length > 120)
            throw new DomainException("CUSTOMER_INTERACTION_SUBJECT_TOO_LONG", "Interaction subject must not exceed 120 characters.");
        if (string.IsNullOrWhiteSpace(normalizedSummary))
            throw new DomainException("CUSTOMER_INTERACTION_SUMMARY_REQUIRED", "Interaction summary is required.");
        if (normalizedSummary.Length > 1500)
            throw new DomainException("CUSTOMER_INTERACTION_SUMMARY_TOO_LONG", "Interaction summary must not exceed 1500 characters.");
        if (occurredAtUtc > nowUtc.AddMinutes(5))
            throw new DomainException("CUSTOMER_INTERACTION_DATE_INVALID", "An interaction cannot be dated in the future.");
        if (nextFollowUpAtUtc.HasValue && nextFollowUpAtUtc.Value < occurredAtUtc)
            throw new DomainException("CUSTOMER_FOLLOW_UP_DATE_INVALID", "Next follow-up cannot precede the interaction.");

        return new CustomerInteraction
        {
            Id = Guid.NewGuid(),
            ProjectCustomerId = projectCustomerId,
            Type = type,
            Subject = normalizedSubject,
            Summary = normalizedSummary,
            OccurredAtUtc = occurredAtUtc.ToUniversalTime(),
            NextFollowUpAtUtc = nextFollowUpAtUtc?.ToUniversalTime(),
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    private static string NormalizeWhitespace(string? value)
        => Regex.Replace((value ?? string.Empty).Normalize(NormalizationForm.FormKC).Trim(), @"\s+", " ");
}