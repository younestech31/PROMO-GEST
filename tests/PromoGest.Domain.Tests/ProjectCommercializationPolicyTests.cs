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

    [Theory]
    [InlineData(ProjectStatus.Planning, true)]
    [InlineData(ProjectStatus.UnderConstruction, true)]
    [InlineData(ProjectStatus.Commercialization, true)]
    [InlineData(ProjectStatus.Delivered, true)]
    [InlineData(ProjectStatus.Suspended, false)]
    public void EnteringSuspensionRequiresOneReviewMarker(ProjectStatus previousStatus, bool expected)
    {
        var requiresReview = ProjectCommercializationPolicy.RequiresSuspensionReview(
            previousStatus,
            ProjectStatus.Suspended);

        Assert.Equal(expected, requiresReview);
    }

    [Theory]
    [InlineData(ProjectStatus.Planning)]
    [InlineData(ProjectStatus.UnderConstruction)]
    [InlineData(ProjectStatus.Commercialization)]
    [InlineData(ProjectStatus.Delivered)]
    public void LeavingSuspensionDoesNotCreateAReviewMarker(ProjectStatus nextStatus)
    {
        Assert.False(ProjectCommercializationPolicy.RequiresSuspensionReview(
            ProjectStatus.Suspended,
            nextStatus));
        Assert.False(ProjectCommercializationPolicy.RequiresSuspensionReview(
            ProjectStatus.Commercialization,
            nextStatus));
    }

    [Fact]
    public void SuspensionReviewEventTypeIsStable()
    {
        Assert.Equal(
            "PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED",
            ProjectCommercializationPolicy.SuspensionReviewEventType);
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
