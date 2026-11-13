using System.Text.RegularExpressions;
using PromoGest.Domain.Common;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed partial class OrganizationSettings : BaseEntity
{
    public const int FixedSingletonGuard = 1;

    private static readonly HashSet<string> AllowedLegalForms = new(StringComparer.OrdinalIgnoreCase)
    {
        "SARL", "SPA", "EURL", "SNC", "SCS", "SPAS", "EPIC", "OTHER"
    };

    private OrganizationSettings() { }

    public string LegalName { get; private set; } = string.Empty;
    public string? TradeName { get; private set; }
    public string LegalForm { get; private set; } = string.Empty;
    public string? Nif { get; private set; }
    public string? Nis { get; private set; }
    public string? TradeRegisterNumber { get; private set; }
    public string? TaxArticleNumber { get; private set; }
    public decimal? ShareCapitalDzd { get; private set; }
    public string WilayaCode { get; private set; } = "16";
    public string WilayaName { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string DefaultLanguage { get; private set; } = "ar";
    public string CurrencyCode { get; private set; } = "DZD";
    public bool IsInitialized { get; private set; }
    public DateTimeOffset? InitializedAtUtc { get; private set; }
    public int SingletonGuard { get; private set; } = FixedSingletonGuard;

    public static OrganizationSettings Initialize(
        string legalName,
        string? tradeName,
        string legalForm,
        string? nif,
        string? nis,
        string? tradeRegisterNumber,
        string? taxArticleNumber,
        decimal? shareCapitalDzd,
        string wilayaCode,
        string wilayaName,
        string address,
        string? phone,
        string? email,
        string defaultLanguage,
        DateTimeOffset nowUtc)
    {
        ValidateCommon(legalName, legalForm, nif, shareCapitalDzd, wilayaCode, wilayaName, address, email);

        var lang = defaultLanguage is "fr" or "ar" ? defaultLanguage : "ar";

        return new OrganizationSettings
        {
            Id = Guid.NewGuid(),
            LegalName = legalName.Trim(),
            TradeName = string.IsNullOrWhiteSpace(tradeName) ? null : tradeName.Trim(),
            LegalForm = legalForm.Trim().ToUpperInvariant(),
            Nif = NormalizeOptional(nif),
            Nis = NormalizeOptional(nis),
            TradeRegisterNumber = NormalizeOptional(tradeRegisterNumber),
            TaxArticleNumber = NormalizeOptional(taxArticleNumber),
            ShareCapitalDzd = shareCapitalDzd,
            WilayaCode = wilayaCode.Trim(),
            WilayaName = wilayaName.Trim(),
            Address = address.Trim(),
            Phone = NormalizeOptional(phone),
            Email = NormalizeOptional(email),
            DefaultLanguage = lang,
            CurrencyCode = "DZD",
            IsInitialized = true,
            InitializedAtUtc = nowUtc,
            SingletonGuard = FixedSingletonGuard,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdateProfile(
        string legalName,
        string? tradeName,
        string legalForm,
        string? nif,
        string? nis,
        string? tradeRegisterNumber,
        string? taxArticleNumber,
        decimal? shareCapitalDzd,
        string wilayaCode,
        string wilayaName,
        string address,
        string? phone,
        string? email,
        string defaultLanguage,
        DateTimeOffset nowUtc)
    {
        ValidateCommon(legalName, legalForm, nif, shareCapitalDzd, wilayaCode, wilayaName, address, email);

        LegalName = legalName.Trim();
        TradeName = string.IsNullOrWhiteSpace(tradeName) ? null : tradeName.Trim();
        LegalForm = legalForm.Trim().ToUpperInvariant();
        Nif = NormalizeOptional(nif);
        Nis = NormalizeOptional(nis);
        TradeRegisterNumber = NormalizeOptional(tradeRegisterNumber);
        TaxArticleNumber = NormalizeOptional(taxArticleNumber);
        ShareCapitalDzd = shareCapitalDzd;
        WilayaCode = wilayaCode.Trim();
        WilayaName = wilayaName.Trim();
        Address = address.Trim();
        Phone = NormalizeOptional(phone);
        Email = NormalizeOptional(email);
        DefaultLanguage = defaultLanguage is "fr" or "ar" ? defaultLanguage : DefaultLanguage;
        Touch(nowUtc);
    }

    private static void ValidateCommon(
        string legalName,
        string legalForm,
        string? nif,
        decimal? shareCapitalDzd,
        string wilayaCode,
        string wilayaName,
        string address,
        string? email)
    {
        if (string.IsNullOrWhiteSpace(legalName))
            throw new DomainException("ORG_LEGAL_NAME_REQUIRED", "Organization legal name is required.");
        if (string.IsNullOrWhiteSpace(legalForm) || !AllowedLegalForms.Contains(legalForm.Trim()))
            throw new DomainException("ORG_LEGAL_FORM_INVALID", "A valid Algerian legal form (SARL, SPA, EURL, SNC, SCS, SPAS, EPIC, OTHER) is required.");
        if (!IsValidAlgerianWilayaCode(wilayaCode))
            throw new DomainException("ORG_WILAYA_INVALID", "Valid two-digit Algerian Wilaya code (01-58) is required.");
        if (string.IsNullOrWhiteSpace(wilayaName))
            throw new DomainException("ORG_WILAYA_NAME_REQUIRED", "Wilaya name is required.");
        if (string.IsNullOrWhiteSpace(address))
            throw new DomainException("ORG_ADDRESS_REQUIRED", "Organization address is required.");
        if (shareCapitalDzd is < 0)
            throw new DomainException("ORG_CAPITAL_NEGATIVE", "Share capital cannot be negative.");
        if (!string.IsNullOrWhiteSpace(nif) && !NifRegex().IsMatch(nif.Trim()))
            throw new DomainException("ORG_NIF_INVALID", "Algerian NIF must contain 15 to 20 digits.");
        if (!string.IsNullOrWhiteSpace(email) && !EmailRegex().IsMatch(email.Trim()))
            throw new DomainException("ORG_EMAIL_INVALID", "Organization email address format is invalid.");
    }

    public static bool IsValidAlgerianWilayaCode(string? wilayaCode)
    {
        if (string.IsNullOrWhiteSpace(wilayaCode))
            return false;
        var trimmed = wilayaCode.Trim();
        return trimmed.Length == 2 && int.TryParse(trimmed, out var num) && num is >= 1 and <= 58;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [GeneratedRegex(@"^\d{15,20}$")]
    private static partial Regex NifRegex();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();
}
