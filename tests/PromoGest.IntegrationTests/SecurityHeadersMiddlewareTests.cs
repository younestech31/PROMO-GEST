using Microsoft.AspNetCore.Http;
using PromoGest.Api.Middleware;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class SecurityHeadersMiddlewareTests
{
    [Theory]
    [InlineData("/api")]
    [InlineData("/api/auth/csrf")]
    [InlineData("/api/auth/me")]
    [InlineData("/api/nonexistent-endpoint")]
    [InlineData("/API/projects")]
    [InlineData("/health")]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    [InlineData("/HEALTH/ready")]
    public async Task ApiAndHealthResponses_AreMarkedNoStore(string requestPath)
    {
        var context = await InvokeMiddlewareAsync(requestPath);

        Assert.Equal("no-store", context.Response.Headers["Cache-Control"].ToString());
    }

    [Fact]
    public async Task SecurityHeaders_DisallowObjectEmbeddingAndKeepExistingBrowserControls()
    {
        var context = await InvokeMiddlewareAsync("/api/security-headers");

        var policy = context.Response.Headers["Content-Security-Policy"].ToString();
        Assert.Contains("object-src 'none'", policy);
        Assert.Contains("frame-ancestors 'none'", policy);
        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString());
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"].ToString());
        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"].ToString());
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/index.html")]
    [InlineData("/assets/app.123456.js")]
    [InlineData("/manifest.webmanifest")]
    [InlineData("/apiary")]
    [InlineData("/healthcare")]
    public async Task StaticAndNearMissPaths_DoNotReceiveApiCachePolicy(string requestPath)
    {
        var context = await InvokeMiddlewareAsync(requestPath);

        Assert.False(context.Response.Headers.ContainsKey("Cache-Control"));
    }

    private static async Task<DefaultHttpContext> InvokeMiddlewareAsync(string requestPath)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = requestPath;

        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(context);

        return context;
    }
}
