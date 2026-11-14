using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed class ProjectSalesReservation : BaseEntity
{
    private ProjectSalesReservation() { }

    public Guid ProjectId { get; private set; }
    public Guid PropertyUnitId { get; private set; }
    public Guid ProjectCustomerId { get; private set; }
    public string ReservationNumber { get; private set; } = string.Empty;
    public SalesReservationStatus Status { get; private set; } = SalesReservationStatus.Active;
    public DateTimeOffset ReservedAtUtc { get; private set; }
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? ClosedAtUtc { get; private set; }
    public Guid? ClosedByUserId { get; private set; }
    public string? CloseReason { get; private set; }
    public Guid CreatedByUserId { get; private set; }

    public static ProjectSalesReservation Create(
        Guid projectId,
        Guid propertyUnitId,
        Guid projectCustomerId,
        string reservationNumber,
        DateTimeOffset reservedAtUtc,
        DateTimeOffset expiresAtUtc,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (projectId == Guid.Empty || propertyUnitId == Guid.Empty ||
            projectCustomerId == Guid.Empty || createdByUserId == Guid.Empty)
        {
            throw new DomainException(
                "RESERVATION_REFERENCE_INVALID",
                "A project, available property unit, customer and creating employee are required.");
        }

        var number = (reservationNumber ?? string.Empty).Trim().ToUpperInvariant();
        if (number.Length is < 8 or > 50)
        {
            throw new DomainException(
                "RESERVATION_NUMBER_INVALID",
                "The internal reservation reference must contain between 8 and 50 characters.");
        }

        if (expiresAtUtc <= reservedAtUtc)
        {
            throw new DomainException(
                "RESERVATION_EXPIRY_INVALID",
                "A reservation must expire after it is created.");
        }

        return new ProjectSalesReservation
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PropertyUnitId = propertyUnitId,
            ProjectCustomerId = projectCustomerId,
            ReservationNumber = number,
            Status = SalesReservationStatus.Active,
            ReservedAtUtc = reservedAtUtc.ToUniversalTime(),
            ExpiresAtUtc = expiresAtUtc.ToUniversalTime(),
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void Cancel(string reason, Guid closedByUserId, DateTimeOffset nowUtc)
    {
        EnsureActive();

        if (closedByUserId == Guid.Empty)
            throw new DomainException("RESERVATION_REFERENCE_INVALID", "A cancelling employee is required.");

        var normalizedReason = (reason ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedReason))
            throw new DomainException("RESERVATION_CLOSE_REASON_REQUIRED", "A cancellation reason is required.");
        if (normalizedReason.Length > 300)
            throw new DomainException("RESERVATION_CLOSE_REASON_TOO_LONG", "The cancellation reason must not exceed 300 characters.");

        Status = SalesReservationStatus.Cancelled;
        ClosedAtUtc = nowUtc;
        ClosedByUserId = closedByUserId;
        CloseReason = normalizedReason;
        Touch(nowUtc);
    }

    public void Expire(DateTimeOffset nowUtc)
    {
        EnsureActive();
        if (ExpiresAtUtc > nowUtc)
            throw new DomainException("RESERVATION_NOT_DUE", "The reservation has not reached its expiry time.");

        Status = SalesReservationStatus.Expired;
        ClosedAtUtc = nowUtc;
        ClosedByUserId = null;
        CloseReason = "EXPIRED";
        Touch(nowUtc);
    }

    private void EnsureActive()
    {
        if (Status != SalesReservationStatus.Active)
        {
            throw new DomainException(
                "RESERVATION_NOT_ACTIVE",
                "Only an active reservation can be closed.");
        }
    }
}
