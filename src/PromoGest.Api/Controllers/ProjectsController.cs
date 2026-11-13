using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public sealed class ProjectsController : ControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectsController(ProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDto>>> ListAccessible(CancellationToken ct)
    {
        var projects = await _projectService.ListAccessibleProjectsAsync(GetActorUserId(), GetMetadata(), ct);
        return Ok(projects);
    }

    [HttpGet("{projectId:guid}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid projectId, CancellationToken ct)
    {
        var project = await _projectService.GetProjectByIdAsync(GetActorUserId(), projectId, GetMetadata(), ct);
        return Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectRequest request, CancellationToken ct)
    {
        var created = await _projectService.CreateProjectAsync(GetActorUserId(), request, GetMetadata(), ct);
        return Created($"/api/projects/{created.Id}", created);
    }

    [HttpPut("{projectId:guid}/members")]
    public async Task<ActionResult<ProjectDto>> AssignMember(Guid projectId, [FromBody] AssignProjectMemberRequest request, CancellationToken ct)
    {
        var updated = await _projectService.AssignMemberAsync(GetActorUserId(), projectId, request, GetMetadata(), ct);
        return Ok(updated);
    }

    [HttpDelete("{projectId:guid}/members/{userId:guid}")]
    public async Task<ActionResult<ProjectDto>> RemoveMember(Guid projectId, Guid userId, CancellationToken ct)
    {
        var updated = await _projectService.RemoveMemberAsync(GetActorUserId(), projectId, userId, GetMetadata(), ct);
        return Ok(updated);
    }

    private Guid GetActorUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var userId))
            throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authenticated user identity is missing.");
        return userId;
    }

    private RequestMetadata GetMetadata()
        => new(HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());
}
