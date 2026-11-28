using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Reference;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reference/staged")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class StagedAdministrativeReferenceController(StagedAdministrativeReferenceService service) : ControllerBase
{
    [HttpGet("{snapshotId}")]
    public async Task<ActionResult<StagedAdministrativeSnapshotDto>> GetSnapshot(string snapshotId, CancellationToken ct)
        => Ok(await service.GetSnapshotAsync(ActorId(), snapshotId, Metadata(), ct));

    [HttpGet("{snapshotId}/communes")]
    public async Task<ActionResult<StagedAdministrativeCommunePageDto>> GetCommunes(
        string snapshotId, [FromQuery] string? wilayaCode = null, [FromQuery] string? q = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => Ok(await service.GetCommunesAsync(ActorId(), snapshotId, wilayaCode, q, page, pageSize, Metadata(), ct));

    private Guid ActorId() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
        ? id : throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

    private RequestMetadata Metadata() => new(HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());
}
