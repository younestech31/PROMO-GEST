namespace PromoGest.Contracts.Projects;

public sealed record ProjectMemberDto(
    Guid Id,
    Guid UserId,
    string Username,
    string FullName,
    string RoleInProject,
    bool CanViewFinancials,
    bool CanManageSales,
    bool CanManageConstruction,
    bool CanManageDocuments,
    DateTimeOffset AssignedAtUtc);

public sealed record ProjectDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameFr,
    string WilayaCode,
    string WilayaName,
    string Municipality,
    string? Address,
    string? LandTitleReference,
    string? BuildingPermitNumber,
    DateOnly? BuildingPermitDate,
    string Status,
    decimal EstimatedBudgetDzd,
    int PlannedBlocksCount,
    int PlannedUnitsCount,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<ProjectMemberDto> Members);

public sealed record CreateProjectRequest(
    string Code,
    string NameAr,
    string NameFr,
    string WilayaCode,
    string WilayaName,
    string Municipality,
    string? Address,
    string? LandTitleReference,
    string? BuildingPermitNumber,
    DateOnly? BuildingPermitDate,
    string Status,
    decimal EstimatedBudgetDzd,
    int PlannedBlocksCount,
    int PlannedUnitsCount);

public sealed record UpdateProjectRequest(
    string NameAr,
    string NameFr,
    string WilayaCode,
    string WilayaName,
    string Municipality,
    string? Address,
    string? LandTitleReference,
    string? BuildingPermitNumber,
    DateOnly? BuildingPermitDate,
    string Status,
    decimal EstimatedBudgetDzd,
    int PlannedBlocksCount,
    int PlannedUnitsCount);

public sealed record AssignProjectMemberRequest(
    Guid UserId,
    string RoleInProject,
    bool CanViewFinancials,
    bool CanManageSales,
    bool CanManageConstruction,
    bool CanManageDocuments);
