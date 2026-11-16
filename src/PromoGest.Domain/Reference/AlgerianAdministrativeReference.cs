using System.Globalization;
using System.Text;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Reference;

public sealed record WilayaReference(string Code, string NameAr, string NameFr)
{
    public string CanonicalDisplayName => $"{NameAr} / {NameFr}";
}

/// <summary>
/// Server-owned versioned Algerian administrative reference dataset (ADR-0010).
/// Covers the 69 official Wilayas (Law 26-06 / Executive Decree 26-206).
/// </summary>
public static class AlgerianAdministrativeReference
{
    public const string DatasetVersion = "2026-06-03-wilayas-69";
    public const string EffectiveDate = "2026-06-03";
    public const string LegalSource = "Law 26-06 (JO 25) / Decree 26-206 (JO 40)";
    public const string CommuneDatasetStatus = "PendingOfficialVerification";
    public const int CommuneLegalBaselineCount = 1541;
    public const int CommunesCount = 0;

    private static readonly IReadOnlyList<WilayaReference> OrderedWilayas = new WilayaReference[]
    {
        new("01", "أدرار", "Adrar"),
        new("02", "الشلف", "Chlef"),
        new("03", "الأغواط", "Laghouat"),
        new("04", "أم البواقي", "Oum El Bouaghi"),
        new("05", "باتنة", "Batna"),
        new("06", "بجاية", "Béjaïa"),
        new("07", "بسكرة", "Biskra"),
        new("08", "بشار", "Béchar"),
        new("09", "البليدة", "Blida"),
        new("10", "البويرة", "Bouira"),
        new("11", "تمنراست", "Tamanrasset"),
        new("12", "تبسة", "Tébessa"),
        new("13", "تلمسان", "Tlemcen"),
        new("14", "تيارت", "Tiaret"),
        new("15", "تيزي وزو", "Tizi Ouzou"),
        new("16", "الجزائر", "Alger"),
        new("17", "الجلفة", "Djelfa"),
        new("18", "جيجل", "Jijel"),
        new("19", "سطيف", "Sétif"),
        new("20", "سعيدة", "Saïda"),
        new("21", "سكيكدة", "Skikda"),
        new("22", "سيدي بلعباس", "Sidi Bel Abbès"),
        new("23", "عنابة", "Annaba"),
        new("24", "قالمة", "Guelma"),
        new("25", "قسنطينة", "Constantine"),
        new("26", "المدية", "Médéa"),
        new("27", "مستغانم", "Mostaganem"),
        new("28", "المسيلة", "M'Sila"),
        new("29", "معسكر", "Mascara"),
        new("30", "ورقلة", "Ouargla"),
        new("31", "وهران", "Oran"),
        new("32", "البيض", "El Bayadh"),
        new("33", "إليزي", "Illizi"),
        new("34", "برج بوعريريج", "Bordj Bou Arréridj"),
        new("35", "بومرداس", "Boumerdès"),
        new("36", "الطارف", "El Tarf"),
        new("37", "تندوف", "Tindouf"),
        new("38", "تيسمسيلت", "Tissemsilt"),
        new("39", "الوادي", "El Oued"),
        new("40", "خنشلة", "Khenchela"),
        new("41", "سوق أهراس", "Souk Ahras"),
        new("42", "تيبازة", "Tipaza"),
        new("43", "ميلة", "Mila"),
        new("44", "عين الدفلى", "Aïn Defla"),
        new("45", "النعامة", "Naâma"),
        new("46", "عين تموشنت", "Aïn Témouchent"),
        new("47", "غرداية", "Ghardaïa"),
        new("48", "غليزان", "Relizane"),
        new("49", "تيميمون", "Timimoun"),
        new("50", "برج باجي مختار", "Bordj Badji Mokhtar"),
        new("51", "أولاد جلال", "Ouled Djellal"),
        new("52", "بني عباس", "Béni Abbès"),
        new("53", "عين صالح", "In Salah"),
        new("54", "عين قزام", "In Guezzam"),
        new("55", "تقرت", "Touggourt"),
        new("56", "جانت", "Djanet"),
        new("57", "المغير", "El M'Ghair"),
        new("58", "المنيعة", "El Meniaa"),
        new("59", "أفلو", "Aflou"),
        new("60", "بريكة", "Barika"),
        new("61", "القنطرة", "El Kantara"),
        new("62", "بئر العاتر", "Bir El Ater"),
        new("63", "العريشة", "El Aricha"),
        new("64", "قصر الشلالة", "Ksar Chellala"),
        new("65", "عين وسارة", "Aïn Oussera"),
        new("66", "مسعد", "Messaad"),
        new("67", "قصر البخاري", "Ksar El Boukhari"),
        new("68", "بوسعادة", "Bou Saâda"),
        new("69", "الأبيض سيدي الشيخ", "El Abiodh Sidi Cheikh"),
    };

    private static readonly Dictionary<string, WilayaReference> ByCode =
        OrderedWilayas.ToDictionary(w => w.Code, StringComparer.Ordinal);

    public static IReadOnlyList<WilayaReference> Wilayas => OrderedWilayas;

    public static bool TryGetWilaya(string? wilayaCode, out WilayaReference wilaya)
    {
        wilaya = null!;
        if (string.IsNullOrWhiteSpace(wilayaCode))
            return false;

        return ByCode.TryGetValue(wilayaCode.Trim(), out wilaya!);
    }

    public static bool IsValidWilayaCode(string? wilayaCode)
        => TryGetWilaya(wilayaCode, out _);

    public static WilayaReference ValidateWilayaSelection(
        string? wilayaCode,
        string? suppliedName,
        string invalidCodeError,
        string requiredNameError,
        string mismatchError)
    {
        if (!TryGetWilaya(wilayaCode, out var wilaya))
            throw new DomainException(invalidCodeError, "Valid two-digit Algerian Wilaya code (01-69) is required.");

        if (string.IsNullOrWhiteSpace(suppliedName))
            throw new DomainException(requiredNameError, "Wilaya name is required.");

        if (!MatchesCanonicalWilayaName(wilaya, suppliedName))
        {
            throw new DomainException(
                mismatchError,
                $"Wilaya name '{suppliedName.Trim()}' does not match official Wilaya '{wilaya.Code}' ({wilaya.CanonicalDisplayName}).");
        }

        return wilaya;
    }

    public static WilayaReference ResolveCanonicalWilaya(
        string? wilayaCode,
        string? suppliedName,
        string invalidCodeError,
        string mismatchError)
    {
        if (!TryGetWilaya(wilayaCode, out var wilaya))
            throw new DomainException(invalidCodeError, "Valid two-digit Algerian Wilaya code (01-69) is required.");

        if (!string.IsNullOrWhiteSpace(suppliedName) && !MatchesCanonicalWilayaName(wilaya, suppliedName))
        {
            throw new DomainException(
                mismatchError,
                $"Wilaya name '{suppliedName.Trim()}' does not match official Wilaya '{wilaya.Code}' ({wilaya.CanonicalDisplayName}).");
        }

        return wilaya;
    }

    public static bool MatchesCanonicalWilayaName(WilayaReference wilaya, string? suppliedName)
    {
        if (string.IsNullOrWhiteSpace(suppliedName))
            return false;

        var normalizedSupplied = NormalizeForMatch(suppliedName);
        var candidates = new[]
        {
            wilaya.NameAr,
            wilaya.NameFr,
            wilaya.CanonicalDisplayName,
            $"{wilaya.NameFr} / {wilaya.NameAr}",
            $"{wilaya.Code} - {wilaya.NameAr}",
            $"{wilaya.Code} - {wilaya.NameFr}",
            $"{wilaya.Code} — {wilaya.NameAr}",
            $"{wilaya.Code} — {wilaya.NameFr}",
        };

        return candidates.Any(candidate =>
            string.Equals(normalizedSupplied, NormalizeForMatch(candidate), StringComparison.Ordinal));
    }

    private static string NormalizeForMatch(string value)
    {
        var collapsed = string.Join(
            ' ',
            value.Normalize(NormalizationForm.FormD)
                .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                .ToArray());

        return string.Join(
                ' ',
                collapsed.Replace('’', '\'')
                    .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .Normalize(NormalizationForm.FormC)
            .ToUpperInvariant();
    }
}
