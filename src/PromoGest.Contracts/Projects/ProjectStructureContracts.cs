namespace PromoGest.Contracts.Projects;

public sealed record ProjectStructureDto(
    Guid ProjectId,
    IReadOnlyList<BuildingStructureDto> Buildings);

public sealed record BuildingStructureDto(
    Guid Id,
    Guid ProjectId,
    string Code,
    string NameAr,
    string NameFr,
    string Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    Guid ConcurrencyStamp,
    IReadOnlyList<BuildingFloorDto> Floors);

public sealed record BuildingFloorDto(
    Guid Id,
    Guid BuildingId,
    int FloorNumber,
    string NameAr,
    string NameFr,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<PropertyUnitDto> Units);

public sealed record PropertyUnitDto(
    Guid Id,
    Guid FloorId,
    string UnitNumber,
    string UnitType,
    string Status,
    decimal? GrossAreaSquareMeters,
    decimal? NetAreaSquareMeters,
    int? RoomsCount,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    Guid ConcurrencyStamp);

public sealed record CreateBuildingRequest(
    string Code,
    string NameAr,
    string NameFr,
    string Status);

public sealed record CreateBuildingFloorRequest(
    int FloorNumber,
    string NameAr,
    string NameFr);

public sealed record CreatePropertyUnitRequest(
    string UnitNumber,
    string UnitType,
    string Status,
    decimal? GrossAreaSquareMeters,
    decimal? NetAreaSquareMeters,
    int? RoomsCount);

public sealed record UpdatePropertyUnitRequest(
    string UnitNumber,
    string UnitType,
    decimal? GrossAreaSquareMeters,
    decimal? NetAreaSquareMeters,
    int? RoomsCount,
    Guid ExpectedConcurrencyStamp);

public sealed record ChangePropertyUnitStatusRequest(
    string Status,
    Guid ExpectedConcurrencyStamp);
