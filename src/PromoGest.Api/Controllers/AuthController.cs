using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PromoGest.Api.Security;
using PromoGest.Application.Services;
using PromoGest.Contracts.Auth;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly IAntiforgery _antiforgery;

    public AuthController(
        AuthService authService,
        IConfiguration configuration,
        IAntiforgery antiforgery)
    {
        _authService = authService;
        _configuration = configuration;
        _antiforgery = antiforgery;
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public ActionResult<CsrfTokenResponse> GetCsrfToken()
    {
        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true);
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

        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true);
        Response.Cookies.Append(
            SessionCookieDefaults.CookieName,
            result.OpaqueSessionToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = requireHttps,
                SameSite = SameSiteMode.Strict,
                Expires = result.ExpiresAtUtc,
                Path = "/",
                IsEssential = true
            });

        HttpContext.User = SessionClaimsFactory.CreatePrincipal(result.Session);
        SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);

        return Ok(result.Session);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(SessionCookieDefaults.CookieName, out var token);
        var metadata = new RequestMetadata(
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        await _authService.LogoutAsync(token, metadata, ct);

        var requireHttps = _configuration.GetValue<bool>("Security:RequireHttpsCookies", true);
        Response.Cookies.Delete(
            SessionCookieDefaults.CookieName,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = requireHttps,
                SameSite = SameSiteMode.Strict,
                Path = "/"
            });

        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        SessionClaimsFactory.IssueCsrfToken(HttpContext, _antiforgery, requireHttps);

        return NoContent();
    }

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
