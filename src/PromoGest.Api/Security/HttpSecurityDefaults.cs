using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace PromoGest.Api.Security;

public static class HttpSecurityDefaults
{
    // The document endpoint retains its narrower 26 MiB limit. The global limit
    // leaves a small allowance for multipart boundaries and form headers.
    public const long MaxRequestBodySizeBytes = 30_000_000;
    public static TimeSpan RequestHeadersTimeout { get; } = TimeSpan.FromSeconds(15);
    public static TimeSpan KeepAliveTimeout { get; } = TimeSpan.FromMinutes(2);
    public static TimeSpan HstsMaxAge { get; } = TimeSpan.FromDays(1);

    public static void ConfigureKestrel(KestrelServerOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.Limits.MaxRequestBodySize = MaxRequestBodySizeBytes;
        options.Limits.RequestHeadersTimeout = RequestHeadersTimeout;
        options.Limits.KeepAliveTimeout = KeepAliveTimeout;
    }

    public static void ConfigureHsts(HstsOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        // Begin with a short-lived policy for the internal HTTPS hostname.
        // Increase only after certificate distribution and host stability are verified.
        options.MaxAge = HstsMaxAge;
        options.IncludeSubDomains = false;
        options.Preload = false;
    }
}
