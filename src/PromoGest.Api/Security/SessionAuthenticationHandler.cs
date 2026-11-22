using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using PromoGest.Application.Services;
using PromoGest.Contracts.Auth;

namespace PromoGest.Api.Security;

public static class SessionCookieDefaults
{
    public const string AuthenticationScheme = "PromoGestSession";

    // Legacy non-prefixed name is intentionally limited to plain-HTTP Development.
    // Secure environments use the browser-enforced __Host- cookie prefix.
    public const string CookieName = "promogest_session";
    public const string HostCookieName = "__Host-promogest_session";
    public const string CsrfCookieName = "promogest_csrf";
    public const string CsrfHeaderName = "X-CSRF-TOKEN";

    public static bool UsesHostPrefix(HttpContext context, IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(environment);

        return !environment.IsDevelopment() ||
               context.Request.IsHttps ||
               DevelopmentPreviewCookiePolicy.IsHttpsPreviewRequest(context.Request);
    }

    public static string GetCookieName(HttpContext context, IHostEnvironment environment)
        => UsesHostPrefix(context, environment) ? HostCookieName : CookieName;
}

public static class SessionClaimsFactory
{
    public static ClaimsPrincipal CreatePrincipal(SessionResponse session)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, session.User.Id.ToString()),
            new(ClaimTypes.Name, session.User.Username),
            new(ClaimTypes.Email, session.User.Email),
            new("is_system_admin", session.User.IsSystemAdministrator ? "true" : "false"),
            new("must_change_password", session.User.MustChangePasswordAtNextLogin ? "true" : "false")
        };

        foreach (var role in session.User.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var permission in session.User.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var identity = new ClaimsIdentity(claims, SessionCookieDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    public static string IssueCsrfToken(HttpContext context, IAntiforgery antiforgery, bool requireHttps)
    {
        var tokens = antiforgery.GetAndStoreTokens(context);
        var requestToken = tokens.RequestToken ?? string.Empty;

        context.Response.Cookies.Append(
            SessionCookieDefaults.CsrfCookieName,
            requestToken,
            new CookieOptions
            {
                HttpOnly = false,
                Secure = requireHttps,
                SameSite = SameSiteMode.Strict,
                Path = "/",
                IsEssential = true
            });

        context.Response.Headers[SessionCookieDefaults.CsrfHeaderName] = requestToken;
        return requestToken;
    }
}

public sealed class SessionAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AuthService _authService;
    private readonly IHostEnvironment _environment;

    public SessionAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AuthService authService,
        IHostEnvironment environment)
        : base(options, logger, encoder)
    {
        _authService = authService;
        _environment = environment;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var cookieName = SessionCookieDefaults.GetCookieName(Context, _environment);
        if (!Request.Cookies.TryGetValue(cookieName, out var token) || string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.NoResult();
        }

        var session = await _authService.ValidateSessionAsync(token, Context.RequestAborted);
        if (session is null)
        {
            return AuthenticateResult.Fail("Invalid or expired session.");
        }

        var principal = SessionClaimsFactory.CreatePrincipal(session);
        var ticket = new AuthenticationTicket(principal, SessionCookieDefaults.AuthenticationScheme);

        Context.Items["PromoGestSession"] = session;
        return AuthenticateResult.Success(ticket);
    }
}
