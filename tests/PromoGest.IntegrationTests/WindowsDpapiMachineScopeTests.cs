using System.Runtime.Versioning;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class WindowsDpapiMachineScopeTests
{
    [Fact]
    public void MachineScopedDpapi_KeyRingCanBeReadAfterProviderRestartOnSameMachine()
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        var keyDirectory = Path.Combine(
            Path.GetTempPath(),
            $"promogest_dpapi_machine_{Guid.NewGuid():N}");
        Directory.CreateDirectory(keyDirectory);

        const string applicationName = "PromoGest";
        const string purpose = "PromoGest.IntegrationTests.DpapiMachineScope";
        const string plainText = "machine-scope-key-ring-roundtrip";

        try
        {
            string protectedPayload;
            using (var firstProvider = CreateProvider(keyDirectory, applicationName))
            {
                protectedPayload = firstProvider
                    .GetRequiredService<IDataProtectionProvider>().CreateProtector(purpose)
                    .Protect(plainText);
            }

            Assert.NotEmpty(Directory.GetFiles(keyDirectory, "*.xml", SearchOption.TopDirectoryOnly));

            // Construct a new provider to simulate an application process restart.
            using (var restartedProvider = CreateProvider(keyDirectory, applicationName))
            {
                var restored = restartedProvider
                    .CreateProtector(purpose)
                    .Unprotect(protectedPayload);

                Assert.Equal(plainText, restored);
            }
        }
        finally
        {
            if (Directory.Exists(keyDirectory))
            {
                Directory.Delete(keyDirectory, recursive: true);
            }
        }
    }

    [SupportedOSPlatform("windows")]
    private static ServiceProvider CreateProvider(string keyDirectory, string applicationName)
    {
        var services = new ServiceCollection();
        services.AddDataProtection()
            .SetApplicationName(applicationName)
            .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory))
            .ProtectKeysWithDpapi(protectToLocalMachine: true);

        return services.BuildServiceProvider();
    }
}
