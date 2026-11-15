using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Organization;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/organization")]
[Authorize]
public sealed class OrganizationController : ControllerBase
{
    private readonly OrganizationProfileService _organizationProfileService;

    public OrganizationController(OrganizationProfileService organizationProfileService)
    {
        _organizationProfileService = organizationProfileService;
    }

    [HttpPut]
    public async Task<IActionResult> Update(
        [FromBody] UpdateOrganizationProfileRequest request,
        CancellationToken ct)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var actorUserId))
        {
            throw new UnauthorizedDomainException(
                "AUTH_REQUIRED",
                "Authenticated user identity is missing.");
        }

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var updated = await _organizationProfileService.UpdateAsync(
            actorUserId,
            request,
            metadata,
            ct);

        return Ok(updated);
    }
}
