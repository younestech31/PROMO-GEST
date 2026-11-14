using PromoGest.Application.Interfaces;
using PromoGest.Application.Services;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Projects;
using PromoGest.Contracts.Setup;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Security;
using Xunit;

namespace PromoGest.Application.Tests;

public sealed class ApplicationSecurityAndFoundationTests
{
    private sealed class FakeClock : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = new(2026, 11, 13, 12, 0, 0, TimeSpan.Zero);
    }

    private sealed class FailingAuditWriter : IAuditWriter
    {
        public Task WriteAsync(AuditLog entry, CancellationToken ct = default)
            => throw new IOException("Simulated audit persistence failure.");
    }

    private sealed class InMemoryStore :
        IInstallationRepository,
        IUserRepository,
        IProjectRepository,
        IProjectStructureRepository,
        IAuditWriter,
        IAuditQueryRepository
    {
        public OrganizationSettings? Org { get; set; }
        public List<User> Users { get; } = new();
        public List<Role> Roles { get; } = new();
        public List<Permission> Permissions { get; } = new();
        public List<RolePermission> RolePermissions { get; } = new();
        public List<UserRole> UserRoles { get; } = new();
        public List<UserSession> Sessions { get; } = new();
        public List<Project> Projects { get; } = new();
        public List<Building> Buildings { get; } = new();
        public List<BuildingFloor> Floors { get; } = new();
        public List<PropertyUnit> Units { get; } = new();
        public List<AuditLog> AuditLogs { get; } = new();

        public InMemoryStore()
        {
            var t = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
            var adminRole = Role.Create(Guid.NewGuid(), Role.SystemAdminCode, "مدير النظام", "Administrateur Système", "Admin", "Admin", true, t);
            var commRole = Role.Create(Guid.NewGuid(), Role.CommercialManagerCode, "مسؤول المبيعات", "Responsable Commercial", "Sales", "Sales", false, t);
            var siteEngineerRole = Role.Create(Guid.NewGuid(), Role.SiteEngineerCode, "مهندس الموقع", "Ingénieur de chantier", "Site", "Site", false, t);
            Roles.AddRange(new[] { adminRole, commRole, siteEngineerRole });

            var pRead = Permission.Create(Guid.NewGuid(), "projects.read", "Projects", "قراءة", "Lire", t);
            var pUsers = Permission.Create(Guid.NewGuid(), "users.manage", "Admin", "مستخدمين", "Utilisateurs", t);
            var pAudit = Permission.Create(Guid.NewGuid(), "audit.read", "Security", "تدقيق", "Audit", t);
            Permissions.AddRange(new[] { pRead, pUsers, pAudit });

            RolePermissions.Add(RolePermission.Create(adminRole.Id, pRead.Id));
            RolePermissions.Add(RolePermission.Create(adminRole.Id, pUsers.Id));
            RolePermissions.Add(RolePermission.Create(adminRole.Id, pAudit.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pRead.Id));
        }

        public Task<OrganizationSettings?> GetOrganizationSettingsAsync(CancellationToken ct = default) => Task.FromResult(Org);
        public Task<bool> IsInitializedAsync(CancellationToken ct = default) => Task.FromResult(Org?.IsInitialized ?? false);
        public Task<bool> HasSystemAdministratorAsync(CancellationToken ct = default) => Task.FromResult(Users.Any(u => u.IsSystemAdministrator));
        public Task<Role?> GetRoleByCodeAsync(string code, CancellationToken ct = default) => Task.FromResult(Roles.FirstOrDefault(r => r.Code == code.ToUpperInvariant()));
        public Task<IReadOnlyList<Role>> GetRolesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Role>>(Roles);
        public Task AddOrganizationSettingsAsync(OrganizationSettings settings, CancellationToken ct = default) { Org = settings; return Task.CompletedTask; }
        public Task AddUserAsync(User user, CancellationToken ct = default) { Users.Add(user); return Task.CompletedTask; }
        public Task AddUserRoleAsync(UserRole userRole, CancellationToken ct = default) { UserRoles.Add(userRole); return Task.CompletedTask; }
        public Task ExecuteInSerializableTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default) => action(ct);
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

        public Task<User?> GetByIdWithRolesAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(Users.FirstOrDefault(u => u.Id == userId));
        public Task<User?> GetSystemAdministratorAsync(CancellationToken ct = default) => Task.FromResult(Users.FirstOrDefault(u => u.IsSystemAdministrator));
        public Task<User?> GetByUsernameOrEmailWithRolesAsync(string usernameOrEmail, CancellationToken ct = default)
        {
            var norm = usernameOrEmail.Trim().ToUpperInvariant();
            return Task.FromResult(Users.FirstOrDefault(u => u.NormalizedUsername == norm || u.NormalizedEmail == norm));
        }
        public Task<IReadOnlyList<User>> ListUsersWithRolesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<User>>(Users);
        public Task<bool> ExistsUsernameOrEmailAsync(string username, string email, Guid? excludeUserId = null, CancellationToken ct = default)
            => Task.FromResult(Users.Any(u => (!excludeUserId.HasValue || u.Id != excludeUserId.Value) &&
                (u.NormalizedUsername == username.ToUpperInvariant() || u.NormalizedEmail == email.ToUpperInvariant())));
        public Task<IReadOnlyList<Role>> GetRolesByCodesAsync(IEnumerable<string> roleCodes, CancellationToken ct = default)
        {
            var codes = roleCodes.Select(c => c.ToUpperInvariant()).ToHashSet();
            return Task.FromResult<IReadOnlyList<Role>>(Roles.Where(r => codes.Contains(r.Code)).ToList());
        }
        public Task<IReadOnlyList<string>> GetEffectivePermissionsAsync(Guid userId, CancellationToken ct = default)
        {
            var roleIds = UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToHashSet();
            var permIds = RolePermissions.Where(rp => roleIds.Contains(rp.RoleId)).Select(rp => rp.PermissionId).ToHashSet();
            return Task.FromResult<IReadOnlyList<string>>(Permissions.Where(p => permIds.Contains(p.Id)).Select(p => p.Code).ToList());
        }
        public Task ReplaceUserRolesAsync(Guid userId, IEnumerable<UserRole> newRoles, CancellationToken ct = default)
        {
            UserRoles.RemoveAll(ur => ur.UserId == userId);
            UserRoles.AddRange(newRoles);
            return Task.CompletedTask;
        }
        public Task AddSessionAsync(UserSession session, CancellationToken ct = default) { Sessions.Add(session); return Task.CompletedTask; }
        public Task<UserSession?> GetSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default)
            => Task.FromResult(Sessions.FirstOrDefault(s => s.TokenHash == tokenHash));
        public Task RevokeAllUserSessionsAsync(Guid userId, DateTimeOffset revokedAtUtc, CancellationToken ct = default)
        {
            foreach (var s in Sessions.Where(s => s.UserId == userId && !s.IsRevoked))
                s.Revoke(revokedAtUtc);
            return Task.CompletedTask;
        }

        public Task<Project?> GetByIdWithMembersAsync(Guid projectId, CancellationToken ct = default)
            => Task.FromResult(Projects.FirstOrDefault(p => p.Id == projectId));
        public Task<bool> ExistsCodeAsync(string normalizedCode, CancellationToken ct = default)
            => Task.FromResult(Projects.Any(p => p.NormalizedCode == normalizedCode));
        public Task<IReadOnlyList<Project>> ListAllWithMembersAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Project>>(Projects);
        public Task<IReadOnlyList<Project>> ListForUserWithMembersAsync(Guid userId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Project>>(Projects.Where(p => p.Members.Any(m => m.UserId == userId)).ToList());
        public Task<ProjectMember?> GetMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default)
            => Task.FromResult(Projects.FirstOrDefault(p => p.Id == projectId)?.Members.FirstOrDefault(m => m.UserId == userId));
        public Task AddProjectAsync(Project project, CancellationToken ct = default) { Projects.Add(project); return Task.CompletedTask; }
        // The in-memory store retains the aggregate instance, so AssignMember has already updated its collection.
        public Task AddMemberAsync(ProjectMember member, CancellationToken ct = default) => Task.CompletedTask;
        public Task<IReadOnlyList<Building>> ListBuildingsByProjectAsync(Guid projectId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Building>>(Buildings.Where(b => b.ProjectId == projectId).ToList());
        public Task<IReadOnlyList<BuildingFloor>> ListFloorsByProjectAsync(Guid projectId, CancellationToken ct = default)
        {
            var buildingIds = Buildings.Where(b => b.ProjectId == projectId).Select(b => b.Id).ToHashSet();
            return Task.FromResult<IReadOnlyList<BuildingFloor>>(Floors.Where(f => buildingIds.Contains(f.BuildingId)).ToList());
        }
        public Task<IReadOnlyList<PropertyUnit>> ListUnitsByProjectAsync(Guid projectId, CancellationToken ct = default)
        {
            var buildingIds = Buildings.Where(b => b.ProjectId == projectId).Select(b => b.Id).ToHashSet();
            var floorIds = Floors.Where(f => buildingIds.Contains(f.BuildingId)).Select(f => f.Id).ToHashSet();
            return Task.FromResult<IReadOnlyList<PropertyUnit>>(Units.Where(u => floorIds.Contains(u.FloorId)).ToList());
        }
        public Task<Building?> GetBuildingAsync(Guid buildingId, CancellationToken ct = default)
            => Task.FromResult(Buildings.FirstOrDefault(b => b.Id == buildingId));
        public Task<BuildingFloor?> GetFloorAsync(Guid floorId, CancellationToken ct = default)
            => Task.FromResult(Floors.FirstOrDefault(f => f.Id == floorId));
        public Task<PropertyUnit?> GetUnitAsync(Guid unitId, CancellationToken ct = default)
            => Task.FromResult(Units.FirstOrDefault(u => u.Id == unitId));
        public Task<bool> ExistsBuildingCodeAsync(
            Guid projectId,
            string normalizedCode,
            Guid? excludeBuildingId = null,
            CancellationToken ct = default)
            => Task.FromResult(Buildings.Any(b =>
                b.ProjectId == projectId &&
                b.NormalizedCode == normalizedCode &&
                (!excludeBuildingId.HasValue || b.Id != excludeBuildingId.Value)));
        public Task<bool> ExistsFloorNumberAsync(
            Guid buildingId,
            int floorNumber,
            Guid? excludeFloorId = null,
            CancellationToken ct = default)
            => Task.FromResult(Floors.Any(f =>
                f.BuildingId == buildingId &&
                f.FloorNumber == floorNumber &&
                (!excludeFloorId.HasValue || f.Id != excludeFloorId.Value)));
        public Task<bool> ExistsUnitNumberAsync(
            Guid floorId,
            string normalizedUnitNumber,
            Guid? excludeUnitId = null,
            CancellationToken ct = default)
            => Task.FromResult(Units.Any(u =>
                u.FloorId == floorId &&
                u.NormalizedUnitNumber == normalizedUnitNumber &&
                (!excludeUnitId.HasValue || u.Id != excludeUnitId.Value)));
        public Task AddBuildingAsync(Building building, CancellationToken ct = default) { Buildings.Add(building); return Task.CompletedTask; }
        public Task AddFloorAsync(BuildingFloor floor, CancellationToken ct = default) { Floors.Add(floor); return Task.CompletedTask; }
        public Task AddPropertyUnitAsync(PropertyUnit unit, CancellationToken ct = default) { Units.Add(unit); return Task.CompletedTask; }
        public Task WriteAsync(AuditLog entry, CancellationToken ct = default) { AuditLogs.Add(entry); return Task.CompletedTask; }
        public Task<IReadOnlyList<AuditLog>> ListRecentAsync(int limit, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<AuditLog>>(AuditLogs.OrderByDescending(a => a.OccurredAtUtc).Take(limit).ToList());
    }

    private static InitializeInstallationRequest ValidInitRequest() => new(
        "SARL Promotion El-Bahdja",
        "El-Bahdja",
        "SARL",
        "001616012345678",
        null,
        "16/00-1234567B20",
        null,
        20_000_000m,
        "16",
        "Alger",
        "Hydra",
        "+21321000000",
        "contact@elbahdja.dz",
        "ar",
        "sysadmin",
        "Karim Benali",
        "admin@elbahdja.dz",
        "+213550000001",
        "StrongPass123");

    [Fact]
    public async Task FirstRunSetup_SucceedsOnce_AndRejectsSecondInitialization()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var setup = new SetupService(store, new Pbkdf2PasswordHasher(), store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var statusBefore = await setup.GetStatusAsync();
        Assert.False(statusBefore.IsInitialized);

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        Assert.Equal("sysadmin", init.SystemAdminUsername);

        var statusAfter = await setup.GetStatusAsync();
        Assert.True(statusAfter.IsInitialized);

        var ex = await Assert.ThrowsAsync<ConflictDomainException>(() => setup.InitializeAsync(ValidInitRequest(), meta));
        Assert.Equal("SETUP_ALREADY_INITIALIZED", ex.Code);
    }

    [Fact]
    public async Task UserManagement_RejectsCreatingSecondSystemAdministrator_AndLogsAccessDenied()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var users = new UserManagementService(store, store, hasher, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);

        var ex = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            users.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("admin2", "Second Admin", "admin2@elbahdja.dz", null, "StrongPass123", "ar", new[] { Role.SystemAdminCode }),
                meta));

        Assert.Equal("SINGLE_SYSTEM_ADMIN_ONLY", ex.Code);
        Assert.Contains(store.AuditLogs, a => a.EventType == "ACCESS_DENIED" && a.ActorUserId == init.SystemAdminUserId);
    }

    [Fact]
    public async Task ProjectAuthorization_BlocksUnassignedEmployeeFromAccessingProjectById()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var employee = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("amel.sales", "Amel Kaci", "amel@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        var project = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest("PRJ-16-01", "إقامة الياسمين", "Résidence Yasmine", "16", "Alger", "Cheraga", null, null, null, null, "Commercialization", 150_000_000m, 2, 32),
            meta);

        // Employee without assignment gets empty list and 403 Forbidden on direct ID access
        var visibleBefore = await projectSvc.ListAccessibleProjectsAsync(employee.Id, meta);
        Assert.Empty(visibleBefore);

        var deniedEx = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.GetProjectByIdAsync(employee.Id, project.Id, meta));
        Assert.Equal("PROJECT_ACCESS_DENIED", deniedEx.Code);
        Assert.Contains(store.AuditLogs, a => a.EventType == "ACCESS_DENIED" && a.ActorUserId == employee.Id);

        // Also blocks probing nonexistent project UUIDs without leaking 404 existence
        var probeEx = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.GetProjectByIdAsync(employee.Id, Guid.NewGuid(), meta));
        Assert.Equal("PROJECT_ACCESS_DENIED", probeEx.Code);

        // Assign employee -> now access succeeds
        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(employee.Id, nameof(ProjectRole.CommercialAgent), false, true, false, true),
            meta);

        var visibleAfter = await projectSvc.ListAccessibleProjectsAsync(employee.Id, meta);
        Assert.Single(visibleAfter);
        var accessed = await projectSvc.GetProjectByIdAsync(employee.Id, project.Id, meta);
        Assert.Equal(project.Code, accessed.Code);
    }

    [Fact]
    public async Task ProjectStructure_EnforcesProjectScopeUniquenessPermissionsAndAudit()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var structureSvc = new ProjectStructureService(store, store, store, store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var project = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest(
                "PRJ-16-STRUCT",
                "إقامة النخيل",
                "Résidence Les Palmiers",
                "16",
                "Alger",
                "Hydra",
                null,
                null,
                null,
                null,
                "Planning",
                300_000_000m,
                2,
                40),
            metadata);

        var employee = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest(
                "nadir.site",
                "Nadir Site",
                "nadir.site@elbahdja.dz",
                null,
                "StrongPass123",
                "ar",
                new[] { Role.SiteEngineerCode }),
            metadata);

        var readDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            structureSvc.GetProjectStructureAsync(employee.Id, project.Id, metadata));
        Assert.Equal("PROJECT_ACCESS_DENIED", readDenied.Code);

        var initial = await structureSvc.CreateBuildingAsync(
            init.SystemAdminUserId,
            project.Id,
            new CreateBuildingRequest("A", "العمارة أ", "Bâtiment A", "Planned"),
            metadata);
        var building = Assert.Single(initial.Buildings);
        Assert.Equal("A", building.Code);

        var floorResponse = await structureSvc.CreateFloorAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            new CreateBuildingFloorRequest(0, "الطابق الأرضي", "Rez-de-chaussée"),
            metadata);
        var floor = Assert.Single(Assert.Single(floorResponse.Buildings).Floors);
        Assert.Equal(0, floor.FloorNumber);

        var unitResponse = await structureSvc.CreatePropertyUnitAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            new CreatePropertyUnitRequest(
                "A-001",
                "Apartment",
                "AvailableForSale",
                112.50m,
                96.25m,
                4),
            metadata);
        var unit = Assert.Single(Assert.Single(Assert.Single(unitResponse.Buildings).Floors).Units);
        Assert.Equal("A-001", unit.UnitNumber);
        Assert.Equal(112.50m, unit.GrossAreaSquareMeters);
        Assert.Equal(96.25m, unit.NetAreaSquareMeters);
        Assert.Equal(4, unit.RoomsCount);

        var updatedBuildingResponse = await structureSvc.UpdateBuildingAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            new UpdateBuildingRequest("A-NEW", "العمارة أ المحدثة", "Bâtiment A Mis à Jour", "UnderConstruction"),
            metadata);
        var updatedBuilding = Assert.Single(updatedBuildingResponse.Buildings);
        Assert.Equal("A-NEW", updatedBuilding.Code);
        Assert.Equal("UnderConstruction", updatedBuilding.Status);

        var updatedFloorResponse = await structureSvc.UpdateFloorAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            new UpdateBuildingFloorRequest(1, "الطابق الأول", "Premier étage"),
            metadata);
        var updatedFloor = Assert.Single(Assert.Single(updatedFloorResponse.Buildings).Floors);
        Assert.Equal(1, updatedFloor.FloorNumber);
        Assert.Equal("الطابق الأول", updatedFloor.NameAr);

        var updatedUnitResponse = await structureSvc.UpdatePropertyUnitAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            unit.Id,
            new UpdatePropertyUnitRequest("A-101", "Apartment", "UnderConstruction", 120m, 100m, 4),
            metadata);
        var updatedUnit = Assert.Single(Assert.Single(Assert.Single(updatedUnitResponse.Buildings).Floors).Units);
        Assert.Equal("A-101", updatedUnit.UnitNumber);
        Assert.Equal(120m, updatedUnit.GrossAreaSquareMeters);
        Assert.Equal("UnderConstruction", updatedUnit.Status);

        var invalidSalesState = await Assert.ThrowsAsync<DomainException>(() =>
            structureSvc.CreatePropertyUnitAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                new CreatePropertyUnitRequest("A-102", "Apartment", "Sold", 100m, 90m, 3),
                metadata));
        Assert.Equal("UNIT_STATUS_REQUIRES_SALES_WORKFLOW", invalidSalesState.Code);

        var invalidSalesTransition = await Assert.ThrowsAsync<DomainException>(() =>
            structureSvc.UpdatePropertyUnitAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                unit.Id,
                new UpdatePropertyUnitRequest("A-101", "Apartment", "Sold", 120m, 100m, 4),
                metadata));
        Assert.Equal("UNIT_STATUS_REQUIRES_SALES_WORKFLOW", invalidSalesTransition.Code);

        var duplicateBuilding = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.CreateBuildingAsync(
                init.SystemAdminUserId,
                project.Id,
                new CreateBuildingRequest(" a-new ", "العمارة", "Bâtiment", "Planned"),
                metadata));
        Assert.Equal("BUILDING_CODE_EXISTS", duplicateBuilding.Code);

        var duplicateFloor = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.CreateFloorAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                new CreateBuildingFloorRequest(1, "الطابق", "Étage"),
                metadata));
        Assert.Equal("FLOOR_NUMBER_EXISTS", duplicateFloor.Code);

        var duplicateUnit = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.CreatePropertyUnitAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                new CreatePropertyUnitRequest(
                    "a-101",
                    "Apartment",
                    "Planned",
                    100m,
                    90m,
                    3),
                metadata));
        Assert.Equal("UNIT_NUMBER_EXISTS", duplicateUnit.Code);

        var invalidArea = await Assert.ThrowsAsync<DomainException>(() =>
            structureSvc.CreatePropertyUnitAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                new CreatePropertyUnitRequest(
                    "A-002",
                    "Apartment",
                    "Planned",
                    90m,
                    91m,
                    3),
                metadata));
        Assert.Equal("UNIT_NET_AREA_EXCEEDS_GROSS", invalidArea.Code);

        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(
                employee.Id,
                nameof(ProjectRole.SiteSupervisor),
                false,
                false,
                true,
                false),
            metadata);

        var employeeStructure = await structureSvc.GetProjectStructureAsync(employee.Id, project.Id, metadata);
        Assert.Single(employeeStructure.Buildings);

        var employeeFloor = await structureSvc.CreateFloorAsync(
            employee.Id,
            project.Id,
            building.Id,
            new CreateBuildingFloorRequest(-1, "الطابق تحت الأرضي", "Sous-sol"),
            metadata);
        Assert.Equal(2, Assert.Single(employeeFloor.Buildings).Floors.Count);

        Assert.Contains(store.AuditLogs, entry => entry.EventType == "BUILDING_CREATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "BUILDING_FLOOR_CREATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "PROPERTY_UNIT_CREATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "ACCESS_DENIED" && entry.ActorUserId == employee.Id);
    }

    [Fact]
    public async Task ProjectUpdates_RequireManagementPermission_PreserveCode_AndWriteAudit()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var employee = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest(
                "sami.sales",
                "Sami Benali",
                "sami@elbahdja.dz",
                null,
                "StrongPass123",
                "fr",
                new[] { Role.CommercialManagerCode }),
            metadata);

        var created = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest(
                "PRJ-16-01",
                "إقامة الياسمين",
                "Résidence Yasmine",
                "16",
                "Alger",
                "Cheraga",
                null,
                null,
                null,
                null,
                "Planning",
                150_000_000m,
                2,
                32),
            metadata);

        clock.UtcNow = clock.UtcNow.AddMinutes(5);
        var updateRequest = new UpdateProjectRequest(
            "إقامة الياسمين الجديدة",
            "Résidence Yasmine Nouvelle",
            "31",
            "Oran",
            "Bir El Djir",
            "Nouvelle adresse",
            "TF-ORAN-2026-001",
            "PC-ORAN-2026-010",
            new DateOnly(2026, 11, 13),
            "UnderConstruction",
            175_000_000m,
            3,
            36);

        var updated = await projectSvc.UpdateProjectAsync(
            init.SystemAdminUserId,
            created.Id,
            updateRequest,
            metadata);

        Assert.Equal(created.Code, updated.Code);
        Assert.Equal(updateRequest.NameAr, updated.NameAr);
        Assert.Equal(updateRequest.NameFr, updated.NameFr);
        Assert.Equal(updateRequest.WilayaCode, updated.WilayaCode);
        Assert.Equal(updateRequest.Municipality, updated.Municipality);
        Assert.Equal(updateRequest.Status, updated.Status);
        Assert.Equal(updateRequest.EstimatedBudgetDzd, updated.EstimatedBudgetDzd);
        Assert.Equal(created.CreatedAtUtc, updated.CreatedAtUtc);
        Assert.True(updated.CreatedAtUtc < clock.UtcNow);
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "PROJECT_UPDATED" &&
            entry.TargetEntityId == created.Id.ToString());

        var denied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(employee.Id, created.Id, updateRequest, metadata));
        Assert.Equal("FORBIDDEN_PROJECT_UPDATE", denied.Code);
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "ACCESS_DENIED" &&
            entry.ActorUserId == employee.Id &&
            entry.TargetEntityId == created.Id.ToString());

        var invalidBudget = updateRequest with { EstimatedBudgetDzd = -1m };
        await Assert.ThrowsAsync<DomainException>(() =>
            projectSvc.UpdateProjectAsync(init.SystemAdminUserId, created.Id, invalidBudget, metadata));

        var invalidStatus = updateRequest with { Status = "999" };
        var statusError = await Assert.ThrowsAsync<DomainException>(() =>
            projectSvc.UpdateProjectAsync(init.SystemAdminUserId, created.Id, invalidStatus, metadata));
        Assert.Equal("PROJECT_STATUS_INVALID", statusError.Code);
    }

    [Fact]
    public async Task Authentication_ReturnsGenericErrorAcrossUnknownWrongInactiveAndLockedAccounts()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var tokenGen = new CryptoSessionTokenGenerator();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var authSvc = new AuthService(store, store, hasher, tokenGen, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var emp = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("farid.fin", "Farid Ziani", "farid@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        // Unknown account
        var unknownEx = await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
            authSvc.LoginAsync(new LoginRequest("nobody", "SomePassword123"), meta));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", unknownEx.Code);

        // 5 failed attempts -> locks account, still returns generic 401 AUTH_INVALID_CREDENTIALS
        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            var wrongEx = await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
                authSvc.LoginAsync(new LoginRequest("farid.fin", "WrongPassword1"), meta));
            Assert.Equal("AUTH_INVALID_CREDENTIALS", wrongEx.Code);
        }
        Assert.Contains(store.AuditLogs, a => a.EventType == "AUTH_LOCKOUT" && a.ActorUserId == emp.Id);

        // Correct password while locked -> still generic 401 AUTH_INVALID_CREDENTIALS
        var lockedEx = await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
            authSvc.LoginAsync(new LoginRequest("farid.fin", "StrongPass123"), meta));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", lockedEx.Code);
        Assert.Contains(store.AuditLogs, a => a.EventType == "AUTH_LOGIN_BLOCKED_LOCKED" && a.ActorUserId == emp.Id);

        // Advance past lockout, then deactivate -> still generic 401 AUTH_INVALID_CREDENTIALS
        clock.UtcNow = clock.UtcNow.AddMinutes(20);
        await userSvc.SetUserActiveStatusAsync(init.SystemAdminUserId, emp.Id, false, meta);
        var inactiveEx = await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
            authSvc.LoginAsync(new LoginRequest("farid.fin", "StrongPass123"), meta));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", inactiveEx.Code);
        Assert.Contains(store.AuditLogs, a => a.EventType == "AUTH_LOGIN_BLOCKED_INACTIVE" && a.ActorUserId == emp.Id);
    }

    [Fact]
    public async Task InactiveUser_And_UnauthorizedAuditAccess_AreBlockedAndAudited()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var auditSvc = new AuditQueryService(store, store, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var emp = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("nadia.com", "Nadia Ali", "nadia@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        // Non-admin cannot view audit logs and failure is audited
        await Assert.ThrowsAsync<ForbiddenDomainException>(() => auditSvc.ListRecentAsync(emp.Id, meta));
        Assert.Contains(store.AuditLogs, a => a.EventType == "ACCESS_DENIED" && a.ActorUserId == emp.Id && a.TargetEntityType == "AuditLog");

        // Deactivate user -> project listing & roles listing are rejected
        await userSvc.SetUserActiveStatusAsync(init.SystemAdminUserId, emp.Id, false, meta);
        await Assert.ThrowsAsync<ForbiddenDomainException>(() => projectSvc.ListAccessibleProjectsAsync(emp.Id, meta));
        await Assert.ThrowsAsync<ForbiddenDomainException>(() => userSvc.ListRolesAsync(emp.Id, meta));
    }

    [Fact]
    public async Task AdminRecoveryService_Unlocks_ResetsPassword_RevokesSessions_And_Audits()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var tokenGen = new CryptoSessionTokenGenerator();
        var setup = new SetupService(store, hasher, store, clock);
        var authSvc = new AuthService(store, store, hasher, tokenGen, store, clock);
        var recovery = new AdminRecoveryService(store, store, hasher, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        await setup.InitializeAsync(ValidInitRequest(), meta);
        var login = await authSvc.LoginAsync(new LoginRequest("sysadmin", "StrongPass123"), meta);
        Assert.NotNull(await authSvc.ValidateSessionAsync(login.OpaqueSessionToken));

        // Lock out sysadmin via failed logins
        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
                authSvc.LoginAsync(new LoginRequest("sysadmin", "BadPass999"), meta));
        }

        // Recover via local console service
        await recovery.UnlockSystemAdministratorAsync("server-operator");
        await recovery.ResetSystemAdministratorPasswordAsync("RecoveredPass#2026", "server-operator");

        // Prior session token must now be invalid
        Assert.Null(await authSvc.ValidateSessionAsync(login.OpaqueSessionToken));

        // Login works with recovered password
        var newLogin = await authSvc.LoginAsync(new LoginRequest("sysadmin", "RecoveredPass#2026"), meta);
        Assert.Equal("sysadmin", newLogin.Session.User.Username);
        Assert.Contains(store.AuditLogs, a => a.EventType == "ADMIN_LOCAL_UNLOCK");
        Assert.Contains(store.AuditLogs, a => a.EventType == "ADMIN_LOCAL_PASSWORD_RECOVERY");
    }

    [Fact]
    public async Task AuditFailure_PropagatesInsteadOfSilentlySucceeding()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, new FailingAuditWriter(), clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        await Assert.ThrowsAsync<IOException>(() => setup.InitializeAsync(ValidInitRequest(), meta));
    }
}
