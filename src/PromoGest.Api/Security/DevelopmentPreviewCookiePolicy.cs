using Microsoft.AspNetCore.Http;

namespace PromoGest.Api.Security;

/// <summary>
/// Adapts cookie attributes strictly during Development when the app is accessed
/// over an HTTPS cross-site preview proxy (e.g., Google AI Studio / Cloud Run iframe
/// on mobile or desktop browsers) where SameSite=Strict cookies are blocked.
/// Production deployments never register this policy and retain SameSite=Strict.
/// </summary>
public static class DevelopmentPreviewCookiePolicy
{
    public static bool IsHttpsPreviewRequest(HttpRequest request)
    {
        if (request.IsHttps)
        {
            return true;
        }

        var forwardedProto = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedProto))
        {
            var firstProto = forwardedProto.Split(',')[0].Trim();
            if (string.Equals(firstProto, "https", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        if (IsNonLocalHttpsUrl(request.Headers.Origin.FirstOrDefault()) ||
            IsNonLocalHttpsUrl(request.Headers.Referer.FirstOrDefault()))
        {
            return true;
        }

        var forwardedHost = request.Headers["X-Forwarded-Host"].FirstOrDefault();
        if (IsKnownCloudPreviewHost(forwardedHost) || IsKnownCloudPreviewHost(request.Host.Host))
        {
            return true;
        }

        return false;
    }

    public static void ApplyCookieOptions(HttpContext httpContext, CookieOptions options)
    {
        if (!IsHttpsPreviewRequest(httpContext.Request))
        {
            return;
        }

        options.SameSite = SameSiteMode.None;
        options.Secure = true;

        if (!options.Extensions.Contains("Partitioned", StringComparer.OrdinalIgnoreCase))
        {
            options.Extensions.Add("Partitioned");
        }
    }

    private static bool IsNonLocalHttpsUrl(string? rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl) ||
            !Uri.TryCreate(rawUrl, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return !IsLocalHostName(uri.Host);
    }

    private static bool IsKnownCloudPreviewHost(string? rawHostHeader)
    {
        if (string.IsNullOrWhiteSpace(rawHostHeader))
        {
            return false;
        }

        var firstHost = rawHostHeader.Split(',')[0].Trim();
        var hostOnly = firstHost.Split(':')[0].Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(hostOnly) || IsLocalHostName(hostOnly))
        {
            return false;
        }

        return hostOnly.EndsWith(".run.app", StringComparison.Ordinal) ||
               hostOnly.Equals("aistudio.google.com", StringComparison.Ordinal) ||
               hostOnly.EndsWith(".aistudio.google.com", StringComparison.Ordinal);
    }

    private static bool IsLocalHostName(string host)
    {
        var normalized = host.Trim().Trim('[', ']').ToLowerInvariant();
        return normalized is "localhost" or "127.0.0.1" or "::1";
    }
}
