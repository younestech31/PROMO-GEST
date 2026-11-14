using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed class Building : BaseEntity
{
    private Building() { }

    public Guid ProjectId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string NormalizedCode { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameFr { get; private set; } = string.Empty;
    public BuildingStatus Status { get; private set; } = BuildingStatus.Planned;
    public Guid CreatedByUserId { get; private set; }

    public static Building Create(
        Guid projectId,
        string code,
        string nameAr,
        string nameFr,
        BuildingStatus status,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (projectId == Guid.Empty)
            throw new DomainException("BUILDING_PROJECT_REQUIRED", "A project is required for this building.");

        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("BUILDING_CODE_REQUIRED", "Building code is required.");

        var normalizedCode = code.Trim().ToUpperInvariant();
        EnsureLength(normalizedCode, 40, "BUILDING_CODE_TOO_LONG");

        if (string.IsNullOrWhiteSpace(nameAr) && string.IsNullOrWhiteSpace(nameFr))
            throw new DomainException("BUILDING_NAME_REQUIRED", "Building name in Arabic or French is required.");

        var effectiveAr = string.IsNullOrWhiteSpace(nameAr) ? nameFr.Trim() : nameAr.Trim();
        var effectiveFr = string.IsNullOrWhiteSpace(nameFr) ? nameAr.Trim() : nameFr.Trim();
        EnsureLength(effectiveAr, 200, "BUILDING_NAME_TOO_LONG");
        EnsureLength(effectiveFr, 200, "BUILDING_NAME_TOO_LONG");

        if (!Enum.IsDefined(status))
            throw new DomainException("BUILDING_STATUS_INVALID", "A valid building status is required.");

        if (createdByUserId == Guid.Empty)
            throw new DomainException("BUILDING_CREATOR_REQUIRED", "A building creator is required.");

        return new Building
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Code = normalizedCode,
            NormalizedCode = normalizedCode,
            NameAr = effectiveAr,
            NameFr = effectiveFr,
            Status = status,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    private static void EnsureLength(string value, int maximumLength, string errorCode)
    {
        if (value.Length > maximumLength)
            throw new DomainException(errorCode, $"Building field must not exceed {maximumLength} characters.");
    }
}

public sealed class BuildingFloor : BaseEntity
{
    private BuildingFloor() { }

    public Guid BuildingId { get; private set; }
    public int FloorNumber { get; private set; }
    public string NameAr { get; private set; } = string.Empty;
    public string NameFr { get; private set; } = string.Empty;

    public static BuildingFloor Create(
        Guid buildingId,
        int floorNumber,
        string nameAr,
        string nameFr,
        DateTimeOffset nowUtc)
    {
        if (buildingId == Guid.Empty)
            throw new DomainException("FLOOR_BUILDING_REQUIRED", "A building is required for this floor.");

        if (floorNumber is < -10 or > 200)
            throw new DomainException("FLOOR_NUMBER_INVALID", "Floor number must be between -10 and 200.");

        if (string.IsNullOrWhiteSpace(nameAr) && string.IsNullOrWhiteSpace(nameFr))
            throw new DomainException("FLOOR_NAME_REQUIRED", "Floor name in Arabic or French is required.");

        var effectiveAr = string.IsNullOrWhiteSpace(nameAr) ? nameFr.Trim() : nameAr.Trim();
        var effectiveFr = string.IsNullOrWhiteSpace(nameFr) ? nameAr.Trim() : nameFr.Trim();
        EnsureLength(effectiveAr, 100, "FLOOR_NAME_TOO_LONG");
        EnsureLength(effectiveFr, 100, "FLOOR_NAME_TOO_LONG");

        return new BuildingFloor
        {
            Id = Guid.NewGuid(),
            BuildingId = buildingId,
            FloorNumber = floorNumber,
            NameAr = effectiveAr,
            NameFr = effectiveFr,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    private static void EnsureLength(string value, int maximumLength, string errorCode)
    {
        if (value.Length > maximumLength)
            throw new DomainException(errorCode, $"Floor name must not exceed {maximumLength} characters.");
    }
}

public sealed class PropertyUnit : BaseEntity
{
    private PropertyUnit() { }

    public Guid FloorId { get; private set; }
    public string UnitNumber { get; private set; } = string.Empty;
    public string NormalizedUnitNumber { get; private set; } = string.Empty;
    public PropertyUnitType UnitType { get; private set; }
    public PropertyUnitStatus Status { get; private set; } = PropertyUnitStatus.Planned;
    public decimal? GrossAreaSquareMeters { get; private set; }
    public decimal? NetAreaSquareMeters { get; private set; }
    public int? RoomsCount { get; private set; }
    public Guid CreatedByUserId { get; private set; }

    public static PropertyUnit Create(
        Guid floorId,
        string unitNumber,
        PropertyUnitType unitType,
        PropertyUnitStatus status,
        decimal? grossAreaSquareMeters,
        decimal? netAreaSquareMeters,
        int? roomsCount,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (floorId == Guid.Empty)
            throw new DomainException("UNIT_FLOOR_REQUIRED", "A floor is required for this property unit.");

        if (string.IsNullOrWhiteSpace(unitNumber))
            throw new DomainException("UNIT_NUMBER_REQUIRED", "Property unit number is required.");

        var normalizedUnitNumber = unitNumber.Trim().ToUpperInvariant();
        EnsureLength(normalizedUnitNumber, 40, "UNIT_NUMBER_TOO_LONG");

        if (!Enum.IsDefined(unitType))
            throw new DomainException("UNIT_TYPE_INVALID", "A valid property unit type is required.");

        if (!Enum.IsDefined(status))
            throw new DomainException("UNIT_STATUS_INVALID", "A valid property unit status is required.");

        if (RequiresSalesWorkflow(status))
        {
            throw new DomainException(
                "UNIT_STATUS_REQUIRES_SALES_WORKFLOW",
                "Reserved, sold, and delivered states can only be assigned by the sales and contract workflow.");
        }

        ValidateMeasurements(grossAreaSquareMeters, netAreaSquareMeters, roomsCount);

        if (createdByUserId == Guid.Empty)
            throw new DomainException("UNIT_CREATOR_REQUIRED", "A property unit creator is required.");

        return new PropertyUnit
        {
            Id = Guid.NewGuid(),
            FloorId = floorId,
            UnitNumber = normalizedUnitNumber,
            NormalizedUnitNumber = normalizedUnitNumber,
            UnitType = unitType,
            Status = status,
            GrossAreaSquareMeters = grossAreaSquareMeters,
            NetAreaSquareMeters = netAreaSquareMeters,
            RoomsCount = roomsCount,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdateDetails(
        string unitNumber,
        PropertyUnitType unitType,
        decimal? grossAreaSquareMeters,
        decimal? netAreaSquareMeters,
        int? roomsCount,
        DateTimeOffset nowUtc)
    {
        if (Status is PropertyUnitStatus.Reserved or PropertyUnitStatus.Sold or PropertyUnitStatus.Delivered)
        {
            throw new DomainException(
                "UNIT_DETAILS_LOCKED_BY_SALES_WORKFLOW",
                "Property unit details are locked while the unit is reserved, sold, or delivered.");
        }

        if (string.IsNullOrWhiteSpace(unitNumber))
            throw new DomainException("UNIT_NUMBER_REQUIRED", "Property unit number is required.");

        var normalizedUnitNumber = unitNumber.Trim().ToUpperInvariant();
        EnsureLength(normalizedUnitNumber, 40, "UNIT_NUMBER_TOO_LONG");

        if (!Enum.IsDefined(unitType))
            throw new DomainException("UNIT_TYPE_INVALID", "A valid property unit type is required.");

        ValidateMeasurements(grossAreaSquareMeters, netAreaSquareMeters, roomsCount);

        UnitNumber = normalizedUnitNumber;
        NormalizedUnitNumber = normalizedUnitNumber;
        UnitType = unitType;
        GrossAreaSquareMeters = grossAreaSquareMeters;
        NetAreaSquareMeters = netAreaSquareMeters;
        RoomsCount = roomsCount;
        Touch(nowUtc);
    }

    public void ChangeStatus(PropertyUnitStatus newStatus, DateTimeOffset nowUtc)
    {
        if (!Enum.IsDefined(newStatus))
            throw new DomainException("UNIT_STATUS_INVALID", "A valid property unit status is required.");

        if (RequiresSalesWorkflow(newStatus))
        {
            throw new DomainException(
                "UNIT_STATUS_REQUIRES_SALES_WORKFLOW",
                "Reserved, sold, and delivered states can only be assigned by the sales and contract workflow.");
        }

        if (RequiresSalesWorkflow(Status))
        {
            throw new DomainException(
                "UNIT_STATUS_LOCKED_BY_SALES_WORKFLOW",
                "The status of a reserved, sold, or delivered unit can only be changed by the sales and contract workflow.");
        }

        if (newStatus == Status)
            return;

        var transitionAllowed = (Status, newStatus) switch
        {
            (PropertyUnitStatus.Planned, PropertyUnitStatus.UnderConstruction) => true,
            (PropertyUnitStatus.Planned, PropertyUnitStatus.Withdrawn) => true,
            (PropertyUnitStatus.UnderConstruction, PropertyUnitStatus.AvailableForSale) => true,
            (PropertyUnitStatus.UnderConstruction, PropertyUnitStatus.Withdrawn) => true,
            (PropertyUnitStatus.AvailableForSale, PropertyUnitStatus.Withdrawn) => true,
            _ => false
        };

        if (!transitionAllowed)
        {
            throw new DomainException(
                "UNIT_STATUS_TRANSITION_INVALID",
                $"The transition from {Status} to {newStatus} is not allowed.");
        }

        Status = newStatus;
        Touch(nowUtc);
    }

    private static bool RequiresSalesWorkflow(PropertyUnitStatus status)
        => status is PropertyUnitStatus.Reserved or PropertyUnitStatus.Sold or PropertyUnitStatus.Delivered;

    private static void ValidateMeasurements(
        decimal? grossAreaSquareMeters,
        decimal? netAreaSquareMeters,
        int? roomsCount)
    {
        const decimal maximumArea = 99_999_999.99m;
        if (grossAreaSquareMeters is < 0 or > maximumArea ||
            netAreaSquareMeters is < 0 or > maximumArea)
        {
            throw new DomainException("UNIT_AREA_INVALID", "Unit areas must be non-negative and fit the supported range.");
        }

        if (grossAreaSquareMeters.HasValue &&
            netAreaSquareMeters.HasValue &&
            netAreaSquareMeters.Value > grossAreaSquareMeters.Value)
        {
            throw new DomainException("UNIT_NET_AREA_EXCEEDS_GROSS", "Net area cannot exceed gross area.");
        }

        if (roomsCount is < 0 or > 20)
            throw new DomainException("UNIT_ROOMS_COUNT_INVALID", "Room count must be between 0 and 20.");
    }

    private static void EnsureLength(string value, int maximumLength, string errorCode)
    {
        if (value.Length > maximumLength)
            throw new DomainException(errorCode, $"Property unit number must not exceed {maximumLength} characters.");
    }
}
