using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/structure")]
[Authorize]
public sealed class ProjectStructureController : ControllerBase
{
    private readonly ProjectStructureService _structureService;

    public ProjectStructureController(ProjectStructureService structureService)
    {
        _structureService = structureService;
    }

    [HttpGet]
    public async Task<ActionResult<ProjectStructureDto>> Get(Guid projectId, CancellationToken ct)
    {
        var structure = await _structureService.GetProjectStructureAsync(
            GetActorUserId(), projectId, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPost("buildings")]
    public async Task<ActionResult<ProjectStructureDto>> CreateBuilding(
        Guid projectId,
        [FromBody] CreateBuildingRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.CreateBuildingAsync(
            GetActorUserId(), projectId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPost("buildings/{buildingId:guid}/floors")]
    public async Task<ActionResult<ProjectStructureDto>> CreateFloor(
        Guid projectId,
        Guid buildingId,
        [FromBody] CreateBuildingFloorRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.CreateFloorAsync(
            GetActorUserId(), projectId, buildingId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPost("buildings/{buildingId:guid}/floors/{floorId:guid}/units")]
    public async Task<ActionResult<ProjectStructureDto>> CreatePropertyUnit(
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        [FromBody] CreatePropertyUnitRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.CreatePropertyUnitAsync(
            GetActorUserId(), projectId, buildingId, floorId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPut("buildings/{buildingId:guid}")]
    public async Task<ActionResult<ProjectStructureDto>> UpdateBuilding(
        Guid projectId,
        Guid buildingId,
        [FromBody] UpdateBuildingRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.UpdateBuildingAsync(
            GetActorUserId(), projectId, buildingId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPut("buildings/{buildingId:guid}/floors/{floorId:guid}")]
    public async Task<ActionResult<ProjectStructureDto>> UpdateFloor(
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        [FromBody] UpdateBuildingFloorRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.UpdateFloorAsync(
            GetActorUserId(), projectId, buildingId, floorId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPut("buildings/{buildingId:guid}/floors/{floorId:guid}/units/{unitId:guid}")]
    public async Task<ActionResult<ProjectStructureDto>> UpdatePropertyUnit(
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        Guid unitId,
        [FromBody] UpdatePropertyUnitRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.UpdatePropertyUnitAsync(
            GetActorUserId(), projectId, buildingId, floorId, unitId, request, GetMetadata(), ct);
        return Ok(structure);
    }

    [HttpPut("buildings/{buildingId:guid}/floors/{floorId:guid}/units/{unitId:guid}/status")]
    public async Task<ActionResult<ProjectStructureDto>> ChangePropertyUnitStatus(
        Guid projectId,
        Guid buildingId,
        Guid floorId,
        Guid unitId,
        [FromBody] ChangePropertyUnitStatusRequest request,
        CancellationToken ct)
    {
        var structure = await _structureService.ChangePropertyUnitStatusAsync(
            GetActorUserId(), projectId, buildingId, floorId, unitId, request, GetMetadata(), ct);
        return Ok(structure);
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
