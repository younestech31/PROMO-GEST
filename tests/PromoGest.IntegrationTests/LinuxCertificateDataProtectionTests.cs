using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class LinuxCertificateDataProtectionTests
{
    [Fact]
    public void CertificateProtectedKeyRing_RoundTripsAcrossProviderRestart()
    {
        if (!OperatingSystem.IsLinux())
        {
            return;
        }

        var workDirectory = Path.Combine(
            Path.GetTempPath(),
            $"promogest_linux_dp_{Guid.NewGuid():N}");
        var keyDirectory = Path.Combine(workDirectory, "keys");
        var certificatePath = Path.Combine(keyDirectory, "protection.pfx");
        Directory.CreateDirectory(keyDirectory);

        const string password = "Integration-Test-Pfx-Password-2026";
        const string applicationName = "PromoGest";
        const string purpose = "PromoGest.IntegrationTests.LinuxCertificateProtection";
        const string plainText = "linux-certificate-key-ring-roundtrip";

        try
        {
            using (var rsa = RSA.Create(3072))
            {
                var request = new CertificateRequest(
                    "CN=PromoGest Data Protection Integration Test",
                    rsa,
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1);
                using var generatedCertificate = request.CreateSelfSigned(
                    DateTimeOffset.UtcNow.AddMinutes(-5),
                    DateTimeOffset.UtcNow.AddYears(2));
                File.WriteAllBytes(
                    certificatePath,
                    generatedCertificate.Export(X509ContentType.Pfx, password));
            }

            using var certificate = X509CertificateLoader.LoadPkcs12FromFile(
                certificatePath,
                password,
                X509KeyStorageFlags.EphemeralKeySet);
            Assert.True(certificate.HasPrivateKey);

            string protectedPayload;
            using (var firstProvider = CreateProvider(keyDirectory, applicationName, certificate))
            {
                protectedPayload = firstProvider
                    .GetRequiredService<IDataProtectionProvider>().CreateProtector(purpose)
                    .Protect(plainText);
            }

            using (var restartedProvider = CreateProvider(keyDirectory, applicationName, certificate))
            {
                var restored = restartedProvider
                    .CreateProtector(purpose)
                    .Unprotect(protectedPayload);

                Assert.Equal(plainText, restored);
            }
        }
        finally
        {
            if (Directory.Exists(workDirectory))
            {
                Directory.Delete(workDirectory, recursive: true);
            }
        }
    }

    private static ServiceProvider CreateProvider(
        string keyDirectory,
        string applicationName,
        X509Certificate2 certificate)
    {
        var services = new ServiceCollection();
        services.AddDataProtection()
            .SetApplicationName(applicationName)
            .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory))
            .ProtectKeysWithCertificate(certificate);

        return services.BuildServiceProvider();
    }
}
