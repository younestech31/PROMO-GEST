using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class ProjectStructureService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IProjectStructureRepository _structureRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectStructureService(
        IProjectRepository projectRepository,
        IProjectStructureRepository structureRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _projectRepository = projectRepository;
        _structureRepository = structureRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<ProjectStructureDto> GetProjectStructureAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var project = await RequireProjectAccessAsync(actorUserId, projectId, canManage: false, metadata, ct);

        var buildings = await _structureRepository.ListBuildingsByProjectAsync(project.Id, ct);
        var floors = await _structureRepository.ListFloorsByProjectAsync(project.Id, ct);
        var units = await _structureRepository.ListUnitsByProjectAsync(project.Id, ct);

        var unitsByFloor = units
            .GroupBy(unit => unit.FloorId)
            .ToDictionary(group => group.Key, group => group
                .OrderBy(unit => unit.NormalizedUnitNumber)
                .Select(MapUnit)
                .ToList());

        var floorsByBuilding = floors
            .GroupBy(floor => floor.BuildingId)
            .ToDictionary(group => group.Key, group => group
                .OrderBy(floor => floor.FloorNumber)
                .Select(floor => new BuildingFloorDto(
                    floor.Id,
                    floor.BuildingId,
                    floor.FloorNumber,
                    floor.NameAr,
                    floor.NameFr,
                    floor.CreatedAtUtc,
                    floor.UpdatedAtUtc,
                    floor.ConcurrencyStamp,
                    unitsByFloor.GetValueOrDefault(floor.Id) ?? new List<PropertyUnitDto>()))
                .ToList());

        var buildingDtos = buildings
            .OrderBy(building => building.NormalizedCode)
            .Select(building => new BuildingStructureDto(
                building.Id,
                building.ProjectId,
                building.Code,
                building.NameAr,
                building.NameFr,
                building.Status.ToString(),
                building.CreatedAtUtc,
                building.UpdatedAtUtc,
                building.ConcurrencyStamp,
                floorsByBuilding.GetValueOrDefault(building.Id) ?? new List<BuildingFloorDto>()))
            .ToList();

        return new ProjectStructureDto(project.Id, buildingDtos);
    }

    public async Task<ProjectStructureDto> CreateBuildingAsync(
        Guid actorUserId,
        Guid projectId,
        CreateBuildingRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        if (!Enum.TryParse<BuildingStatus>(request.Status, ignoreCase: true, out var status) ||
            !Enum.IsDefined(status))
        {
            throw new DomainException("BUILDING_STATUS_INVALID", "A valid building status is required.");
        }

        var buildingCode = request.Code?.Trim() ?? string.Empty;
        var normalizedCode = buildingCode.ToUpperInvariant();
        if (await _structureRepository.ExistsBuildingCodeAsync(projectId, normalizedCode, ct))
            throw new ConflictDomainException("BUILDING_CODE_EXISTS", "A building with this code already exists in the project.");

        var nowUtc = _clock.UtcNow;
        var building = Building.Create(
            projectId,
            buildingCode,
            request.NameAr,
            request.NameFr,
            status,
            actorAndProject.Actor.Id,
            nowUtc);

        await _structureRepository.AddBuildingAsync(building, ct);
        await WriteAuditAsync(
            actorAndProject.Actor,
            nowUtc,
            "BUILDING_CREATED",
            "Building",
            building.Id.ToString(),
            $"Created building '{building.Code}' in project '{actorAndProject.Project.Code}'.",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    public async Task<ProjectStructureDto> CreateFloorAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        CreateBuildingFloorRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        var building = await _structureRepository.GetBuildingAsync(buildingId, ct);
        if (building is null || building.ProjectId != projectId)
            throw new NotFoundDomainException("BUILDING_NOT_FOUND", "Building not found in this project.");

        if (await _structureRepository.ExistsFloorNumberAsync(buildingId, request.FloorNumber, ct))
            throw new ConflictDomainException("FLOOR_NUMBER_EXISTS", "This floor number already exists in the building.");

        var nowUtc = _clock.UtcNow;
        var floor = BuildingFloor.Create(
            buildingId,
            request.FloorNumber,
            request.NameAr,
            request.NameFr,
            nowUtc);

        await _structureRepository.AddFloorAsync(floor, ct);
        await WriteAuditAsync(
            actorAndProject.Actor,
            nowUtc,
            "BUILDING_FLOOR_CREATED",
            "BuildingFloor",
            floor.Id.ToString(),
            $"Created floor {floor.FloorNumber} in building '{building.Code}' of project '{actorAndProject.Project.Code}'.",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    public async Task<ProjectStructureDto> CreatePropertyUnitAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        CreatePropertyUnitRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        var building = await _structureRepository.GetBuildingAsync(buildingId, ct);
        if (building is null || building.ProjectId != projectId)
            throw new NotFoundDomainException("BUILDING_NOT_FOUND", "Building not found in this project.");

        var floor = await _structureRepository.GetFloorAsync(floorId, ct);
        if (floor is null || floor.BuildingId != buildingId)
            throw new NotFoundDomainException("FLOOR_NOT_FOUND", "Floor not found in this building.");

        if (!Enum.TryParse<PropertyUnitType>(request.UnitType, ignoreCase: true, out var unitType) ||
            !Enum.IsDefined(unitType))
        {
            throw new DomainException("UNIT_TYPE_INVALID", "A valid property unit type is required.");
        }

        if (!Enum.TryParse<PropertyUnitStatus>(request.Status, ignoreCase: true, out var status) ||
            !Enum.IsDefined(status))
        {
            throw new DomainException("UNIT_STATUS_INVALID", "A valid property unit status is required.");
        }

        var unitNumber = request.UnitNumber?.Trim() ?? string.Empty;
        var normalizedUnitNumber = unitNumber.ToUpperInvariant();
        if (await _structureRepository.ExistsUnitNumberAsync(
            floorId, normalizedUnitNumber, excludeUnitId: null, ct: ct))
            throw new ConflictDomainException("UNIT_NUMBER_EXISTS", "A property unit with this number already exists on the floor.");

        var nowUtc = _clock.UtcNow;
        var unit = PropertyUnit.Create(
            floorId,
            unitNumber,
            unitType,
            status,
            request.GrossAreaSquareMeters,
            request.NetAreaSquareMeters,
            request.RoomsCount,
            actorAndProject.Actor.Id,
            nowUtc);

        await _structureRepository.AddPropertyUnitAsync(unit, ct);
        await WriteAuditAsync(
            actorAndProject.Actor,
            nowUtc,
            "PROPERTY_UNIT_CREATED",
            "PropertyUnit",
            unit.Id.ToString(),
            $"Created property unit '{unit.UnitNumber}' ({unitType}) on floor {floor.FloorNumber}, building '{building.Code}', project '{actorAndProject.Project.Code}'.",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }


    public async Task<ProjectStructureDto> UpdateBuildingAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        UpdateBuildingRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        var building = await _structureRepository.GetBuildingAsync(buildingId, ct);
        if (building is null || building.ProjectId != projectId)
            throw new NotFoundDomainException("BUILDING_NOT_FOUND", "Building not found in this project.");

        EnsureExpectedConcurrencyStamp(building.ConcurrencyStamp, request.ExpectedConcurrencyStamp);

        if (!Enum.TryParse<BuildingStatus>(request.Status, ignoreCase: true, out var status) ||
            !Enum.IsDefined(status))
        {
            throw new DomainException("BUILDING_STATUS_INVALID", "A valid building status is required.");
        }

        var normalizedCode = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
        if (await _structureRepository.ExistsBuildingCodeAsync(projectId, normalizedCode, buildingId, ct))
        {
            throw new ConflictDomainException(
                "BUILDING_CODE_EXISTS",
                "A building with this code already exists in the project.");
        }

        var previousCode = building.Code;
        var nowUtc = _clock.UtcNow;
        building.UpdateDetails(normalizedCode, request.NameAr, request.NameFr, status, nowUtc);

        await WriteAuditAsync(
            actorAndProject.Actor,
            nowUtc,
            "BUILDING_UPDATED",
            "Building",
            building.Id.ToString(),
            $"Updated building '{previousCode}' to '{building.Code}' in project '{actorAndProject.Project.Code}'.",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    public async Task<ProjectStructureDto> UpdateFloorAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        UpdateBuildingFloorRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        var building = await _structureRepository.GetBuildingAsync(buildingId, ct);
        if (building is null || building.ProjectId != projectId)
            throw new NotFoundDomainException("BUILDING_NOT_FOUND", "Building not found in this project.");

        var floor = await _structureRepository.GetFloorAsync(floorId, ct);
        if (floor is null || floor.BuildingId != buildingId)
            throw new NotFoundDomainException("FLOOR_NOT_FOUND", "Floor not found in this building.");

        EnsureExpectedConcurrencyStamp(floor.ConcurrencyStamp, request.ExpectedConcurrencyStamp);

        if (await _structureRepository.ExistsFloorNumberAsync(buildingId, request.FloorNumber, floorId, ct))
        {
            throw new ConflictDomainException(
                "FLOOR_NUMBER_EXISTS",
                "This floor number already exists in the building.");
        }

        var previousNumber = floor.FloorNumber;
        var nowUtc = _clock.UtcNow;
        floor.UpdateDetails(request.FloorNumber, request.NameAr, request.NameFr, nowUtc);

        await WriteAuditAsync(
            actorAndProject.Actor,
            nowUtc,
            "BUILDING_FLOOR_UPDATED",
            "BuildingFloor",
            floor.Id.ToString(),
            $"Updated floor {previousNumber} to {floor.FloorNumber} in building '{building.Code}' of project '{actorAndProject.Project.Code}'.",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    public async Task<ProjectStructureDto> UpdatePropertyUnitAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        Guid unitId,
        UpdatePropertyUnitRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var scope = await RequireUnitForManagementAsync(
            actorUserId, projectId, buildingId, floorId, unitId, metadata, ct);

        EnsureExpectedConcurrencyStamp(scope.Unit.ConcurrencyStamp, request.ExpectedConcurrencyStamp);

        if (!Enum.TryParse<PropertyUnitType>(request.UnitType, ignoreCase: true, out var unitType) ||
            !Enum.IsDefined(unitType))
        {
            throw new DomainException("UNIT_TYPE_INVALID", "A valid property unit type is required.");
        }

        var unitNumber = request.UnitNumber?.Trim() ?? string.Empty;
        var normalizedUnitNumber = unitNumber.ToUpperInvariant();
        if (await _structureRepository.ExistsUnitNumberAsync(
            floorId, normalizedUnitNumber, excludeUnitId: unitId, ct: ct))
        {
            throw new ConflictDomainException(
                "UNIT_NUMBER_EXISTS",
                "A property unit with this number already exists on the floor.");
        }

        var previousNumber = scope.Unit.UnitNumber;
        var previousType = scope.Unit.UnitType;
        var nowUtc = _clock.UtcNow;

        scope.Unit.UpdateDetails(
            unitNumber,
            unitType,
            request.GrossAreaSquareMeters,
            request.NetAreaSquareMeters,
            request.RoomsCount,
            nowUtc);

        await WriteAuditAsync(
            scope.Actor,
            nowUtc,
            "PROPERTY_UNIT_UPDATED",
            "PropertyUnit",
            scope.Unit.Id.ToString(),
            $"Updated property unit '{previousNumber}' to '{scope.Unit.UnitNumber}' in project '{scope.Project.Code}' (type: {previousType} -> {unitType}).",
            metadata,
            ct);
        await _structureRepository.SaveChangesAsync(ct);

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    public async Task<ProjectStructureDto> ChangePropertyUnitStatusAsync(
        Guid actorUserId,
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        Guid unitId,
        ChangePropertyUnitStatusRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var scope = await RequireUnitForManagementAsync(
            actorUserId, projectId, buildingId, floorId, unitId, metadata, ct);

        EnsureExpectedConcurrencyStamp(scope.Unit.ConcurrencyStamp, request.ExpectedConcurrencyStamp);

        if (!Enum.TryParse<PropertyUnitStatus>(request.Status, ignoreCase: true, out var newStatus) ||
            !Enum.IsDefined(newStatus))
        {
            throw new DomainException("UNIT_STATUS_INVALID", "A valid property unit status is required.");
        }

        var previousStatus = scope.Unit.Status;
        var nowUtc = _clock.UtcNow;
        scope.Unit.ChangeStatus(newStatus, nowUtc);

        if (scope.Unit.Status != previousStatus)
        {
            await WriteAuditAsync(
                scope.Actor,
                nowUtc,
                "PROPERTY_UNIT_STATUS_CHANGED",
                "PropertyUnit",
                scope.Unit.Id.ToString(),
                $"Changed property unit '{scope.Unit.UnitNumber}' status from {previousStatus} to {scope.Unit.Status} in project '{scope.Project.Code}'.",
                metadata,
                ct);
            await _structureRepository.SaveChangesAsync(ct);
        }

        return await GetProjectStructureAsync(actorUserId, projectId, metadata, ct);
    }

    private async Task<(User Actor, Project Project, Building Building, BuildingFloor Floor, PropertyUnit Unit)>
        RequireUnitForManagementAsync(
            Guid actorUserId,
            Guid projectId,
            Guid buildingId,
            Guid floorId,
            Guid unitId,
            RequestMetadata metadata,
            CancellationToken ct)
    {
        var actorAndProject = await RequireActorAndProjectAsync(
            actorUserId, projectId, canManage: true, metadata, ct);

        var building = await _structureRepository.GetBuildingAsync(buildingId, ct);
        if (building is null || building.ProjectId != projectId)
            throw new NotFoundDomainException("BUILDING_NOT_FOUND", "Building not found in this project.");

        var floor = await _structureRepository.GetFloorAsync(floorId, ct);
        if (floor is null || floor.BuildingId != buildingId)
            throw new NotFoundDomainException("FLOOR_NOT_FOUND", "Floor not found in this building.");

        var unit = await _structureRepository.GetPropertyUnitForUpdateAsync(floorId, unitId, ct);
        if (unit is null)
            throw new NotFoundDomainException("UNIT_NOT_FOUND", "Property unit not found on this floor.");

        return (actorAndProject.Actor, actorAndProject.Project, building, floor, unit);
    }

    private static void EnsureExpectedConcurrencyStamp(Guid actualConcurrencyStamp, Guid expectedConcurrencyStamp)
    {
        if (expectedConcurrencyStamp == Guid.Empty || actualConcurrencyStamp != expectedConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "CONCURRENCY_CONFLICT",
                "This record changed after it was loaded. Reload it before saving.");
        }
    }

    private async Task<Project> RequireProjectAccessAsync(
        Guid actorUserId,
        Guid projectId,
        bool canManage,
        RequestMetadata metadata,
        CancellationToken ct)
        => (await RequireActorAndProjectAsync(actorUserId, projectId, canManage, metadata, ct)).Project;

    private async Task<(User Actor, Project Project)> RequireActorAndProjectAsync(
        Guid actorUserId,
        Guid projectId,
        bool canManage,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var membership = project.Members.FirstOrDefault(member => member.UserId == actorUserId);
        var permissions = actor.IsSystemAdministrator
            ? Array.Empty<string>()
            : await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);

        var hasGlobalManagementPermission =
            permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase) ||
            permissions.Contains("projects.structure.manage", StringComparer.OrdinalIgnoreCase);

        var canRead = actor.IsSystemAdministrator || membership is not null || hasGlobalManagementPermission;
        var canManageStructure = actor.IsSystemAdministrator ||
            hasGlobalManagementPermission ||
            membership?.CanManageConstruction == true ||
            membership?.RoleInProject == ProjectRole.ProjectManager;

        if ((canManage && !canManageStructure) || (!canManage && !canRead))
        {
            await WriteAuditAsync(
                actor,
                _clock.UtcNow,
                "ACCESS_DENIED",
                "Project",
                projectId.ToString(),
                $"Unauthorized project-structure {(canManage ? "management" : "read")} attempt by '{actor.Username}' on project '{project.Code}'.",
                metadata,
                ct);
            await _structureRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException(
                canManage ? "FORBIDDEN_PROJECT_STRUCTURE_MANAGE" : "PROJECT_ACCESS_DENIED",
                canManage
                    ? "You do not have permission to manage this project's building structure."
                    : "You do not have access to this project's structure.");
        }

        return (actor, project);
    }

    private async Task WriteAuditAsync(
        User actor,
        DateTimeOffset occurredAtUtc,
        string eventType,
        string targetEntityType,
        string targetEntityId,
        string summary,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                occurredAtUtc,
                actor.Id,
                actor.Username,
                eventType,
                eventType == "ACCESS_DENIED" ? AuditSeverity.Security : AuditSeverity.Info,
                targetEntityType,
                targetEntityId,
                summary,
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
    }

    private static PropertyUnitDto MapUnit(PropertyUnit unit)
        => new(
            unit.Id,
            unit.FloorId,
            unit.UnitNumber,
            unit.UnitType.ToString(),
            unit.Status.ToString(),
            unit.GrossAreaSquareMeters,
            unit.NetAreaSquareMeters,
            unit.RoomsCount,
            unit.CreatedAtUtc,
            unit.UpdatedAtUtc,
            unit.ConcurrencyStamp);
}
