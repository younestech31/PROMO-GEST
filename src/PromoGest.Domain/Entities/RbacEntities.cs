using PromoGest.Domain.Common;

namespace PromoGest.Domain.Entities;

public sealed class Role : BaseEntity
{
    public const string SystemAdminCode = "SYSTEM_ADMIN";
    public const string ProjectDirectorCode = "PROJECT_DIRECTOR";
    public const string CommercialManagerCode = "COMMERCIAL_MANAGER";
    public const string FinanceOfficerCode = "FINANCE_OFFICER";
    public const string SiteEngineerCode = "SITE_ENGINEER";
    public const string LegalOfficerCode = "LEGAL_OFFICER";
    public const string ViewerCode = "VIEWER";

    private readonly List<RolePermission> _rolePermissions = new();
    private readonly List<UserRole> _userRoles = new();

    private Role() { }

    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameFr { get; private set; } = string.Empty;
    public string DescriptionAr { get; private set; } = string.Empty;
    public string DescriptionFr { get; private set; } = string.Empty;
    public bool IsSystemRole { get; private set; }

    public IReadOnlyCollection<RolePermission> RolePermissions => _rolePermissions.AsReadOnly();
    public IReadOnlyCollection<UserRole> UserRoles => _userRoles.AsReadOnly();

    public static Role Create(
        Guid id,
        string code,
        string nameAr,
        string nameFr,
        string descriptionAr,
        string descriptionFr,
        bool isSystemRole,
        DateTimeOffset nowUtc)
    {
        return new Role
        {
            Id = id,
            Code = code.Trim().ToUpperInvariant(),
            NameAr = nameAr.Trim(),
            NameFr = nameFr.Trim(),
            DescriptionAr = descriptionAr.Trim(),
            DescriptionFr = descriptionFr.Trim(),
            IsSystemRole = isSystemRole,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }
}

public sealed class Permission : BaseEntity
{
    private readonly List<RolePermission> _rolePermissions = new();

    private Permission() { }

    public string Code { get; private set; } = string.Empty;
    public string Module { get; private set; } = string.Empty;
    public string DescriptionAr { get; private set; } = string.Empty;
    public string DescriptionFr { get; private set; } = string.Empty;

    public IReadOnlyCollection<RolePermission> RolePermissions => _rolePermissions.AsReadOnly();

    public static Permission Create(
        Guid id,
        string code,
        string module,
        string descriptionAr,
        string descriptionFr,
        DateTimeOffset nowUtc)
    {
        return new Permission
        {
            Id = id,
            Code = code.Trim().ToLowerInvariant(),
            Module = module.Trim(),
            DescriptionAr = descriptionAr.Trim(),
            DescriptionFr = descriptionFr.Trim(),
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };
    }
}

public sealed class RolePermission
{
    private RolePermission() { }

    public Guid RoleId { get; private set; }
    public Role Role { get; private set; } = null!;
    public Guid PermissionId { get; private set; }
    public Permission Permission { get; private set; } = null!;

    public static RolePermission Create(Guid roleId, Guid permissionId)
        => new() { RoleId = roleId, PermissionId = permissionId };
}

public sealed class UserRole
{
    private UserRole() { }

    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public Guid RoleId { get; private set; }
    public Role Role { get; private set; } = null!;
    public Guid? AssignedByUserId { get; private set; }
    public DateTimeOffset AssignedAtUtc { get; private set; }

    public static UserRole Create(Guid userId, Guid roleId, Guid? assignedByUserId, DateTimeOffset assignedAtUtc)
        => new()
        {
            UserId = userId,
            RoleId = roleId,
            AssignedByUserId = assignedByUserId,
            AssignedAtUtc = assignedAtUtc
        };
}
