using System.Data;
using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

public sealed class EfAuditWriter : IAuditWriter, IAuditQueryRepository
{
    private readonly AppDbContext _dbContext;

    public EfAuditWriter(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task WriteAsync(AuditLog entry, CancellationToken ct = default)
    {
        await _dbContext.AuditLogs.AddAsync(entry, ct);
    }

    public async Task<IReadOnlyList<AuditLog>> ListRecentAsync(int limit, CancellationToken ct = default)
    {
        return await _dbContext.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(limit)
            .ToListAsync(ct);
    }
}

public sealed class EfInstallationRepository : IInstallationRepository
{
    private readonly AppDbContext _dbContext;

    public EfInstallationRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<OrganizationSettings?> GetOrganizationSettingsAsync(CancellationToken ct = default)
        => _dbContext.OrganizationSettings.FirstOrDefaultAsync(ct);

    public Task<bool> IsInitializedAsync(CancellationToken ct = default)
        => _dbContext.OrganizationSettings.AnyAsync(o => o.IsInitialized, ct);

    public Task<bool> HasSystemAdministratorAsync(CancellationToken ct = default)
        => _dbContext.Users.AnyAsync(u => u.IsSystemAdministrator, ct);

    public Task<Role?> GetRoleByCodeAsync(string code, CancellationToken ct = default)
        => _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == code.ToUpperInvariant(), ct);

    public async Task<IReadOnlyList<Role>> GetRolesAsync(CancellationToken ct = default)
        => await _dbContext.Roles.AsNoTracking().OrderBy(r => r.Code).ToListAsync(ct);

    public async Task AddOrganizationSettingsAsync(OrganizationSettings settings, CancellationToken ct = default)
        => await _dbContext.OrganizationSettings.AddAsync(settings, ct);

    public async Task AddUserAsync(User user, CancellationToken ct = default)
        => await _dbContext.Users.AddAsync(user, ct);

    public async Task AddUserRoleAsync(UserRole userRole, CancellationToken ct = default)
        => await _dbContext.UserRoles.AddAsync(userRole, ct);

    public async Task ExecuteInSerializableTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            await action(ct);
            await transaction.CommitAsync(ct);
        });
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}

public sealed class EfUserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;

    public EfUserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<User?> GetByIdWithRolesAsync(Guid userId, CancellationToken ct = default)
        => _dbContext.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<User?> GetSystemAdministratorAsync(CancellationToken ct = default)
        => _dbContext.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.IsSystemAdministrator, ct);

    public Task<User?> GetByUsernameOrEmailWithRolesAsync(string usernameOrEmail, CancellationToken ct = default)
    {
        var normalized = usernameOrEmail.Trim().ToUpperInvariant();
        return _dbContext.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.NormalizedUsername == normalized || u.NormalizedEmail == normalized, ct);
    }

    public async Task<IReadOnlyList<User>> ListUsersWithRolesAsync(CancellationToken ct = default)
        => await _dbContext.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .OrderByDescending(u => u.IsSystemAdministrator)
            .ThenBy(u => u.FullName)
            .ToListAsync(ct);

    public Task<bool> ExistsUsernameOrEmailAsync(string username, string email, Guid? excludeUserId = null, CancellationToken ct = default)
    {
        var normUser = username.Trim().ToUpperInvariant();
        var normEmail = email.Trim().ToUpperInvariant();
        return _dbContext.Users.AnyAsync(u =>
            (!excludeUserId.HasValue || u.Id != excludeUserId.Value) &&
            (u.NormalizedUsername == normUser || u.NormalizedEmail == normEmail), ct);
    }

    public async Task<IReadOnlyList<Role>> GetRolesByCodesAsync(IEnumerable<string> roleCodes, CancellationToken ct = default)
    {
        var normalized = roleCodes.Select(c => c.Trim().ToUpperInvariant()).Distinct().ToList();
        return await _dbContext.Roles.Where(r => normalized.Contains(r.Code)).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetEffectivePermissionsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _dbContext.UserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);
    }

    public async Task AddUserAsync(User user, CancellationToken ct = default)
        => await _dbContext.Users.AddAsync(user, ct);

    public async Task ReplaceUserRolesAsync(Guid userId, IEnumerable<UserRole> newRoles, CancellationToken ct = default)
    {
        var existing = await _dbContext.UserRoles.Where(ur => ur.UserId == userId).ToListAsync(ct);
        _dbContext.UserRoles.RemoveRange(existing);
        await _dbContext.UserRoles.AddRangeAsync(newRoles, ct);
    }

    public async Task AddSessionAsync(UserSession session, CancellationToken ct = default)
        => await _dbContext.UserSessions.AddAsync(session, ct);

    public Task<UserSession?> GetSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => _dbContext.UserSessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct);

    public async Task RevokeAllUserSessionsAsync(Guid userId, DateTimeOffset revokedAtUtc, CancellationToken ct = default)
    {
        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync(ct);

        foreach (var session in activeSessions)
        {
            session.Revoke(revokedAtUtc);
        }
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}

public sealed class EfProjectRepository : IProjectRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Project?> GetByIdWithMembersAsync(Guid projectId, CancellationToken ct = default)
        => _dbContext.Projects
            .Include(p => p.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

    public Task<bool> ExistsCodeAsync(string normalizedCode, CancellationToken ct = default)
        => _dbContext.Projects.AnyAsync(p => p.NormalizedCode == normalizedCode, ct);

    public async Task<IReadOnlyList<Project>> ListAllWithMembersAsync(CancellationToken ct = default)
        => await _dbContext.Projects
            .Include(p => p.Members)
            .ThenInclude(m => m.User)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Project>> ListForUserWithMembersAsync(Guid userId, CancellationToken ct = default)
        => await _dbContext.Projects
            .Include(p => p.Members)
            .ThenInclude(m => m.User)
            .Where(p => p.Members.Any(m => m.UserId == userId))
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(ct);

    public Task<ProjectMember?> GetMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default)
        => _dbContext.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, ct);

    public async Task AddProjectAsync(Project project, CancellationToken ct = default)
        => await _dbContext.Projects.AddAsync(project, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}
