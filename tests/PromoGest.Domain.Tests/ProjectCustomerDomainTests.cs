using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class ProjectCustomerDomainTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 14, 18, 0, 0, TimeSpan.Zero);

    private static ProjectCustomer CreateCustomer(
        Guid? partyId = null,
        string phone = "+213 550-123-456",
        string language = "ar")
        => ProjectCustomer.Create(
            Guid.NewGuid(),
            partyId ?? Guid.NewGuid(),
            "  ليلى   بن عيسى ",
            phone,
            "leila@example.dz",
            "Oran",
            language,
            CustomerSource.Referral,
            null,
            Guid.NewGuid(),
            FixedNow);

    [Fact]
    public void ProjectCustomer_NormalizesPhoneEmailAndContactWithoutStoringIdentityMirrors()
    {
        var partyId = Guid.NewGuid();
        var customer = CreateCustomer(partyId: partyId);

        Assert.Equal(partyId, customer.PartyId);
        Assert.Equal("ليلى بن عيسى", customer.ContactPerson);
        Assert.Equal("+213 550-123-456", customer.Phone);
        Assert.Equal("213550123456", customer.NormalizedPhone);
        Assert.Equal("LEILA@EXAMPLE.DZ", customer.NormalizedEmail);
        Assert.Equal(ProjectCustomerStatus.Prospect, customer.Status);
        Assert.Equal("ar", customer.PreferredLanguage);
    }

    [Theory]
    [InlineData("0555123456", "213555123456")]
    [InlineData("0 555 123 456", "213555123456")]
    [InlineData("+213555123456", "213555123456")]
    [InlineData("213 555 123 456", "213555123456")]
    [InlineData("+33 1 23 45 67 89", "33123456789")]
    [InlineData("0033 1 23 45 67 89", "0033123456789")]
    public void ProjectCustomer_CanonicalizesOnlyAlgerianNationalFormat(string phone, string expected)
    {
        var customer = CreateCustomer(phone: phone);
        Assert.Equal(expected, customer.NormalizedPhone);
    }

    [Theory]
    [InlineData("0550123A56")]
    [InlineData("055012")]
    [InlineData("0550123456789012")]
    [InlineData("")]
    public void ProjectCustomer_RejectsMalformedPhoneNumbers(string phone)
    {
        var error = Assert.Throws<DomainException>(() => CreateCustomer(phone: phone));
        Assert.Equal("CUSTOMER_PHONE_INVALID", error.Code);
    }

    [Fact]
    public void ProjectCustomer_RejectsInvalidEmailAndLanguage()
    {
        var emailError = Assert.Throws<DomainException>(() => ProjectCustomer.Create(
            Guid.NewGuid(), Guid.NewGuid(), null, "0550123456",
            "not-an-email", null, "ar", CustomerSource.Other, null, Guid.NewGuid(), FixedNow));
        Assert.Equal("CUSTOMER_EMAIL_INVALID", emailError.Code);

        var languageError = Assert.Throws<DomainException>(() => ProjectCustomer.Create(
            Guid.NewGuid(), Guid.NewGuid(), null, "0550123456",
            null, null, "en", CustomerSource.Other, null, Guid.NewGuid(), FixedNow));
        Assert.Equal("CUSTOMER_LANGUAGE_INVALID", languageError.Code);
    }

    [Fact]
    public void ProjectCustomer_RejectsInvalidProjectAndPartyReferences()
    {
        var projectError = Assert.Throws<DomainException>(() => ProjectCustomer.Create(
            Guid.Empty, Guid.NewGuid(), null, "0550123456",
            null, null, "ar", CustomerSource.Other, null, Guid.NewGuid(), FixedNow));
        Assert.Equal("CUSTOMER_REFERENCE_INVALID", projectError.Code);

        var partyError = Assert.Throws<DomainException>(() => ProjectCustomer.Create(
            Guid.NewGuid(), Guid.Empty, null, "0550123456",
            null, null, "ar", CustomerSource.Other, null, Guid.NewGuid(), FixedNow));
        Assert.Equal("CUSTOMER_PARTY_REFERENCE_INVALID", partyError.Code);
    }

    [Fact]
    public void ProjectCustomer_UpdateDetailsChangesVersionAndRejectsInvalidStatusAtomically()
    {
        var customer = CreateCustomer();
        var initialStamp = customer.ConcurrencyStamp;

        customer.UpdateDetails(
            "مدير المبيعات",
            "0550 123 456",
            "sales@example.dz",
            "وهران",
            "fr",
            CustomerSource.Website,
            ProjectCustomerStatus.Qualified,
            null,
            FixedNow.AddMinutes(10));

        Assert.Equal("مدير المبيعات", customer.ContactPerson);
        Assert.Equal("213550123456", customer.NormalizedPhone);
        Assert.Equal(ProjectCustomerStatus.Qualified, customer.Status);
        Assert.NotEqual(initialStamp, customer.ConcurrencyStamp);
        Assert.Equal(FixedNow.AddMinutes(10), customer.UpdatedAtUtc);

        var stampAfterUpdate = customer.ConcurrencyStamp;
        var invalidStatus = Assert.Throws<DomainException>(() => customer.UpdateDetails(
            "مدير المبيعات",
            "0550123456",
            "sales@example.dz",
            "وهران",
            "fr",
            CustomerSource.Website,
            (ProjectCustomerStatus)999,
            null,
            FixedNow.AddMinutes(20)));

        Assert.Equal("CUSTOMER_STATUS_INVALID", invalidStatus.Code);
        Assert.Equal(ProjectCustomerStatus.Qualified, customer.Status);
        Assert.Equal(stampAfterUpdate, customer.ConcurrencyStamp);
    }

    [Fact]
    public void CustomerInteraction_RecordsValidFollowUpAndRejectsFutureOccurrence()
    {
        var customerId = Guid.NewGuid();
        var actorId = Guid.NewGuid();
        var followUp = FixedNow.AddDays(2);

        var interaction = CustomerInteraction.Create(
            customerId,
            CustomerInteractionType.Call,
            "First contact",
            "Asked for plans and pricing information.",
            FixedNow.AddMinutes(-5),
            followUp,
            actorId,
            FixedNow);

        Assert.Equal(customerId, interaction.ProjectCustomerId);
        Assert.Equal(CustomerInteractionType.Call, interaction.Type);
        Assert.Equal(followUp, interaction.NextFollowUpAtUtc);

        var futureDateError = Assert.Throws<DomainException>(() => CustomerInteraction.Create(
            customerId,
            CustomerInteractionType.Meeting,
            "Future meeting",
            "Invalid future occurrence.",
            FixedNow.AddDays(1),
            null,
            actorId,
            FixedNow));
        Assert.Equal("CUSTOMER_INTERACTION_DATE_INVALID", futureDateError.Code);
    }

    [Fact]
    public void CustomerInteraction_RejectsFollowUpBeforeOccurrenceAndEmptyContent()
    {
        var earlierFollowUp = Assert.Throws<DomainException>(() => CustomerInteraction.Create(
            Guid.NewGuid(),
            CustomerInteractionType.Call,
            "Contact",
            "Summary",
            FixedNow,
            FixedNow.AddMinutes(-1),
            Guid.NewGuid(),
            FixedNow));
        Assert.Equal("CUSTOMER_FOLLOW_UP_DATE_INVALID", earlierFollowUp.Code);

        var emptySubject = Assert.Throws<DomainException>(() => CustomerInteraction.Create(
            Guid.NewGuid(),
            CustomerInteractionType.Call,
            " ",
            "Summary",
            FixedNow,
            null,
            Guid.NewGuid(),
            FixedNow));
        Assert.Equal("CUSTOMER_INTERACTION_SUBJECT_REQUIRED", emptySubject.Code);

        var emptySummary = Assert.Throws<DomainException>(() => CustomerInteraction.Create(
            Guid.NewGuid(),
            CustomerInteractionType.Call,
            "Contact",
            " ",
            FixedNow,
            null,
            Guid.NewGuid(),
            FixedNow));
        Assert.Equal("CUSTOMER_INTERACTION_SUMMARY_REQUIRED", emptySummary.Code);
    }
}