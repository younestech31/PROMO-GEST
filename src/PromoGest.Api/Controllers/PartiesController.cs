using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/parties")]
[Authorize]
public sealed class PartiesController : ControllerBase
{
    private readonly PartyDirectoryService _partyDirectoryService;

    public PartiesController(PartyDirectoryService partyDirectoryService)
    {
        _partyDirectoryService = partyDirectoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PartyDirectoryItemDto>>> Search(
        [FromQuery] string? query,
        CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        var parties = await _partyDirectoryService.SearchAsync(
            GetActorUserId(), query, GetMetadata(), ct);
        return Ok(parties);
    }

    [HttpPut("{partyId:guid}")]
    public async Task<ActionResult<PartyDirectoryItemDto>> UpdateIdentity(
        Guid partyId,
        [FromBody] UpdatePartyIdentityRequest request,
        CancellationToken ct)
    {
        var party = await _partyDirectoryService.UpdateIdentityAsync(
            GetActorUserId(), partyId, request, GetMetadata(), ct);
        return Ok(party);
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
