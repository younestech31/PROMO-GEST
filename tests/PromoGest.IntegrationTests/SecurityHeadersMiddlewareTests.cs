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
