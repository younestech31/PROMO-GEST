using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Setup;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/setup")]
public sealed class SetupController : ControllerBase
{
    private readonly SetupService _setupService;

    public SetupController(SetupService setupService)
    {
        _setupService = setupService;
    }

    [HttpGet("status")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<SetupStatusResponse>> GetStatus(CancellationToken ct)
    {
        var status = await _setupService.GetStatusAsync(ct);
        return Ok(status);
    }

    [HttpPost("initialize")]
    [AllowAnonymous]
    public async Task<ActionResult<InitializeInstallationResponse>> Initialize(
        [FromBody] InitializeInstallationRequest request,
        CancellationToken ct)
    {
        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var result = await _setupService.InitializeAsync(request, metadata, ct);
        return Created("/api/setup/status", result);
    }
}
