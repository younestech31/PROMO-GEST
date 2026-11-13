using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Services;
using PromoGest.Contracts.Audit;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize]
public sealed class AuditController : ControllerBase
{
    private readonly AuditQueryService _auditQueryService;

    public AuditController(AuditQueryService auditQueryService)
    {
        _auditQueryService = auditQueryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditLogDto>>> ListRecent([FromQuery] int limit = 100, CancellationToken ct = default)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var userId))
            throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authenticated user identity is missing.");

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var logs = await _auditQueryService.ListRecentAsync(userId, metadata, limit, ct);
        return Ok(logs);
    }
}

[ApiController]
[Route("health")]
[AllowAnonymous]
public sealed class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IClock _clock;
    private readonly IHostEnvironment _environment;

    public HealthController(AppDbContext dbContext, IClock clock, IHostEnvironment environment)
    {
        _dbContext = dbContext;
        _clock = clock;
        _environment = environment;
    }

    [HttpGet("live")]
    public ActionResult<object> Live()
    {
        return Ok(new
        {
            status = "Healthy",
            timestampUtc = _clock.UtcNow,
            environmentMode = _environment.EnvironmentName
        });
    }

    [HttpGet("ready")]
    public async Task<ActionResult<HealthStatusResponse>> Ready(CancellationToken ct)
    {
        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(ct);
            if (!canConnect)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new HealthStatusResponse("Unhealthy", false, false, _clock.UtcNow, _environment.EnvironmentName));
            }

            var isInitialized = await _dbContext.OrganizationSettings.AnyAsync(o => o.IsInitialized, ct);
            return Ok(new HealthStatusResponse(
                "Ready",
                true,
                isInitialized,
                _clock.UtcNow,
                _environment.EnvironmentName));
        }
        catch
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new HealthStatusResponse("Unhealthy", false, false, _clock.UtcNow, _environment.EnvironmentName));
        }
    }
}
