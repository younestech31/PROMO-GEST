using PromoGest.Domain.Common;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Entities;

public sealed class Project : BaseEntity
{
    private readonly List<ProjectMember> _members = new();

    private Project() { }

    public string Code { get; private set; } = string.Empty;
    public string NormalizedCode { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameFr { get; private set; } = string.Empty;
    public string WilayaCode { get; private set; } = "16";
    public string WilayaName { get; private set; } = string.Empty;
    public string Municipality { get; private set; } = string.Empty;
    public string? Address { get; private set; }
    public string? LandTitleReference { get; private set; }
    public string? BuildingPermitNumber { get; private set; }
    public DateOnly? BuildingPermitDate { get; private set; }
    public ProjectStatus Status { get; private set; } = ProjectStatus.Planning;
    public decimal EstimatedBudgetDzd { get; private set; }
    public int PlannedBlocksCount { get; private set; }
    public int PlannedUnitsCount { get; private set; }
    public Guid CreatedByUserId { get; private set; }

    public IReadOnlyCollection<ProjectMember> Members => _members.AsReadOnly();

    public static Project Create(
        string code,
        string nameAr,
        string nameFr,
        string wilayaCode,
        string wilayaName,
        string municipality,
        string? address,
        string? landTitleReference,
        string? buildingPermitNumber,
        DateOnly? buildingPermitDate,
        ProjectStatus status,
        decimal estimatedBudgetDzd,
        int plannedBlocksCount,
        int plannedUnitsCount,
        Guid createdByUserId,
        DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("PROJECT_CODE_REQUIRED", "Project code is required.");
        if (string.IsNullOrWhiteSpace(nameAr) && string.IsNullOrWhiteSpace(nameFr))
            throw new DomainException("PROJECT_NAME_REQUIRED", "Project name in Arabic or French is required.");
        if (!OrganizationSettings.IsValidAlgerianWilayaCode(wilayaCode))
            throw new DomainException("PROJECT_WILAYA_INVALID", "Valid two-digit Algerian Wilaya code (01-58) is required.");
        if (string.IsNullOrWhiteSpace(wilayaName))
            throw new DomainException("PROJECT_WILAYA_NAME_REQUIRED", "Wilaya name is required.");
        if (string.IsNullOrWhiteSpace(municipality))
            throw new DomainException("PROJECT_MUNICIPALITY_REQUIRED", "Municipality (Commune) is required.");
        if (estimatedBudgetDzd < 0)
            throw new DomainException("PROJECT_BUDGET_NEGATIVE", "Estimated budget in DZD cannot be negative.");
        if (plannedBlocksCount < 0 || plannedUnitsCount < 0)
            throw new DomainException("PROJECT_COUNTS_NEGATIVE", "Planned blocks and units counts cannot be negative.");

        var trimmedCode = code.Trim().ToUpperInvariant();
        var effectiveAr = string.IsNullOrWhiteSpace(nameAr) ? nameFr.Trim() : nameAr.Trim();
        var effectiveFr = string.IsNullOrWhiteSpace(nameFr) ? nameAr.Trim() : nameFr.Trim();

        return new Project
        {
            Id = Guid.NewGuid(),
            Code = trimmedCode,
            NormalizedCode = trimmedCode,
            NameAr = effectiveAr,
            NameFr = effectiveFr,
            WilayaCode = wilayaCode.Trim(),
            WilayaName = wilayaName.Trim(),
            Municipality = municipality.Trim(),
            Address = string.IsNullOrWhiteSpace(address) ? null : address.Trim(),
            LandTitleReference = string.IsNullOrWhiteSpace(landTitleReference) ? null : landTitleReference.Trim(),
            BuildingPermitNumber = string.IsNullOrWhiteSpace(buildingPermitNumber) ? null : buildingPermitNumber.Trim(),
            BuildingPermitDate = buildingPermitDate,
            Status = status,
            EstimatedBudgetDzd = estimatedBudgetDzd,
            PlannedBlocksCount = plannedBlocksCount,
            PlannedUnitsCount = plannedUnitsCount,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public ProjectMember AssignMember(
        Guid userId,
        ProjectRole roleInProject,
        bool canViewFinancials,
        bool canManageSales,
        bool canManageConstruction,
        bool canManageDocuments,
        Guid assignedByUserId,
        DateTimeOffset nowUtc)
    {
        var existing = _members.FirstOrDefault(m => m.UserId == userId);
        if (existing is not null)
        {
            existing.UpdatePermissions(
                roleInProject,
                canViewFinancials,
                canManageSales,
                canManageConstruction,
                canManageDocuments,
                assignedByUserId,
                nowUtc);
            return existing;
        }

        var member = ProjectMember.Create(
            Id,
            userId,
            roleInProject,
            canViewFinancials,
            canManageSales,
            canManageConstruction,
            canManageDocuments,
            assignedByUserId,
            nowUtc);

        _members.Add(member);
        Touch(nowUtc);
        return member;
    }

    public bool RemoveMember(Guid userId, DateTimeOffset nowUtc)
    {
        var existing = _members.FirstOrDefault(m => m.UserId == userId);
        if (existing is null)
            return false;

        _members.Remove(existing);
        Touch(nowUtc);
        return true;
    }
}

public sealed class ProjectMember : BaseEntity
{
    private ProjectMember() { }

    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public ProjectRole RoleInProject { get; private set; }
    public bool CanViewFinancials { get; private set; }
    public bool CanManageSales { get; private set; }
    public bool CanManageConstruction { get; private set; }
    public bool CanManageDocuments { get; private set; }
    public Guid AssignedByUserId { get; private set; }
    public DateTimeOffset AssignedAtUtc { get; private set; }

    public static ProjectMember Create(
        Guid projectId,
        Guid userId,
        ProjectRole roleInProject,
        bool canViewFinancials,
        bool canManageSales,
        bool canManageConstruction,
        bool canManageDocuments,
        Guid assignedByUserId,
        DateTimeOffset nowUtc)
    {
        return new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UserId = userId,
            RoleInProject = roleInProject,
            CanViewFinancials = canViewFinancials,
            CanManageSales = canManageSales,
            CanManageConstruction = canManageConstruction,
            CanManageDocuments = canManageDocuments,
            AssignedByUserId = assignedByUserId,
            AssignedAtUtc = nowUtc,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }

    public void UpdatePermissions(
        ProjectRole roleInProject,
        bool canViewFinancials,
        bool canManageSales,
        bool canManageConstruction,
        bool canManageDocuments,
        Guid assignedByUserId,
        DateTimeOffset nowUtc)
    {
        RoleInProject = roleInProject;
        CanViewFinancials = canViewFinancials;
        CanManageSales = canManageSales;
        CanManageConstruction = canManageConstruction;
        CanManageDocuments = canManageDocuments;
        AssignedByUserId = assignedByUserId;
        AssignedAtUtc = nowUtc;
        Touch(nowUtc);
    }
}
