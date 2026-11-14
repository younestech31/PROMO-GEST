namespace PromoGest.Contracts.Projects;

public sealed record CreateProjectSalesReservationRequest(
    Guid PropertyUnitId,
    Guid ProjectCustomerId,
    DateTimeOffset ExpiresAtUtc);

public sealed record CancelProjectSalesReservationRequest(
    string Reason,
    Guid ExpectedConcurrencyStamp);

public sealed record ProjectSalesReservationDto(
    Guid Id,
    Guid ProjectId,
    Guid PropertyUnitId,
    string UnitNumber,
    Guid ProjectCustomerId,
    string CustomerName,
    string ReservationNumber,
    string Status,
    DateTimeOffset ReservedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset? ClosedAtUtc,
    Guid? ClosedByUserId,
    string? CloseReason,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAtUtc,
    Guid ConcurrencyStamp);
