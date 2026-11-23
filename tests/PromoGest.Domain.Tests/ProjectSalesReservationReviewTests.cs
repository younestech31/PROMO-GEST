using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

/// <summary>
/// ADR-0018 suspension review queue. Queuing a hold and recording its review are bookkeeping only:
/// recording a review must never approve, cancel, expire, or release the hold.
/// </summary>
public sealed class ProjectSalesReservationReviewTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 23, 20, 0, 0, TimeSpan.Zero);

    private static readonly Guid ProjectId = Guid.NewGuid();
    private static readonly Guid UnitId = Guid.NewGuid();
    private static readonly Guid CustomerId = Guid.NewGuid();
    private static readonly Guid ActorId = Guid.NewGuid();

    private static ProjectSalesReservation NewReservation(DateTimeOffset? atUtc = null)
    {
        var created = atUtc ?? Now;
        return ProjectSalesReservation.Create(
            ProjectId,
            UnitId,
            CustomerId,
            $"RSV-{created:yyyyMMdd}-ABCD1234",
            created,
            created.AddDays(7),
            ActorId,
            created);
    }

    [Fact]
    public void ActiveHold_IsQueuedOnceForReview()
    {
        var reservation = NewReservation();
        Assert.False(reservation.IsAwaitingReview);
        Assert.Null(reservation.ReviewRequiredAtUtc);

        reservation.RequestSuspensionReview(Now.AddMinutes(5));

        Assert.Equal(Now.AddMinutes(5), reservation.ReviewRequiredAtUtc);
        Assert.Null(reservation.ReviewCompletedAtUtc);
        Assert.True(reservation.IsAwaitingReview);

        // Queuing twice must not restart the clock of the first request.
        reservation.RequestSuspensionReview(Now.AddHours(2));
        Assert.Equal(Now.AddMinutes(5), reservation.ReviewRequiredAtUtc);
    }

    [Fact]
    public void RecordingTheReview_KeepsTheHoldActiveAndUnchanged()
    {
        var reservation = NewReservation();
        var statusBefore = reservation.Status;
        var expiresBefore = reservation.ExpiresAtUtc;
        var stampBefore = reservation.ConcurrencyStamp;

        reservation.RequestSuspensionReview(Now.AddMinutes(5));
        reservation.CompleteSuspensionReview(Now.AddMinutes(30));

        Assert.Equal(Now.AddMinutes(30), reservation.ReviewCompletedAtUtc);
        Assert.False(reservation.IsAwaitingReview);
        // Not an approval: the hold is still active, still on its unit, still on its own expiry.
        Assert.Equal(statusBefore, reservation.Status);
        Assert.Equal(SalesReservationStatus.Active, reservation.Status);
        Assert.Equal(expiresBefore, reservation.ExpiresAtUtc);
        Assert.Null(reservation.ClosedAtUtc);
        Assert.Null(reservation.CloseReason);
        // Only the optimistic concurrency signal moves.
        Assert.NotEqual(stampBefore, reservation.ConcurrencyStamp);
    }

    [Fact]
    public void ReviewingAHoldThatWasNeverQueued_IsRejected()
    {
        var reservation = NewReservation();

        var error = Assert.Throws<ConflictDomainException>(
            () => reservation.CompleteSuspensionReview(Now.AddMinutes(1)));

        Assert.Equal("RESERVATION_REVIEW_NOT_REQUIRED", error.Code);
    }

    [Fact]
    public void ReviewingTwice_IsRejected()
    {
        var reservation = NewReservation();
        reservation.RequestSuspensionReview(Now.AddMinutes(5));
        reservation.CompleteSuspensionReview(Now.AddMinutes(10));

        var error = Assert.Throws<ConflictDomainException>(
            () => reservation.CompleteSuspensionReview(Now.AddMinutes(15)));

        Assert.Equal("RESERVATION_REVIEW_ALREADY_COMPLETED", error.Code);
        Assert.Equal(Now.AddMinutes(10), reservation.ReviewCompletedAtUtc);
    }

    [Fact]
    public void ReviewCannotCompleteBeforeItWasRequested()
    {
        var reservation = NewReservation();
        reservation.RequestSuspensionReview(Now.AddMinutes(5));

        var error = Assert.Throws<DomainException>(
            () => reservation.CompleteSuspensionReview(Now.AddMinutes(1)));

        Assert.Equal("RESERVATION_REVIEW_TIMESTAMP_INVALID", error.Code);
        Assert.Null(reservation.ReviewCompletedAtUtc);
    }

    [Fact]
    public void ClosedHold_IsNotQueuedForReview()
    {
        var reservation = NewReservation();
        reservation.Cancel("Customer requested release", ActorId, Now.AddMinutes(2));

        reservation.RequestSuspensionReview(Now.AddMinutes(5));

        Assert.Null(reservation.ReviewRequiredAtUtc);
        Assert.False(reservation.IsAwaitingReview);
        Assert.Equal(SalesReservationStatus.Cancelled, reservation.Status);
    }

    [Fact]
    public void ExpiredHold_IsNotQueuedForReview()
    {
        var reservation = NewReservation();
        reservation.Expire(Now.AddDays(8));

        reservation.RequestSuspensionReview(Now.AddDays(9));

        Assert.Null(reservation.ReviewRequiredAtUtc);
        Assert.False(reservation.IsAwaitingReview);
    }
}
