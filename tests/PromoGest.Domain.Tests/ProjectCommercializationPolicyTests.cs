using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Policies;
using Xunit;

namespace PromoGest.Domain.Tests;

/// <summary>
/// ADR-0018: marketing and new internal reservations are an allow-list keyed on
/// <see cref="ProjectStatus.Commercialization"/>. Every other value — including undefined
/// numeric values and any status added later — must be denied by default.
/// </summary>
public sealed class ProjectCommercializationPolicyTests
{
    [Fact]
    public void Commercialization_AllowsMarketingAndNewReservation()
    {
        Assert.True(ProjectCommercializationPolicy.AllowsMarketingAndNewReservation(
            ProjectStatus.Commercialization));

        ProjectCommercializationPolicy.EnsureMarketingAndNewReservation(ProjectStatus.Commercialization);
    }

    [Theory]
    [InlineData(ProjectStatus.Planning)]
    [InlineData(ProjectStatus.UnderConstruction)]
    [InlineData(ProjectStatus.Delivered)]
    [InlineData(ProjectStatus.Suspended)]
    public void DefinedStatusesOtherThanCommercialization_AreDenied(ProjectStatus status)
    {
        Assert.False(ProjectCommercializationPolicy.AllowsMarketingAndNewReservation(status));

        var denied = Assert.Throws<ConflictDomainException>(
            () => ProjectCommercializationPolicy.EnsureMarketingAndNewReservation(status));
        Assert.Equal(ProjectCommercializationPolicy.DeniedCode, denied.Code);
        Assert.Equal("PROJECT_NOT_COMMERCIALIZABLE", denied.Code);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(99)]
    [InlineData(int.MaxValue)]
    public void UndefinedStatusValues_AreDenied(int rawStatus)
    {
        var status = (ProjectStatus)rawStatus;

        Assert.False(ProjectCommercializationPolicy.AllowsMarketingAndNewReservation(status));
        var denied = Assert.Throws<ConflictDomainException>(
            () => ProjectCommercializationPolicy.EnsureMarketingAndNewReservation(status));
        Assert.Equal(ProjectCommercializationPolicy.DeniedCode, denied.Code);
    }

    [Fact]
    public void OnlyOneStatusIsAllowListed()
    {
        var allowed = Enum.GetValues<ProjectStatus>()
            .Where(ProjectCommercializationPolicy.AllowsMarketingAndNewReservation)
            .ToArray();

        Assert.Equal(new[] { ProjectStatus.Commercialization }, allowed);
    }
}
