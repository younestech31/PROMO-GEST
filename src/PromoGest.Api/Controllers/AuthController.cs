using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;
using PromoGest.Api.Security;
using PromoGest.Application.Services;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Users;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly IAntiforgery _antiforgery;
    private readonly IHostEnvironment _environment;

    public AuthController(
        AuthService authService,
        IConfiguration configuration,
        IAntiforgery antiforgery,
        IHostEnvironment environment)
    {
        _authService = authService;
        _configuration = configuration;
        _antiforgery = antiforgery;
        _environment = environment;
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public ActionResult<CsrfTokenResponse> GetCsrfToken()
    {
        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true) ||
                            SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        var token = SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);
        return Ok(new CsrfTokenResponse(SessionCookieDefaults.CsrfHeaderName, token));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<SessionResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var result = await _authService.LoginAsync(request, metadata, ct);

        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true) ||
                            SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        var useHostCookie = SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        if (useHostCookie &&
            Request.Cookies.TryGetValue(SessionCookieDefaults.CookieName, out var previousLegacyToken) &&
            !string.IsNullOrWhiteSpace(previousLegacyToken) &&
            !string.Equals(previousLegacyToken, result.OpaqueSessionToken, StringComparison.Ordinal))
        {
            // Retire the pre-prefix server-side session when the user next signs in.
            await _authService.LogoutAsync(previousLegacyToken, metadata, ct);
        }

        Response.Cookies.Append(
            SessionCookieDefaults.GetCookieName(HttpContext, _environment),
            result.OpaqueSessionToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = useHostCookie,
                SameSite = SameSiteMode.Strict,
                Expires = result.ExpiresAtUtc,
                Path = "/",
                IsEssential = true
            });

        if (useHostCookie)
        {
            DeleteLegacySessionCookie();
        }

        HttpContext.User = SessionClaimsFactory.CreatePrincipal(result.Session);
        SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);

        return Ok(result.Session);
    }

    [HttpPut("preferred-language")]
    [Authorize]
    public async Task<ActionResult<SessionResponse>> UpdatePreferredLanguage(
        [FromBody] UpdatePreferredLanguageRequest request,
        CancellationToken ct)
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
            return Unauthorized();

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var session = await _authService.UpdatePreferredLanguageAsync(userId, request, metadata, ct);
        return Ok(session);
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<UserSessionDto>>> ListOwnSessions(CancellationToken ct)
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
            return Unauthorized();

        var sessions = await _authService.ListOwnSessionsAsync(
            userId,
            GetCurrentOpaqueSessionToken(),
            ct);
        return Ok(sessions);
    }

    [HttpPost("sessions/{sessionId:guid}/revoke")]
    [Authorize]
    public async Task<IActionResult> RevokeOwnSession(
        Guid sessionId,
        [FromBody] RevokeUserSessionRequest request,
        CancellationToken ct)
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
            return Unauthorized();

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var revokedCurrentSession = await _authService.RevokeOwnSessionAsync(
            userId,
            sessionId,
            GetCurrentOpaqueSessionToken(),
            request,
            metadata,
            ct);

        if (revokedCurrentSession)
        {
            var useHostCookie = SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
            Response.Cookies.Delete(
                SessionCookieDefaults.GetCookieName(HttpContext, _environment),
                CreateSessionCookieDeletionOptions(useHostCookie));

            if (useHostCookie)
            {
                DeleteLegacySessionCookie();
            }

            HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
            var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true) ||
                                SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
            SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);
        }

        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
            return Unauthorized();

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        await _authService.ChangePasswordAsync(userId, request, metadata, ct);

        var useHostCookie = SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        Response.Cookies.Delete(
            SessionCookieDefaults.GetCookieName(HttpContext, _environment),
            CreateSessionCookieDeletionOptions(useHostCookie));

        if (useHostCookie)
        {
            DeleteLegacySessionCookie();
        }

        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true) ||
                            SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);
        return NoContent();
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var useHostCookie = SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        var cookieName = SessionCookieDefaults.GetCookieName(HttpContext, _environment);
        Request.Cookies.TryGetValue(cookieName, out var token);

        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        await _authService.LogoutAsync(token, metadata, ct);

        // Old secure-host sessions are never accepted for authentication after this
        // migration, but an explicit logout still revokes a presented legacy token.
        if (useHostCookie &&
            Request.Cookies.TryGetValue(SessionCookieDefaults.CookieName, out var legacyToken) &&
            !string.IsNullOrWhiteSpace(legacyToken) &&
            !string.Equals(legacyToken, token, StringComparison.Ordinal))
        {
            await _authService.LogoutAsync(legacyToken, metadata, ct);
        }

        Response.Cookies.Delete(
            cookieName,
            CreateSessionCookieDeletionOptions(useHostCookie));

        if (useHostCookie)
        {
            DeleteLegacySessionCookie();
        }

        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true) ||
                            SessionCookieDefaults.UsesHostPrefix(HttpContext, _environment);
        SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);

        return NoContent();
    }

    private string? GetCurrentOpaqueSessionToken()
    {
        var cookieName = SessionCookieDefaults.GetCookieName(HttpContext, _environment);
        return Request.Cookies.TryGetValue(cookieName, out var token) ? token : null;
    }

    private void DeleteLegacySessionCookie()
        => Response.Cookies.Delete(
            SessionCookieDefaults.CookieName,
            CreateSessionCookieDeletionOptions(useSecure: true));

    private static CookieOptions CreateSessionCookieDeletionOptions(bool useSecure)
        => new()
        {
            HttpOnly = true,
            Secure = useSecure,
            SameSite = SameSiteMode.Strict,
            Path = "/"
            // Deliberately no Domain: required for __Host- cookie semantics.
        };

    [HttpGet("me")]
    [Authorize]
    public ActionResult<SessionResponse> Me()
    {
        if (HttpContext.Items["PromoGestSession"] is SessionResponse session)
        {
            return Ok(session);
        }

        return Unauthorized();
    }
}
