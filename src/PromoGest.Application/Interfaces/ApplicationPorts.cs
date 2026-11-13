using PromoGest.Domain.Entities;

namespace PromoGest.Application.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(string plainTextPassword);
    bool VerifyPassword(string plainTextPassword, string passwordHash);
}

public interface ISessionTokenGenerator
{
    string GenerateOpaqueToken();
    string HashToken(string opaqueToken);
}

public interface IAuditWriter
{
    Task WriteAsync(AuditLog entry, CancellationToken ct = default);
}

public interface IInstallationRepository
{
    Task<OrganizationSettings?> GetOrganizationSettingsAsync(CancellationToken ct = default);
    Task<bool> IsInitializedAsync(CancellationToken ct = default);
    Task<bool> HasSystemAdministratorAsync(CancellationToken ct = default);
    Task<Role?> GetRoleByCodeAsync(string code, CancellationToken ct = default);
    Task<IReadOnlyList<Role>> GetRolesAsync(CancellationToken ct = default);
    Task AddOrganizationSettingsAsync(OrganizationSettings settings, CancellationToken ct = default);
    Task AddUserAsync(User user, CancellationToken ct = default);
    Task AddUserRoleAsync(UserRole userRole, CancellationToken ct = default);
    Task ExecuteInSerializableTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IUserRepository
{
    Task<User?> GetByIdWithRolesAsync(Guid userId, CancellationToken ct = default);
    Task<User?> GetSystemAdministratorAsync(CancellationToken ct = default);
    Task<User?> GetByUsernameOrEmailWithRolesAsync(string usernameOrEmail, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListUsersWithRolesAsync(CancellationToken ct = default);
    Task<bool> ExistsUsernameOrEmailAsync(string username, string email, Guid? excludeUserId = null, CancellationToken ct = default);
    Task<IReadOnlyList<Role>> GetRolesByCodesAsync(IEnumerable<string> roleCodes, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetEffectivePermissionsAsync(Guid userId, CancellationToken ct = default);
    Task AddUserAsync(User user, CancellationToken ct = default);
    Task ReplaceUserRolesAsync(Guid userId, IEnumerable<UserRole> newRoles, CancellationToken ct = default);
    Task AddSessionAsync(UserSession session, CancellationToken ct = default);
    Task<UserSession?> GetSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeAllUserSessionsAsync(Guid userId, DateTimeOffset revokedAtUtc, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IProjectRepository
{
    Task<Project?> GetByIdWithMembersAsync(Guid projectId, CancellationToken ct = default);
    Task<bool> ExistsCodeAsync(string normalizedCode, CancellationToken ct = default);
    Task<IReadOnlyList<Project>> ListAllWithMembersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Project>> ListForUserWithMembersAsync(Guid userId, CancellationToken ct = default);
    Task<ProjectMember?> GetMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default);
    Task AddProjectAsync(Project project, CancellationToken ct = default);
    Task AddMemberAsync(ProjectMember member, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IAuditQueryRepository
{
    Task<IReadOnlyList<AuditLog>> ListRecentAsync(int limit, CancellationToken ct = default);
}
