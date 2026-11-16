using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Reference;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class AlgerianAdministrativeReferenceTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 16, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Catalogue_ExposesAll69Wilayas_WithOfficialMetadataAndPendingCommunes()
    {
        Assert.Equal("2026-06-03-wilayas-69", AlgerianAdministrativeReference.DatasetVersion);
        Assert.Equal("2026-06-03", AlgerianAdministrativeReference.EffectiveDate);
        Assert.Equal("PendingOfficialVerification", AlgerianAdministrativeReference.CommuneDatasetStatus);
        Assert.Equal(1541, AlgerianAdministrativeReference.CommuneLegalBaselineCount);
        Assert.Equal(0, AlgerianAdministrativeReference.CommunesCount);
        Assert.Equal(69, AlgerianAdministrativeReference.Wilayas.Count);

        for (var codeNumber = 1; codeNumber <= 69; codeNumber++)
        {
            var code = codeNumber.ToString("00");
            Assert.True(AlgerianAdministrativeReference.TryGetWilaya(code, out var wilaya));
            Assert.False(string.IsNullOrWhiteSpace(wilaya.NameAr));
            Assert.False(string.IsNullOrWhiteSpace(wilaya.NameFr));
            Assert.Contains(wilaya.NameAr, wilaya.CanonicalDisplayName, StringComparison.Ordinal);
            Assert.Contains(wilaya.NameFr, wilaya.CanonicalDisplayName, StringComparison.Ordinal);
        }

        Assert.True(AlgerianAdministrativeReference.TryGetWilaya("69", out var wilaya69));
        Assert.Equal("الأبيض سيدي الشيخ", wilaya69.NameAr);
        Assert.Equal("El Abiodh Sidi Cheikh", wilaya69.NameFr);
        Assert.False(AlgerianAdministrativeReference.TryGetWilaya("00", out _));
        Assert.False(AlgerianAdministrativeReference.TryGetWilaya("70", out _));
    }

    [Fact]
    public void Entities_RejectMismatchedWilayaCodeAndNameCombinations()
    {
        var orgMismatch = Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "Promotion Test",
            null,
            "SARL",
            null,
            null,
            null,
            null,
            10_000_000m,
            "16",
            "Oran",
            "Hydra",
            null,
            null,
            "ar",
            FixedNow));
        Assert.Equal("ORG_WILAYA_NAME_MISMATCH", orgMismatch.Code);

        var projectMismatch = Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-16-001",
            "مشروع الاختبار",
            "Projet Test",
            "16",
            "Constantine",
            "Hydra",
            null,
            null,
            null,
            null,
            ProjectStatus.Planning,
            50_000_000m,
            1,
            10,
            Guid.NewGuid(),
            FixedNow));
        Assert.Equal("PROJECT_WILAYA_NAME_MISMATCH", projectMismatch.Code);
    }
}
