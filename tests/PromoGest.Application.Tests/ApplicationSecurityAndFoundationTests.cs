using PromoGest.Application.Interfaces;
using PromoGest.Application.Services;
using PromoGest.Application.Validators;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Projects;
using PromoGest.Contracts.Setup;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Security;
using PromoGest.Infrastructure.Storage;
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

    private sealed class SpyPasswordHasher : IPasswordHasher
    {
        private readonly IPasswordHasher _inner;
        public int VerifyCallCount { get; private set; }

        public SpyPasswordHasher(IPasswordHasher inner) => _inner = inner;

        public string HashPassword(string plainTextPassword) => _inner.HashPassword(plainTextPassword);

        public bool VerifyPassword(string plainTextPassword, string passwordHash)
        {
            VerifyCallCount++;
            return _inner.VerifyPassword(plainTextPassword, passwordHash);
        }
    }

    private sealed class InMemoryStore :
        IInstallationRepository,
        IUserRepository,
        IPartyRepository,
        IProjectRepository,
        IProjectStructureRepository,
        IProjectCustomerRepository,
        IProjectDocumentRepository,
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
        public List<Party> Parties { get; } = new();
        public List<ProjectCustomer> ProjectCustomers { get; } = new();
        public List<CustomerInteraction> CustomerInteractions { get; } = new();
        public List<StoredFile> StoredFiles { get; } = new();

        public InMemoryStore()
        {
            var t = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
            var adminRole = Role.Create(Guid.NewGuid(), Role.SystemAdminCode, "مدير النظام", "Administrateur Système", "Admin", "Admin", true, t);
            var commRole = Role.Create(Guid.NewGuid(), Role.CommercialManagerCode, "مسؤول المبيعات", "Responsable Commercial", "Sales", "Sales", false, t);
            var siteEngineerRole = Role.Create(Guid.NewGuid(), Role.SiteEngineerCode, "مهندس الموقع", "Ingénieur de chantier", "Site", "Site", false, t);
            var financeRole = Role.Create(Guid.NewGuid(), Role.FinanceOfficerCode, "مسؤول المالية", "Responsable Financier", "Finance", "Finance", false, t);
            var legalRole = Role.Create(Guid.NewGuid(), Role.LegalOfficerCode, "المكلف بالشؤون القانونية", "Chargé Juridique", "Legal", "Legal", false, t);
            var viewerRole = Role.Create(Guid.NewGuid(), Role.ViewerCode, "مستخدم للمطالعة فقط", "Consultant Lecture Seule", "Viewer", "Viewer", false, t);
            Roles.AddRange(new[] { adminRole, commRole, siteEngineerRole, financeRole, legalRole, viewerRole });

            var pOrgRead = Permission.Create(Guid.NewGuid(), "org.read", "Organization", "قراءة المؤسسة", "Lire org", t);
            var pOrgManage = Permission.Create(Guid.NewGuid(), "org.manage", "Organization", "إدارة المؤسسة", "Gérer org", t);
            var pRead = Permission.Create(Guid.NewGuid(), "projects.read", "Projects", "قراءة", "Lire", t);
            var pStructureManage = Permission.Create(Guid.NewGuid(), "projects.structure.manage", "Project Structure", "إدارة الهيكل", "Gérer structure", t);
            var pUsers = Permission.Create(Guid.NewGuid(), "users.manage", "Admin", "مستخدمين", "Utilisateurs", t);
            var pAudit = Permission.Create(Guid.NewGuid(), "audit.read", "Security", "تدقيق", "Audit", t);
            var pFilesRead = Permission.Create(Guid.NewGuid(), "files.read", "Documents", "قراءة الوثائق", "Lire documents", t);
            var pFilesWrite = Permission.Create(Guid.NewGuid(), "files.write", "Documents", "رفع الوثائق", "Écrire documents", t);
            var pCustomersRead = Permission.Create(Guid.NewGuid(), "customers.read", "Customers", "قراءة العملاء", "Lire clients", t);
            var pCustomersManage = Permission.Create(Guid.NewGuid(), "customers.manage", "Customers", "إدارة العملاء", "Gérer clients", t);
            Permissions.AddRange(new[]
            {
                pOrgRead, pOrgManage, pRead, pStructureManage, pUsers, pAudit,
                pFilesRead, pFilesWrite, pCustomersRead, pCustomersManage
            });

            foreach (var perm in Permissions)
            {
                RolePermissions.Add(RolePermission.Create(adminRole.Id, perm.Id));
            }

            RolePermissions.Add(RolePermission.Create(commRole.Id, pOrgRead.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pRead.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pFilesRead.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pFilesWrite.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pCustomersRead.Id));
            RolePermissions.Add(RolePermission.Create(commRole.Id, pCustomersManage.Id));

            RolePermissions.Add(RolePermission.Create(siteEngineerRole.Id, pOrgRead.Id));
            RolePermissions.Add(RolePermission.Create(siteEngineerRole.Id, pRead.Id));
            RolePermissions.Add(RolePermission.Create(siteEngineerRole.Id, pStructureManage.Id));
            RolePermissions.Add(RolePermission.Create(siteEngineerRole.Id, pFilesRead.Id));
            RolePermissions.Add(RolePermission.Create(siteEngineerRole.Id, pFilesWrite.Id));

            RolePermissions.Add(RolePermission.Create(financeRole.Id, pOrgRead.Id));
            RolePermissions.Add(RolePermission.Create(financeRole.Id, pRead.Id));
            RolePermissions.Add(RolePermission.Create(financeRole.Id, pFilesRead.Id));
            RolePermissions.Add(RolePermission.Create(financeRole.Id, pFilesWrite.Id));

            RolePermissions.Add(RolePermission.Create(legalRole.Id, pOrgRead.Id));
            RolePermissions.Add(RolePermission.Create(legalRole.Id, pRead.Id));
            RolePermissions.Add(RolePermission.Create(legalRole.Id, pFilesRead.Id));
            RolePermissions.Add(RolePermission.Create(legalRole.Id, pFilesWrite.Id));
            RolePermissions.Add(RolePermission.Create(legalRole.Id, pCustomersRead.Id));

            RolePermissions.Add(RolePermission.Create(viewerRole.Id, pOrgRead.Id));
            RolePermissions.Add(RolePermission.Create(viewerRole.Id, pRead.Id));
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
            => ListAllWithMembersAsync(null, null, ct);
        public Task<IReadOnlyList<Project>> ListAllWithMembersAsync(string? query, ProjectStatus? status, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Project>>(FilterProjects(Projects, query, status));
        public Task<IReadOnlyList<Project>> ListForUserWithMembersAsync(Guid userId, CancellationToken ct = default)
            => ListForUserWithMembersAsync(userId, null, null, ct);
        public Task<IReadOnlyList<Project>> ListForUserWithMembersAsync(Guid userId, string? query, ProjectStatus? status, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Project>>(FilterProjects(Projects.Where(p => p.Members.Any(m => m.UserId == userId)), query, status));
        private static IReadOnlyList<Project> FilterProjects(IEnumerable<Project> source, string? query, ProjectStatus? status)
        {
            if (status.HasValue)
                source = source.Where(p => p.Status == status.Value);
            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim();
                source = source.Where(p =>
                    p.Code.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.NameAr.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.NameFr.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.WilayaCode.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.WilayaName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.Municipality.Contains(q, StringComparison.OrdinalIgnoreCase));
            }
            return source.ToList();
        }
        public Task<IReadOnlyDictionary<Guid, ProjectStructureCounts>> GetStructureCountsByProjectIdsAsync(
            IReadOnlyCollection<Guid> projectIds,
            CancellationToken ct = default)
        {
            var counts = projectIds.Distinct().ToDictionary(projectId => projectId, projectId =>
            {
                var buildingIds = Buildings
                    .Where(building => building.ProjectId == projectId)
                    .Select(building => building.Id)
                    .ToHashSet();
                var floorIds = Floors
                    .Where(floor => buildingIds.Contains(floor.BuildingId))
                    .Select(floor => floor.Id)
                    .ToHashSet();
                return new ProjectStructureCounts(
                    buildingIds.Count,
                    Units.Count(unit => floorIds.Contains(unit.FloorId)));
            });
            return Task.FromResult<IReadOnlyDictionary<Guid, ProjectStructureCounts>>(counts);
        }
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
        public Task<bool> ExistsBuildingCodeAsync(Guid projectId, string normalizedCode, CancellationToken ct = default)
            => Task.FromResult(Buildings.Any(b => b.ProjectId == projectId && b.NormalizedCode == normalizedCode));
        public Task<bool> ExistsBuildingCodeAsync(Guid projectId, string normalizedCode, Guid? excludeBuildingId, CancellationToken ct = default)
            => Task.FromResult(Buildings.Any(b => b.ProjectId == projectId &&
                b.NormalizedCode == normalizedCode &&
                (!excludeBuildingId.HasValue || b.Id != excludeBuildingId.Value)));
        public Task<bool> ExistsFloorNumberAsync(Guid buildingId, int floorNumber, CancellationToken ct = default)
            => Task.FromResult(Floors.Any(f => f.BuildingId == buildingId && f.FloorNumber == floorNumber));
        public Task<bool> ExistsFloorNumberAsync(Guid buildingId, int floorNumber, Guid? excludeFloorId, CancellationToken ct = default)
            => Task.FromResult(Floors.Any(f => f.BuildingId == buildingId &&
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
        public Task<PropertyUnit?> GetPropertyUnitForUpdateAsync(Guid floorId, Guid unitId, CancellationToken ct = default)
            => Task.FromResult(Units.FirstOrDefault(u => u.FloorId == floorId && u.Id == unitId));
        public Task AddBuildingAsync(Building building, CancellationToken ct = default) { Buildings.Add(building); return Task.CompletedTask; }
        public Task AddFloorAsync(BuildingFloor floor, CancellationToken ct = default) { Floors.Add(floor); return Task.CompletedTask; }
        public Task AddPropertyUnitAsync(PropertyUnit unit, CancellationToken ct = default) { Units.Add(unit); return Task.CompletedTask; }
        public Task<IReadOnlyList<ProjectCustomer>> ListByProjectAsync(Guid projectId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<ProjectCustomer>>(ProjectCustomers.Where(customer => customer.ProjectId == projectId).ToList());
        public Task<bool> HasProjectCustomerIdentityCollisionAsync(
            Guid partyId,
            string normalizedDisplayName,
            CancellationToken ct = default)
        {
            var linkedCustomers = ProjectCustomers.Where(customer => customer.PartyId == partyId).ToList();
            var hasCollision = linkedCustomers.Any(linked => ProjectCustomers.Any(other =>
                other.PartyId != partyId &&
                other.ProjectId == linked.ProjectId &&
                other.NormalizedPhone == linked.NormalizedPhone &&
                other.Party.NormalizedDisplayName == normalizedDisplayName));
            return Task.FromResult(hasCollision);
        }
        public Task<ProjectCustomer?> GetByProjectAsync(Guid projectId, Guid customerId, CancellationToken ct = default)
            => Task.FromResult(ProjectCustomers.FirstOrDefault(customer => customer.ProjectId == projectId && customer.Id == customerId));
        public Task<bool> ExistsDuplicateAsync(
            Guid projectId,
            string normalizedDisplayName,
            string normalizedPhone,
            Guid? excludeCustomerId = null,
            CancellationToken ct = default)
            => Task.FromResult(ProjectCustomers.Any(customer =>
                customer.ProjectId == projectId &&
                customer.Party.NormalizedDisplayName == normalizedDisplayName &&
                customer.NormalizedPhone == normalizedPhone &&
                (!excludeCustomerId.HasValue || customer.Id != excludeCustomerId.Value)));
        public Task<bool> ExistsPartyInProjectAsync(
            Guid projectId,
            Guid partyId,
            Guid? excludeCustomerId = null,
            CancellationToken ct = default)
            => Task.FromResult(ProjectCustomers.Any(customer =>
                customer.ProjectId == projectId &&
                customer.PartyId == partyId &&
                (!excludeCustomerId.HasValue || customer.Id != excludeCustomerId.Value)));
        public Task AddCustomerAsync(ProjectCustomer customer, CancellationToken ct = default) { ProjectCustomers.Add(customer); return Task.CompletedTask; }
        public Task AddInteractionAsync(CustomerInteraction interaction, CancellationToken ct = default) { CustomerInteractions.Add(interaction); return Task.CompletedTask; }
        public Task<IReadOnlyList<ProjectDocumentListItem>> ListProjectDocumentsAsync(Guid projectId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<ProjectDocumentListItem>>(
                StoredFiles
                    .Where(file => file.Scope == StoredFileScope.Project && file.ProjectId == projectId)
                    .OrderByDescending(file => file.CreatedAtUtc)
                    .Select(file => new ProjectDocumentListItem(
                        file,
                        Users.FirstOrDefault(u => u.Id == file.UploadedByUserId)?.FullName ?? "Unknown"))
                    .ToList());
        public Task<StoredFile?> GetProjectDocumentAsync(Guid projectId, Guid fileId, CancellationToken ct = default)
            => Task.FromResult(StoredFiles.FirstOrDefault(file =>
                file.Scope == StoredFileScope.Project && file.ProjectId == projectId && file.Id == fileId));
        public Task<IReadOnlySet<Guid>> ListCustomerIdentityDocumentIdsAsync(Guid projectId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlySet<Guid>>(
                ProjectCustomers
                    .Where(customer => customer.ProjectId == projectId && customer.IdentityDocumentStoredFileId.HasValue)
                    .Select(customer => customer.IdentityDocumentStoredFileId!.Value)
                    .ToHashSet());
        public Task<bool> IsCustomerIdentityDocumentAsync(Guid projectId, Guid fileId, CancellationToken ct = default)
            => Task.FromResult(ProjectCustomers.Any(customer =>
                customer.ProjectId == projectId && customer.IdentityDocumentStoredFileId == fileId));
        public Task AddAsync(StoredFile file, CancellationToken ct = default) { StoredFiles.Add(file); return Task.CompletedTask; }
        public Task<Party?> GetByIdAsync(Guid partyId, CancellationToken ct = default)
            => Task.FromResult(Parties.FirstOrDefault(party => party.Id == partyId));
        public Task<IReadOnlyList<Party>> SearchDirectoryAsync(string normalizedPrefix, int limit, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Party>>(Parties
                .Where(party => party.NormalizedDisplayName.StartsWith(normalizedPrefix, StringComparison.Ordinal))
                .Take(limit)
                .ToList());
        public Task AddAsync(Party party, CancellationToken ct = default) { Parties.Add(party); return Task.CompletedTask; }
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
    public async Task ProjectCustomer_PartyPermissionDenialsAreSecurityAudited_AndAuthorizedUpdatesCapturePreviousKind()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var users = new UserManagementService(store, store, hasher, store, clock);
        var projects = new ProjectService(store, store, store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");
        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var employee = await users.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest(
                "party.customer.manager",
                "Customer Manager",
                "customer.manager@elbahdja.dz",
                null,
                "StrongPass123",
                "ar",
                new[] { Role.CommercialManagerCode }),
            metadata);
        var project = await projects.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest(
                "PRJ-16-C2-AUDIT",
                "إقامة الاختبار",
                "Résidence Test",
                "16",
                "Alger",
                "Cheraga",
                null,
                null,
                null,
                null,
                "Commercialization",
                0m,
                2,
                32),
            metadata);
        await projects.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(employee.Id, nameof(ProjectRole.CommercialAgent), false, true, false, true),
            metadata);

        var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Client Protected", clock.UtcNow);
        var customer = ProjectCustomer.Create(
            project.Id,
            party.Id,
            null,
            "0550000001",
            null,
            null,
            "ar",
            CustomerSource.WalkIn,
            null,
            employee.Id,
            clock.UtcNow);
        customer.AttachParty(party);
        store.Parties.Add(party);
        store.ProjectCustomers.Add(customer);
        var relatedProjectCustomer = ProjectCustomer.Create(
            Guid.NewGuid(),
            party.Id,
            null,
            "0550000003",
            null,
            null,
            "fr",
            CustomerSource.Referral,
            null,
            employee.Id,
            clock.UtcNow);
        relatedProjectCustomer.AttachParty(party);
        store.ProjectCustomers.Add(relatedProjectCustomer);
        var conflictingParty = Party.Create(Guid.NewGuid(), PartyKind.Person, "Collision Name", clock.UtcNow);
        var conflictingCustomer = ProjectCustomer.Create(
            relatedProjectCustomer.ProjectId,
            conflictingParty.Id,
            null,
            "0550000003",
            null,
            null,
            "fr",
            CustomerSource.Referral,
            null,
            employee.Id,
            clock.UtcNow);
        conflictingCustomer.AttachParty(conflictingParty);
        store.Parties.Add(conflictingParty);
        store.ProjectCustomers.Add(conflictingCustomer);

        var service = new ProjectCustomerService(store, store, store, store, store, store, clock);
        var createDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            service.CreateAsync(
                employee.Id,
                project.Id,
                new CreateProjectCustomerRequest(
                    nameof(CustomerType.Individual),
                    "Client Protected",
                    null,
                    "0550000002",
                    null,
                    null,
                    "ar",
                    nameof(CustomerSource.WalkIn),
                    null,
                    party.Id),
                metadata));
        Assert.Equal("PARTY_DIRECTORY_ACCESS_DENIED", createDenied.Code);

        var updateDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            service.UpdateAsync(
                employee.Id,
                project.Id,
                customer.Id,
                new UpdateProjectCustomerRequest(
                    nameof(CustomerType.Individual),
                    "Client Renamed",
                    null,
                    "0550000001",
                    null,
                    null,
                    "ar",
                    nameof(CustomerSource.WalkIn),
                    nameof(ProjectCustomerStatus.Prospect),
                    null,
                    customer.ConcurrencyStamp,
                    party.ConcurrencyStamp),
                metadata));
        Assert.Equal("PARTY_IDENTITY_MANAGE_REQUIRED", updateDenied.Code);

        var denials = store.AuditLogs.Where(entry => entry.EventType == "ACCESS_DENIED").ToList();
        Assert.Equal(2, denials.Count);
        Assert.All(denials, entry => Assert.Equal(AuditSeverity.Security, entry.Severity));
        Assert.Contains(denials, entry => entry.TargetEntityType == "Party" &&
            entry.TargetEntityId == party.Id.ToString() &&
            entry.MetadataJson!.Contains("parties.directory.read", StringComparison.Ordinal));
        Assert.Contains(denials, entry => entry.TargetEntityType == "Party" &&
            entry.TargetEntityId == party.Id.ToString() &&
            entry.MetadataJson!.Contains("parties.identity.manage", StringComparison.Ordinal));
        Assert.Equal("Client Protected", party.DisplayName);
        Assert.Equal("Client Protected", customer.Party.DisplayName);

        var collision = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            service.UpdateAsync(
                init.SystemAdminUserId,
                project.Id,
                customer.Id,
                new UpdateProjectCustomerRequest(
                    nameof(CustomerType.LegalEntity),
                    "Collision Name",
                    null,
                    "0550000001",
                    null,
                    null,
                    "ar",
                    nameof(CustomerSource.WalkIn),
                    nameof(ProjectCustomerStatus.Customer),
                    null,
                    customer.ConcurrencyStamp,
                    party.ConcurrencyStamp),
                metadata));
        Assert.Equal("PARTY_IDENTITY_CONFLICT", collision.Code);
        Assert.Equal("Client Protected", party.DisplayName);
        Assert.Equal("Client Protected", relatedProjectCustomer.Party.DisplayName);

        var authorizedUpdate = await service.UpdateAsync(
            init.SystemAdminUserId,
            project.Id,
            customer.Id,
            new UpdateProjectCustomerRequest(
                nameof(CustomerType.LegalEntity),
                "SARL Client Updated",
                null,
                "0550000001",
                null,
                null,
                "ar",
                nameof(CustomerSource.WalkIn),
                nameof(ProjectCustomerStatus.Customer),
                null,
                customer.ConcurrencyStamp,
                party.ConcurrencyStamp),
            metadata);
        Assert.Equal(nameof(CustomerType.LegalEntity), authorizedUpdate.CustomerType);
        Assert.Equal("SARL Client Updated", relatedProjectCustomer.Party.DisplayName);
        Assert.Equal("SARL CLIENT UPDATED", relatedProjectCustomer.Party.NormalizedDisplayName);
        Assert.Equal(PartyKind.LegalEntity, relatedProjectCustomer.Party.Kind);
        var identityAudit = Assert.Single(store.AuditLogs.Where(entry => entry.EventType == "PARTY_IDENTITY_UPDATED"));
        Assert.Contains("\"previousKind\":\"Person\"", identityAudit.MetadataJson);
        Assert.Contains("\"newKind\":\"LegalEntity\"", identityAudit.MetadataJson);
    }

    [Fact]
    public async Task PartyDirectory_UpdateIdentityAudit_UsesOriginalKindBeforeMutation()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var setup = new SetupService(store, new Pbkdf2PasswordHasher(), store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");
        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Client Original", clock.UtcNow);
        store.Parties.Add(party);
        var linkedCustomers = new[]
        {
            ProjectCustomer.Create(Guid.NewGuid(), party.Id, null, "0555000001",
                null, null, "ar", CustomerSource.WalkIn, null, init.SystemAdminUserId, clock.UtcNow),
            ProjectCustomer.Create(Guid.NewGuid(), party.Id, null, "0555000002",
                null, null, "fr", CustomerSource.Referral, null, init.SystemAdminUserId, clock.UtcNow)
        };
        foreach (var linkedCustomer in linkedCustomers)
        {
            linkedCustomer.AttachParty(party);
            store.ProjectCustomers.Add(linkedCustomer);
        }
        var originalCustomerStamps = linkedCustomers.Select(customer => customer.ConcurrencyStamp).ToArray();

        var service = new PartyDirectoryService(store, store, store, store, clock);
        var updated = await service.UpdateIdentityAsync(
            init.SystemAdminUserId,
            party.Id,
            new UpdatePartyIdentityRequest(nameof(PartyKind.LegalEntity), "Client Updated", party.ConcurrencyStamp),
            metadata);

        Assert.Equal(nameof(PartyKind.LegalEntity), updated.Kind);
        var audit = Assert.Single(store.AuditLogs.Where(entry => entry.EventType == "PARTY_IDENTITY_UPDATED"));
        Assert.Contains("\"previousKind\":\"Person\"", audit.MetadataJson);
        Assert.Contains("\"newKind\":\"LegalEntity\"", audit.MetadataJson);
        Assert.Equal(2, store.ProjectCustomers.Count);
        Assert.All(linkedCustomers, customer =>
        {
            Assert.Equal("Client Updated", customer.Party.DisplayName);
            Assert.Equal("CLIENT UPDATED", customer.Party.NormalizedDisplayName);
            Assert.Equal(PartyKind.LegalEntity, customer.Party.Kind);
        });
        Assert.All(Enumerable.Range(0, linkedCustomers.Length),
            index => Assert.Equal(originalCustomerStamps[index], linkedCustomers[index].ConcurrencyStamp));
    }

    [Fact]
    public async Task PartyDirectory_UpdateIdentityRejectsCrossProjectDuplicateBeforeMutation()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var setup = new SetupService(store, new Pbkdf2PasswordHasher(), store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");
        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var projectId = Guid.NewGuid();
        var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Client Original", clock.UtcNow);
        var conflictingParty = Party.Create(Guid.NewGuid(), PartyKind.Person, "Client Updated", clock.UtcNow);
        var customer = ProjectCustomer.Create(
            projectId, party.Id, null, "0555000001",
            null, null, "ar", CustomerSource.WalkIn, null, init.SystemAdminUserId, clock.UtcNow);
        var conflictingCustomer = ProjectCustomer.Create(
            projectId, conflictingParty.Id, null, "0555000001",
            null, null, "fr", CustomerSource.Referral, null, init.SystemAdminUserId, clock.UtcNow);
        customer.AttachParty(party);
        conflictingCustomer.AttachParty(conflictingParty);
        store.Parties.AddRange(new[] { party, conflictingParty });
        store.ProjectCustomers.AddRange(new[] { customer, conflictingCustomer });
        var customerStamp = customer.ConcurrencyStamp;
        var partyStamp = party.ConcurrencyStamp;

        var service = new PartyDirectoryService(store, store, store, store, clock);
        var conflict = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            service.UpdateIdentityAsync(
                init.SystemAdminUserId,
                party.Id,
                new UpdatePartyIdentityRequest(nameof(PartyKind.Person), "Client Updated", partyStamp),
                metadata));

        Assert.Equal("PARTY_IDENTITY_CONFLICT", conflict.Code);
        Assert.Equal("Client Original", party.DisplayName);
        Assert.Equal("Client Original", customer.Party.DisplayName);
        Assert.Equal(customerStamp, customer.ConcurrencyStamp);
        Assert.Empty(store.AuditLogs.Where(entry => entry.EventType == "PARTY_IDENTITY_UPDATED"));
    }

    [Fact]
    public async Task PartyDirectory_DeniedPermissionsAreSecurityAuditedBeforeRejecting()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var users = new UserManagementService(store, store, hasher, store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");
        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        var employee = await users.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest(
                "party.viewer",
                "Party Viewer",
                "party.viewer@elbahdja.dz",
                null,
                "StrongPass123",
                "ar",
                new[] { Role.CommercialManagerCode }),
            metadata);
        var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Client Protected", clock.UtcNow);
        store.Parties.Add(party);
        var service = new PartyDirectoryService(store, store, store, store, clock);

        var readDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            service.SearchAsync(employee.Id, "Client", metadata));
        Assert.Equal("PARTY_DIRECTORY_ACCESS_DENIED", readDenied.Code);

        var updateDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            service.UpdateIdentityAsync(
                employee.Id,
                party.Id,
                new UpdatePartyIdentityRequest(nameof(PartyKind.LegalEntity), "Changed Client", party.ConcurrencyStamp),
                metadata));
        Assert.Equal("PARTY_IDENTITY_MANAGE_REQUIRED", updateDenied.Code);

        var denials = store.AuditLogs.Where(entry => entry.EventType == "ACCESS_DENIED").ToList();
        Assert.Equal(2, denials.Count);
        Assert.All(denials, entry => Assert.Equal(AuditSeverity.Security, entry.Severity));
        Assert.Contains(denials, entry => entry.TargetEntityType == "PartyDirectory" && entry.MetadataJson!.Contains("parties.directory.read", StringComparison.Ordinal));
        Assert.Contains(denials, entry => entry.TargetEntityType == "Party" &&
            entry.TargetEntityId == party.Id.ToString() &&
            entry.MetadataJson!.Contains("parties.identity.manage", StringComparison.Ordinal));
        Assert.Equal("Client Protected", party.DisplayName);
        Assert.Equal(PartyKind.Person, party.Kind);
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
            new CreateProjectRequest("PRJ-16-01", "إقامة الياسمين", "Résidence Yasmine", "16", "Alger", "Cheraga", null, null, null, null, "Commercialization", 0m, 2, 32),
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
                0m,
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

        var editDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            structureSvc.UpdateBuildingAsync(
                employee.Id,
                project.Id,
                Guid.NewGuid(),
                new UpdateBuildingRequest("X", "غير مصرح", "Non autorisé", "Planned", Guid.NewGuid()),
                metadata));
        Assert.Equal("FORBIDDEN_PROJECT_STRUCTURE_MANAGE", editDenied.Code);

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

        var updatedBuildingResponse = await structureSvc.UpdateBuildingAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            new UpdateBuildingRequest(
                "A-RENAMED",
                "العمارة أ - معدلة",
                "Bâtiment A - Modifié",
                "UnderConstruction",
                building.ConcurrencyStamp),
            metadata);
        var updatedBuilding = Assert.Single(updatedBuildingResponse.Buildings);
        Assert.Equal("A-RENAMED", updatedBuilding.Code);
        Assert.Equal("UnderConstruction", updatedBuilding.Status);
        Assert.NotEqual(building.ConcurrencyStamp, updatedBuilding.ConcurrencyStamp);

        var staleBuildingUpdate = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.UpdateBuildingAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                new UpdateBuildingRequest(
                    "A-STALE",
                    "اسم قديم",
                    "Ancien nom",
                    "Planned",
                    building.ConcurrencyStamp),
                metadata));
        Assert.Equal("CONCURRENCY_CONFLICT", staleBuildingUpdate.Code);

        var updatedFloorResponse = await structureSvc.UpdateFloorAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            new UpdateBuildingFloorRequest(
                1,
                "الطابق الأول",
                "Premier étage",
                floor.ConcurrencyStamp),
            metadata);
        var updatedFloor = Assert.Single(Assert.Single(updatedFloorResponse.Buildings).Floors);
        Assert.Equal(1, updatedFloor.FloorNumber);
        Assert.NotEqual(floor.ConcurrencyStamp, updatedFloor.ConcurrencyStamp);

        var staleFloorUpdate = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.UpdateFloorAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                new UpdateBuildingFloorRequest(
                    2,
                    "تعديل قديم",
                    "Ancienne modification",
                    floor.ConcurrencyStamp),
                metadata));
        Assert.Equal("CONCURRENCY_CONFLICT", staleFloorUpdate.Code);

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

        var updatedStructure = await structureSvc.UpdatePropertyUnitAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            unit.Id,
            new UpdatePropertyUnitRequest(
                "A-001",
                "Apartment",
                113m,
                97m,
                4,
                unit.ConcurrencyStamp),
            metadata);
        var updatedUnit = Assert.Single(
            Assert.Single(Assert.Single(updatedStructure.Buildings).Floors).Units);
        Assert.Equal(113m, updatedUnit.GrossAreaSquareMeters);
        Assert.Equal(97m, updatedUnit.NetAreaSquareMeters);
        Assert.NotEqual(unit.ConcurrencyStamp, updatedUnit.ConcurrencyStamp);

        var staleUpdate = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.UpdatePropertyUnitAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                unit.Id,
                new UpdatePropertyUnitRequest(
                    "A-001",
                    "Apartment",
                    114m,
                    97m,
                    4,
                    unit.ConcurrencyStamp),
                metadata));
        Assert.Equal("CONCURRENCY_CONFLICT", staleUpdate.Code);

        var withdrawnStructure = await structureSvc.ChangePropertyUnitStatusAsync(
            init.SystemAdminUserId,
            project.Id,
            building.Id,
            floor.Id,
            unit.Id,
            new ChangePropertyUnitStatusRequest("Withdrawn", updatedUnit.ConcurrencyStamp),
            metadata);
        var withdrawnUnit = Assert.Single(
            Assert.Single(Assert.Single(withdrawnStructure.Buildings).Floors).Units);
        Assert.Equal("Withdrawn", withdrawnUnit.Status);

        var forbiddenSaleStatus = await Assert.ThrowsAsync<DomainException>(() =>
            structureSvc.ChangePropertyUnitStatusAsync(
                init.SystemAdminUserId,
                project.Id,
                building.Id,
                floor.Id,
                unit.Id,
                new ChangePropertyUnitStatusRequest("Sold", withdrawnUnit.ConcurrencyStamp),
                metadata));
        Assert.Equal("UNIT_STATUS_REQUIRES_SALES_WORKFLOW", forbiddenSaleStatus.Code);

        var duplicateBuilding = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            structureSvc.CreateBuildingAsync(
                init.SystemAdminUserId,
                project.Id,
                new CreateBuildingRequest(" a-renamed ", "العمارة", "Bâtiment", "Planned"),
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
                    "a-001",
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
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "BUILDING_UPDATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "BUILDING_FLOOR_CREATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "BUILDING_FLOOR_UPDATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "PROPERTY_UNIT_CREATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "PROPERTY_UNIT_UPDATED");
        Assert.Contains(store.AuditLogs, entry => entry.EventType == "PROPERTY_UNIT_STATUS_CHANGED");
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
                0m,
                2,
                32),
            metadata);
        Assert.Null(created.EstimatedBudgetDzd);

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
            null,
            3,
            36,
            created.ConcurrencyStamp);

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
        Assert.Null(updated.EstimatedBudgetDzd);
        Assert.Equal(created.CreatedAtUtc, updated.CreatedAtUtc);
        Assert.True(updated.CreatedAtUtc < clock.UtcNow);
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "PROJECT_UPDATED" &&
            entry.TargetEntityId == created.Id.ToString());

        var staleUpdate = updateRequest with
        {
            NameAr = "تعديل قديم يجب رفضه",
            NameFr = "Modification obsolète à rejeter"
        };
        var staleError = await Assert.ThrowsAsync<ConflictDomainException>(() =>
            projectSvc.UpdateProjectAsync(init.SystemAdminUserId, created.Id, staleUpdate, metadata));
        Assert.Equal("PROJECT_CONCURRENCY_CONFLICT", staleError.Code);
        var stillCurrent = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, created.Id, metadata);
        Assert.Equal(updated.NameAr, stillCurrent.NameAr);
        Assert.Equal(updated.ConcurrencyStamp, stillCurrent.ConcurrencyStamp);
        Assert.Null(stillCurrent.EstimatedBudgetDzd);

        var denied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(employee.Id, created.Id, updateRequest, metadata));
        Assert.Equal("FORBIDDEN_PROJECT_UPDATE", denied.Code);
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "ACCESS_DENIED" &&
            entry.ActorUserId == employee.Id &&
            entry.TargetEntityId == created.Id.ToString());

        var invalidBudget = updateRequest with
        {
            EstimatedBudgetDzd = -1m,
            ExpectedConcurrencyStamp = updated.ConcurrencyStamp
        };
        var financialDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(init.SystemAdminUserId, created.Id, invalidBudget, metadata));
        Assert.Equal("PROJECT_FINANCIAL_ACCESS_DENIED", financialDenied.Code);

        var invalidStatus = updateRequest with
        {
            Status = "999",
            ExpectedConcurrencyStamp = updated.ConcurrencyStamp
        };
        var statusError = await Assert.ThrowsAsync<DomainException>(() =>
            projectSvc.UpdateProjectAsync(init.SystemAdminUserId, created.Id, invalidStatus, metadata));
        Assert.Equal("PROJECT_STATUS_INVALID", statusError.Code);
    }

    [Fact]
    public async Task ProjectBudget_RequiresExplicitFinancialCapability_ForReadAndWrite()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);

        // The lightweight test store seeds only the baseline roles. Add the production Project Director
        // role and projects.manage permission locally for this test; do not change production seed data.
        var projectDirectorRole = Role.Create(
            Guid.NewGuid(),
            Role.ProjectDirectorCode,
            "مدير المشاريع",
            "Directeur de Projets",
            "إدارة المشاريع",
            "Gestion des projets",
            false,
            clock.UtcNow);
        var projectsManagePermission = Permission.Create(
            Guid.NewGuid(),
            "projects.manage",
            "Projects",
            "إدارة بيانات المشروع",
            "Gérer les données du projet",
            clock.UtcNow);
        var systemAdminRole = store.Roles.Single(role => role.Code == Role.SystemAdminCode);
        store.Roles.Add(projectDirectorRole);
        store.Permissions.Add(projectsManagePermission);
        store.RolePermissions.Add(RolePermission.Create(projectDirectorRole.Id, projectsManagePermission.Id));
        store.RolePermissions.Add(RolePermission.Create(systemAdminRole.Id, projectsManagePermission.Id));

        var financialManager = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("finance.pm", "Financial PM", "finance.pm@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ProjectDirectorCode }),
            metadata);
        var restrictedManager = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("restricted.pm", "Restricted PM", "restricted.pm@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ProjectDirectorCode }),
            metadata);
        var financialReader = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("finance.reader", "Financial Reader", "finance.reader@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ProjectDirectorCode }),
            metadata);
        var nonMember = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("no.project", "No Project", "no.project@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ProjectDirectorCode }),
            metadata);

        var project = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest("PRJ-FIN-SCOPE", "مشروع مالي", "Projet financier", "16", "Alger", "Hydra", null, null, null, null, "Planning", 0m, 1, 12),
            metadata);
        Assert.Null(project.EstimatedBudgetDzd);

        var unauthorizedCreate = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.CreateProjectAsync(
                init.SystemAdminUserId,
                new CreateProjectRequest("PRJ-FIN-DENIED", "مشروع", "Projet", "16", "Alger", "Hydra", null, null, null, null, "Planning", 1m, 1, 1),
                metadata));
        Assert.Equal("PROJECT_FINANCIAL_ACCESS_DENIED", unauthorizedCreate.Code);

        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(financialManager.Id, nameof(ProjectRole.ProjectManager), true, true, true, true),
            metadata);
        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(restrictedManager.Id, nameof(ProjectRole.ProjectManager), false, true, true, true),
            metadata);
        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(financialReader.Id, nameof(ProjectRole.FinanceController), true, false, false, false),
            metadata);

        var adminRead = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, project.Id, metadata);
        Assert.Null(adminRead.EstimatedBudgetDzd);

        var financialManagerRead = await projectSvc.GetProjectByIdAsync(financialManager.Id, project.Id, metadata);
        Assert.Equal(0m, financialManagerRead.EstimatedBudgetDzd);
        var restrictedManagerRead = await projectSvc.GetProjectByIdAsync(restrictedManager.Id, project.Id, metadata);
        Assert.Null(restrictedManagerRead.EstimatedBudgetDzd);
        var financialReaderRead = await projectSvc.GetProjectByIdAsync(financialReader.Id, project.Id, metadata);
        Assert.Equal(0m, financialReaderRead.EstimatedBudgetDzd);

        var financialList = Assert.Single(await projectSvc.ListAccessibleProjectsAsync(financialManager.Id, metadata));
        Assert.Equal(0m, financialList.EstimatedBudgetDzd);
        var restrictedList = Assert.Single(await projectSvc.ListAccessibleProjectsAsync(restrictedManager.Id, metadata));
        Assert.Null(restrictedList.EstimatedBudgetDzd);
        Assert.Empty(await projectSvc.ListAccessibleProjectsAsync(nonMember.Id, metadata));

        var generalUpdate = new UpdateProjectRequest(
            "مشروع محدث",
            "Projet mis à jour",
            "16",
            "Alger",
            "Hydra",
            null,
            null,
            null,
            null,
            "Planning",
            null,
            1,
            12,
            restrictedManagerRead.ConcurrencyStamp);
        var generalUpdated = await projectSvc.UpdateProjectAsync(
            restrictedManager.Id,
            project.Id,
            generalUpdate,
            metadata);
        Assert.Equal("مشروع محدث", generalUpdated.NameAr);
        Assert.Null(generalUpdated.EstimatedBudgetDzd);

        var budgetTampering = generalUpdate with
        {
            EstimatedBudgetDzd = 90_000_000m,
            ExpectedConcurrencyStamp = generalUpdated.ConcurrencyStamp
        };
        var deniedBudgetUpdate = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(restrictedManager.Id, project.Id, budgetTampering, metadata));
        Assert.Equal("PROJECT_FINANCIAL_ACCESS_DENIED", deniedBudgetUpdate.Code);

        var stillRestricted = await projectSvc.GetProjectByIdAsync(restrictedManager.Id, project.Id, metadata);
        Assert.Null(stillRestricted.EstimatedBudgetDzd);
        var unchangedForFinance = await projectSvc.GetProjectByIdAsync(financialManager.Id, project.Id, metadata);
        Assert.Equal(0m, unchangedForFinance.EstimatedBudgetDzd);

        var financialUpdate = generalUpdate with
        {
            EstimatedBudgetDzd = 125_000_000m,
            ExpectedConcurrencyStamp = unchangedForFinance.ConcurrencyStamp
        };
        var financialUpdated = await projectSvc.UpdateProjectAsync(
            financialManager.Id,
            project.Id,
            financialUpdate,
            metadata);
        Assert.Equal(125_000_000m, financialUpdated.EstimatedBudgetDzd);

        var financeReaderAfterUpdate = await projectSvc.GetProjectByIdAsync(financialReader.Id, project.Id, metadata);
        Assert.Equal(125_000_000m, financeReaderAfterUpdate.EstimatedBudgetDzd);
        var adminAfterUpdate = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, project.Id, metadata);
        Assert.Null(adminAfterUpdate.EstimatedBudgetDzd);

        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(init.SystemAdminUserId, nameof(ProjectRole.FinanceController), true, false, false, false),
            metadata);
        var explicitlyAuthorizedAdminRead = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, project.Id, metadata);
        Assert.Equal(125_000_000m, explicitlyAuthorizedAdminRead.EstimatedBudgetDzd);

        var adminFinanceControllerWrite = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(
                init.SystemAdminUserId,
                project.Id,
                financialUpdate with { EstimatedBudgetDzd = 140_000_000m, ExpectedConcurrencyStamp = explicitlyAuthorizedAdminRead.ConcurrencyStamp },
                metadata));
        Assert.Equal("PROJECT_FINANCIAL_ACCESS_DENIED", adminFinanceControllerWrite.Code);

        var financeReaderManagerWrite = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(
                financialReader.Id,
                project.Id,
                financialUpdate with { EstimatedBudgetDzd = 145_000_000m, ExpectedConcurrencyStamp = financeReaderAfterUpdate.ConcurrencyStamp },
                metadata));
        Assert.Equal("FORBIDDEN_PROJECT_UPDATE", financeReaderManagerWrite.Code);

        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(init.SystemAdminUserId, nameof(ProjectRole.ProjectManager), true, true, true, true),
            metadata);
        var adminProjectManagerRead = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, project.Id, metadata);
        var adminManagerBudgetUpdate = await projectSvc.UpdateProjectAsync(
            init.SystemAdminUserId,
            project.Id,
            financialUpdate with { EstimatedBudgetDzd = 175_000_000m, ExpectedConcurrencyStamp = adminProjectManagerRead.ConcurrencyStamp },
            metadata);
        Assert.Equal(175_000_000m, adminManagerBudgetUpdate.EstimatedBudgetDzd);

        var restrictedAfterUpdate = await projectSvc.GetProjectByIdAsync(restrictedManager.Id, project.Id, metadata);
        Assert.Null(restrictedAfterUpdate.EstimatedBudgetDzd);

        var financeReaderWrite = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.UpdateProjectAsync(
                financialReader.Id,
                project.Id,
                financialUpdate with { EstimatedBudgetDzd = 150_000_000m, ExpectedConcurrencyStamp = financeReaderAfterUpdate.ConcurrencyStamp },
                metadata));
        Assert.Equal("FORBIDDEN_PROJECT_UPDATE", financeReaderWrite.Code);

        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "PROJECT_FINANCIALS_VIEWED" &&
            entry.ActorUserId == financialManager.Id &&
            entry.TargetEntityId == project.Id.ToString());
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "ACCESS_DENIED" &&
            entry.ActorUserId == restrictedManager.Id &&
            entry.TargetEntityId == project.Id.ToString());
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "ACCESS_DENIED" &&
            entry.ActorUserId == init.SystemAdminUserId);
        await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            projectSvc.GetProjectByIdAsync(nonMember.Id, project.Id, metadata));
        Assert.Contains(store.AuditLogs, entry =>
            entry.EventType == "ACCESS_DENIED" &&
            entry.ActorUserId == nonMember.Id &&
            entry.TargetEntityId == project.Id.ToString());
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

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
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
        // Local console recovery keeps the issued password usable: the operator already holds
        // root-equivalent access, and a hidden deadline would silently lock the account again.
        Assert.False(newLogin.Session.User.MustChangePasswordAtNextLogin);
        await authSvc.ChangePasswordAsync(
            init.SystemAdminUserId,
            new ChangePasswordRequest("RecoveredPass#2026", "AdminPersonal#2026"),
            meta);
        var fullyAuthenticated = await authSvc.LoginAsync(new LoginRequest("sysadmin", "AdminPersonal#2026"), meta);
        Assert.False(fullyAuthenticated.Session.User.MustChangePasswordAtNextLogin);
        Assert.Contains(store.AuditLogs, a => a.EventType == "ADMIN_LOCAL_UNLOCK");
        Assert.Contains(store.AuditLogs, a => a.EventType == "ADMIN_LOCAL_PASSWORD_RECOVERY");
    }

    [Fact]
    public async Task AuthService_AllowsVoluntaryPasswordChange_AndRevokesAllSessions()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var tokenGen = new CryptoSessionTokenGenerator();
        var setup = new SetupService(store, hasher, store, clock);
        var authSvc = new AuthService(store, store, hasher, tokenGen, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var login = await authSvc.LoginAsync(new LoginRequest("sysadmin", "StrongPass123"), meta);
        Assert.False(login.Session.User.MustChangePasswordAtNextLogin);

        await authSvc.ChangePasswordAsync(
            init.SystemAdminUserId,
            new ChangePasswordRequest("StrongPass123", "VoluntaryPass#2026"),
            meta);

        Assert.Null(await authSvc.ValidateSessionAsync(login.OpaqueSessionToken));
        Assert.Contains(store.AuditLogs, a => a.EventType == "USER_PASSWORD_CHANGED");

        var relogin = await authSvc.LoginAsync(new LoginRequest("sysadmin", "VoluntaryPass#2026"), meta);
        Assert.False(relogin.Session.User.MustChangePasswordAtNextLogin);
    }

    [Fact]
    public async Task ValidateSession_RevokesIdleSession_AndAuditsTheReason()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var tokenGen = new CryptoSessionTokenGenerator();
        var setup = new SetupService(store, hasher, store, clock);
        var authSvc = new AuthService(
            store, store, hasher, tokenGen, store, clock,
            new SessionPolicy(TimeSpan.FromHours(12), TimeSpan.FromMinutes(30), TimeSpan.FromMinutes(1)));
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        await setup.InitializeAsync(ValidInitRequest(), meta);
        var login = await authSvc.LoginAsync(new LoginRequest("sysadmin", "StrongPass123"), meta);
        Assert.NotNull(await authSvc.ValidateSessionAsync(login.OpaqueSessionToken));

        clock.UtcNow = clock.UtcNow.AddMinutes(31);

        Assert.Null(await authSvc.ValidateSessionAsync(login.OpaqueSessionToken));
        Assert.Contains(store.AuditLogs, a => a.EventType == "AUTH_SESSION_IDLE_EXPIRED");
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

    [Fact]
    public async Task ProjectListAndDetail_ComputeActualBuildingAndUnitCountsDynamically_IndependentOfPlannedCounts()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var structureSvc = new ProjectStructureService(store, store, store, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var created = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest(
                "PRJ-16-COUNTS",
                "إقامة الرمال الذهبية",
                "Résidence Les Sables d'Or",
                "16",
                "Alger",
                "Aïn Benian",
                null,
                null,
                null,
                null,
                "UnderConstruction",
                0m,
                3,
                72),
            meta);

        Assert.Equal(3, created.PlannedBlocksCount);
        Assert.Equal(72, created.PlannedUnitsCount);
        Assert.Equal(0, created.ActualBuildingsCount);
        Assert.Equal(0, created.ActualUnitsCount);

        var s1 = await structureSvc.CreateBuildingAsync(
            init.SystemAdminUserId,
            created.Id,
            new CreateBuildingRequest("BLOC-A", "العمارة أ", "Bâtiment A", "UnderConstruction"),
            meta);
        var buildingId = Assert.Single(s1.Buildings).Id;

        var s2 = await structureSvc.CreateFloorAsync(
            init.SystemAdminUserId,
            created.Id,
            buildingId,
            new CreateBuildingFloorRequest(0, "الطابق الأرضي", "Rez-de-chaussée"),
            meta);
        var floorId = Assert.Single(Assert.Single(s2.Buildings).Floors).Id;

        await structureSvc.CreatePropertyUnitAsync(
            init.SystemAdminUserId,
            created.Id,
            buildingId,
            floorId,
            new CreatePropertyUnitRequest("A-00-01", "Apartment", "AvailableForSale", 92m, 80m, 3),
            meta);
        await structureSvc.CreatePropertyUnitAsync(
            init.SystemAdminUserId,
            created.Id,
            buildingId,
            floorId,
            new CreatePropertyUnitRequest("A-00-02", "Apartment", "AvailableForSale", 114m, 99m, 4),
            meta);

        var listed = Assert.Single(await projectSvc.ListAccessibleProjectsAsync(init.SystemAdminUserId, meta));
        var detailed = await projectSvc.GetProjectByIdAsync(init.SystemAdminUserId, created.Id, meta);

        Assert.Equal(3, listed.PlannedBlocksCount);
        Assert.Equal(72, listed.PlannedUnitsCount);
        Assert.Equal(1, listed.ActualBuildingsCount);
        Assert.Equal(2, listed.ActualUnitsCount);

        Assert.Equal(listed.ActualBuildingsCount, detailed.ActualBuildingsCount);
        Assert.Equal(listed.ActualUnitsCount, detailed.ActualUnitsCount);
    }

    [Fact]
    public async Task ExpiredLockout_ResetsFailedAttempts_AndRequiresFiveNewFailuresToRelock()
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
            new CreateEmployeeRequest("nadia.lock", "Nadia Lock", "nadia.lock@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
                authSvc.LoginAsync(new LoginRequest("nadia.lock", "WrongPass999"), meta));
        }

        // Advance past lockout expiry
        clock.UtcNow = clock.UtcNow.Add(User.LockoutDuration).AddMinutes(1);

        // One failed login after expiry resets counter to 1 and does not immediately re-lock
        await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
            authSvc.LoginAsync(new LoginRequest("nadia.lock", "WrongPass999"), meta));
        var userAfterFirstRetry = await store.GetByIdWithRolesAsync(emp.Id);
        Assert.NotNull(userAfterFirstRetry);
        Assert.Equal(1, userAfterFirstRetry!.FailedLoginAttempts);
        Assert.False(userAfterFirstRetry.IsLockedOut(clock.UtcNow));

        // The temporary credential authenticates only into the forced-change flow.
        var temporaryLogin = await authSvc.LoginAsync(new LoginRequest("nadia.lock", "StrongPass123"), meta);
        Assert.Equal(emp.Id, temporaryLogin.Session.User.Id);
        Assert.True(temporaryLogin.Session.User.MustChangePasswordAtNextLogin);
        Assert.Empty(temporaryLogin.Session.User.Permissions);

        await authSvc.ChangePasswordAsync(
            emp.Id,
            new ChangePasswordRequest("StrongPass123", "NadiaPersonal#2026"),
            meta);
        var ok = await authSvc.LoginAsync(new LoginRequest("nadia.lock", "NadiaPersonal#2026"), meta);
        Assert.Equal(emp.Id, ok.Session.User.Id);
        Assert.False(ok.Session.User.MustChangePasswordAtNextLogin);
        Assert.Equal(0, userAfterFirstRetry.FailedLoginAttempts);
    }

    [Fact]
    public async Task PasswordPolicy_EnforcesMaximumLength128_AndLoginRejectsOversizedPasswordBeforeHashing()
    {
        var overMax = "Aa1" + new string('x', PasswordPolicyValidator.MaximumLength - 2);
        Assert.Equal(129, overMax.Length);

        var policyEx = Assert.Throws<DomainException>(() => PasswordPolicyValidator.EnsureValid(overMax));
        Assert.Equal("PASSWORD_TOO_LONG", policyEx.Code);

        var store = new InMemoryStore();
        var clock = new FakeClock();
        var realHasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, realHasher, store, clock);
        var spyHasher = new SpyPasswordHasher(realHasher);
        var authSvc = new AuthService(store, store, spyHasher, new CryptoSessionTokenGenerator(), store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        await setup.InitializeAsync(ValidInitRequest(), meta);

        var ex = await Assert.ThrowsAsync<UnauthorizedDomainException>(() =>
            authSvc.LoginAsync(new LoginRequest("sysadmin", overMax), meta));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", ex.Code);
        Assert.Equal(0, spyHasher.VerifyCallCount);
        Assert.Contains(store.AuditLogs, a => a.EventType == "AUTH_LOGIN_FAILED" && a.Summary.Contains("length limit"));
    }

    [Fact]
    public async Task AuthService_GatesOrganizationSensitiveFieldsAndConcurrencyStampByPermissions()
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
        var adminLogin = await authSvc.LoginAsync(new LoginRequest("sysadmin", "StrongPass123"), meta);
        Assert.NotEqual(Guid.Empty, adminLogin.Session.Organization.ConcurrencyStamp);
        Assert.Equal("001616012345678", adminLogin.Session.Organization.Nif);
        Assert.Equal("Hydra", adminLogin.Session.Organization.Address);

        // Non-admin with org.read gets fiscal/contact fields but Guid.Empty concurrency stamp
        var viewer = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("viewer.org", "Viewer Org", "viewer.org@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ViewerCode }),
            meta);
        var temporaryViewerLogin = await authSvc.LoginAsync(new LoginRequest("viewer.org", "StrongPass123"), meta);
        Assert.True(temporaryViewerLogin.Session.User.MustChangePasswordAtNextLogin);
        Assert.Empty(temporaryViewerLogin.Session.User.Permissions);
        Assert.Null(temporaryViewerLogin.Session.Organization.Nif);

        await authSvc.ChangePasswordAsync(
            viewer.Id,
            new ChangePasswordRequest("StrongPass123", "ViewerPersonal#2026"),
            meta);
        var viewerLogin = await authSvc.LoginAsync(new LoginRequest("viewer.org", "ViewerPersonal#2026"), meta);
        Assert.False(viewerLogin.Session.User.MustChangePasswordAtNextLogin);
        Assert.Equal(Guid.Empty, viewerLogin.Session.Organization.ConcurrencyStamp);
        Assert.Equal("001616012345678", viewerLogin.Session.Organization.Nif);

        // User with custom role lacking org.read and org.manage receives redacted fiscal/contact fields
        var restrictedRole = Role.Create(Guid.NewGuid(), "NO_ORG_ROLE", "بدون قراءة", "Sans org", "Restricted", "Restricted", false, clock.UtcNow);
        store.Roles.Add(restrictedRole);
        var restrictedUser = User.CreateEmployee(
            "restricted.user",
            "Restricted User",
            "restricted@elbahdja.dz",
            null,
            hasher.HashPassword("StrongPass123"),
            "fr",
            clock.UtcNow);
        await store.AddUserAsync(restrictedUser);
        await store.AddUserRoleAsync(UserRole.Create(restrictedUser.Id, restrictedRole.Id, init.SystemAdminUserId, clock.UtcNow));

        var restrictedLogin = await authSvc.LoginAsync(new LoginRequest("restricted.user", "StrongPass123"), meta);
        Assert.Null(restrictedLogin.Session.Organization.Nif);
        Assert.Null(restrictedLogin.Session.Organization.Nis);
        Assert.Null(restrictedLogin.Session.Organization.TradeRegisterNumber);
        Assert.Null(restrictedLogin.Session.Organization.TaxArticleNumber);
        Assert.Null(restrictedLogin.Session.Organization.ShareCapitalDzd);
        Assert.Equal(string.Empty, restrictedLogin.Session.Organization.Address);
        Assert.Null(restrictedLogin.Session.Organization.Phone);
        Assert.Null(restrictedLogin.Session.Organization.Email);
        Assert.Equal(Guid.Empty, restrictedLogin.Session.Organization.ConcurrencyStamp);

        var validated = await authSvc.ValidateSessionAsync(restrictedLogin.OpaqueSessionToken);
        Assert.NotNull(validated);
        Assert.Null(validated!.Organization.Nif);
        Assert.Equal(string.Empty, validated.Organization.Address);
        Assert.Equal(Guid.Empty, validated.Organization.ConcurrencyStamp);
    }

    [Fact]
    public async Task ProjectStructure_RequiresProjectsStructureManagePermissionEvenForProjectManager()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var userSvc = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var structureSvc = new ProjectStructureService(store, store, store, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), meta);
        var project = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest("PRJ-STRUCT-PERM", "مشروع", "Projet", "16", "Alger", "Hydra", null, null, null, null, "Planning", 0m, 1, 10),
            meta);

        // CommercialManager does NOT have projects.structure.manage
        var commercialPm = await userSvc.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("comm.pm", "Commercial PM", "comm.pm@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        await projectSvc.AssignMemberAsync(
            init.SystemAdminUserId,
            project.Id,
            new AssignProjectMemberRequest(commercialPm.Id, nameof(ProjectRole.ProjectManager), true, true, true, true),
            meta);

        // Reading structure succeeds with projects.read + membership, but mutating is denied without projects.structure.manage
        var readStructure = await structureSvc.GetProjectStructureAsync(commercialPm.Id, project.Id, meta);
        Assert.Empty(readStructure.Buildings);

        var deniedCreate = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
            structureSvc.CreateBuildingAsync(
                commercialPm.Id,
                project.Id,
                new CreateBuildingRequest("B1", "عمارة 1", "Bloc 1", "Planned"),
                meta));
        Assert.Equal("FORBIDDEN_PROJECT_STRUCTURE_MANAGE", deniedCreate.Code);
    }

    [Fact]
    public async Task ProjectDocuments_EnforceCategoryNarrowing_AndIsolateCustomerIdentityDocuments()
    {
        var tempStorage = Path.Combine(Path.GetTempPath(), $"promogest-app-docs-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempStorage);
        try
        {
            var store = new InMemoryStore();
            var clock = new FakeClock();
            var hasher = new Pbkdf2PasswordHasher();
            var storage = new LocalFileStorageService(new LocalStorageOptions { RootDirectory = tempStorage }, clock);
            var setup = new SetupService(store, hasher, store, clock);
            var userSvc = new UserManagementService(store, store, hasher, store, clock);
            var projectSvc = new ProjectService(store, store, store, clock);
            var docSvc = new ProjectDocumentService(store, store, store, storage, store, clock);
            var meta = new RequestMetadata("127.0.0.1", "xUnit");

            var init = await setup.InitializeAsync(ValidInitRequest(), meta);
            var project = await projectSvc.CreateProjectAsync(
                init.SystemAdminUserId,
                new CreateProjectRequest("PRJ-DOC-SCOPE", "مشروع الوثائق", "Projet Docs", "16", "Alger", "Hydra", null, null, null, null, "Planning", 0m, 1, 10),
                meta);

            var financeUser = await userSvc.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("fin.officer", "Finance Officer", "fin@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.FinanceOfficerCode }),
                meta);
            var siteUser = await userSvc.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("site.eng", "Site Engineer", "site@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.SiteEngineerCode }),
                meta);
            var commUser = await userSvc.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("comm.mgr", "Commercial Manager", "comm@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
                meta);
            var viewerUser = await userSvc.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("viewer.doc", "Viewer Doc", "viewer.doc@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.ViewerCode }),
                meta);

            await projectSvc.AssignMemberAsync(init.SystemAdminUserId, project.Id, new AssignProjectMemberRequest(financeUser.Id, nameof(ProjectRole.FinanceController), true, false, false, true), meta);
            await projectSvc.AssignMemberAsync(init.SystemAdminUserId, project.Id, new AssignProjectMemberRequest(siteUser.Id, nameof(ProjectRole.SiteSupervisor), false, false, true, true), meta);
            await projectSvc.AssignMemberAsync(init.SystemAdminUserId, project.Id, new AssignProjectMemberRequest(commUser.Id, nameof(ProjectRole.CommercialAgent), false, true, false, true), meta);
            await projectSvc.AssignMemberAsync(init.SystemAdminUserId, project.Id, new AssignProjectMemberRequest(viewerUser.Id, nameof(ProjectRole.ReadOnlyObserver), false, false, false, false), meta);

            // Admin uploads documents across categories and one customer identity document
            async Task<ProjectDocumentDto> UploadTextAsync(Guid actorId, string name, string category)
            {
                await using var ms = new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"content-{name}"));
                return await docSvc.UploadAsync(actorId, project.Id, ms, name, category, null, ms.Length, meta);
            }

            var financialDoc = await UploadTextAsync(init.SystemAdminUserId, "budget.txt", "Financial");
            var engineeringDoc = await UploadTextAsync(init.SystemAdminUserId, "plan.txt", "Engineering");
            var legalDoc = await UploadTextAsync(init.SystemAdminUserId, "title.txt", "Legal");
            var generalDoc = await UploadTextAsync(init.SystemAdminUserId, "note.txt", "Other");
            var customerIdDoc = await UploadTextAsync(init.SystemAdminUserId, "cni-client.txt", "Commercial");

            var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Amine Client", clock.UtcNow);
            var customer = ProjectCustomer.Create(
                project.Id,
                party.Id,
                null,
                "0550112233",
                null,
                null,
                "fr",
                CustomerSource.WalkIn,
                customerIdDoc.Id,
                commUser.Id,
                clock.UtcNow);
            customer.AttachParty(party);
            store.Parties.Add(party);
            store.ProjectCustomers.Add(customer);

            // VIEWER lacks files.read and is denied listing and download
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.ListAsync(viewerUser.Id, project.Id, meta));
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.GetDownloadAsync(viewerUser.Id, project.Id, generalDoc.Id, meta));

            // FinanceOfficer (CanViewFinancials + CanManageDocuments) sees Financial, Legal, Engineering, Other, NOT Commercial
            var financeList = await docSvc.ListAsync(financeUser.Id, project.Id, meta);
            Assert.Contains(financeList, d => d.Id == financialDoc.Id);
            Assert.Contains(financeList, d => d.Id == legalDoc.Id);
            Assert.Contains(financeList, d => d.Id == generalDoc.Id);
            Assert.DoesNotContain(financeList, d => d.Id == customerIdDoc.Id);
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.GetDownloadAsync(financeUser.Id, project.Id, customerIdDoc.Id, meta));

            // FinanceOfficer cannot upload Engineering even with CanManageDocuments because Engineering upload requires CanManageConstruction
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => UploadTextAsync(financeUser.Id, "eng-forbidden.txt", "Engineering"));

            // SiteEngineer (CanManageConstruction + CanManageDocuments, no CanViewFinancials, no customers.read)
            // sees Engineering, Legal, Other, NOT Financial or Commercial
            var siteList = await docSvc.ListAsync(siteUser.Id, project.Id, meta);
            Assert.Contains(siteList, d => d.Id == engineeringDoc.Id);
            Assert.Contains(siteList, d => d.Id == legalDoc.Id);
            Assert.DoesNotContain(siteList, d => d.Id == financialDoc.Id);
            Assert.DoesNotContain(siteList, d => d.Id == customerIdDoc.Id);
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.GetDownloadAsync(siteUser.Id, project.Id, financialDoc.Id, meta));

            // Even if customer identity doc is uploaded under "Other", SiteEngineer (lacks customers.read) cannot see or download it
            var disguisedIdDoc = await UploadTextAsync(init.SystemAdminUserId, "passport-other.txt", "Other");
            var party2 = Party.Create(Guid.NewGuid(), PartyKind.Person, "Karima Client", clock.UtcNow);
            var customer2 = ProjectCustomer.Create(
                project.Id,
                party2.Id,
                null,
                "0550445566",
                null,
                null,
                "fr",
                CustomerSource.WalkIn,
                disguisedIdDoc.Id,
                commUser.Id,
                clock.UtcNow);
            customer2.AttachParty(party2);
            store.Parties.Add(party2);
            store.ProjectCustomers.Add(customer2);

            var siteListAfter = await docSvc.ListAsync(siteUser.Id, project.Id, meta);
            Assert.DoesNotContain(siteListAfter, d => d.Id == disguisedIdDoc.Id);
            var piiDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.GetDownloadAsync(siteUser.Id, project.Id, disguisedIdDoc.Id, meta));
            Assert.Equal("PROJECT_DOCUMENT_ACCESS_DENIED", piiDenied.Code);
            Assert.Contains(store.AuditLogs, entry =>
                entry.EventType == "ACCESS_DENIED" &&
                entry.ActorUserId == siteUser.Id &&
                entry.TargetEntityId == disguisedIdDoc.Id.ToString());

            // CommercialManager (CanManageSales + CanManageDocuments + customers.read) CAN list and download both customer identity documents
            var commList = await docSvc.ListAsync(commUser.Id, project.Id, meta);
            Assert.Contains(commList, d => d.Id == customerIdDoc.Id);
            Assert.Contains(commList, d => d.Id == disguisedIdDoc.Id);
            var commDownload = await docSvc.GetDownloadAsync(commUser.Id, project.Id, disguisedIdDoc.Id, meta);
            await using var commContent = commDownload.Content;
            Assert.Equal("passport-other.txt", commDownload.FileName);

            // A ProjectManager does not inherit Financial read access from the role alone.
            await projectSvc.AssignMemberAsync(
                init.SystemAdminUserId,
                project.Id,
                new AssignProjectMemberRequest(siteUser.Id, nameof(ProjectRole.ProjectManager), false, true, true, true),
                meta);
            var managerFinancialListDenied = await docSvc.ListAsync(siteUser.Id, project.Id, meta);
            Assert.DoesNotContain(managerFinancialListDenied, item => item.Id == financialDoc.Id);
            Assert.Contains(store.AuditLogs, entry =>
                entry.EventType == "ACCESS_DENIED" &&
                entry.ActorUserId == siteUser.Id &&
                entry.TargetEntityType == "Project" &&
                entry.TargetEntityId == project.Id.ToString());
            var managerFinancialDownloadDenied = await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
                docSvc.GetDownloadAsync(siteUser.Id, project.Id, financialDoc.Id, meta));
            Assert.Equal("PROJECT_DOCUMENT_ACCESS_DENIED", managerFinancialDownloadDenied.Code);

            // P1-07 is read-only: preserve existing ProjectManager Financial upload behavior.
            var managerUploadedFinancialDoc = await UploadTextAsync(siteUser.Id, "pm-upload.txt", "Financial");
            var adminDocumentList = await docSvc.ListAsync(init.SystemAdminUserId, project.Id, meta);
            Assert.Contains(adminDocumentList, item => item.Id == managerUploadedFinancialDoc.Id);

            // Granting the explicit capability restores Financial list and download access.
            await projectSvc.AssignMemberAsync(
                init.SystemAdminUserId,
                project.Id,
                new AssignProjectMemberRequest(siteUser.Id, nameof(ProjectRole.ProjectManager), true, true, true, true),
                meta);
            var managerFinancialListAllowed = await docSvc.ListAsync(siteUser.Id, project.Id, meta);
            Assert.Contains(managerFinancialListAllowed, item => item.Id == financialDoc.Id);
            Assert.Contains(managerFinancialListAllowed, item => item.Id == managerUploadedFinancialDoc.Id);
            var managerFinancialDownloadAllowed = await docSvc.GetDownloadAsync(siteUser.Id, project.Id, financialDoc.Id, meta);
            await using var managerFinancialContent = managerFinancialDownloadAllowed.Content;
            Assert.Equal("budget.txt", managerFinancialDownloadAllowed.FileName);

            // A user with files.read but without membership cannot list or download these documents.
            var outsiderUser = await userSvc.CreateEmployeeAsync(
                init.SystemAdminUserId,
                new CreateEmployeeRequest("finance.outsider", "Finance Outsider", "finance.outsider@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.FinanceOfficerCode }),
                meta);
            await Assert.ThrowsAsync<ForbiddenDomainException>(() => docSvc.ListAsync(outsiderUser.Id, project.Id, meta));
            await Assert.ThrowsAsync<ForbiddenDomainException>(() =>
                docSvc.GetDownloadAsync(outsiderUser.Id, project.Id, financialDoc.Id, meta));

            // Membership in another project does not permit cross-project document lookup (IDOR).
            var otherProject = await projectSvc.CreateProjectAsync(
                init.SystemAdminUserId,
                new CreateProjectRequest("PRJ-DOC-OTHER", "مشروع ثان", "Second Project", "31", "Oran", "Bir El Djir", null, null, null, null, "Planning", 0m, 1, 2),
                meta);
            await projectSvc.AssignMemberAsync(
                init.SystemAdminUserId,
                otherProject.Id,
                new AssignProjectMemberRequest(siteUser.Id, nameof(ProjectRole.ProjectManager), true, true, true, true),
                meta);
            await Assert.ThrowsAsync<NotFoundDomainException>(() =>
                docSvc.GetDownloadAsync(siteUser.Id, otherProject.Id, financialDoc.Id, meta));
        }
        finally
        {
            if (Directory.Exists(tempStorage))
                Directory.Delete(tempStorage, recursive: true);
        }
    }

    [Fact]
    public async Task ProjectService_FiltersByQueryAndStatusWithinScope_AndCanonicalizesWilayas()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var setup = new SetupService(store, hasher, store, clock);
        var users = new UserManagementService(store, store, hasher, store, clock);
        var projectSvc = new ProjectService(store, store, store, clock);
        var meta = new RequestMetadata("127.0.0.1", "xUnit");

        var mismatchSetup = await Assert.ThrowsAsync<DomainException>(() =>
            setup.InitializeAsync(ValidInitRequest() with { WilayaCode = "16", WilayaName = "Oran" }, meta));
        Assert.Equal("ORG_WILAYA_NAME_MISMATCH", mismatchSetup.Code);

        var init = await setup.InitializeAsync(ValidInitRequest() with { WilayaCode = "69", WilayaName = "El Abiodh Sidi Cheikh" }, meta);
        Assert.Equal("الأبيض سيدي الشيخ / El Abiodh Sidi Cheikh", store.Org!.WilayaName);

        var assignedUser = await users.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest("scoped.lead", "Scoped Lead", "scoped@elbahdja.dz", null, "StrongPass123", "fr", new[] { Role.CommercialManagerCode }),
            meta);

        var alpha = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest("PRJ-69-ALPHA", "إقامة الشهباء", "Résidence Aflou", "59", "Aflou", "Aflou", null, null, null, null, "Commercialization", 0m, 2, 24),
            meta);
        Assert.Equal("أفلو / Aflou", alpha.WilayaName);

        var beta = await projectSvc.CreateProjectAsync(
            init.SystemAdminUserId,
            new CreateProjectRequest("PRJ-16-BETA", "إقامة البهجة", "Résidence Hydra", "16", "Alger", "Hydra", null, null, null, null, "Planning", 0m, 1, 12),
            meta);
        await projectSvc.AssignMemberAsync(init.SystemAdminUserId, alpha.Id, new AssignProjectMemberRequest(assignedUser.Id, nameof(ProjectRole.CommercialAgent), false, true, false, false), meta);

        var mismatchProject = await Assert.ThrowsAsync<DomainException>(() =>
            projectSvc.CreateProjectAsync(
                init.SystemAdminUserId,
                new CreateProjectRequest("PRJ-16-BAD", "مشروع", "Projet", "16", "Oran", "Hydra", null, null, null, null, "Planning", 0m, 1, 1),
                meta));
        Assert.Equal("PROJECT_WILAYA_NAME_MISMATCH", mismatchProject.Code);

        var adminFiltered = await projectSvc.ListAccessibleProjectsAsync(init.SystemAdminUserId, meta, "aflou", "Commercialization");
        var singleAdmin = Assert.Single(adminFiltered);
        Assert.Equal(alpha.Id, singleAdmin.Id);

        var scopedQueryForUnassigned = await projectSvc.ListAccessibleProjectsAsync(assignedUser.Id, meta, "Hydra", null);
        Assert.Empty(scopedQueryForUnassigned);

        var scopedQueryForAssigned = await projectSvc.ListAccessibleProjectsAsync(assignedUser.Id, meta, "59", null);
        Assert.Equal(alpha.Id, Assert.Single(scopedQueryForAssigned).Id);
        Assert.NotEqual(beta.Id, singleAdmin.Id);
    }

    [Fact]
    public async Task TemporaryPassword_ExpiresAtInclusiveDeadline_AndSessionIsBoundedByDeadline()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var hasher = new Pbkdf2PasswordHasher();
        var tokenGenerator = new CryptoSessionTokenGenerator();
        var setup = new SetupService(store, hasher, store, clock);
        var users = new UserManagementService(store, store, hasher, store, clock);
        var auth = new AuthService(
            store,
            store,
            hasher,
            tokenGenerator,
            store,
            clock,
            new SessionPolicy(
                TimeSpan.FromHours(48),
                TimeSpan.FromHours(24),
                TimeSpan.FromMinutes(1)));
        var metadata = new RequestMetadata("127.0.0.1", "xUnit");

        var init = await setup.InitializeAsync(ValidInitRequest(), metadata);
        const string temporaryPassword = "Temporary#Pass2026";
        var created = await users.CreateEmployeeAsync(
            init.SystemAdminUserId,
            new CreateEmployeeRequest(
                "deadline.user",
                "Deadline Employee",
                "deadline@elbahdja.dz",
                null,
                temporaryPassword,
                "ar",
                new[] { Role.CommercialManagerCode }),
            metadata);

        var storedUser = await store.GetByIdWithRolesAsync(created.Id);
        Assert.NotNull(storedUser);
        var deadline = storedUser!.PasswordChangeRequiredUntilUtc;
        Assert.NotNull(deadline);
        Assert.Equal(clock.UtcNow.AddHours(24), deadline.Value);

        // One tick before the inclusive deadline, login and session validation are allowed.
        clock.UtcNow = deadline.Value.AddTicks(-1);
        var beforeDeadline = await auth.LoginAsync(
            new LoginRequest("deadline.user", temporaryPassword),
            metadata);
        Assert.Equal(deadline.Value, beforeDeadline.ExpiresAtUtc);
        Assert.True(beforeDeadline.Session.User.MustChangePasswordAtNextLogin);
        Assert.NotNull(await auth.ValidateSessionAsync(beforeDeadline.OpaqueSessionToken));

        // The deadline is exclusive for authentication: equality is already expired.
        clock.UtcNow = deadline.Value;
        var atDeadline = await Assert.ThrowsAsync<UnauthorizedDomainException>(
            () => auth.LoginAsync(
                new LoginRequest("deadline.user", temporaryPassword),
                metadata));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", atDeadline.Code);

        var changeAtDeadline = await Assert.ThrowsAsync<UnauthorizedDomainException>(
            () => auth.ChangePasswordAsync(
                created.Id,
                new ChangePasswordRequest(temporaryPassword, "EmployeePersonal#2026"),
                metadata));
        Assert.Equal("TEMPORARY_PASSWORD_EXPIRED", changeAtDeadline.Code);
        Assert.NotEmpty(store.Sessions.Where(session => session.UserId == created.Id));
        Assert.All(
            store.Sessions.Where(session => session.UserId == created.Id),
            session => Assert.True(session.IsRevoked));

        clock.UtcNow = deadline.Value.AddTicks(1);
        var afterDeadline = await Assert.ThrowsAsync<UnauthorizedDomainException>(
            () => auth.LoginAsync(
                new LoginRequest("deadline.user", temporaryPassword),
                metadata));
        Assert.Equal("AUTH_INVALID_CREDENTIALS", afterDeadline.Code);
    }


}
