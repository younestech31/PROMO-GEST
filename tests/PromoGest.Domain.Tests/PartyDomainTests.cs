using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class PartyDomainTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 15, 9, 30, 0, TimeSpan.Zero);

    [Fact]
    public void Party_CreateNormalizesIdentityAndAllowsSeparatePartiesWithSameName()
    {
        var first = Party.Create(Guid.NewGuid(), PartyKind.Person, "  ليلى   بن عيسى ", FixedNow);
        var second = Party.Create(Guid.NewGuid(), PartyKind.Person, "ليلى بن عيسى", FixedNow);

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal("ليلى بن عيسى", first.DisplayName);
        Assert.Equal("ليلى بن عيسى".ToUpperInvariant(), first.NormalizedDisplayName);
        Assert.Equal(PartyKind.Person, first.Kind);
    }

    [Fact]
    public void Party_UpdateIdentityChangesConcurrencyStampOnlyWhenIdentityChanges()
    {
        var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "ليلى بن عيسى", FixedNow);
        var originalStamp = party.ConcurrencyStamp;

        party.UpdateIdentity(PartyKind.Person, "ليلى بن عيسى", FixedNow.AddMinutes(1));
        Assert.Equal(originalStamp, party.ConcurrencyStamp);

        party.UpdateIdentity(PartyKind.LegalEntity, " شركة البناء ", FixedNow.AddMinutes(2));
        Assert.Equal(PartyKind.LegalEntity, party.Kind);
        Assert.Equal("شركة البناء", party.DisplayName);
        Assert.NotEqual(originalStamp, party.ConcurrencyStamp);
        Assert.Equal(FixedNow.AddMinutes(2), party.UpdatedAtUtc);
    }

    [Theory]
    [InlineData(PartyKind.Person, " ")]
    [InlineData(PartyKind.LegalEntity, "")]
    public void Party_RejectsEmptyNames(PartyKind kind, string displayName)
    {
        var exception = Assert.Throws<DomainException>(() =>
            Party.Create(Guid.NewGuid(), kind, displayName, FixedNow));
        Assert.Equal("PARTY_NAME_REQUIRED", exception.Code);
    }

    [Fact]
    public void Party_RejectsInvalidKindAndIdentifier()
    {
        var invalidKind = Assert.Throws<DomainException>(() =>
            Party.Create(Guid.NewGuid(), (PartyKind)999, "Name", FixedNow));
        Assert.Equal("PARTY_KIND_INVALID", invalidKind.Code);

        var invalidId = Assert.Throws<DomainException>(() =>
            Party.Create(Guid.Empty, PartyKind.Person, "Name", FixedNow));
        Assert.Equal("PARTY_ID_REQUIRED", invalidId.Code);
    }
}
