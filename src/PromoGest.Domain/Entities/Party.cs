using System.Text;
using System.Text.RegularExpressions;
using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

/// <summary>
/// Organization-wide identity for one natural person or legal entity.
/// Contact points and commercial status remain owned by their relevant business relationship.
/// </summary>
public sealed class Party : BaseEntity
{
    private Party() { }

    public PartyKind Kind { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string NormalizedDisplayName { get; private set; } = string.Empty;

    public static Party Create(
        Guid id,
        PartyKind kind,
        string displayName,
        DateTimeOffset nowUtc)
    {
        if (id == Guid.Empty)
            throw new DomainException("PARTY_ID_REQUIRED", "A valid party identifier is required.");
        var normalized = NormalizeAndValidate(kind, displayName);

        return new Party
        {
            Id = id,
            Kind = kind,
            DisplayName = normalized.DisplayName,
            NormalizedDisplayName = normalized.NormalizedDisplayName,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdateIdentity(PartyKind kind, string displayName, DateTimeOffset nowUtc)
    {
        var normalized = NormalizeAndValidate(kind, displayName);
        if (Kind == kind &&
            string.Equals(DisplayName, normalized.DisplayName, StringComparison.Ordinal) &&
            string.Equals(NormalizedDisplayName, normalized.NormalizedDisplayName, StringComparison.Ordinal))
        {
            return;
        }

        Kind = kind;
        DisplayName = normalized.DisplayName;
        NormalizedDisplayName = normalized.NormalizedDisplayName;
        Touch(nowUtc);
    }

    private static (string DisplayName, string NormalizedDisplayName) NormalizeAndValidate(
        PartyKind kind,
        string displayName)
    {
        if (!Enum.IsDefined(kind))
            throw new DomainException("PARTY_KIND_INVALID", "Select a person or legal entity.");

        var normalizedDisplayName = Regex.Replace(
            (displayName ?? string.Empty).Normalize(NormalizationForm.FormKC).Trim(),
            @"\\s+",
            " ");

        if (string.IsNullOrWhiteSpace(normalizedDisplayName))
            throw new DomainException("PARTY_NAME_REQUIRED", "A party name is required.");
        if (normalizedDisplayName.Length > 200)
            throw new DomainException("PARTY_NAME_TOO_LONG", "A party name must not exceed 200 characters.");

        return (normalizedDisplayName, normalizedDisplayName.ToUpperInvariant());
    }
}
