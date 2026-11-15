using PromoGest.Domain.Entities;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class OrganizationSettingsTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 16, 8, 0, 0, TimeSpan.Zero);

    private static OrganizationSettings CreateOrganization()
        => OrganizationSettings.Initialize(
            "Promotion Atlas",
            "Atlas Immo",
            "SPA",
            "001616098765432",
            "001616098765400",
            "16/00-9876543B21",
            "16098765432",
            100_000_000m,
            "16",
            "Alger",
            "Dely Ibrahim, Alger",
            "+21321000010",
            "direction@atlasimmo.dz",
            "ar",
            FixedNow);

    [Fact]
    public void UpdateProfile_UpdatesFieldsAndAdvancesConcurrencyWithoutChangingInstallationInvariants()
    {
        var organization = CreateOrganization();
        var originalId = organization.Id;
        var originalStamp = organization.ConcurrencyStamp;

        organization.UpdateProfile(
            "Promotion Atlas Nouvelle",
            "Atlas Immobilier",
            "SPA",
            "001616012345678",
            "001616012345600",
            "16/00-1111111B21",
            "16012345678",
            125_000_000m,
            "31",
            "Oran",
            "Bir El Djir, Oran",
            "+21341000020",
            "contact@atlasimmo.dz",
            "fr",
            FixedNow.AddMinutes(5));

        Assert.Equal(originalId, organization.Id);
        Assert.NotEqual(originalStamp, organization.ConcurrencyStamp);
        Assert.Equal(FixedNow.AddMinutes(5), organization.UpdatedAtUtc);
        Assert.Equal("Promotion Atlas Nouvelle", organization.LegalName);
        Assert.Equal("Atlas Immobilier", organization.TradeName);
        Assert.Equal("31", organization.WilayaCode);
        Assert.Equal("Oran", organization.WilayaName);
        Assert.Equal("fr", organization.DefaultLanguage);
        Assert.Equal("DZD", organization.CurrencyCode);
        Assert.Equal(OrganizationSettings.FixedSingletonGuard, organization.SingletonGuard);
    }

    [Fact]
    public void UpdateProfile_RejectsUnsupportedDefaultLanguageWithoutChangingEntity()
    {
        var organization = CreateOrganization();
        var originalStamp = organization.ConcurrencyStamp;
        var originalName = organization.LegalName;

        var exception = Assert.Throws<DomainException>(() => organization.UpdateProfile(
            "Changed Name",
            organization.TradeName,
            organization.LegalForm,
            organization.Nif,
            organization.Nis,
            organization.TradeRegisterNumber,
            organization.TaxArticleNumber,
            organization.ShareCapitalDzd,
            organization.WilayaCode,
            organization.WilayaName,
            organization.Address,
            organization.Phone,
            organization.Email,
            "en",
            FixedNow.AddMinutes(5)));

        Assert.Equal("ORG_DEFAULT_LANGUAGE_INVALID", exception.Code);
        Assert.Equal(originalStamp, organization.ConcurrencyStamp);
        Assert.Equal(originalName, organization.LegalName);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public void UpdateProfile_RejectsNegativeShareCapital(decimal shareCapital)
    {
        var organization = CreateOrganization();

        var exception = Assert.Throws<DomainException>(() => organization.UpdateProfile(
            organization.LegalName,
            organization.TradeName,
            organization.LegalForm,
            organization.Nif,
            organization.Nis,
            organization.TradeRegisterNumber,
            organization.TaxArticleNumber,
            shareCapital,
            organization.WilayaCode,
            organization.WilayaName,
            organization.Address,
            organization.Phone,
            organization.Email,
            organization.DefaultLanguage,
            FixedNow.AddMinutes(5)));

        Assert.Equal("ORG_CAPITAL_NEGATIVE", exception.Code);
    }
}
