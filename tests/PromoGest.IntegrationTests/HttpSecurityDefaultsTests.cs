using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using PromoGest.Api.Controllers;
using PromoGest.Api.Security;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class HttpSecurityDefaultsTests
{
    [Fact]
    public void KestrelLimits_AreExplicitAndDocumentUploadKeepsItsNarrowerLimit()
    {
        var options = new KestrelServerOptions();
        HttpSecurityDefaults.ConfigureKestrel(options);

        Assert.Equal((long?)30_000_000, options.Limits.MaxRequestBodySize);
        Assert.Equal(TimeSpan.FromSeconds(15), options.Limits.RequestHeadersTimeout);
        Assert.Equal(TimeSpan.FromMinutes(2), options.Limits.KeepAliveTimeout);

        var uploadMethod = typeof(ProjectDocumentsController).GetMethod(nameof(ProjectDocumentsController.Upload));
        Assert.NotNull(uploadMethod);
        var requestLimit = Assert.Single(uploadMethod!.GetCustomAttributes(typeof(RequestSizeLimitAttribute), inherit: true));
        Assert.Equal(26L * 1024 * 1024, Assert.IsAssignableFrom<IRequestSizeLimitMetadata>(requestLimit).MaxRequestBodySize);
        Assert.True(options.Limits.MaxRequestBodySize > 26L * 1024 * 1024);
    }

    [Fact]
    public void HstsPolicy_UsesShortInitialLifetimeWithoutSubdomainOrPreloadExpansion()
    {
        var options = new HstsOptions();
        HttpSecurityDefaults.ConfigureHsts(options);

        Assert.Equal(TimeSpan.FromDays(1), options.MaxAge);
        Assert.False(options.IncludeSubDomains);
        Assert.False(options.Preload);
    }
}
