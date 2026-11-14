using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfProjectStructureRepository : IProjectStructureRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectStructureRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Building>> ListBuildingsByProjectAsync(
        Guid projectId,
        CancellationToken ct = default)
        => await _dbContext.Buildings
            .AsNoTracking()
            .Where(building => building.ProjectId == projectId)
            .OrderBy(building => building.NormalizedCode)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<BuildingFloor>> ListFloorsByProjectAsync(
        Guid projectId,
        CancellationToken ct = default)
        => await _dbContext.BuildingFloors
            .AsNoTracking()
            .Where(floor => _dbContext.Buildings.Any(
                building => building.Id == floor.BuildingId && building.ProjectId == projectId))
            .OrderBy(floor => floor.BuildingId)
            .ThenBy(floor => floor.FloorNumber)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<PropertyUnit>> ListUnitsByProjectAsync(
        Guid projectId,
        CancellationToken ct = default)
        => await _dbContext.PropertyUnits
            .AsNoTracking()
            .Where(unit => _dbContext.BuildingFloors.Any(
                floor => floor.Id == unit.FloorId &&
                    _dbContext.Buildings.Any(
                        building => building.Id == floor.BuildingId && building.ProjectId == projectId)))
            .OrderBy(unit => unit.FloorId)
            .ThenBy(unit => unit.NormalizedUnitNumber)
            .ToListAsync(ct);

    // Tracked reads are required for version-checked aggregate updates.
    public Task<Building?> GetBuildingAsync(Guid buildingId, CancellationToken ct = default)
        => _dbContext.Buildings
            .FirstOrDefaultAsync(building => building.Id == buildingId, ct);

    public Task<BuildingFloor?> GetFloorAsync(Guid floorId, CancellationToken ct = default)
        => _dbContext.BuildingFloors
            .FirstOrDefaultAsync(floor => floor.Id == floorId, ct);

    public Task<bool> ExistsBuildingCodeAsync(
        Guid projectId,
        string normalizedCode,
        CancellationToken ct = default)
        => _dbContext.Buildings.AnyAsync(
            building => building.ProjectId == projectId && building.NormalizedCode == normalizedCode,
            ct);

    public Task<bool> ExistsFloorNumberAsync(
        Guid buildingId,
        int floorNumber,
        CancellationToken ct = default)
        => _dbContext.BuildingFloors.AnyAsync(
            floor => floor.BuildingId == buildingId && floor.FloorNumber == floorNumber,
            ct);

    public Task<bool> ExistsUnitNumberAsync(
        Guid floorId,
        string normalizedUnitNumber,
        Guid? excludeUnitId = null,
        CancellationToken ct = default)
        => _dbContext.PropertyUnits.AnyAsync(
            unit => unit.FloorId == floorId &&
                unit.NormalizedUnitNumber == normalizedUnitNumber &&
                (!excludeUnitId.HasValue || unit.Id != excludeUnitId.Value),
            ct);

    public Task<PropertyUnit?> GetPropertyUnitForUpdateAsync(
        Guid floorId,
        Guid unitId,
        CancellationToken ct = default)
        => _dbContext.PropertyUnits.FirstOrDefaultAsync(
            unit => unit.Id == unitId && unit.FloorId == floorId,
            ct);

    public async Task AddBuildingAsync(Building building, CancellationToken ct = default)
        => await _dbContext.Buildings.AddAsync(building, ct);

    public async Task AddFloorAsync(BuildingFloor floor, CancellationToken ct = default)
        => await _dbContext.BuildingFloors.AddAsync(floor, ct);

    public async Task AddPropertyUnitAsync(PropertyUnit unit, CancellationToken ct = default)
        => await _dbContext.PropertyUnits.AddAsync(unit, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}
