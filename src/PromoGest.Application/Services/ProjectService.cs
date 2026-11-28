using System.Text.Json;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Domain.Policies;
using PromoGest.Domain.Reference;

namespace PromoGest.Application.Services;

public sealed class ProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IProjectSalesReservationRepository? _reservationRepository;

    /// <param name="reservationRepository">
    /// Optional only so existing focused unit tests can keep constructing this service with their
    /// in-memory fakes; dependency injection always supplies the real repository, which writes the
    /// ADR-0018 suspension review marker in production.
    /// </param>
    public ProjectService(
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        IClock clock,
        IProjectSalesReservationRepository? reservationRepository = null)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
        _reservationRepository = reservationRepository;
    }

    public Task<IReadOnlyList<ProjectDto>> ListAccessibleProjectsAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        CancellationToken ct = default)
        => ListAccessibleProjectsAsync(actorUserId, metadata, null, null, ct);

    public async Task<IReadOnlyList<ProjectDto>> ListAccessibleProjectsAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        string? query,
        string? status,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "ListProjects", metadata, ct);

        ProjectStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ProjectStatus>(status.Trim(), ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
                throw new DomainException("PROJECT_STATUS_INVALID", "A valid project status is required.");
            parsedStatus = parsed;
        }

        var normalizedQuery = string.IsNullOrWhiteSpace(query) ? null : query.Trim();
        IReadOnlyList<Project> projects = actor.IsSystemAdministrator
            ? await _projectRepository.ListAllWithMembersAsync(normalizedQuery, parsedStatus, ct)
            : await _projectRepository.ListForUserWithMembersAsync(actorUserId, normalizedQuery, parsedStatus, ct);

        await RecordFinancialViewsAsync(actor, projects, metadata, ct);

        var structureCounts = await _projectRepository.GetStructureCountsByProjectIdsAsync(
            projects.Select(project => project.Id).ToArray(), ct);

        return projects
            .Select(project => MapProject(
                project,
                structureCounts.GetValueOrDefault(project.Id),
                HasFinancialPermission(project, actorUserId)))
            .ToList();
    }

    public async Task<ProjectDirectoryPageDto> ListAccessibleProjectDirectoryAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        string? query,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "ListProjectDirectory", metadata, ct);

        if (page < 1 || pageSize is < 1 or > 100)
            throw new DomainException(
                "PROJECT_PAGINATION_INVALID",
                "Project directory page must be positive and page size must be between 1 and 100.");

        var offset = (long)(page - 1) * pageSize;
        if (offset > int.MaxValue)
            throw new DomainException(
                "PROJECT_PAGINATION_INVALID",
                "The requested project directory page is outside the supported range.");

        ProjectStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ProjectStatus>(status.Trim(), ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
                throw new DomainException("PROJECT_STATUS_INVALID", "A valid project status is required.");
            parsedStatus = parsed;
        }

        var normalizedQuery = string.IsNullOrWhiteSpace(query) ? null : query.Trim();
        var result = actor.IsSystemAdministrator
            ? await _projectRepository.ListAllWithMembersPageAsync(
                normalizedQuery, parsedStatus, (int)offset, pageSize, ct)
            : await _projectRepository.ListForUserWithMembersPageAsync(
                actorUserId, normalizedQuery, parsedStatus, (int)offset, pageSize, ct);

        var totalPages = Math.Max(1, (int)Math.Ceiling(result.TotalCount / (double)pageSize));
        if (page > totalPages)
        {
            page = totalPages;
            offset = (long)(page - 1) * pageSize;
            result = actor.IsSystemAdministrator
                ? await _projectRepository.ListAllWithMembersPageAsync(
                    normalizedQuery, parsedStatus, (int)offset, pageSize, ct)
                : await _projectRepository.ListForUserWithMembersPageAsync(
                    actorUserId, normalizedQuery, parsedStatus, (int)offset, pageSize, ct);
        }

        await RecordFinancialViewsAsync(actor, result.Items, metadata, ct);

        var structureCounts = await _projectRepository.GetStructureCountsByProjectIdsAsync(
            result.Items.Select(project => project.Id).ToArray(), ct);

        var items = result.Items
            .Select(project => MapProject(
                project,
                structureCounts.GetValueOrDefault(project.Id),
                HasFinancialPermission(project, actorUserId)))
            .ToList();

        return new ProjectDirectoryPageDto(items, page, pageSize, result.TotalCount, totalPages);
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

        await RecordFinancialViewsAsync(actor, new[] { project }, metadata, ct);
        return await MapProjectAsync(project, actorUserId, ct);
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

        if (actor.IsSystemAdministrator && request.EstimatedBudgetDzd != 0m)
        {
            await RecordAccessDeniedAsync(
                actor,
                null,
                $"Unauthorized financial budget supplied during project creation by '{actor.Username}'.",
                metadata,
                ct);
            throw new ForbiddenDomainException(
                "PROJECT_FINANCIAL_ACCESS_DENIED",
                "An explicit project financial capability is required to set an estimated budget.");
        }

        var normalizedCode = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        if (await _projectRepository.ExistsCodeAsync(normalizedCode, ct))
            throw new ConflictDomainException("PROJECT_CODE_EXISTS", "A project with this code already exists.");

        if (!Enum.TryParse<ProjectStatus>(request.Status, ignoreCase: true, out var parsedStatus) ||
            !Enum.IsDefined(parsedStatus))
        {
            throw new DomainException("PROJECT_STATUS_INVALID", "A valid project status is required.");
        }

        var canonicalWilaya = AlgerianAdministrativeReference.ResolveCanonicalWilaya(
            request.WilayaCode,
            request.WilayaName,
            "PROJECT_WILAYA_INVALID",
            "PROJECT_WILAYA_NAME_MISMATCH");

        var nowUtc = _clock.UtcNow;
        var project = Project.Create(
            request.Code ?? string.Empty,
            request.NameAr,
            request.NameFr,
            canonicalWilaya.Code,
            canonicalWilaya.CanonicalDisplayName,
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

        ProjectMember? creatorMembership = null;
        if (!actor.IsSystemAdministrator)
        {
            creatorMembership = project.AssignMember(
                actor.Id,
                ProjectRole.ProjectManager,
                canViewFinancials: true,
                canManageSales: true,
                canManageConstruction: true,
                canManageDocuments: true,
                assignedByUserId: actor.Id,
                nowUtc);
        }

        await _projectRepository.AddProjectAsync(project, ct);
        if (creatorMembership is not null)
            await _projectRepository.AddMemberAsync(creatorMembership, ct);

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
        return await MapProjectAsync(reloaded, actorUserId, ct);
    }

    public async Task<ProjectDto> UpdateProjectAsync(
        Guid actorUserId,
        Guid projectId,
        UpdateProjectRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await RequireActiveActorAsync(actorUserId, "UpdateProject", metadata, ct);

        // Resolve explicit membership for every actor. SYSTEM_ADMIN may manage general
        // project master data, but does not bypass the separate financial capability.
        var membership = await _projectRepository.GetMemberAsync(projectId, actorUserId, ct);
        var permissions = await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);
        if (!actor.IsSystemAdministrator)
        {
            var canManageProject = permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase) &&
                membership?.RoleInProject == ProjectRole.ProjectManager;

            if (!canManageProject)
            {
                await RecordAccessDeniedAsync(
                    actor,
                    projectId,
                    $"Unauthorized project update attempt by '{actor.Username}' on project ID '{projectId}'.",
                    metadata,
                    ct);
                throw new ForbiddenDomainException(
                    "FORBIDDEN_PROJECT_UPDATE",
                    "You must be an explicitly assigned Project Manager to update this project's master data.");
            }
        }

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var canUpdateFinancialBudget =
            permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase) &&
            membership?.RoleInProject == ProjectRole.ProjectManager &&
            membership?.CanViewFinancials == true;

        if (request.EstimatedBudgetDzd.HasValue && !canUpdateFinancialBudget)
        {
            await RecordAccessDeniedAsync(
                actor,
                projectId,
                $"Unauthorized estimated-budget update attempt by '{actor.Username}' on project ID '{projectId}'.",
                metadata,
                ct);
            throw new ForbiddenDomainException(
                "PROJECT_FINANCIAL_ACCESS_DENIED",
                "Updating the estimated budget requires projects.manage, ProjectManager membership, and CanViewFinancials.");
        }

        if (request.ExpectedConcurrencyStamp == Guid.Empty ||
            request.ExpectedConcurrencyStamp != project.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "PROJECT_CONCURRENCY_CONFLICT",
                "This project changed after it was loaded. Reload the latest project data and review your changes before saving.");
        }

        if (!Enum.TryParse<ProjectStatus>(request.Status, ignoreCase: true, out var parsedStatus) ||
            !Enum.IsDefined(parsedStatus))
        {
            throw new DomainException("PROJECT_STATUS_INVALID", "A valid project status is required.");
        }

        var canonicalWilaya = AlgerianAdministrativeReference.ResolveCanonicalWilaya(
            request.WilayaCode,
            request.WilayaName,
            "PROJECT_WILAYA_INVALID",
            "PROJECT_WILAYA_NAME_MISMATCH");

        var previousStatus = project.Status;
        var nowUtc = _clock.UtcNow;
        project.UpdateDetails(
            request.NameAr,
            request.NameFr,
            canonicalWilaya.Code,
            canonicalWilaya.CanonicalDisplayName,
            request.Municipality,
            request.Address,
            request.LandTitleReference,
            request.BuildingPermitNumber,
            request.BuildingPermitDate,
            parsedStatus,
            request.EstimatedBudgetDzd ?? project.EstimatedBudgetDzd,
            request.PlannedBlocksCount,
            request.PlannedUnitsCount,
            nowUtc);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "PROJECT_UPDATED",
                AuditSeverity.Info,
                "Project",
                project.Id.ToString(),
                $"Updated master data for real estate project '{project.Code}'.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        // ADR-0018: suspension blocks new reservations and must never cancel, expire, or release an
        // existing hold. Every real transition into Suspended therefore records one durable,
        // append-only review marker naming the holds an operator has to review. Nothing else is
        // mutated here: units, holds, and customers keep their state.
        if (ProjectCommercializationPolicy.RequiresSuspensionReview(previousStatus, project.Status) &&
            _reservationRepository is not null)
        {
            var activeReservations = await _reservationRepository.ListTrackedActiveAsync(project.Id, ct);
            foreach (var activeReservation in activeReservations)
                activeReservation.RequestSuspensionReview(nowUtc);

            var activeReservationIds = activeReservations
                .Select(reservation => reservation.Id)
                .OrderBy(id => id)
                .ToArray();

            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    actor.Id,
                    actor.Username,
                    ProjectCommercializationPolicy.SuspensionReviewEventType,
                    AuditSeverity.Security,
                    "Project",
                    project.Id.ToString(),
                    $"Project '{project.Code}' entered suspension with {activeReservationIds.Length} active reservation(s) "
                        + "queued for review; no hold was cancelled, expired, or released.",
                    JsonSerializer.Serialize(new
                    {
                        previousStatus = previousStatus.ToString(),
                        projectStatus = project.Status.ToString(),
                        activeReservationCount = activeReservationIds.Length,
                        activeReservationIds,
                        reviewRequiredAtUtc = nowUtc
                    }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
        }

        // #280: all scoped repositories/audit writer share the same DbContext. Save the root,
        // review markers and both audit events ONCE, in the same EF transaction. A concurrent
        // hold creation touches this root too: its CAS conflict rolls back the entire losing
        // operation. Never persist Suspended before its review metadata is ready.
        await _projectRepository.SaveChangesAsync(ct);

        var reloaded = await _projectRepository.GetByIdWithMembersAsync(project.Id, ct) ?? project;
        return await MapProjectAsync(reloaded, actorUserId, ct);
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

        if (!Enum.TryParse<ProjectRole>(request.RoleInProject, ignoreCase: true, out var roleInProject) ||
            !Enum.IsDefined(roleInProject))
        {
            throw new DomainException("PROJECT_ROLE_INVALID", "Invalid project role.");
        }

        var existingMembership = project.Members.FirstOrDefault(member => member.UserId == targetUser.Id);
        if (existingMembership?.RoleInProject == ProjectRole.ProjectManager &&
            roleInProject != ProjectRole.ProjectManager &&
            project.Members.Count(member => member.RoleInProject == ProjectRole.ProjectManager) <= 1)
        {
            throw new ConflictDomainException(
                "PROJECT_LAST_MANAGER_REQUIRED",
                "Assign another Project Manager before changing the last Project Manager's role.");
        }

        var nowUtc = _clock.UtcNow;
        var isNewMembership = existingMembership is null;
        var previous = existingMembership is null ? null : new
        {
            Role = existingMembership.RoleInProject.ToString(),
            existingMembership.CanViewFinancials,
            existingMembership.CanManageSales,
            existingMembership.CanManageConstruction,
            existingMembership.CanManageDocuments
        };
        var membership = project.AssignMember(
            targetUser.Id,
            roleInProject,
            request.CanViewFinancials,
            request.CanManageSales,
            request.CanManageConstruction,
            request.CanManageDocuments,
            actor.Id,
            nowUtc);

        if (isNewMembership)
        {
            await _projectRepository.AddMemberAsync(membership, ct);
        }

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
                JsonSerializer.Serialize(new
                {
                    TargetUserId = targetUser.Id,
                    Previous = previous,
                    Current = new
                    {
                        Role = membership.RoleInProject.ToString(),
                        membership.CanViewFinancials,
                        membership.CanManageSales,
                        membership.CanManageConstruction,
                        membership.CanManageDocuments
                    }
                }),
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _projectRepository.SaveChangesAsync(ct);

        var reloaded = await _projectRepository.GetByIdWithMembersAsync(project.Id, ct) ?? project;
        return await MapProjectAsync(reloaded, actor.Id, ct);
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
        var targetMembership = project.Members.FirstOrDefault(member => member.UserId == targetUserId);
        if (targetMembership?.RoleInProject == ProjectRole.ProjectManager &&
            project.Members.Count(member => member.RoleInProject == ProjectRole.ProjectManager) <= 1)
        {
            throw new ConflictDomainException(
                "PROJECT_LAST_MANAGER_REQUIRED",
                "Assign another Project Manager before removing the last Project Manager.");
        }

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
        return await MapProjectAsync(reloaded, actor.Id, ct);
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
        if (!permissions.Contains("projects.access.manage", StringComparer.OrdinalIgnoreCase) ||
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

    private static bool HasFinancialPermission(Project project, Guid actorUserId)
        => project.Members.Any(member =>
            member.UserId == actorUserId && member.CanViewFinancials);

    private async Task RecordFinancialViewsAsync(
        User actor,
        IEnumerable<Project> projects,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var visibleFinancialProjects = projects
            .Where(project => HasFinancialPermission(project, actor.Id))
            .ToArray();

        foreach (var project in visibleFinancialProjects)
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "PROJECT_FINANCIALS_VIEWED",
                    AuditSeverity.Info,
                    "Project",
                    project.Id.ToString(),
                    $"Viewed estimated budget for project '{project.Code}'.",
                    null,
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
        }

        if (visibleFinancialProjects.Length > 0)
            await _projectRepository.SaveChangesAsync(ct);
    }

    private async Task<ProjectDto> MapProjectAsync(
        Project project,
        Guid actorUserId,
        CancellationToken ct)
    {
        var structureCounts = await _projectRepository.GetStructureCountsByProjectIdsAsync(
            new[] { project.Id }, ct);
        return MapProject(
            project,
            structureCounts.GetValueOrDefault(project.Id),
            HasFinancialPermission(project, actorUserId));
    }

    private static ProjectDto MapProject(
        Project project,
        ProjectStructureCounts structureCounts,
        bool canViewFinancials)
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
            canViewFinancials ? project.EstimatedBudgetDzd : null,
            project.PlannedBlocksCount,
            project.PlannedUnitsCount,
            structureCounts.BuildingsCount,
            structureCounts.UnitsCount,
            project.CreatedAtUtc,
            project.ConcurrencyStamp,
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
