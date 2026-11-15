using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Exceptions;
using Npgsql;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfProjectSalesReservationRepository : IProjectSalesReservationRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectSalesReservationRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectSalesReservationListItem>> ListByProjectAsync(
        Guid projectId,
        CancellationToken ct = default)
        => await (
            from reservation in _dbContext.ProjectSalesReservations.AsNoTracking()
            join unit in _dbContext.PropertyUnits.AsNoTracking()
                on reservation.PropertyUnitId equals unit.Id
            join customer in _dbContext.ProjectCustomers.AsNoTracking()
                on reservation.ProjectCustomerId equals customer.Id
            join party in _dbContext.Parties.AsNoTracking()
                on customer.PartyId equals party.Id
            where reservation.ProjectId == projectId
            orderby reservation.CreatedAtUtc descending
            select new ProjectSalesReservationListItem(
                reservation,
                unit.UnitNumber,
                party.DisplayName))
            .ToListAsync(ct);

    public Task<ProjectSalesReservation?> GetByProjectAsync(
        Guid projectId,
        Guid reservationId,
        CancellationToken ct = default)
        => _dbContext.ProjectSalesReservations.FirstOrDefaultAsync(
            reservation => reservation.ProjectId == projectId && reservation.Id == reservationId,
            ct);

    public Task<PropertyUnit?> GetPropertyUnitForProjectAsync(
        Guid projectId,
        Guid propertyUnitId,
        CancellationToken ct = default)
        => _dbContext.PropertyUnits.FirstOrDefaultAsync(
            unit => unit.Id == propertyUnitId &&
                _dbContext.BuildingFloors.Any(floor =>
                    floor.Id == unit.FloorId &&
                    _dbContext.Buildings.Any(building =>
                        building.Id == floor.BuildingId && building.ProjectId == projectId)),
            ct);

    public async Task<IReadOnlyList<ProjectSalesReservation>> ListDueForExpiryAsync(
        DateTimeOffset nowUtc,
        int limit,
        CancellationToken ct = default)
        => await _dbContext.ProjectSalesReservations
            .Where(reservation =>
                reservation.Status == Domain.Enums.SalesReservationStatus.Active &&
                reservation.ExpiresAtUtc <= nowUtc)
            .OrderBy(reservation => reservation.ExpiresAtUtc)
            .Take(Math.Clamp(limit, 1, 500))
            .ToListAsync(ct);

    public async Task AddAsync(ProjectSalesReservation reservation, CancellationToken ct = default)
        => await _dbContext.ProjectSalesReservations.AddAsync(reservation, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictDomainException(
                "RESERVATION_CONCURRENCY_CONFLICT",
                "The reservation or property unit was changed by another operation. Reload and try again.");
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException postgres &&
            postgres.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new ConflictDomainException(
                "RESERVATION_UNIT_UNAVAILABLE",
                "Another active reservation already exists for this property unit.");
        }
    }
}
