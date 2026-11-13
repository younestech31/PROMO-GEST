using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class ProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectService(
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProjectDto>> ListAccessibleProjectsAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "ListProjects", metadata, ct);

        IReadOnlyList<Project> projects = actor.IsSystemAdministrator
            ? await _projectRepository.ListAllWithMembersAsync(ct)
            : await _projectRepository.ListForUserWithMembersAsync(actorUserId, ct);

        return projects.Select(MapProject).ToList();
    }

    public async Task<ProjectDto> GetProjectByIdAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "GetProjectById", metadata, ct);

        if (!actor.IsSystemAdministrator)
        {
            var membership = await _projectRepository.GetMemberAsync(projectId, actorUserId, ct);
            if (membership is null)
            {
                await RecordAccessDeniedAsync(
                    actor,
                    projectId,
                    $"Unauthorized project access attempt by '{actor.Username}' on project ID '{projectId}'.",
                    metadata,
                    ct);

                throw new ForbiddenDomainException(
                    "PROJECT_ACCESS_DENIED",
                    "You do not have project-level authorization to access this project.");
            }
        }

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct);
        if (project is null)
        {
            throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");
        }

        return MapProject(project);
    }

    public async Task<ProjectDto> CreateProjectAsync(
        Guid actorUserId,
        CreateProjectRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "CreateProject", metadata, ct);

        var permissions = await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);
        if (!actor.IsSystemAdministrator && !permissions.Contains("projects.create", StringComparer.OrdinalIgnoreCase))
        {
            await RecordAccessDeniedAsync(
                actor,
                null,
                $"Unauthorized project creation attempt by '{actor.Username}'.",
                metadata,
                ct);
            throw new ForbiddenDomainException("FORBIDDEN_PROJECT_CREATE", "You do not have permission to create real estate projects.");
        }

        var normalizedCode = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        if (await _projectRepository.ExistsCodeAsync(normalizedCode, ct))
            throw new ConflictDomainException("PROJECT_CODE_EXISTS", "A project with this code already exists.");

        if (!Enum.TryParse<ProjectStatus>(request.Status, ignoreCase: true, out var parsedStatus))
            parsedStatus = ProjectStatus.Planning;

        var nowUtc = _clock.UtcNow;
        var project = Project.Create(
            request.Code ?? string.Empty,
            request.NameAr,
            request.NameFr,
            request.WilayaCode,
            request.WilayaName,
            request.Municipality,
            request.Address,
            request.LandTitleReference,
            request.BuildingPermitNumber,
            request.BuildingPermitDate,
            parsedStatus,
            request.EstimatedBudgetDzd,
            request.PlannedBlocksCount,
            request.PlannedUnitsCount,
            actor.Id,
            nowUtc);

        await _projectRepository.AddProjectAsync(project, ct);
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "PROJECT_CREATED",
                AuditSeverity.Info,
                "Project",
                project.Id.ToString(),
                $"Created real estate project '{project.Code}' ({project.NameFr}).",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _projectRepository.SaveChangesAsync(ct);

        var reloaded = await _projectRepository.GetByIdWithMembersAsync(project.Id, ct) ?? project;
        return MapProject(reloaded);
    }

    public async Task<ProjectDto> AssignMemberAsync(
        Guid actorUserId,
        Guid projectId,
        AssignProjectMemberRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageProjectAccessAsync(actorUserId, projectId, metadata, ct);
        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var targetUser = await _userRepository.GetByIdWithRolesAsync(request.UserId, ct)
            ?? throw new NotFoundDomainException("USER_NOT_FOUND", "Target employee account not found.");

        if (!targetUser.IsActive)
            throw new DomainException("USER_INACTIVE", "Cannot assign an inactive employee to a project.");

        if (!Enum.TryParse<ProjectRole>(request.RoleInProject, ignoreCase: true, out var roleInProject))
            throw new DomainException("PROJECT_ROLE_INVALID", "Invalid project role.");

        var nowUtc = _clock.UtcNow;
        project.AssignMember(
            targetUser.Id,
            roleInProject,
            request.CanViewFinancials,
            request.CanManageSales,
            request.CanManageConstruction,
            request.CanManageDocuments,
            actor.Id,
            nowUtc);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "PROJECT_MEMBER_ASSIGNED",
                AuditSeverity.Security,
                "Project",
                project.Id.ToString(),
                $"Assigned '{targetUser.Username}' to project '{project.Code}' as {roleInProject}.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _projectRepository.SaveChangesAsync(ct);

        var reloaded = await _projectRepository.GetByIdWithMembersAsync(project.Id, ct) ?? project;
        return MapProject(reloaded);
    }

    public async Task<ProjectDto> RemoveMemberAsync(
        Guid actorUserId,
        Guid projectId,
        Guid targetUserId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageProjectAccessAsync(actorUserId, projectId, metadata, ct);
        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var targetUser = await _userRepository.GetByIdWithRolesAsync(targetUserId, ct);

        var nowUtc = _clock.UtcNow;
        var removed = project.RemoveMember(targetUserId, nowUtc);
        if (!removed)
            throw new NotFoundDomainException("PROJECT_MEMBER_NOT_FOUND", "Employee is not a member of this project.");

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "PROJECT_MEMBER_REVOKED",
                AuditSeverity.Security,
                "Project",
                project.Id.ToString(),
                $"Revoked project access for '{targetUser?.Username ?? targetUserId.ToString()}' on project '{project.Code}'.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _projectRepository.SaveChangesAsync(ct);

        var reloaded = await _projectRepository.GetByIdWithMembersAsync(project.Id, ct) ?? project;
        return MapProject(reloaded);
    }

    private async Task<User> RequireActiveActorAsync(
        Guid actorUserId,
        string operation,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
        {
            await RecordAccessDeniedAsync(
                actor,
                null,
                $"Inactive account '{actor.Username}' attempted project operation '{operation}'.",
                metadata,
                ct);
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");
        }

        return actor;
    }

    private async Task<User> EnsureCanManageProjectAccessAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "ManageProjectAccess", metadata, ct);

        if (actor.IsSystemAdministrator)
            return actor;

        var permissions = await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);
        var membership = await _projectRepository.GetMemberAsync(projectId, actorUserId, ct);
        if (!permissions.Contains("projects.access.manage", StringComparer.OrdinalIgnoreCase) &&
            membership?.RoleInProject != ProjectRole.ProjectManager)
        {
            await RecordAccessDeniedAsync(
                actor,
                projectId,
                $"Unauthorized attempt by '{actor.Username}' to modify project memberships on project ID '{projectId}'.",
                metadata,
                ct);
            throw new ForbiddenDomainException("FORBIDDEN_PROJECT_ACCESS_ADMIN", "You do not have permission to manage project memberships.");
        }

        return actor;
    }

    private async Task RecordAccessDeniedAsync(
        User actor,
        Guid? projectId,
        string summary,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                "ACCESS_DENIED",
                AuditSeverity.Security,
                "Project",
                projectId?.ToString(),
                summary,
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _projectRepository.SaveChangesAsync(ct);
    }

    private static ProjectDto MapProject(Project project)
        => new(
            project.Id,
            project.Code,
            project.NameAr,
            project.NameFr,
            project.WilayaCode,
            project.WilayaName,
            project.Municipality,
            project.Address,
            project.LandTitleReference,
            project.BuildingPermitNumber,
            project.BuildingPermitDate,
            project.Status.ToString(),
            project.EstimatedBudgetDzd,
            project.PlannedBlocksCount,
            project.PlannedUnitsCount,
            project.CreatedAtUtc,
            project.Members.Select(m => new ProjectMemberDto(
                m.Id,
                m.UserId,
                m.User?.Username ?? string.Empty,
                m.User?.FullName ?? string.Empty,
                m.RoleInProject.ToString(),
                m.CanViewFinancials,
                m.CanManageSales,
                m.CanManageConstruction,
                m.CanManageDocuments,
                m.AssignedAtUtc)).ToList());
}
