using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PromoGest.Application.Services;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Setup;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/setup")]
public sealed class SetupController : ControllerBase
{
    public const string BootstrapTokenHeaderName = "X-PROMOGEST-SETUP-TOKEN";

    private readonly SetupService _setupService;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<SetupController> _logger;

    public SetupController(
        SetupService setupService,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<SetupController> logger)
    {
        _setupService = setupService;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    [HttpGet("status")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<SetupStatusResponse>> GetStatus(CancellationToken ct)
    {
        var status = await _setupService.GetStatusAsync(ct);
        var requiresToken = !status.IsInitialized && !string.IsNullOrWhiteSpace(ResolveExpectedBootstrapToken());
        return Ok(status with { RequiresBootstrapToken = requiresToken });
    }

    [HttpPost("initialize")]
    [AllowAnonymous]
    [EnableRateLimiting("setup")]
    public async Task<ActionResult<InitializeInstallationResponse>> Initialize(
        [FromBody] InitializeInstallationRequest request,
        CancellationToken ct)
    {
        if (!IsBootstrapAuthorized())
        {
            var deniedMetadata = new RequestMetadata(
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString());

            try
            {
                // Do not let a client abort cancel a security-audit write. Bound the
                // independent persistence attempt so a database stall cannot pin the request.
                using var auditCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await _setupService.RecordBootstrapDeniedAsync(deniedMetadata, auditCts.Token);
            }
            catch (Exception ex)
            {
                // A database/audit-store outage must not change the security decision:
                // the request remains forbidden and the failure is visible to operators.
                _logger.LogError(
                    ex,
                    "Could not persist SETUP_BOOTSTRAP_DENIED for request {RequestId}.",
                    HttpContext.TraceIdentifier);
            }

            _logger.LogWarning(
                "Blocked unauthorized first-run setup initialization attempt from IP {RemoteIp}.",
                deniedMetadata.IpAddress ?? "unknown");
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new ApiErrorResponse(
                    "SETUP_BOOTSTRAP_FORBIDDEN",
                    "First-run setup initialization is restricted to the local server loopback interface or a valid setup bootstrap token."));
        }

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var result = await _setupService.InitializeAsync(request, metadata, ct);
        return Created("/api/setup/status", result);
    }

    private string? ResolveExpectedBootstrapToken()
    {
        var configured = _configuration["Security:SetupBootstrapToken"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.Trim();
        }

        var envToken = Environment.GetEnvironmentVariable("PROMOGEST_SETUP_TOKEN");
        return string.IsNullOrWhiteSpace(envToken) ? null : envToken.Trim();
    }

    private bool IsBootstrapAuthorized()
    {
        var expectedToken = ResolveExpectedBootstrapToken();
        if (!string.IsNullOrWhiteSpace(expectedToken))
        {
            var suppliedToken = Request.Headers[BootstrapTokenHeaderName].FirstOrDefault()?.Trim();
            if (string.IsNullOrWhiteSpace(suppliedToken))
            {
                return false;
            }

            var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expectedToken));
            var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(suppliedToken));
            return CryptographicOperations.FixedTimeEquals(expectedHash, suppliedHash);
        }

        var remoteIp = HttpContext.Connection.RemoteIpAddress;
        if (remoteIp is null)
        {
            // ASP.NET Core TestServer leaves RemoteIpAddress null unless overridden in tests.
            return _environment.IsDevelopment();
        }

        return IPAddress.IsLoopback(remoteIp);
    }
}
