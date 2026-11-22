using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Npgsql;
using PromoGest.Application.Interfaces;
using PromoGest.Application.Services;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Audit;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Projects;
using PromoGest.Contracts.Setup;
using PromoGest.Contracts.Organization;
using PromoGest.Contracts.Reference;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Infrastructure;
using PromoGest.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PromoGest.IntegrationTests;

[ApiController]
[Route("api/test/default-deny")]
public sealed class DefaultDenyProbeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { reachable = true });
}

public sealed class PostgreSql18IntegrationFixture : IAsyncLifetime
{
    private PostgreSqlContainer? _container;
    private string _provisionConnectionString = string.Empty;
    private string _migrationConnectionString = string.Empty;
    private string _runtimeConnectionString = string.Empty;
    private readonly Dictionary<string, string?> _previousEnvironment = new(StringComparer.Ordinal);
    private string? _dataProtectionTestRoot;

    public async Task InitializeAsync()
    {
        ConfigureLinuxDataProtectionEnvironment();

        var provision = Environment.GetEnvironmentVariable("PROMOGEST_TEST_PROVISION_DB_CONNECTION");
        var migration = Environment.GetEnvironmentVariable("PROMOGEST_TEST_MIGRATE_DB_CONNECTION");
        var runtime = Environment.GetEnvironmentVariable("PROMOGEST_TEST_DB_CONNECTION");

        if (!string.IsNullOrWhiteSpace(provision) ||
            !string.IsNullOrWhiteSpace(migration) ||
            !string.IsNullOrWhiteSpace(runtime))
        {
            if (string.IsNullOrWhiteSpace(provision) ||
                string.IsNullOrWhiteSpace(migration) ||
                string.IsNullOrWhiteSpace(runtime))
            {
                throw new InvalidOperationException(
                    "Set all three PostgreSQL test connections: provision, migration-owner, and runtime-app.");
            }

            _provisionConnectionString = provision;
            _migrationConnectionString = migration;
            _runtimeConnectionString = runtime;
            return;
        }

        _container = new PostgreSqlBuilder()
            .WithImage("postgres:18-alpine")
            .WithDatabase("promogest_test")
            .WithUsername("promogest_test")
            .WithPassword("promogest_test_pw")
            .Build();

        await _container.StartAsync();
        _provisionConnectionString = _container.GetConnectionString();

        await using var provisionConnection = new NpgsqlConnection(_provisionConnectionString);
        await provisionConnection.OpenAsync();

        await using (var createOwner = new NpgsqlCommand(
            "CREATE ROLE promogest_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD 'owner_test_password';",
            provisionConnection))
        {
            await createOwner.ExecuteNonQueryAsync();
        }

        await using (var createApp = new NpgsqlCommand(
            "CREATE ROLE promogest_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD 'app_test_password';",
            provisionConnection))
        {
            await createApp.ExecuteNonQueryAsync();
        }

        _migrationConnectionString = new NpgsqlConnectionStringBuilder(_provisionConnectionString)
        {
            Username = "promogest_owner",
            Password = "owner_test_password"
        }.ConnectionString;

        _runtimeConnectionString = new NpgsqlConnectionStringBuilder(_provisionConnectionString)
        {
            Username = "promogest_app",
            Password = "app_test_password"
        }.ConnectionString;
    }

    public async Task<string> CreateIsolatedDatabaseConnectionStringAsync(string? targetMigration = null)
    {
        var dbName = $"promogest_it_{Guid.NewGuid():N}"[..28];

        await using (var provisionConnection = new NpgsqlConnection(_provisionConnectionString))
        {
            await provisionConnection.OpenAsync();
            await using var createDatabase = new NpgsqlCommand(
                $"CREATE DATABASE \"{dbName}\" OWNER promogest_owner;",
                provisionConnection);
            await createDatabase.ExecuteNonQueryAsync();
        }

        var migrationConnection = new NpgsqlConnectionStringBuilder(_migrationConnectionString)
        {
            Database = dbName
        }.ConnectionString;
        var runtimeConnection = new NpgsqlConnectionStringBuilder(_runtimeConnectionString)
        {
            Database = dbName
        }.ConnectionString;

        var migrationOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(migrationConnection, npgsql =>
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using (var migrationDb = new AppDbContext(migrationOptions))
        {
            await migrationDb.Database.MigrateAsync(targetMigration);
            await DbInitializer.SeedRolesAndPermissionsAsync(migrationDb);

            var applied = await migrationDb.Database.GetAppliedMigrationsAsync();
            if (!applied.Contains("20261113000003_SystemAdministratorInvariant"))
            {
                throw new InvalidOperationException(
                    "The SystemAdministratorInvariant migration was not discovered and applied.");
            }
            if (!applied.Contains("20261113000004_AuditLogRuntimePermissions"))
            {
                throw new InvalidOperationException(
                    "The AuditLogRuntimePermissions migration was not discovered and applied.");
            }
            if (!applied.Contains("20261114090000_ProjectStructureFoundation"))
            {
                throw new InvalidOperationException(
                    "The ProjectStructureFoundation migration was not discovered and applied.");
            }
            if (!applied.Contains("20261114180000_ProjectDocumentMetadata"))
            {
                throw new InvalidOperationException(
                    "The ProjectDocumentMetadata migration was not discovered and applied.");
            }
            if (!applied.Contains("20261114190000_ProjectCustomerRegistry"))
            {
                throw new InvalidOperationException(
                    "The ProjectCustomerRegistry migration was not discovered and applied.");
            }
            if (!applied.Contains("20261114220000_ProjectSalesReservations"))
            {
                throw new InvalidOperationException(
                    "The ProjectSalesReservations migration was not discovered and applied.");
            }
            if (!applied.Contains("20261115100000_OrganizationWidePartyFoundation"))
            {
                throw new InvalidOperationException(
                    "The OrganizationWidePartyFoundation migration was not discovered and applied.");
            }
            if (!applied.Contains("20261115120000_UniqueProjectPartyCustomerLink"))
            {
                throw new InvalidOperationException(
                    "The UniqueProjectPartyCustomerLink migration was not discovered and applied.");
            }
            if (targetMigration is null &&
                !applied.Contains("20261121120000_CanonicalizeAlgerianProjectCustomerPhones"))
            {
                throw new InvalidOperationException(
                    "The CanonicalizeAlgerianProjectCustomerPhones migration was not discovered and applied.");
            }
            if (targetMigration is not null && !applied.Contains(targetMigration))
            {
                throw new InvalidOperationException(
                    $"The requested PostgreSQL test migration checkpoint '{targetMigration}' was not applied.");
            }
        }

        // Apply the same post-migration grants used by the Google AI Studio Cloud SQL path.
        // This also sets least-privilege defaults for tables created by later migrations.
        await CloudSqlRuntimePermissions.ApplyAsync(migrationConnection, "promogest_app");
        await VerifyFutureTableDefaultsAsync(migrationConnection, runtimeConnection);

        // Prove the restricted runtime identity can authenticate before any ASP.NET Core test host is created.
        await using (var runtimeProbe = new NpgsqlConnection(runtimeConnection))
        {
            await runtimeProbe.OpenAsync();
            await using var identityCommand = new NpgsqlCommand("SELECT current_user;", runtimeProbe);
            var currentUser = (string?)await identityCommand.ExecuteScalarAsync();
            if (!string.Equals(currentUser, "promogest_app", StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"Expected runtime database identity 'promogest_app', got '{currentUser}'.");
            }
        }

        return runtimeConnection;
    }

    public string GetMigrationConnectionString(string runtimeConnectionString)
    {
        var databaseName = new NpgsqlConnectionStringBuilder(runtimeConnectionString).Database;
        if (string.IsNullOrWhiteSpace(databaseName))
            throw new InvalidOperationException("The runtime PostgreSQL connection string has no database name.");

        return new NpgsqlConnectionStringBuilder(_migrationConnectionString)
        {
            Database = databaseName
        }.ConnectionString;
    }

    private static async Task VerifyFutureTableDefaultsAsync(
        string migrationConnectionString,
        string runtimeConnectionString)
    {
        const string probeTable = "cloudsql_default_privilege_probe";

        await using (var ownerConnection = new NpgsqlConnection(migrationConnectionString))
        {
            await ownerConnection.OpenAsync();
            await using var createProbe = new NpgsqlCommand(
                $"CREATE TABLE public.{probeTable} (id integer PRIMARY KEY, value text NOT NULL);",
                ownerConnection);
            await createProbe.ExecuteNonQueryAsync();
        }

        try
        {
            await using var runtimeConnection = new NpgsqlConnection(runtimeConnectionString);
            await runtimeConnection.OpenAsync();
            await using var privilegeCheck = new NpgsqlCommand(
                "SELECT " +
                $"has_table_privilege(current_user, 'public.{probeTable}', 'SELECT') AND " +
                $"has_table_privilege(current_user, 'public.{probeTable}', 'INSERT') AND " +
                $"has_table_privilege(current_user, 'public.{probeTable}', 'UPDATE') AND " +
                $"has_table_privilege(current_user, 'public.{probeTable}', 'DELETE') AND " +
                $"NOT has_table_privilege(current_user, 'public.{probeTable}', 'TRUNCATE') AND " +
                "NOT has_table_privilege(current_user, (SELECT oid FROM pg_class WHERE relname = '__EFMigrationsHistory' AND relnamespace = 'public'::regnamespace), 'SELECT');",
                runtimeConnection);

            var hasExpectedPrivileges = (bool)(await privilegeCheck.ExecuteScalarAsync())!;
            if (!hasExpectedPrivileges)
            {
                throw new InvalidOperationException(
                    "Cloud SQL runtime role did not receive the expected future-table least-privilege grants.");
            }
        }
        finally
        {
            await using var ownerConnection = new NpgsqlConnection(migrationConnectionString);
            await ownerConnection.OpenAsync();
            await using var dropProbe = new NpgsqlCommand(
                $"DROP TABLE IF EXISTS public.{probeTable};",
                ownerConnection);
            await dropProbe.ExecuteNonQueryAsync();
        }
    }

    public async Task DisposeAsync()
    {
        try
        {
            if (_container is not null)
            {
                await _container.DisposeAsync();
            }
        }
        finally
        {
            foreach (var (name, value) in _previousEnvironment)
            {
                Environment.SetEnvironmentVariable(name, value);
            }

            if (_dataProtectionTestRoot is not null && Directory.Exists(_dataProtectionTestRoot))
            {
                Directory.Delete(_dataProtectionTestRoot, recursive: true);
            }
        }
    }

    private void ConfigureLinuxDataProtectionEnvironment()
    {
        if (!OperatingSystem.IsLinux())
        {
            return;
        }

        var variables = new[]
        {
            "Security__DataProtectionCertificatePath",
            "Security__DataProtectionKeyDirectory",
            "Security__RequireHttpsCookies",
            "Storage__RootDirectory",
            "PROMOGEST_DATA_PROTECTION_CERT_PASSWORD"
        };
        foreach (var name in variables)
        {
            _previousEnvironment[name] = Environment.GetEnvironmentVariable(name);
        }

        _dataProtectionTestRoot = Path.Combine(
            Path.GetTempPath(),
            $"promogest-api-dp-tests-{Guid.NewGuid():N}");
        var keyDirectory = Path.Combine(_dataProtectionTestRoot, "keys");
        Directory.CreateDirectory(keyDirectory);

        var certificatePath = Path.Combine(keyDirectory, "protection.pfx");
        var password = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        using (var rsa = RSA.Create(2048))
        {
            var request = new CertificateRequest(
                "CN=PromoGest PostgreSQL API Integration Test",
                rsa,
                HashAlgorithmName.SHA256,
                RSASignaturePadding.Pkcs1);
            using var certificate = request.CreateSelfSigned(
                DateTimeOffset.UtcNow.AddMinutes(-5),
                DateTimeOffset.UtcNow.AddYears(1));
            File.WriteAllBytes(certificatePath, certificate.Export(X509ContentType.Pfx, password));
        }

        Environment.SetEnvironmentVariable("Security__DataProtectionCertificatePath", certificatePath);
        Environment.SetEnvironmentVariable("Security__DataProtectionKeyDirectory", keyDirectory);
        Environment.SetEnvironmentVariable("Security__RequireHttpsCookies", "false");
        Environment.SetEnvironmentVariable("Storage__RootDirectory", Path.Combine(_dataProtectionTestRoot, "storage"));
        Environment.SetEnvironmentVariable("PROMOGEST_DATA_PROTECTION_CERT_PASSWORD", password);
    }
}

internal sealed class BufferingLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _entries = new();

    public IReadOnlyList<string> Snapshot() => _entries.ToArray();

    public ILogger CreateLogger(string categoryName) => new BufferingLogger(categoryName, _entries);

    public void Dispose()
    {
    }

    private sealed class BufferingLogger(
        string categoryName,
        ConcurrentQueue<string> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }

            var message = formatter(state, exception);
            if (exception is not null)
            {
                message += Environment.NewLine + exception;
            }

            if (exception is DbUpdateConcurrencyException concurrencyException)
            {
                foreach (var entry in concurrencyException.Entries)
                {
                    var keyNames = entry.Metadata.FindPrimaryKey()?.Properties
                        .Select(property => property.Name)
                        .ToHashSet(StringComparer.Ordinal) ?? new HashSet<string>();
                    var concurrencyValues = entry.Properties
                        .Where(property => keyNames.Contains(property.Metadata.Name) || property.Metadata.IsConcurrencyToken)
                        .Select(property => $"{property.Metadata.Name}: original={property.OriginalValue}, current={property.CurrentValue}");
                    message += Environment.NewLine +
                        $"Concurrency entity={entry.Metadata.ClrType.Name}, state={entry.State}: " +
                        string.Join("; ", concurrencyValues);
                }
            }

            entries.Enqueue($"[{logLevel}] {categoryName}: {message}");
        }
    }
}

public sealed partial class PostgresEndToEndTests : IClassFixture<PostgreSql18IntegrationFixture>
{
    private readonly PostgreSql18IntegrationFixture _fixture;
    private readonly BufferingLoggerProvider _serverLogs = new();

    public PostgresEndToEndTests(PostgreSql18IntegrationFixture fixture)
    {
        _fixture = fixture;
    }

    private WebApplicationFactory<Program> CreateFactory(
        string connectionString,
        string tempRoot,
        string environmentName = "Development",
        IDictionary<string, string?>? extraConfiguration = null,
        IPAddress? simulatedRemoteIp = null,
        bool includeAuthorizationProbe = false,
        ISaveChangesInterceptor? saveChangesInterceptor = null)
    {
        Directory.CreateDirectory(tempRoot);
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environmentName);
            builder.ConfigureLogging(logging =>
            {
                logging.AddProvider(_serverLogs);
                logging.SetMinimumLevel(LogLevel.Information);
            });
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = connectionString,
                    ["Security:RequireHttpsCookies"] = "false",
                    ["Storage:RootDirectory"] = Path.Combine(tempRoot, "storage"),
                    ["Sales:ReservationExpiryWorkerEnabled"] = "false",
                    ["Security:LoginRateLimitPermitLimit"] = "100"
                };
                if (extraConfiguration is not null)
                {
                    foreach (var (key, value) in extraConfiguration)
                    {
                        settings[key] = value;
                    }
                }
                config.AddInMemoryCollection(settings);
            });
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<AppDbContext>();
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseNpgsql(connectionString, npgsql =>
                        npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                    if (saveChangesInterceptor is not null)
                    {
                        options.AddInterceptors(saveChangesInterceptor);
                    }
                });
                if (simulatedRemoteIp is not null)
                {
                    services.AddSingleton<IStartupFilter>(new SimulatedRemoteIpStartupFilter(simulatedRemoteIp));
                }

                if (includeAuthorizationProbe)
                {
                    services.AddControllers().AddApplicationPart(typeof(DefaultDenyProbeController).Assembly);
                }
            });
        });
    }

    private sealed class SimulatedRemoteIpStartupFilter(IPAddress remoteIp) : IStartupFilter
    {
        public Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> Configure(Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> next)
            => app =>
            {
                app.Use(innerNext => async context =>
                {
                    context.Connection.RemoteIpAddress = remoteIp;
                    await innerNext(context);
                });
                next(app);
            };
    }

    private static async Task AttachCsrfTokenAsync(HttpClient client)
    {
        var resp = await client.GetAsync("/api/auth/csrf");
        resp.EnsureSuccessStatusCode();
        Assert.True(resp.Headers.CacheControl?.NoStore == true);
        var payload = await resp.Content.ReadFromJsonAsync<CsrfTokenResponse>();
        Assert.NotNull(payload);
        client.DefaultRequestHeaders.Remove(payload!.HeaderName);
        client.DefaultRequestHeaders.Add(payload.HeaderName, payload.Token);
    }

    private static async Task<SessionResponse> CompleteMandatoryPasswordChangeAsync(
        HttpClient client,
        string username,
        string temporaryPassword,
        string permanentPassword)
    {
        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(username, temporaryPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var temporarySession = await login.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(temporarySession);
        Assert.True(temporarySession!.User.MustChangePasswordAtNextLogin);
        Assert.Empty(temporarySession.User.Roles);
        Assert.Empty(temporarySession.User.Permissions);
        Assert.Null(temporarySession.Organization.Nif);
        Assert.Equal(string.Empty, temporarySession.Organization.LegalName);

        // Temporary sessions must not gain access to setup metadata; the SPA restores
        // this session through /api/auth/me before it decides whether setup status is needed.
        var blockedSetupStatus = await client.GetAsync("/api/setup/status");
        Assert.Equal(HttpStatusCode.Forbidden, blockedSetupStatus.StatusCode);
        var blockedSetupError = await blockedSetupStatus.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("PASSWORD_CHANGE_REQUIRED", blockedSetupError!.Code);

        await AttachCsrfTokenAsync(client);
        var blockedProjects = await client.GetAsync("/api/projects");
        Assert.Equal(HttpStatusCode.Forbidden, blockedProjects.StatusCode);
        var blockedError = await blockedProjects.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("PASSWORD_CHANGE_REQUIRED", blockedError!.Code);
        var blockedReference = await client.GetAsync("/api/reference/administrative-units");
        Assert.Equal(HttpStatusCode.Forbidden, blockedReference.StatusCode);
        var spaShell = await client.GetAsync("/projects");
        Assert.Equal(HttpStatusCode.OK, spaShell.StatusCode);
        Assert.Equal("text/html", spaShell.Content.Headers.ContentType?.MediaType);

        var change = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new ChangePasswordRequest(temporaryPassword, permanentPassword));
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        await AttachCsrfTokenAsync(client);
        var freshLogin = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(username, permanentPassword));
        Assert.Equal(HttpStatusCode.OK, freshLogin.StatusCode);

        var permanentSession = await freshLogin.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(permanentSession);
        Assert.False(permanentSession!.User.MustChangePasswordAtNextLogin);
        await AttachCsrfTokenAsync(client);
        return permanentSession;
    }

    private static InitializeInstallationRequest ValidInitRequest() => new(
        "SPA Promotion Atlas",
        "Atlas Immo",
        "SPA",
        "001616098765432",
        "001616098765400",
        "16/00-9876543B21",
        "16098765432",
        100_000_000m,
        "16",
        "Alger",
        "Dely Ibrahim, Alger",
        "+21321000010",
        "direction@atlasimmo.dz",
        "ar",
        "sysadmin",
        "Nabil Mansouri",
        "admin@atlasimmo.dz",
        "+213550102030",
        "AtlasAdmin#2026");

    [Fact]
    public async Task ProductionHost_AddsHstsOnHttpsWhileDevelopmentDoesNot()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var productionRoot = Path.Combine(Path.GetTempPath(), $"promogest_hsts_production_{Guid.NewGuid():N}");

        await using var productionFactory = CreateFactory(
            connectionString,
            productionRoot,
            environmentName: "Production");
        using var productionClient = productionFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://promogest.test"),
            HandleCookies = true
        });

        var productionResponse = await productionClient.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, productionResponse.StatusCode);
        var hsts = Assert.Single(productionResponse.Headers.GetValues("Strict-Transport-Security"));
        Assert.Contains("max-age=86400", hsts);
        Assert.DoesNotContain("includeSubDomains", hsts);
        Assert.DoesNotContain("preload", hsts);

        var developmentRoot = Path.Combine(Path.GetTempPath(), $"promogest_hsts_development_{Guid.NewGuid():N}");
        await using var developmentFactory = CreateFactory(
            connectionString,
            developmentRoot,
            environmentName: "Development");
        using var developmentClient = developmentFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://promogest.test"),
            HandleCookies = true
        });

        var developmentResponse = await developmentClient.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, developmentResponse.StatusCode);
        Assert.False(developmentResponse.Headers.Contains("Strict-Transport-Security"));
    }

    [Fact]
    public async Task AuthorizationFallback_DeniesUnannotatedControllerAndPreservesIntentionalAnonymousRoutes()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_default_deny_it_{Guid.NewGuid():N}");
        var configuration = new Dictionary<string, string?>
        {
            ["Security:SetupBootstrapToken"] = "test-only-bootstrap-token"
        };

        using var factory = CreateFactory(
            connectionString,
            tempRoot,
            extraConfiguration: configuration,
            simulatedRemoteIp: IPAddress.Parse("192.0.2.25"),
            includeAuthorizationProbe: true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        // The test-only controller has no [Authorize] or [AllowAnonymous].
        // FallbackPolicy must reject it before its action can execute.
        var unannotatedProbe = await client.GetAsync("/api/test/default-deny");
        Assert.Equal(HttpStatusCode.Unauthorized, unannotatedProbe.StatusCode);

        // Authentication bootstrap endpoints remain intentionally anonymous.
        await AttachCsrfTokenAsync(client);

        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("not-initialized", "not-a-real-password"));
        Assert.Equal(HttpStatusCode.Conflict, login.StatusCode);
        var loginError = await login.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("SETUP_REQUIRED", loginError!.Code);

        // Setup status remains public; initialization reaches its own bootstrap-token
        // guard (403) rather than being rejected by the authorization fallback (401).
        var setupStatus = await client.GetAsync("/api/setup/status");
        Assert.Equal(HttpStatusCode.OK, setupStatus.StatusCode);

        await AttachCsrfTokenAsync(client);
        var initialize = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Forbidden, initialize.StatusCode);
        var initializeError = await initialize.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("SETUP_BOOTSTRAP_FORBIDDEN", initializeError!.Code);

        // Five bootstrap attempts per client IP are allowed in the one-minute window.
        // The sixth request must be rejected before the endpoint can process setup data.
        for (var attempt = 1; attempt < 5; attempt++)
        {
            var retry = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, retry.StatusCode);
        }

        var rateLimitedInitialize = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedInitialize.StatusCode);

        // Every request that reaches the bootstrap guard is persisted as an append-only
        // security audit event. The sixth request is rejected by the limiter before the
        // controller runs, so it must not create a sixth denial event.
        using (var auditScope = factory.Services.CreateScope())
        {
            var db = auditScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var deniedEvents = await db.AuditLogs
                .AsNoTracking()
                .Where(entry => entry.EventType == "SETUP_BOOTSTRAP_DENIED")
                .OrderBy(entry => entry.OccurredAtUtc)
                .ToListAsync();

            Assert.Equal(5, deniedEvents.Count);
            Assert.All(deniedEvents, entry =>
            {
                Assert.Null(entry.ActorUserId);
                Assert.Equal("anonymous", entry.ActorUsername);
                Assert.Equal(AuditSeverity.Security, entry.Severity);
                Assert.Equal("192.0.2.25", entry.IpAddress);
                Assert.DoesNotContain("test-only-bootstrap-token", entry.Summary);
            });
        }

        var reference = await client.GetAsync("/api/reference/administrative-units");
        Assert.Equal(HttpStatusCode.OK, reference.StatusCode);

        var live = await client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);

        var ready = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);

        // Logout is intentionally anonymous but still requires the existing CSRF token.
        var logout = await client.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        // Unknown API/health paths keep their explicit anonymous 404 endpoints.
        var apiNotFound = await client.GetAsync("/api/nonexistent-endpoint");
        Assert.Equal(HttpStatusCode.NotFound, apiNotFound.StatusCode);
        var apiNotFoundError = await apiNotFound.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("ENDPOINT_NOT_FOUND", apiNotFoundError!.Code);

        var healthNotFound = await client.GetAsync("/health/nonexistent");
        Assert.Equal(HttpStatusCode.NotFound, healthNotFound.StatusCode);

        // The SPA shell must stay reachable without a session so the login page and
        // client-side deep links can render before authentication.
        var spaShell = await client.GetAsync("/login");
        Assert.Equal(HttpStatusCode.OK, spaShell.StatusCode);
        Assert.Equal("text/html", spaShell.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task AdministrativeReference_ExposesCanonical69WilayaCatalogueWithoutAuthentication()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_reference_it_{Guid.NewGuid():N}");

        using var factory = CreateFactory(connectionString, tempRoot);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        var response = await client.GetAsync("/api/reference/administrative-units");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore == true);

        var reference = await response.Content.ReadFromJsonAsync<AdministrativeUnitsReferenceDto>();
        Assert.NotNull(reference);
        Assert.Equal("2026-06-03-wilayas-69", reference!.Version);
        Assert.Equal("2026-06-03", reference.EffectiveDate);
        Assert.Equal("PendingOfficialVerification", reference.CommuneDatasetStatus);
        Assert.Equal(1541, reference.CommuneLegalBaselineCount);
        Assert.Equal(0, reference.CommunesCount);
        Assert.Equal(69, reference.Wilayas.Count);
        Assert.Equal(
            Enumerable.Range(1, 69).Select(number => number.ToString("00")),
            reference.Wilayas.Select(wilaya => wilaya.Code));
        Assert.Equal("الجزائر", reference.Wilayas[15].NameAr);
        Assert.Equal("Alger", reference.Wilayas[15].NameFr);
        Assert.Equal("الأبيض سيدي الشيخ / El Abiodh Sidi Cheikh", reference.Wilayas[68].CanonicalDisplayName);
    }

    [Fact]
    public async Task Migrations_Csrf_Auth_Idor_AuditImmutability_And_Restart_WorkAgainstPostgreSql18()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_it_{Guid.NewGuid():N}");

        await using (var factory = CreateFactory(connStr, tempRoot))
        {
            // Verify EF Core ModelSnapshot has ZERO pending model changes against AppDbContext
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.False(db.Database.HasPendingModelChanges());
            }

            using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

            // 1. Health & SPA fallback isolation (unknown /api & /health must return 404 JSON, never index.html)
            var liveResp = await adminClient.GetAsync("/health/live");
            Assert.Equal(HttpStatusCode.OK, liveResp.StatusCode);
            Assert.True(liveResp.Headers.CacheControl?.NoStore == true);

            var apiNotFound = await adminClient.GetAsync("/api/nonexistent-endpoint");
            Assert.Equal(HttpStatusCode.NotFound, apiNotFound.StatusCode);
            Assert.True(apiNotFound.Headers.CacheControl?.NoStore == true);
            var notFoundErr = await apiNotFound.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("ENDPOINT_NOT_FOUND", notFoundErr!.Code);

            var healthNotFound = await adminClient.GetAsync("/health/nonexistent");
            Assert.Equal(HttpStatusCode.NotFound, healthNotFound.StatusCode);
            Assert.True(healthNotFound.Headers.CacheControl?.NoStore == true);

            var readyResponse = await adminClient.GetAsync("/health/ready");
            Assert.Equal(HttpStatusCode.OK, readyResponse.StatusCode);
            Assert.True(readyResponse.Headers.CacheControl?.NoStore == true);
            var readyResp = await readyResponse.Content.ReadFromJsonAsync<HealthStatusResponse>();
            Assert.NotNull(readyResp);
            Assert.True(readyResp!.DatabaseConnected);
            Assert.False(readyResp.IsInitialized);

            // 2. CSRF protection blocks state-changing requests lacking X-CSRF-TOKEN
            var missingCsrfInit = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, missingCsrfInit.StatusCode);
            Assert.True(missingCsrfInit.Headers.CacheControl?.NoStore == true);
            var csrfErr = await missingCsrfInit.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("CSRF_TOKEN_INVALID", csrfErr!.Code);

            // 3. Invalid setup payload rolls back cleanly and allows subsequent valid setup
            await AttachCsrfTokenAsync(adminClient);
            var invalidInit = ValidInitRequest() with { WilayaCode = "99" };
            var invalidResp = await adminClient.PostAsJsonAsync("/api/setup/initialize", invalidInit);
            Assert.Equal(HttpStatusCode.BadRequest, invalidResp.StatusCode);

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Equal(0, await db.OrganizationSettings.CountAsync());
                Assert.Equal(0, await db.Users.CountAsync());
            }

            // 4. Valid first-run setup succeeds once and rejects second call
            var initResponse = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Created, initResponse.StatusCode);

            var secondInitResponse = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Conflict, secondInitResponse.StatusCode);

            // 5. Partial unique index blocks inserting a second System Administrator directly in PostgreSQL
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var duplicateAdmin = User.CreateSystemAdministrator(
                    "rogueadmin", "Rogue Admin", "rogue@atlasimmo.dz", null, "hash", "ar", DateTimeOffset.UtcNow);
                db.Users.Add(duplicateAdmin);
                var dbEx = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
                var pgEx = Assert.IsType<PostgresException>(dbEx.InnerException);
                Assert.Equal("23505", pgEx.SqlState);
            }

            // 5b. Database trigger protects the only active System Administrator from direct SQL mutation.
            await using (var adminInvariantConn = new NpgsqlConnection(connStr))
            {
                await adminInvariantConn.OpenAsync();

                await using var deactivateAdmin = new NpgsqlCommand(
                    "UPDATE users SET is_active = FALSE WHERE is_system_administrator = TRUE;",
                    adminInvariantConn);
                var deactivateError = await Assert.ThrowsAsync<PostgresException>(() => deactivateAdmin.ExecuteNonQueryAsync());
                Assert.Equal("42501", deactivateError.SqlState);

                await using var demoteAdmin = new NpgsqlCommand(
                    "UPDATE users SET is_system_administrator = FALSE WHERE is_system_administrator = TRUE;",
                    adminInvariantConn);
                var demoteError = await Assert.ThrowsAsync<PostgresException>(() => demoteAdmin.ExecuteNonQueryAsync());
                Assert.Equal("42501", demoteError.SqlState);

                await using var deleteAdmin = new NpgsqlCommand(
                    "DELETE FROM users WHERE is_system_administrator = TRUE;",
                    adminInvariantConn);
                var deleteError = await Assert.ThrowsAsync<PostgresException>(() => deleteAdmin.ExecuteNonQueryAsync());
                Assert.Equal("42501", deleteError.SqlState);
            }

            // 6. Audit logs are immutable both in EF Core and PostgreSQL trigger (42501)
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var auditEntry = await db.AuditLogs.FirstAsync();
                db.AuditLogs.Remove(auditEntry);
                await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());

                await using var rawConn = new NpgsqlConnection(connStr);
                await rawConn.OpenAsync();
                await using var updateCmd = new NpgsqlCommand("UPDATE audit_logs SET summary = 'tampered' WHERE id = @id;", rawConn);
                updateCmd.Parameters.AddWithValue("id", auditEntry.Id);
                var pgUpdateEx = await Assert.ThrowsAsync<PostgresException>(() => updateCmd.ExecuteNonQueryAsync());
                Assert.Equal("42501", pgUpdateEx.SqlState);

                await using var deleteCmd = new NpgsqlCommand("DELETE FROM audit_logs WHERE id = @id;", rawConn);
                deleteCmd.Parameters.AddWithValue("id", auditEntry.Id);
                var pgDeleteEx = await Assert.ThrowsAsync<PostgresException>(() => deleteCmd.ExecuteNonQueryAsync());
                Assert.Equal("42501", pgDeleteEx.SqlState);

                await using var truncateCmd = new NpgsqlCommand("TRUNCATE audit_logs;", rawConn);
                var pgTruncateEx = await Assert.ThrowsAsync<PostgresException>(() => truncateCmd.ExecuteNonQueryAsync());
                Assert.Equal("42501", pgTruncateEx.SqlState);

                await using var ddlCmd = new NpgsqlCommand(
                    "ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable;",
                    rawConn);
                var pgDdlEx = await Assert.ThrowsAsync<PostgresException>(() => ddlCmd.ExecuteNonQueryAsync());
                Assert.Equal("42501", pgDdlEx.SqlState);

                const string auditPrivilegesSql =
                    "SELECT has_table_privilege(current_user, 'public.audit_logs', 'SELECT') " +
                    "AND has_table_privilege(current_user, 'public.audit_logs', 'INSERT') " +
                    "AND NOT has_table_privilege(current_user, 'public.audit_logs', 'UPDATE') " +
                    "AND NOT has_table_privilege(current_user, 'public.audit_logs', 'DELETE') " +
                    "AND NOT has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE') " +
                    "AND NOT has_table_privilege(current_user, 'public.audit_logs', 'TRIGGER');";
                await using var auditPrivilegesCommand = new NpgsqlCommand(auditPrivilegesSql, rawConn);
                var auditPrivilegesAreLeastPrivilege = (bool)(await auditPrivilegesCommand.ExecuteScalarAsync())!;
                Assert.True(auditPrivilegesAreLeastPrivilege,
                    "The runtime role must only read and append audit logs, not change them or their triggers.");
            }

            // 7. Generic login error on bad password -> valid login -> rotate CSRF -> create employee & project
            var badLogin = await adminClient.PostAsJsonAsync("/api/auth/login", new LoginRequest("sysadmin", "WrongPass999"));
            Assert.Equal(HttpStatusCode.Unauthorized, badLogin.StatusCode);
            var badLoginErr = await badLogin.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("AUTH_INVALID_CREDENTIALS", badLoginErr!.Code);

            var loginResp = await adminClient.PostAsJsonAsync("/api/auth/login", new LoginRequest("sysadmin", "AtlasAdmin#2026"));
            Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
            await AttachCsrfTokenAsync(adminClient);

            var empResp = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
                "yasmine.sales", "Yasmine Boudiaf", "yasmine@atlasimmo.dz", null, "YasminePass#2026", "fr", new[] { Role.CommercialManagerCode }));
            Assert.Equal(HttpStatusCode.Created, empResp.StatusCode);
            var createdEmployee = await empResp.Content.ReadFromJsonAsync<UserDto>();

            var deniedBudgetCreate = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
                "PRJ-16-DENIED-BUDGET", "مشروع ممنوع", "Projet sans autorisation financière", "16", "Alger", "Dely Ibrahim",
                null, null, null, null, "Planning", 1m, 1, 1));
            Assert.Equal(HttpStatusCode.Forbidden, deniedBudgetCreate.StatusCode);
            Assert.Contains("PROJECT_FINANCIAL_ACCESS_DENIED", await deniedBudgetCreate.Content.ReadAsStringAsync(), StringComparison.Ordinal);

            var projectResp = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
                "PRJ-16-009", "إقامة الأطلس", "Résidence Atlas", "16", "Alger", "Dely Ibrahim",
                null, null, null, null, "Commercialization", 0m, 4, 64));
            Assert.Equal(HttpStatusCode.Created, projectResp.StatusCode);
            var createdProject = await projectResp.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(createdProject);
            Assert.Null(createdProject!.EstimatedBudgetDzd);

            // SYSTEM_ADMIN manages non-financial project master data; the budget stays restricted.
            var projectUpdate = new UpdateProjectRequest(
                "إقامة الأطلس المحدثة",
                "Résidence Atlas Mise à Jour",
                "31",
                "Oran",
                "Bir El Djir",
                "Nouvelle adresse du projet",
                "TF-ORAN-2026-001",
                "PC-ORAN-2026-010",
                new DateOnly(2026, 11, 13),
                "UnderConstruction",
                null,
                4,
                64,
                createdProject!.ConcurrencyStamp);
            var updateProjectResp = await adminClient.PutAsJsonAsync($"/api/projects/{createdProject!.Id}", projectUpdate);
            Assert.Equal(HttpStatusCode.OK, updateProjectResp.StatusCode);
            var updatedProject = await updateProjectResp.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(updatedProject);
            Assert.Equal(createdProject.Code, updatedProject!.Code);
            Assert.Equal(projectUpdate.NameAr, updatedProject.NameAr);
            Assert.Equal(projectUpdate.WilayaCode, updatedProject.WilayaCode);
            Assert.Equal(projectUpdate.Status, updatedProject.Status);
            Assert.Null(updatedProject.EstimatedBudgetDzd);
            Assert.NotEqual(createdProject.ConcurrencyStamp, updatedProject.ConcurrencyStamp);

            // A second editor submitting the original version must receive a conflict and must not overwrite the first save.
            var staleProjectUpdate = projectUpdate with
            {
                NameAr = "تعديل متقادم",
                NameFr = "Modification obsolète"
            };
            var staleProjectUpdateResponse = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                staleProjectUpdate);
            Assert.Equal(HttpStatusCode.Conflict, staleProjectUpdateResponse.StatusCode);
            var staleProjectError = await staleProjectUpdateResponse.Content.ReadAsStringAsync();
            Assert.Contains("PROJECT_CONCURRENCY_CONFLICT", staleProjectError, StringComparison.Ordinal);
            var projectAfterStaleAttempt = await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(projectAfterStaleAttempt);
            Assert.Equal(updatedProject.NameAr, projectAfterStaleAttempt!.NameAr);
            Assert.Equal(updatedProject.ConcurrencyStamp, projectAfterStaleAttempt.ConcurrencyStamp);

            // Two requests based on the same version must produce one winner and one conflict.
            var raceUpdateA = projectUpdate with
            {
                NameAr = "تحديث متزامن أ",
                ExpectedConcurrencyStamp = projectAfterStaleAttempt.ConcurrencyStamp
            };
            var raceUpdateB = projectUpdate with
            {
                NameAr = "تحديث متزامن ب",
                ExpectedConcurrencyStamp = projectAfterStaleAttempt.ConcurrencyStamp
            };
            var projectUpdateRaceResponses = await Task.WhenAll(
                adminClient.PutAsJsonAsync($"/api/projects/{createdProject.Id}", raceUpdateA),
                adminClient.PutAsJsonAsync($"/api/projects/{createdProject.Id}", raceUpdateB));
            Assert.Equal(1, projectUpdateRaceResponses.Count(response => response.StatusCode == HttpStatusCode.OK));
            Assert.Equal(1, projectUpdateRaceResponses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
            updatedProject = await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(updatedProject);
            Assert.Contains(updatedProject!.NameAr, new[] { raceUpdateA.NameAr, raceUpdateB.NameAr });
            Assert.Equal(updatedProject.ConcurrencyStamp, (await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}"))!.ConcurrencyStamp);

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var persistedProject = await db.Projects.SingleAsync(project => project.Id == createdProject.Id);
                Assert.Equal(projectUpdate.NameFr, persistedProject.NameFr);
                Assert.Equal(0m, persistedProject.EstimatedBudgetDzd);
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_UPDATED" &&
                    entry.TargetEntityId == createdProject.Id.ToString());
            }

            // Real project hierarchy: project -> buildings -> floors -> typed property units.
            var structureUrl = $"/api/projects/{createdProject.Id}/structure";
            var emptyStructure = await adminClient.GetFromJsonAsync<ProjectStructureDto>(structureUrl);
            Assert.NotNull(emptyStructure);
            Assert.Empty(emptyStructure!.Buildings);

            var buildingResponse = await adminClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest("A", "العمارة أ", "Bâtiment A", "Planned"));
            Assert.Equal(HttpStatusCode.OK, buildingResponse.StatusCode);
            var buildingStructure = await buildingResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(buildingStructure);
            var createdBuilding = Assert.Single(buildingStructure!.Buildings);
            Assert.Equal("A", createdBuilding.Code);

            // Normalized building codes are unique within the same project.
            var duplicateBuildingResponse = await adminClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest(" a ", "عمارة مكررة", "Bâtiment dupliqué", "Planned"));
            Assert.Equal(HttpStatusCode.Conflict, duplicateBuildingResponse.StatusCode);

            var floorsUrl = $"{structureUrl}/buildings/{createdBuilding.Id}/floors";
            var floorResponse = await adminClient.PostAsJsonAsync(
                floorsUrl,
                new CreateBuildingFloorRequest(0, "الطابق الأرضي", "Rez-de-chaussée"));
            Assert.Equal(HttpStatusCode.OK, floorResponse.StatusCode);
            var floorStructure = await floorResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(floorStructure);
            var createdFloor = Assert.Single(Assert.Single(floorStructure!.Buildings).Floors);
            Assert.Equal(0, createdFloor.FloorNumber);

            var duplicateFloorResponse = await adminClient.PostAsJsonAsync(
                floorsUrl,
                new CreateBuildingFloorRequest(0, "طابق مكرر", "Étage dupliqué"));
            Assert.Equal(HttpStatusCode.Conflict, duplicateFloorResponse.StatusCode);

            // Building edits preserve identifiers and reject stale versions.
            var updateBuildingUrl = $"{structureUrl}/buildings/{createdBuilding.Id}";
            var updateBuildingResponse = await adminClient.PutAsJsonAsync(
                updateBuildingUrl,
                new UpdateBuildingRequest(
                    "A-UPDATED",
                    "العمارة أ المحدثة",
                    "Bâtiment A modifié",
                    "UnderConstruction",
                    createdBuilding.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, updateBuildingResponse.StatusCode);
            var updatedBuildingStructure = await updateBuildingResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(updatedBuildingStructure);
            var updatedBuilding = Assert.Single(updatedBuildingStructure!.Buildings);
            Assert.Equal("A-UPDATED", updatedBuilding.Code);
            Assert.Equal("UnderConstruction", updatedBuilding.Status);
            Assert.NotEqual(createdBuilding.ConcurrencyStamp, updatedBuilding.ConcurrencyStamp);

            var staleBuildingResponse = await adminClient.PutAsJsonAsync(
                updateBuildingUrl,
                new UpdateBuildingRequest(
                    "A-STALE",
                    "اسم قديم",
                    "Ancien nom",
                    "Planned",
                    createdBuilding.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, staleBuildingResponse.StatusCode);

            var updateFloorUrl = $"{floorsUrl}/{createdFloor.Id}";
            var updateFloorResponse = await adminClient.PutAsJsonAsync(
                updateFloorUrl,
                new UpdateBuildingFloorRequest(
                    1,
                    "الطابق الأول",
                    "Premier étage",
                    createdFloor.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, updateFloorResponse.StatusCode);
            var updatedFloorStructure = await updateFloorResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(updatedFloorStructure);
            var updatedFloor = Assert.Single(Assert.Single(updatedFloorStructure!.Buildings).Floors);
            Assert.Equal(1, updatedFloor.FloorNumber);
            Assert.NotEqual(createdFloor.ConcurrencyStamp, updatedFloor.ConcurrencyStamp);

            var staleFloorResponse = await adminClient.PutAsJsonAsync(
                updateFloorUrl,
                new UpdateBuildingFloorRequest(
                    2,
                    "طابق قديم",
                    "Ancien étage",
                    createdFloor.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, staleFloorResponse.StatusCode);

            var unitsUrl = $"{floorsUrl}/{createdFloor.Id}/units";
            var unitResponse = await adminClient.PostAsJsonAsync(
                unitsUrl,
                new CreatePropertyUnitRequest(
                    "A-001",
                    "Apartment",
                    "AvailableForSale",
                    112.50m,
                    96.25m,
                    4));
            Assert.Equal(HttpStatusCode.OK, unitResponse.StatusCode);
            var unitStructure = await unitResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(unitStructure);
            var createdUnit = Assert.Single(
                Assert.Single(Assert.Single(unitStructure!.Buildings).Floors).Units);
            Assert.Equal("A-001", createdUnit.UnitNumber);
            Assert.Equal(112.50m, createdUnit.GrossAreaSquareMeters);
            Assert.Equal(96.25m, createdUnit.NetAreaSquareMeters);
            Assert.Equal(4, createdUnit.RoomsCount);

            // The project list summary must report actual registered structure separately from planning targets.
            var projectListResponse = await adminClient.GetAsync("/api/projects");
            Assert.Equal(HttpStatusCode.OK, projectListResponse.StatusCode);
            var projectList = await projectListResponse.Content.ReadFromJsonAsync<List<ProjectDto>>();
            Assert.NotNull(projectList);
            var projectSummary = Assert.Single(projectList!, item => item.Id == createdProject.Id);
            Assert.Equal(4, projectSummary.PlannedBlocksCount);
            Assert.Equal(64, projectSummary.PlannedUnitsCount);
            Assert.Equal(1, projectSummary.ActualBuildingsCount);
            Assert.Equal(1, projectSummary.ActualUnitsCount);

            var duplicateUnitResponse = await adminClient.PostAsJsonAsync(
                unitsUrl,
                new CreatePropertyUnitRequest("a-001", "Apartment", "Planned", 100m, 90m, 3));
            Assert.Equal(HttpStatusCode.Conflict, duplicateUnitResponse.StatusCode);

            var invalidAreaResponse = await adminClient.PostAsJsonAsync(
                unitsUrl,
                new CreatePropertyUnitRequest("A-002", "Apartment", "Planned", 90m, 91m, 3));
            Assert.Equal(HttpStatusCode.BadRequest, invalidAreaResponse.StatusCode);

            // Unit technical details are editable with optimistic concurrency protection.
            var updateUnitUrl = $"{unitsUrl}/{createdUnit.Id}";
            var updateUnitResponse = await adminClient.PutAsJsonAsync(
                updateUnitUrl,
                new UpdatePropertyUnitRequest(
                    "A-001",
                    "Apartment",
                    113m,
                    97m,
                    4,
                    createdUnit.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, updateUnitResponse.StatusCode);
            var updatedUnitStructure = await updateUnitResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(updatedUnitStructure);
            var updatedUnit = Assert.Single(
                Assert.Single(Assert.Single(updatedUnitStructure!.Buildings).Floors).Units);
            Assert.Equal(113m, updatedUnit.GrossAreaSquareMeters);
            Assert.Equal(97m, updatedUnit.NetAreaSquareMeters);
            Assert.NotEqual(createdUnit.ConcurrencyStamp, updatedUnit.ConcurrencyStamp);

            var staleUnitUpdateResponse = await adminClient.PutAsJsonAsync(
                updateUnitUrl,
                new UpdatePropertyUnitRequest(
                    "A-001",
                    "Apartment",
                    114m,
                    97m,
                    4,
                    createdUnit.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, staleUnitUpdateResponse.StatusCode);

            // Only construction-stage transitions are available here; sale states are reserved for a future workflow.
            var changeStatusResponse = await adminClient.PutAsJsonAsync(
                $"{updateUnitUrl}/status",
                new ChangePropertyUnitStatusRequest("Withdrawn", updatedUnit.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, changeStatusResponse.StatusCode);
            var changedStatusStructure = await changeStatusResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(changedStatusStructure);
            var changedStatusUnit = Assert.Single(
                Assert.Single(Assert.Single(changedStatusStructure!.Buildings).Floors).Units);
            Assert.Equal("Withdrawn", changedStatusUnit.Status);

            var directSoldStatusResponse = await adminClient.PutAsJsonAsync(
                $"{updateUnitUrl}/status",
                new ChangePropertyUnitStatusRequest("Sold", changedStatusUnit.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.BadRequest, directSoldStatusResponse.StatusCode);

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Equal(1, await db.Buildings.CountAsync(building => building.ProjectId == createdProject.Id));
                Assert.Equal(1, await db.BuildingFloors.CountAsync(floor => floor.BuildingId == createdBuilding.Id));
                Assert.Equal(1, await db.PropertyUnits.CountAsync(unit => unit.FloorId == createdFloor.Id));
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "BUILDING_CREATED" && entry.TargetEntityId == createdBuilding.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "BUILDING_FLOOR_CREATED" && entry.TargetEntityId == createdFloor.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "BUILDING_UPDATED" && entry.TargetEntityId == createdBuilding.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "BUILDING_FLOOR_UPDATED" && entry.TargetEntityId == createdFloor.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROPERTY_UNIT_CREATED" && entry.TargetEntityId == createdUnit.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROPERTY_UNIT_UPDATED" && entry.TargetEntityId == createdUnit.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROPERTY_UNIT_STATUS_CHANGED" && entry.TargetEntityId == createdUnit.Id.ToString());
            }

            // Project documents are stored locally, scoped to the project, checksummed, and audited.
            var uploadedDocumentId = Guid.Empty;
            var permitBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0x50, 0x52, 0x4F, 0x4D, 0x4F };
            using (var documentUpload = new MultipartFormDataContent())
            {
                documentUpload.Add(new ByteArrayContent(permitBytes), "file", "building-permit.pdf");
                documentUpload.Add(new StringContent("Permits"), "category");
                documentUpload.Add(new StringContent("Permis de construire initial"), "description");
                var uploadResponse = await adminClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    documentUpload);
                Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
                var uploadedDocument = await uploadResponse.Content.ReadFromJsonAsync<ProjectDocumentDto>();
                Assert.NotNull(uploadedDocument);
                uploadedDocumentId = uploadedDocument!.Id;
                Assert.Equal("building-permit.pdf", uploadedDocument.OriginalFileName);
                Assert.Equal("Permits", uploadedDocument.Category);
                Assert.Equal("Permis de construire initial", uploadedDocument.Description);
                Assert.Equal(permitBytes.LongLength, uploadedDocument.SizeBytes);
                Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(permitBytes)), uploadedDocument.Sha256Checksum);

                var documentListResponse = await adminClient.GetAsync(
                    $"/api/projects/{createdProject.Id}/documents");
                Assert.Equal(HttpStatusCode.OK, documentListResponse.StatusCode);
                Assert.Equal("no-store, no-cache", documentListResponse.Headers.CacheControl?.ToString());
                var documentList = await documentListResponse.Content.ReadFromJsonAsync<List<ProjectDocumentDto>>();
                Assert.NotNull(documentList);
                Assert.Contains(documentList!, item => item.Id == uploadedDocument.Id);

                var documentDownloadResponse = await adminClient.GetAsync(
                    $"/api/projects/{createdProject.Id}/documents/{uploadedDocument.Id}/download");
                Assert.Equal(HttpStatusCode.OK, documentDownloadResponse.StatusCode);
                Assert.Equal("no-store, no-cache", documentDownloadResponse.Headers.CacheControl?.ToString());
                Assert.Equal(permitBytes, await documentDownloadResponse.Content.ReadAsByteArrayAsync());
                Assert.Equal("attachment", documentDownloadResponse.Content.Headers.ContentDisposition?.DispositionType);
            }

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_DOCUMENT_UPLOADED" &&
                    entry.TargetEntityType == "StoredFile");
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_DOCUMENT_DOWNLOADED" &&
                    entry.TargetEntityType == "StoredFile");
            }

            // P1-07: Financial documents are readable only with explicit CanViewFinancials membership.
            var financialDocumentId = Guid.Empty;
            var financialDocumentBytes = System.Text.Encoding.UTF8.GetBytes("Financial document data - PG18");
            using (var financialUpload = new MultipartFormDataContent())
            {
                financialUpload.Add(new ByteArrayContent(financialDocumentBytes), "file", "project-budget.txt");
                financialUpload.Add(new StringContent("Financial"), "category");
                var financialUploadResponse = await adminClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    financialUpload);
                Assert.Equal(HttpStatusCode.Created, financialUploadResponse.StatusCode);
                var financialDocument = await financialUploadResponse.Content.ReadFromJsonAsync<ProjectDocumentDto>();
                Assert.NotNull(financialDocument);
                financialDocumentId = financialDocument!.Id;
            }

            var financeEmployeeResponse = await adminClient.PostAsJsonAsync(
                "/api/users",
                new CreateEmployeeRequest(
                    "finance.documents",
                    "Finance Documents",
                    "finance.documents@atlasimmo.dz",
                    null,
                    "FinanceDocuments#2026",
                    "fr",
                    new[] { Role.FinanceOfficerCode }));
            Assert.Equal(HttpStatusCode.Created, financeEmployeeResponse.StatusCode);
            var financeDocumentUser = await financeEmployeeResponse.Content.ReadFromJsonAsync<UserDto>();
            Assert.NotNull(financeDocumentUser);
            using var financeDocumentClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(financeDocumentClient);
            await CompleteMandatoryPasswordChangeAsync(
                financeDocumentClient,
                "finance.documents",
                "FinanceDocuments#2026",
                "FinanceDocumentsPersonal#2026");
            var financeMembershipResponse = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(financeDocumentUser!.Id, "FinanceController", true, false, false, false));
            Assert.Equal(HttpStatusCode.OK, financeMembershipResponse.StatusCode);
            var financeDocumentList = await financeDocumentClient.GetFromJsonAsync<List<ProjectDocumentDto>>(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.NotNull(financeDocumentList);
            Assert.Contains(financeDocumentList!, item => item.Id == financialDocumentId);
            var financeDocumentDownload = await financeDocumentClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{financialDocumentId}/download");
            Assert.Equal(HttpStatusCode.OK, financeDocumentDownload.StatusCode);
            Assert.Equal(financialDocumentBytes, await financeDocumentDownload.Content.ReadAsByteArrayAsync());

            using (var adminFinancialDownload = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{financialDocumentId}/download"))
            {
                Assert.Equal(HttpStatusCode.OK, adminFinancialDownload.StatusCode);
                Assert.Equal(financialDocumentBytes, await adminFinancialDownload.Content.ReadAsByteArrayAsync());
            }

            // Reject unsupported extensions before writing any bytes to the local storage root.
            using (var invalidDocumentUpload = new MultipartFormDataContent())
            {
                invalidDocumentUpload.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "file", "payload.exe");
                invalidDocumentUpload.Add(new StringContent("Other"), "category");
                var invalidUploadResponse = await adminClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    invalidDocumentUpload);
                Assert.Equal(HttpStatusCode.BadRequest, invalidUploadResponse.StatusCode);
                var invalidUploadError = await invalidUploadResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
                Assert.Equal("FILE_TYPE_NOT_ALLOWED", invalidUploadError!.Code);
            }

            // A permitted filename extension must not allow another payload to masquerade as a PDF.
            int storedProjectDocumentCountBeforeInvalidSignature;
            using (var countBeforeScope = factory.Services.CreateScope())
            {
                var db = countBeforeScope.ServiceProvider.GetRequiredService<AppDbContext>();
                storedProjectDocumentCountBeforeInvalidSignature = await db.StoredFiles.CountAsync(file =>
                    file.ProjectId == createdProject.Id && file.Scope == StoredFileScope.Project);
            }
            using (var invalidSignatureUpload = new MultipartFormDataContent())
            {
                invalidSignatureUpload.Add(new ByteArrayContent(new byte[] { 0x4D, 0x5A, 0x90, 0x00 }), "file", "forged-permit.pdf");
                invalidSignatureUpload.Add(new StringContent("Other"), "category");
                var invalidSignatureResponse = await adminClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    invalidSignatureUpload);
                Assert.Equal(HttpStatusCode.BadRequest, invalidSignatureResponse.StatusCode);
                var invalidSignatureError = await invalidSignatureResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
                Assert.Equal("FILE_SIGNATURE_INVALID", invalidSignatureError!.Code);
                using var countScope = factory.Services.CreateScope();
                var db = countScope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Equal(storedProjectDocumentCountBeforeInvalidSignature, await db.StoredFiles.CountAsync(file =>
                    file.ProjectId == createdProject.Id && file.Scope == StoredFileScope.Project));
            }

            // Customer records are project-scoped, deduplicated, and linked to an existing project document by reference only.
            var customerRequest = new CreateProjectCustomerRequest(
                "Individual",
                "ليلى بن عيسى",
                null,
                "0550 123 456",
                "leila.bensaissa@example.dz",
                "وهران",
                "ar",
                "Referral",
                uploadedDocumentId);
            var createCustomerResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers",
                customerRequest);
            Assert.Equal(HttpStatusCode.Created, createCustomerResponse.StatusCode);
            var createdCustomer = await createCustomerResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(createdCustomer);
            Assert.Equal("ليلى بن عيسى", createdCustomer!.DisplayName);
            Assert.Equal("Prospect", createdCustomer.Status);
            Assert.NotNull(createdCustomer.IdentityDocument);
            Assert.Equal("building-permit.pdf", createdCustomer.IdentityDocument!.OriginalFileName);
            Assert.Empty(createdCustomer.Interactions);
            // Party is the organization-wide identity; ProjectCustomer is the project-scoped relationship.
            Assert.NotEqual(createdCustomer.Id, createdCustomer.PartyId);

            using (var partyScope = factory.Services.CreateScope())
            {
                var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var persistedCustomer = await db.ProjectCustomers
                    .Include(customer => customer.Party)
                    .SingleAsync(customer => customer.Id == createdCustomer.Id);
                Assert.NotEqual(persistedCustomer.Id, persistedCustomer.PartyId);
                Assert.Equal(persistedCustomer.Party.Id, persistedCustomer.PartyId);
                Assert.Equal(PartyKind.Person, persistedCustomer.Party.Kind);
                Assert.Equal("ليلى بن عيسى", persistedCustomer.Party.DisplayName);
                Assert.Equal("ليلى بن عيسى".ToUpperInvariant(), persistedCustomer.Party.NormalizedDisplayName);
            }

            var customerListResponse = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers");
            Assert.Equal(HttpStatusCode.OK, customerListResponse.StatusCode);
            Assert.Equal("no-store, no-cache", customerListResponse.Headers.CacheControl?.ToString());
            var customerList = await customerListResponse.Content.ReadFromJsonAsync<List<ProjectCustomerListItemDto>>();
            Assert.NotNull(customerList);
            Assert.Contains(customerList!, item => item.Id == createdCustomer.Id && item.HasIdentityDocument);

            var duplicateCustomerResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers",
                customerRequest with { Phone = "0550-123-456" });
            Assert.Equal(HttpStatusCode.Conflict, duplicateCustomerResponse.StatusCode);
            var duplicateCustomerError = await duplicateCustomerResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("CUSTOMER_DUPLICATE", duplicateCustomerError!.Code);

            var otherProjectResponse = await adminClient.PostAsJsonAsync(
                "/api/projects",
                new CreateProjectRequest(
                    "PRJ-16-010",
                    "إقامة ثانية",
                    "Résidence Deux",
                    "31",
                    "Oran",
                    "Bir El Djir",
                    null,
                    null,
                    null,
                    null,
                    "Planning",
                    0m,
                    2,
                    20));
            Assert.Equal(HttpStatusCode.Created, otherProjectResponse.StatusCode);
            var otherProject = await otherProjectResponse.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(otherProject);

            var foreignProjectCustomerResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{otherProject!.Id}/customers",
                customerRequest with { IdentityDocumentStoredFileId = uploadedDocumentId });
            Assert.Equal(HttpStatusCode.NotFound, foreignProjectCustomerResponse.StatusCode);
            var foreignProjectDocumentError = await foreignProjectCustomerResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("CUSTOMER_IDENTITY_DOCUMENT_NOT_FOUND", foreignProjectDocumentError!.Code);
            var crossProjectFinancialDownload = await adminClient.GetAsync(
                $"/api/projects/{otherProject.Id}/documents/{financialDocumentId}/download");
            Assert.Equal(HttpStatusCode.NotFound, crossProjectFinancialDownload.StatusCode);

            var sharedPartyCustomerResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{otherProject.Id}/customers",
                customerRequest with
                {
                    Phone = "0550 987 654",
                    IdentityDocumentStoredFileId = null,
                    PartyId = createdCustomer.PartyId
                });
            Assert.Equal(HttpStatusCode.Created, sharedPartyCustomerResponse.StatusCode);
            var sharedPartyCustomer = await sharedPartyCustomerResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(sharedPartyCustomer);
            Assert.Equal(createdCustomer.PartyId, sharedPartyCustomer!.PartyId);
            var sharedPartyCustomerInitialStamp = sharedPartyCustomer.ConcurrencyStamp;
            var conflictingCustomerResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{otherProject.Id}/customers",
                customerRequest with
                {
                    DisplayName = "Collision Name",
                    Phone = "0550 987 654",
                    IdentityDocumentStoredFileId = null
                });
            Assert.Equal(HttpStatusCode.Created, conflictingCustomerResponse.StatusCode);
            var conflictingCustomer = await conflictingCustomerResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(conflictingCustomer);
            Assert.NotEqual(sharedPartyCustomer.PartyId, conflictingCustomer!.PartyId);

            var addInteractionResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}/interactions",
                new AddCustomerInteractionRequest(
                    "Call",
                    "Premier contact",
                    "The prospect requested information about the project and the available plans.",
                    null,
                    DateTimeOffset.UtcNow.AddDays(2)));
            Assert.Equal(HttpStatusCode.Created, addInteractionResponse.StatusCode);
            var addedInteraction = await addInteractionResponse.Content.ReadFromJsonAsync<CustomerInteractionDto>();
            Assert.NotNull(addedInteraction);
            Assert.Equal("Call", addedInteraction!.Type);

            var customerDetailsResponse = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}");
            Assert.Equal(HttpStatusCode.OK, customerDetailsResponse.StatusCode);
            Assert.Equal("no-store, no-cache", customerDetailsResponse.Headers.CacheControl?.ToString());
            var customerDetails = await customerDetailsResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(customerDetails);
            Assert.Single(customerDetails!.Interactions);
            Assert.Equal("Premier contact", customerDetails.Interactions[0].Subject);
            Assert.False(string.IsNullOrWhiteSpace(customerDetails.Interactions[0].CreatedByFullName));

            var staleCustomerStamp = customerDetails.ConcurrencyStamp;
            var partyConcurrencyStamp = customerDetails.PartyConcurrencyStamp;
            Assert.NotEqual(Guid.Empty, partyConcurrencyStamp);

            var updateCustomerRequest = new UpdateProjectCustomerRequest(
                "LegalEntity",
                "SARL ليلى بن عيسى المحدثة",
                customerDetails.ContactPerson,
                customerDetails.Phone,
                customerDetails.Email,
                customerDetails.Address,
                customerDetails.PreferredLanguage,
                customerDetails.Source,
                "Qualified",
                customerDetails.IdentityDocument?.Id,
                staleCustomerStamp,
                partyConcurrencyStamp);

            var customerIdentityCollisionResponse = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}",
                updateCustomerRequest with { DisplayName = "Collision Name" });
            Assert.Equal(HttpStatusCode.Conflict, customerIdentityCollisionResponse.StatusCode);
            var customerIdentityCollisionError = await customerIdentityCollisionResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("PARTY_IDENTITY_CONFLICT", customerIdentityCollisionError!.Code);

            using (var partyScope = factory.Services.CreateScope())
            {
                var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var unchangedParty = await db.Parties.SingleAsync(party => party.Id == createdCustomer.PartyId);
                Assert.Equal("ليلى بن عيسى", unchangedParty.DisplayName);
                var unchangedLinkedCustomers = await db.ProjectCustomers
                    .Include(customer => customer.Party)
                    .Where(customer => customer.PartyId == createdCustomer.PartyId)
                    .ToListAsync();
                Assert.Equal(2, unchangedLinkedCustomers.Count);
                Assert.All(unchangedLinkedCustomers, customer =>
                    Assert.Equal("ليلى بن عيسى", customer.Party.DisplayName));
            }

            var updateCustomerResponse = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}",
                updateCustomerRequest);
            Assert.Equal(HttpStatusCode.OK, updateCustomerResponse.StatusCode);
            var updatedCustomer = await updateCustomerResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(updatedCustomer);
            Assert.Equal("Qualified", updatedCustomer!.Status);
            Assert.Equal("SARL ليلى بن عيسى المحدثة", updatedCustomer.DisplayName);
            Assert.Equal("LegalEntity", updatedCustomer.CustomerType);
            Assert.Equal(createdCustomer.PartyId, updatedCustomer.PartyId);
            Assert.NotEqual(staleCustomerStamp, updatedCustomer.ConcurrencyStamp);

            using (var partyScope = factory.Services.CreateScope())
            {
                var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var persistedParty = await db.Parties.SingleAsync(party => party.Id == updatedCustomer.PartyId);
                Assert.Equal("SARL ليلى بن عيسى المحدثة", persistedParty.DisplayName);
                Assert.Equal(PartyKind.LegalEntity, persistedParty.Kind);
                var linkedCustomers = await db.ProjectCustomers
                    .Include(customer => customer.Party)
                    .Where(customer => customer.PartyId == updatedCustomer.PartyId)
                    .OrderBy(customer => customer.ProjectId)
                    .ToListAsync();
                Assert.Equal(2, linkedCustomers.Count);
                Assert.All(linkedCustomers, customer =>
                {
                    Assert.Equal("SARL ليلى بن عيسى المحدثة", customer.Party.DisplayName);
                    Assert.Equal("SARL ليلى بن عيسى المحدثة".ToUpperInvariant(), customer.Party.NormalizedDisplayName);
                    Assert.Equal(PartyKind.LegalEntity, customer.Party.Kind);
                });
                Assert.Equal(
                    sharedPartyCustomerInitialStamp,
                    linkedCustomers.Single(customer => customer.Id == sharedPartyCustomer.Id).ConcurrencyStamp);
            }

            var staleUpdateResponse = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}",
                updateCustomerRequest);
            Assert.Equal(HttpStatusCode.Conflict, staleUpdateResponse.StatusCode);

            Guid customerStampBeforeDirectoryUpdate;
            Guid sharedCustomerStampBeforeDirectoryUpdate;
            using (var partyScope = factory.Services.CreateScope())
            {
                var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                customerStampBeforeDirectoryUpdate = await db.ProjectCustomers
                    .Where(customer => customer.Id == createdCustomer.Id)
                    .Select(customer => customer.ConcurrencyStamp)
                    .SingleAsync();
                sharedCustomerStampBeforeDirectoryUpdate = await db.ProjectCustomers
                    .Where(customer => customer.Id == sharedPartyCustomer.Id)
                    .Select(customer => customer.ConcurrencyStamp)
                    .SingleAsync();
            }

            var partyDirectoryCollisionResponse = await adminClient.PutAsJsonAsync(
                $"/api/parties/{updatedCustomer.PartyId}",
                new UpdatePartyIdentityRequest(
                    "LegalEntity",
                    "Collision Name",
                    updatedCustomer.PartyConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, partyDirectoryCollisionResponse.StatusCode);
            var partyDirectoryCollisionError = await partyDirectoryCollisionResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("PARTY_IDENTITY_CONFLICT", partyDirectoryCollisionError!.Code);

            var partyDirectoryUpdateResponse = await adminClient.PutAsJsonAsync(
                $"/api/parties/{updatedCustomer.PartyId}",
                new UpdatePartyIdentityRequest(
                    "LegalEntity",
                    "SARL ليلى بن عيسى — الهوية المركزية",
                    updatedCustomer.PartyConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, partyDirectoryUpdateResponse.StatusCode);
            var updatedPartyDirectoryItem = await partyDirectoryUpdateResponse.Content.ReadFromJsonAsync<PartyDirectoryItemDto>();
            Assert.NotNull(updatedPartyDirectoryItem);
            Assert.Equal("SARL ليلى بن عيسى — الهوية المركزية", updatedPartyDirectoryItem!.DisplayName);

            using (var partyScope = factory.Services.CreateScope())
            {
                var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var persistedParty = await db.Parties.SingleAsync(party => party.Id == updatedCustomer.PartyId);
                Assert.Equal("SARL ليلى بن عيسى — الهوية المركزية", persistedParty.DisplayName);
                var linkedCustomers = await db.ProjectCustomers
                    .Include(customer => customer.Party)
                    .Where(customer => customer.PartyId == updatedCustomer.PartyId)
                    .ToListAsync();
                Assert.Equal(2, linkedCustomers.Count);
                Assert.All(linkedCustomers, customer =>
                {
                    Assert.Equal("SARL ليلى بن عيسى — الهوية المركزية", customer.Party.DisplayName);
                    Assert.Equal("SARL ليلى بن عيسى — الهوية المركزية".ToUpperInvariant(), customer.Party.NormalizedDisplayName);
                    Assert.Equal(PartyKind.LegalEntity, customer.Party.Kind);
                });
                Assert.Equal(customerStampBeforeDirectoryUpdate,
                    linkedCustomers.Single(customer => customer.Id == createdCustomer.Id).ConcurrencyStamp);
                Assert.Equal(sharedCustomerStampBeforeDirectoryUpdate,
                    linkedCustomers.Single(customer => customer.Id == sharedPartyCustomer.Id).ConcurrencyStamp);
            }

            var refreshedCustomer = await adminClient.GetFromJsonAsync<ProjectCustomerDto>(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}");
            Assert.NotNull(refreshedCustomer);
            Assert.Equal("SARL ليلى بن عيسى — الهوية المركزية", refreshedCustomer!.DisplayName);
            Assert.Equal(updatedPartyDirectoryItem.ConcurrencyStamp, refreshedCustomer.PartyConcurrencyStamp);

            var staleAfterDirectoryUpdate = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}",
                new UpdateProjectCustomerRequest(
                    updatedCustomer.CustomerType,
                    updatedCustomer.DisplayName,
                    updatedCustomer.ContactPerson,
                    updatedCustomer.Phone,
                    updatedCustomer.Email,
                    updatedCustomer.Address,
                    updatedCustomer.PreferredLanguage,
                    updatedCustomer.Source,
                    updatedCustomer.Status,
                    updatedCustomer.IdentityDocument?.Id,
                    updatedCustomer.ConcurrencyStamp,
                    updatedCustomer.PartyConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, staleAfterDirectoryUpdate.StatusCode);

            // Reservations must use the sales workflow, not the structure status endpoint.
            var reservationUnitResponse = await adminClient.PostAsJsonAsync(
                unitsUrl,
                new CreatePropertyUnitRequest("A-002", "Apartment", "AvailableForSale", 98m, 86m, 3));
            Assert.Equal(HttpStatusCode.OK, reservationUnitResponse.StatusCode);
            var reservationUnitStructure = await reservationUnitResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(reservationUnitStructure);
            var reservationUnit = reservationUnitStructure!.Buildings
                .SelectMany(building => building.Floors)
                .SelectMany(floor => floor.Units)
                .Single(unit => unit.UnitNumber == "A-002");
            Assert.Equal("AvailableForSale", reservationUnit.Status);

            var directReservedStatusResponse = await adminClient.PutAsJsonAsync(
                $"{unitsUrl}/{reservationUnit.Id}/status",
                new ChangePropertyUnitStatusRequest("Reserved", reservationUnit.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.BadRequest, directReservedStatusResponse.StatusCode);

            var createReservationRequest = new CreateProjectSalesReservationRequest(
                reservationUnit.Id,
                createdCustomer.Id,
                DateTimeOffset.UtcNow.AddDays(7));
            var createReservationResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                createReservationRequest);
            Assert.Equal(HttpStatusCode.Created, createReservationResponse.StatusCode);
            var createdReservation = await createReservationResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(createdReservation);
            Assert.Equal("Active", createdReservation!.Status);
            Assert.Equal(reservationUnit.Id, createdReservation.PropertyUnitId);
            Assert.Equal(createdCustomer.Id, createdReservation.ProjectCustomerId);
            Assert.StartsWith("RSV-", createdReservation.ReservationNumber, StringComparison.Ordinal);
            Assert.Matches(@"^RSV-[0-9]{8}-[A-F0-9]{8}$", createdReservation.ReservationNumber);

            var reservationDetailsResponse = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/reservations/{createdReservation.Id}");
            Assert.Equal(HttpStatusCode.OK, reservationDetailsResponse.StatusCode);
            var reservationDetails = await reservationDetailsResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(reservationDetails);
            Assert.Equal(createdReservation.Id, reservationDetails!.Id);

            var reservationListResponse = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/reservations");
            Assert.Equal(HttpStatusCode.OK, reservationListResponse.StatusCode);
            Assert.Equal("no-store, no-cache", reservationListResponse.Headers.CacheControl?.ToString());
            var reservationList = await reservationListResponse.Content.ReadFromJsonAsync<List<ProjectSalesReservationDto>>();
            Assert.NotNull(reservationList);
            Assert.Contains(reservationList!, item => item.Id == createdReservation.Id);

            var reservedStructureResponse = await adminClient.GetAsync(structureUrl);
            var reservedStructure = await reservedStructureResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(reservedStructure);
            var reservedUnit = reservedStructure!.Buildings.SelectMany(building => building.Floors)
                .SelectMany(floor => floor.Units).Single(unit => unit.Id == reservationUnit.Id);
            Assert.Equal("Reserved", reservedUnit.Status);

            var duplicateActiveReservation = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                createReservationRequest with { ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(9) });
            Assert.Equal(HttpStatusCode.Conflict, duplicateActiveReservation.StatusCode);

            var cancelReservationResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations/{createdReservation.Id}/cancel",
                new CancelProjectSalesReservationRequest(
                    "Customer requested release",
                    createdReservation.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, cancelReservationResponse.StatusCode);
            var cancelledReservation = await cancelReservationResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(cancelledReservation);
            Assert.Equal("Cancelled", cancelledReservation!.Status);
            Assert.Equal("Customer requested release", cancelledReservation.CloseReason);

            var releasedStructureResponse = await adminClient.GetAsync(structureUrl);
            var releasedStructure = await releasedStructureResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(releasedStructure);
            var releasedUnit = releasedStructure!.Buildings.SelectMany(building => building.Floors)
                .SelectMany(floor => floor.Units).Single(unit => unit.Id == reservationUnit.Id);
            Assert.Equal("AvailableForSale", releasedUnit.Status);

            // Two requests racing for one free unit must produce one active reservation only.
            var raceUnitResponse = await adminClient.PostAsJsonAsync(
                unitsUrl,
                new CreatePropertyUnitRequest("A-003", "Apartment", "AvailableForSale", 90m, 82m, 3));
            Assert.Equal(HttpStatusCode.OK, raceUnitResponse.StatusCode);
            var raceUnitStructure = await raceUnitResponse.Content.ReadFromJsonAsync<ProjectStructureDto>();
            Assert.NotNull(raceUnitStructure);
            var raceUnit = raceUnitStructure!.Buildings.SelectMany(building => building.Floors)
                .SelectMany(floor => floor.Units).Single(unit => unit.UnitNumber == "A-003");
            var raceRequest = new CreateProjectSalesReservationRequest(
                raceUnit.Id,
                createdCustomer.Id,
                DateTimeOffset.UtcNow.AddDays(3));
            var reservationRaceResponses = await Task.WhenAll(
                adminClient.PostAsJsonAsync($"/api/projects/{createdProject.Id}/reservations", raceRequest),
                adminClient.PostAsJsonAsync($"/api/projects/{createdProject.Id}/reservations", raceRequest));
            Assert.Equal(1, reservationRaceResponses.Count(response => response.StatusCode == HttpStatusCode.Created));
            Assert.Equal(1, reservationRaceResponses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
            var winningResponse = reservationRaceResponses.Single(response => response.StatusCode == HttpStatusCode.Created);
            var winningReservation = await winningResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(winningReservation);
            var raceReservationCount = await adminClient.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
                $"/api/projects/{createdProject.Id}/reservations");
            Assert.NotNull(raceReservationCount);
            Assert.Equal(1, raceReservationCount!.Count(item => item.PropertyUnitId == raceUnit.Id && item.Status == "Active"));

            var cancelRaceWinner = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations/{winningReservation!.Id}/cancel",
                new CancelProjectSalesReservationRequest("Concurrent reservation test cleanup", winningReservation.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, cancelRaceWinner.StatusCode);

            // The expiry processor releases a unit only when the linked reservation is due and the unit is still Reserved.
            var expiringReservationResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                createReservationRequest with { ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7) });
            Assert.Equal(HttpStatusCode.Created, expiringReservationResponse.StatusCode);
            var expiringReservation = await expiringReservationResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(expiringReservation);
            using (var expiryScope = factory.Services.CreateScope())
            {
                var db = expiryScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var expiryTimestamp = DateTimeOffset.UtcNow.AddMinutes(-1);
                await db.ProjectSalesReservations
                    .Where(item => item.Id == expiringReservation!.Id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(item => item.ReservedAtUtc, expiryTimestamp.AddDays(-7))
                        .SetProperty(item => item.ExpiresAtUtc, expiryTimestamp));
                var expiryProcessor = expiryScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
                var processedCount = await expiryProcessor.ProcessDueAsync();
                Assert.Equal(1, processedCount);
                db.ChangeTracker.Clear();
                var expiredReservation = await db.ProjectSalesReservations.SingleAsync(item => item.Id == expiringReservation.Id);
                var expiredUnit = await db.PropertyUnits.SingleAsync(item => item.Id == reservationUnit.Id);
                Assert.Equal(SalesReservationStatus.Expired, expiredReservation.Status);
                Assert.Equal(PropertyUnitStatus.AvailableForSale, expiredUnit.Status);
            }

            // A reservation which is already past its expiry cannot be manually cancelled in the worker's grace window.
            var elapsedRequest = new CreateProjectSalesReservationRequest(
                raceUnit.Id,
                createdCustomer.Id,
                DateTimeOffset.UtcNow.AddDays(7));
            var elapsedCreate = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                elapsedRequest);
            Assert.Equal(HttpStatusCode.Created, elapsedCreate.StatusCode);
            var elapsedReservation = await elapsedCreate.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(elapsedReservation);
            using (var elapsedScope = factory.Services.CreateScope())
            {
                var db = elapsedScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var elapsedExpiryTimestamp = DateTimeOffset.UtcNow.AddMinutes(-1);
                await db.ProjectSalesReservations
                    .Where(item => item.Id == elapsedReservation!.Id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(item => item.ReservedAtUtc, elapsedExpiryTimestamp.AddDays(-7))
                        .SetProperty(item => item.ExpiresAtUtc, elapsedExpiryTimestamp));
            }
            var cancelExpiredResponse = await adminClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations/{elapsedReservation!.Id}/cancel",
                new CancelProjectSalesReservationRequest("Late cancellation", elapsedReservation.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Conflict, cancelExpiredResponse.StatusCode);

            using (var reservationAuditScope = factory.Services.CreateScope())
            {
                var db = reservationAuditScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var reservationAudit = await db.AuditLogs.SingleAsync(entry =>
                    entry.EventType == "PROJECT_RESERVATION_CREATED" &&
                    entry.TargetEntityId == createdReservation.Id.ToString());
                Assert.DoesNotContain(createdCustomer.DisplayName, reservationAudit.Summary, StringComparison.Ordinal);
                Assert.DoesNotContain(createdCustomer.DisplayName, reservationAudit.MetadataJson ?? string.Empty, StringComparison.Ordinal);
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_RESERVATION_CANCELLED" &&
                    entry.TargetEntityId == createdReservation.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_RESERVATION_EXPIRED" &&
                    entry.TargetEntityId == expiringReservation!.Id.ToString());
            }

            using (var customerAuditScope = factory.Services.CreateScope())
            {
                var db = customerAuditScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var createAudit = await db.AuditLogs.SingleAsync(entry =>
                    entry.EventType == "PROJECT_CUSTOMER_CREATED" &&
                    entry.TargetEntityId == createdCustomer.Id.ToString());
                Assert.DoesNotContain(customerRequest.DisplayName, createAudit.Summary, StringComparison.Ordinal);
                Assert.DoesNotContain(customerRequest.Phone, createAudit.MetadataJson ?? string.Empty, StringComparison.Ordinal);
                Assert.DoesNotContain(customerRequest.Email!, createAudit.MetadataJson ?? string.Empty, StringComparison.Ordinal);
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_CUSTOMER_INTERACTION_ADDED" &&
                    entry.TargetEntityType == "CustomerInteraction");
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_CUSTOMER_UPDATED" &&
                    entry.TargetEntityId == createdCustomer.Id.ToString());
            }

            // The seeded Project Director role must also be able to manage project structure via its explicit permission.
            var directorCreateResp = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
                "youssef.director",
                "Youssef Director",
                "youssef.director@atlasimmo.dz",
                null,
                "YoussefDirector#2026",
                "fr",
                new[] { Role.ProjectDirectorCode }));
            Assert.Equal(HttpStatusCode.Created, directorCreateResp.StatusCode);
            var directorCreatedUser = await directorCreateResp.Content.ReadFromJsonAsync<UserDto>();
            Assert.NotNull(directorCreatedUser);
            var directorCreatedUserId = directorCreatedUser!.Id;

            using var directorClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(directorClient);
            await CompleteMandatoryPasswordChangeAsync(
                directorClient,
                "youssef.director",
                "YoussefDirector#2026",
                "YoussefPersonal#2026");

            var directorUpdate = projectUpdate with
            {
                NameAr = "إقامة الأطلس - تحديث مدير المشاريع",
                NameFr = "Résidence Atlas - Mise à jour du directeur",
                ExpectedConcurrencyStamp = updatedProject.ConcurrencyStamp
            };

            // A global Project Director role grants the action permission, not access to an unassigned project.
            var unassignedProjectRead = await directorClient.GetAsync($"/api/projects/{createdProject.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, unassignedProjectRead.StatusCode);
            var unassignedProjectUpdate = await directorClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                directorUpdate);
            Assert.Equal(HttpStatusCode.Forbidden, unassignedProjectUpdate.StatusCode);
            var unassignedStructureRead = await directorClient.GetAsync(structureUrl);
            Assert.Equal(HttpStatusCode.Forbidden, unassignedStructureRead.StatusCode);
            var unassignedStructureCreate = await directorClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest("B", "غير مصرح", "Non autorisé", "Planned"));
            Assert.Equal(HttpStatusCode.Forbidden, unassignedStructureCreate.StatusCode);
            var directorProjectsBeforeAssignment = await directorClient.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
            Assert.NotNull(directorProjectsBeforeAssignment);
            Assert.DoesNotContain(directorProjectsBeforeAssignment!, item => item.Id == createdProject.Id);

            // Unknown and existing-but-unassigned project IDs must be indistinguishable to a non-member.
            var unknownProjectId = Guid.NewGuid();
            Assert.Equal(HttpStatusCode.Forbidden, (await directorClient.GetAsync($"/api/projects/{unknownProjectId}")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await directorClient.GetAsync($"/api/projects/{unknownProjectId}/structure")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await directorClient.GetAsync($"/api/projects/{unknownProjectId}/customers")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await directorClient.GetAsync($"/api/projects/{unknownProjectId}/documents")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await directorClient.GetAsync($"/api/projects/{unknownProjectId}/reservations")).StatusCode);
            var unknownProjectUpdate = await directorClient.PutAsJsonAsync(
                $"/api/projects/{unknownProjectId}",
                directorUpdate);
            Assert.Equal(HttpStatusCode.Forbidden, unknownProjectUpdate.StatusCode);

            // A non-administrator who creates a project is explicitly assigned as its initial Project Manager.
            var directorCreateProjectResponse = await directorClient.PostAsJsonAsync(
                "/api/projects",
                new CreateProjectRequest(
                    "PRJ-31-010",
                    "إقامة مدير المشاريع",
                    "Résidence du Directeur",
                    "31",
                    "Oran",
                    "Bir El Djir",
                    null,
                    null,
                    null,
                    null,
                    "Planning",
                    125_000_000m,
                    2,
                    24));
            Assert.Equal(HttpStatusCode.Created, directorCreateProjectResponse.StatusCode);
            var directorOwnedProject = await directorCreateProjectResponse.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(directorOwnedProject);
            var creatorMembership = Assert.Single(directorOwnedProject!.Members);
            Assert.Equal(directorCreatedUserId, creatorMembership.UserId);
            Assert.Equal("ProjectManager", creatorMembership.RoleInProject);
            Assert.True(creatorMembership.CanViewFinancials);
            Assert.True(creatorMembership.CanManageSales);
            Assert.True(creatorMembership.CanManageConstruction);
            Assert.True(creatorMembership.CanManageDocuments);
            var directorOwnedProjectDetail = await directorClient.GetAsync($"/api/projects/{directorOwnedProject.Id}");
            Assert.Equal(HttpStatusCode.OK, directorOwnedProjectDetail.StatusCode);

            var directorOwnedProjectList = await directorClient.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
            Assert.NotNull(directorOwnedProjectList);
            Assert.Contains(directorOwnedProjectList!, item => item.Id == directorOwnedProject.Id);
            Assert.DoesNotContain(directorOwnedProjectList!, item => item.Id == createdProject.Id);

            var directorOwnUpdate = projectUpdate with
            {
                NameAr = "إقامة مدير المشاريع - تحديث",
                NameFr = "Résidence du Directeur - Mise à Jour",
                WilayaCode = "31",
                WilayaName = "Oran",
                Municipality = "Bir El Djir",
                ExpectedConcurrencyStamp = directorOwnedProject.ConcurrencyStamp
            };
            var directorOwnUpdateResponse = await directorClient.PutAsJsonAsync(
                $"/api/projects/{directorOwnedProject.Id}",
                directorOwnUpdate);
            Assert.Equal(HttpStatusCode.OK, directorOwnUpdateResponse.StatusCode);

            var directorOwnStructureResponse = await directorClient.PostAsJsonAsync(
                $"/api/projects/{directorOwnedProject.Id}/structure/buildings",
                new CreateBuildingRequest("A", "العمارة أ", "Bâtiment A", "Planned"));
            Assert.Equal(HttpStatusCode.OK, directorOwnStructureResponse.StatusCode);

            // An explicit team assignment grants project scope; the same global role alone did not.
            var directorProjectAssignment = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(directorCreatedUserId, "ProjectManager", false, true, true, true));
            Assert.Equal(HttpStatusCode.OK, directorProjectAssignment.StatusCode);
            var projectAfterManagerAssignment = await directorProjectAssignment.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(projectAfterManagerAssignment);
            Assert.Null(projectAfterManagerAssignment!.EstimatedBudgetDzd);

            var managerFinancialDocumentsDenied = await directorClient.GetFromJsonAsync<List<ProjectDocumentDto>>(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.NotNull(managerFinancialDocumentsDenied);
            Assert.DoesNotContain(managerFinancialDocumentsDenied!, item => item.Id == financialDocumentId);
            var managerFinancialDownloadDenied = await directorClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{financialDocumentId}/download");
            Assert.Equal(HttpStatusCode.Forbidden, managerFinancialDownloadDenied.StatusCode);
            using (var deniedFinancialAuditScope = factory.Services.CreateScope())
            {
                var db = deniedFinancialAuditScope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "ACCESS_DENIED" &&
                    entry.ActorUserId == directorCreatedUserId &&
                    entry.TargetEntityType == "Project" &&
                    entry.TargetEntityId == createdProject.Id.ToString());
            }

            var directorReadWithoutFinancials = await directorClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(directorReadWithoutFinancials);
            Assert.Null(directorReadWithoutFinancials!.EstimatedBudgetDzd);

            var directorFinancialTampering = await directorClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                directorUpdate with
                {
                    EstimatedBudgetDzd = 50_000_000m,
                    ExpectedConcurrencyStamp = directorReadWithoutFinancials.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.Forbidden, directorFinancialTampering.StatusCode);
            Assert.Contains("PROJECT_FINANCIAL_ACCESS_DENIED", await directorFinancialTampering.Content.ReadAsStringAsync(), StringComparison.Ordinal);

            var directorAssignedUpdate = await directorClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                directorUpdate with
                {
                    EstimatedBudgetDzd = null,
                    ExpectedConcurrencyStamp = projectAfterManagerAssignment.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.OK, directorAssignedUpdate.StatusCode);
            var directorUpdatedProject = await directorAssignedUpdate.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(directorUpdatedProject);
            Assert.Equal(directorUpdate.NameAr, directorUpdatedProject!.NameAr);
            Assert.Null(directorUpdatedProject.EstimatedBudgetDzd);

            var grantFinancials = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(directorCreatedUserId, "ProjectManager", true, true, true, true));
            Assert.Equal(HttpStatusCode.OK, grantFinancials.StatusCode);
            var adminAssignmentResponse = await grantFinancials.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(adminAssignmentResponse);
            Assert.Null(adminAssignmentResponse!.EstimatedBudgetDzd);

            var managerFinancialDocumentsAllowed = await directorClient.GetFromJsonAsync<List<ProjectDocumentDto>>(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.NotNull(managerFinancialDocumentsAllowed);
            Assert.Contains(managerFinancialDocumentsAllowed!, item => item.Id == financialDocumentId);
            var managerFinancialDownloadAllowed = await directorClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{financialDocumentId}/download");
            Assert.Equal(HttpStatusCode.OK, managerFinancialDownloadAllowed.StatusCode);
            Assert.Equal(financialDocumentBytes, await managerFinancialDownloadAllowed.Content.ReadAsByteArrayAsync());

            var directorBudgetRead = await directorClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(directorBudgetRead);
            Assert.Equal(0m, directorBudgetRead!.EstimatedBudgetDzd);

            var authorizedBudgetUpdate = await directorClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                directorUpdate with
                {
                    EstimatedBudgetDzd = 470_000_000m,
                    ExpectedConcurrencyStamp = directorBudgetRead.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.OK, authorizedBudgetUpdate.StatusCode);
            var authorizedBudgetResult = await authorizedBudgetUpdate.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(authorizedBudgetResult);
            Assert.Equal(470_000_000m, authorizedBudgetResult!.EstimatedBudgetDzd);

            var administratorBudgetRead = await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(administratorBudgetRead);
            Assert.Null(administratorBudgetRead!.EstimatedBudgetDzd);

            Guid systemAdminUserId;
            using (var adminScope = factory.Services.CreateScope())
            {
                var db = adminScope.ServiceProvider.GetRequiredService<AppDbContext>();
                systemAdminUserId = await db.Users
                    .Where(user => user.IsSystemAdministrator)
                    .Select(user => user.Id)
                    .SingleAsync();
            }

            var explicitlyGrantAdminFinancialScope = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(systemAdminUserId, "FinanceController", true, false, false, false));
            Assert.Equal(HttpStatusCode.OK, explicitlyGrantAdminFinancialScope.StatusCode);
            var adminAfterExplicitMembership = await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(adminAfterExplicitMembership);
            Assert.Equal(470_000_000m, adminAfterExplicitMembership!.EstimatedBudgetDzd);

            var adminFinanceControllerWrite = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                projectUpdate with
                {
                    EstimatedBudgetDzd = 490_000_000m,
                    ExpectedConcurrencyStamp = adminAfterExplicitMembership.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.Forbidden, adminFinanceControllerWrite.StatusCode);
            Assert.Contains("PROJECT_FINANCIAL_ACCESS_DENIED", await adminFinanceControllerWrite.Content.ReadAsStringAsync(), StringComparison.Ordinal);

            var promoteAdminProjectMembership = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(systemAdminUserId, "ProjectManager", true, true, true, true));
            Assert.Equal(HttpStatusCode.OK, promoteAdminProjectMembership.StatusCode);
            var adminProjectManagerBudgetRead = await adminClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(adminProjectManagerBudgetRead);
            Assert.Equal(470_000_000m, adminProjectManagerBudgetRead!.EstimatedBudgetDzd);
            var adminProjectManagerBudgetUpdate = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                projectUpdate with
                {
                    EstimatedBudgetDzd = 490_000_000m,
                    ExpectedConcurrencyStamp = adminProjectManagerBudgetRead.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.OK, adminProjectManagerBudgetUpdate.StatusCode);
            var adminProjectManagerBudgetUpdated = await adminProjectManagerBudgetUpdate.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(adminProjectManagerBudgetUpdated);
            Assert.Equal(490_000_000m, adminProjectManagerBudgetUpdated!.EstimatedBudgetDzd);

            var restoreAdminToFinancialReader = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(systemAdminUserId, "FinanceController", true, false, false, false));
            Assert.Equal(HttpStatusCode.OK, restoreAdminToFinancialReader.StatusCode);

            var directorBuildingResponse = await directorClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest("B", "العمارة ب", "Bâtiment B", "Planned"));
            Assert.Equal(HttpStatusCode.OK, directorBuildingResponse.StatusCode);

            // A project must retain at least one Project Manager.
            var demoteLastManager = await adminClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(directorCreatedUserId, "CommercialAgent", false, true, false, true));
            Assert.Equal(HttpStatusCode.Conflict, demoteLastManager.StatusCode);
            var removeLastManager = await adminClient.DeleteAsync(
                $"/api/projects/{createdProject.Id}/members/{directorCreatedUserId}");
            Assert.Equal(HttpStatusCode.Conflict, removeLastManager.StatusCode);

            // 8. Authenticate as employee -> test CSRF check, IDOR rejection, role escalation rejection, membership grant & revoke, deactivation session invalidation
            using var employeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(employeeClient);

            await CompleteMandatoryPasswordChangeAsync(
                employeeClient,
                "yasmine.sales",
                "YasminePass#2026",
                "YasminePersonal#2026");

            // A regular employee cannot update project master data, even with a valid session and CSRF token.
            var deniedProjectUpdate = await employeeClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                projectUpdate with { NameAr = "تعديل غير مصرح به" });
            Assert.Equal(HttpStatusCode.Forbidden, deniedProjectUpdate.StatusCode);

            var deniedStructureRead = await employeeClient.GetAsync(structureUrl);
            Assert.Equal(HttpStatusCode.Forbidden, deniedStructureRead.StatusCode);

            var deniedStructureCreate = await employeeClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest("X", "غير مصرح", "Non autorisé", "Planned"));
            Assert.Equal(HttpStatusCode.Forbidden, deniedStructureCreate.StatusCode);

            var deniedBuildingUpdate = await employeeClient.PutAsJsonAsync(
                updateBuildingUrl,
                new UpdateBuildingRequest(
                    "X",
                    "تعديل غير مصرح",
                    "Modification non autorisée",
                    updatedBuilding.Status,
                    updatedBuilding.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Forbidden, deniedBuildingUpdate.StatusCode);

            var deniedFloorUpdate = await employeeClient.PutAsJsonAsync(
                updateFloorUrl,
                new UpdateBuildingFloorRequest(
                    updatedFloor.FloorNumber,
                    "تعديل غير مصرح",
                    "Modification non autorisée",
                    updatedFloor.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.Forbidden, deniedFloorUpdate.StatusCode);

            // A valid employee session without explicit membership cannot enumerate project documents or customer records.
            var deniedCustomerList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject!.Id}/customers");
            Assert.Equal(HttpStatusCode.Forbidden, deniedCustomerList.StatusCode);
            var deniedReservationList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/reservations");
            Assert.Equal(HttpStatusCode.Forbidden, deniedReservationList.StatusCode);
            var deniedCustomerDetails = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer!.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, deniedCustomerDetails.StatusCode);
            var deniedCustomerCreate = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers",
                customerRequest with
                {
                    DisplayName = "Unauthorized prospect",
                    Phone = "0550111222",
                    Email = "unauthorized@example.dz",
                    IdentityDocumentStoredFileId = null
                });
            Assert.Equal(HttpStatusCode.Forbidden, deniedCustomerCreate.StatusCode);

            // A valid employee session without explicit membership cannot enumerate or upload project documents.
            var deniedDocumentList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject!.Id}/documents");
            Assert.Equal(HttpStatusCode.Forbidden, deniedDocumentList.StatusCode);
            var deniedDocumentDownload = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{uploadedDocumentId}/download");
            Assert.Equal(HttpStatusCode.Forbidden, deniedDocumentDownload.StatusCode);
            var deniedFinancialDocumentDownload = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{financialDocumentId}/download");
            Assert.Equal(HttpStatusCode.Forbidden, deniedFinancialDocumentDownload.StatusCode);
            using (var deniedDocumentUpload = new MultipartFormDataContent())
            {
                deniedDocumentUpload.Add(new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }), "file", "denied.pdf");
                deniedDocumentUpload.Add(new StringContent("Other"), "category");
                var deniedUploadResponse = await employeeClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    deniedDocumentUpload);
                Assert.Equal(HttpStatusCode.Forbidden, deniedUploadResponse.StatusCode);
            }

            // IDOR blocked + audited
            var forbiddenAttempt = await employeeClient.GetAsync($"/api/projects/{createdProject!.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, forbiddenAttempt.StatusCode);

            // Role escalation blocked
            var escalationAttempt = await employeeClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
                "evil.admin", "Evil", "evil@atlasimmo.dz", null, "EvilPass#2026", "fr", new[] { Role.SystemAdminCode }));
            Assert.Equal(HttpStatusCode.Forbidden, escalationAttempt.StatusCode);

            // Grant project membership -> access works
            var assignResp = await adminClient.PutAsJsonAsync($"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(createdEmployee!.Id, "CommercialAgent", false, true, false, true));
            var assignBody = await assignResp.Content.ReadAsStringAsync();
            Assert.True(assignResp.StatusCode == HttpStatusCode.OK,
                $"Project member assignment failed with {(int)assignResp.StatusCode} {assignResp.StatusCode}: {assignBody}" +
                $"{Environment.NewLine}Captured ASP.NET Core server logs:{Environment.NewLine}{string.Join(Environment.NewLine, _serverLogs.Snapshot())}");

            var salesMemberWithoutFinancials = await employeeClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(salesMemberWithoutFinancials);
            Assert.Null(salesMemberWithoutFinancials!.EstimatedBudgetDzd);

            // Sales project membership plus customers.manage permits access to customer records.
            var memberCustomerList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers");
            Assert.Equal(HttpStatusCode.OK, memberCustomerList.StatusCode);
            var memberCustomerCreate = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers",
                customerRequest with
                {
                    DisplayName = "Yasmine Prospect",
                    Phone = "0550777888",
                    Email = "yasmine.prospect@example.dz",
                    IdentityDocumentStoredFileId = null
                });
            Assert.Equal(HttpStatusCode.Created, memberCustomerCreate.StatusCode);
            var memberCreatedCustomer = await memberCustomerCreate.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(memberCreatedCustomer);

            var memberReservationResponse = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                new CreateProjectSalesReservationRequest(
                    reservationUnit.Id,
                    memberCreatedCustomer!.Id,
                    DateTimeOffset.UtcNow.AddDays(2)));
            Assert.Equal(HttpStatusCode.Created, memberReservationResponse.StatusCode);
            var memberReservation = await memberReservationResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>();
            Assert.NotNull(memberReservation);
            var memberReservationCancel = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations/{memberReservation!.Id}/cancel",
                new CancelProjectSalesReservationRequest("Sales team test cancellation", memberReservation.ConcurrencyStamp));
            Assert.Equal(HttpStatusCode.OK, memberReservationCancel.StatusCode);

            // Explicit project membership allows document reads, and the CanManageDocuments flag allows uploads.
            var memberDocumentList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.Equal(HttpStatusCode.OK, memberDocumentList.StatusCode);
            using (var memberDocumentUpload = new MultipartFormDataContent())
            {
                memberDocumentUpload.Add(new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x41 }), "file", "team-note.pdf");
                memberDocumentUpload.Add(new StringContent("Correspondence"), "category");
                var memberUploadResponse = await employeeClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    memberDocumentUpload);
                Assert.Equal(HttpStatusCode.Created, memberUploadResponse.StatusCode);
            }
            var memberDocumentDownload = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{uploadedDocumentId}/download");
            Assert.Equal(HttpStatusCode.OK, memberDocumentDownload.StatusCode);

            // Reassign the same employee to cover the existing-membership UPDATE path.
            var updateMembershipResp = await adminClient.PutAsJsonAsync($"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(createdEmployee.Id, "CommercialAgent", true, false, false, false));
            Assert.Equal(HttpStatusCode.OK, updateMembershipResp.StatusCode);

            var salesMemberWithFinancials = await employeeClient.GetFromJsonAsync<ProjectDto>(
                $"/api/projects/{createdProject.Id}");
            Assert.NotNull(salesMemberWithFinancials);
            Assert.Equal(490_000_000m, salesMemberWithFinancials!.EstimatedBudgetDzd);
            var salesMemberBudgetWrite = await employeeClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                projectUpdate with
                {
                    EstimatedBudgetDzd = 480_000_000m,
                    ExpectedConcurrencyStamp = salesMemberWithFinancials.ConcurrencyStamp
                });
            Assert.Equal(HttpStatusCode.Forbidden, salesMemberBudgetWrite.StatusCode);

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var updatedMembership = await db.ProjectMembers.SingleAsync(
                    member => member.ProjectId == createdProject.Id && member.UserId == createdEmployee.Id);
                Assert.True(updatedMembership.CanViewFinancials);
                Assert.False(updatedMembership.CanManageSales);
                Assert.False(updatedMembership.CanManageConstruction);
                Assert.False(updatedMembership.CanManageDocuments);
                Assert.Equal(1, await db.ProjectMembers.CountAsync(
                    member => member.ProjectId == createdProject.Id && member.UserId == createdEmployee.Id));
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_FINANCIALS_VIEWED" &&
                    entry.ActorUserId == directorCreatedUserId &&
                    entry.TargetEntityId == createdProject.Id.ToString());
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "ACCESS_DENIED" &&
                    entry.ActorUserId == directorCreatedUserId &&
                    entry.TargetEntityId == createdProject.Id.ToString());
            }

            // Removing the per-project sales-management flag preserves read access but blocks customer mutations.
            var readOnlyCustomerList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers");
            Assert.Equal(HttpStatusCode.OK, readOnlyCustomerList.StatusCode);
            var readOnlyReservationList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/reservations");
            Assert.Equal(HttpStatusCode.OK, readOnlyReservationList.StatusCode);
            var readOnlyReservationCreate = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/reservations",
                new CreateProjectSalesReservationRequest(
                    reservationUnit.Id,
                    createdCustomer.Id,
                    DateTimeOffset.UtcNow.AddDays(2)));
            Assert.Equal(HttpStatusCode.Forbidden, readOnlyReservationCreate.StatusCode);
            var readOnlyCustomerDetails = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}");
            Assert.Equal(HttpStatusCode.OK, readOnlyCustomerDetails.StatusCode);
            var readOnlyCustomerCreate = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers",
                customerRequest with
                {
                    DisplayName = "Read only prospect",
                    Phone = "0550999888",
                    Email = "readonly@example.dz",
                    IdentityDocumentStoredFileId = null
                });
            Assert.Equal(HttpStatusCode.Forbidden, readOnlyCustomerCreate.StatusCode);
            var readOnlyCustomerInteraction = await employeeClient.PostAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}/interactions",
                new AddCustomerInteractionRequest("Call", "Forbidden", "Must not be recorded.", null, null));
            Assert.Equal(HttpStatusCode.Forbidden, readOnlyCustomerInteraction.StatusCode);
            var readOnlyCustomerUpdate = await employeeClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}",
                updateCustomerRequest with { Status = "Customer", ConcurrencyStamp = updatedCustomer!.ConcurrencyStamp });
            Assert.Equal(HttpStatusCode.Forbidden, readOnlyCustomerUpdate.StatusCode);

            // Removing the per-project document-management flag preserves document read access but blocks further uploads.
            var readOnlyDocumentList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.Equal(HttpStatusCode.OK, readOnlyDocumentList.StatusCode);
            using (var readOnlyDocumentUpload = new MultipartFormDataContent())
            {
                readOnlyDocumentUpload.Add(new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x42 }), "file", "read-only.pdf");
                readOnlyDocumentUpload.Add(new StringContent("Other"), "category");
                var readOnlyUploadResponse = await employeeClient.PostAsync(
                    $"/api/projects/{createdProject.Id}/documents",
                    readOnlyDocumentUpload);
                Assert.Equal(HttpStatusCode.Forbidden, readOnlyUploadResponse.StatusCode);
            }
            var readOnlyDocumentDownload = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{uploadedDocumentId}/download");
            Assert.Equal(HttpStatusCode.OK, readOnlyDocumentDownload.StatusCode);

            var allowedAttempt = await employeeClient.GetAsync($"/api/projects/{createdProject.Id}");
            Assert.Equal(HttpStatusCode.OK, allowedAttempt.StatusCode);

            // Revoke membership -> access blocked again
            var revokeResp = await adminClient.DeleteAsync($"/api/projects/{createdProject.Id}/members/{createdEmployee.Id}");
            Assert.Equal(HttpStatusCode.OK, revokeResp.StatusCode);

            var revokedAttempt = await employeeClient.GetAsync($"/api/projects/{createdProject.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, revokedAttempt.StatusCode);
            var revokedDocumentList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents");
            Assert.Equal(HttpStatusCode.Forbidden, revokedDocumentList.StatusCode);
            var revokedDocumentDownload = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{uploadedDocumentId}/download");
            Assert.Equal(HttpStatusCode.Forbidden, revokedDocumentDownload.StatusCode);
            var revokedCustomerList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers");
            Assert.Equal(HttpStatusCode.Forbidden, revokedCustomerList.StatusCode);
            var revokedReservationList = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/reservations");
            Assert.Equal(HttpStatusCode.Forbidden, revokedReservationList.StatusCode);
            var revokedCustomerDetails = await employeeClient.GetAsync(
                $"/api/projects/{createdProject.Id}/customers/{createdCustomer.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, revokedCustomerDetails.StatusCode);

            // Deactivate employee -> existing session cookie becomes invalid immediately (401)
            var deactivateResp = await adminClient.PatchAsJsonAsync($"/api/users/{createdEmployee.Id}/status", new SetUserStatusRequest(false));
            Assert.Equal(HttpStatusCode.OK, deactivateResp.StatusCode);

            var postDeactivateMe = await employeeClient.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, postDeactivateMe.StatusCode);

            // A stored document modified after upload must fail SHA-256 verification and be audited.
            using (var documentScope = factory.Services.CreateScope())
            {
                var db = documentScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var storedDocument = await db.StoredFiles.SingleAsync(file => file.Id == uploadedDocumentId);
                var localStorage = documentScope.ServiceProvider.GetRequiredService<IProjectFileStorage>();
                var storedPath = localStorage.ResolveSafeFullPath(storedDocument);
                await File.WriteAllBytesAsync(storedPath, new byte[] { 0x54, 0x41, 0x4D, 0x50, 0x45, 0x52 });
            }

            var tamperedDocumentResponse = await adminClient.GetAsync(
                $"/api/projects/{createdProject.Id}/documents/{uploadedDocumentId}/download");
            Assert.Equal(HttpStatusCode.Conflict, tamperedDocumentResponse.StatusCode);

            using (var integrityScope = factory.Services.CreateScope())
            {
                var db = integrityScope.ServiceProvider.GetRequiredService<AppDbContext>();
                Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                    entry.EventType == "PROJECT_DOCUMENT_INTEGRITY_FAILED" &&
                    entry.TargetEntityType == "StoredFile" &&
                    entry.TargetEntityId == uploadedDocumentId.ToString());
            }
        }

        // 9. Simulated Server Restart: new WebApplicationFactory against same DB retains initialized state
        await using (var restartedFactory = CreateFactory(connStr, tempRoot))
        {
            using var client = restartedFactory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            var setupStatus = await client.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
            Assert.NotNull(setupStatus);
            Assert.True(setupStatus!.IsInitialized);

            await AttachCsrfTokenAsync(client);
            var blockedReinit = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Conflict, blockedReinit.StatusCode);
        }
    }

    [Fact]
    public async Task FirstRunSetup_OnEmptyPostgreSql18Database_InitializesExactlyOnce()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_first_run_acceptance_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        var statusBefore = await client.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
        Assert.NotNull(statusBefore);
        Assert.False(statusBefore!.IsInitialized);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Empty(await db.OrganizationSettings.ToListAsync());
            Assert.Empty(await db.Users.ToListAsync());
        }

        await AttachCsrfTokenAsync(client);

        var firstSetup = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, firstSetup.StatusCode);

        var secondSetup = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Conflict, secondSetup.StatusCode);
        var secondSetupError = await secondSetup.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("SETUP_ALREADY_INITIALIZED", secondSetupError!.Code);

        var statusAfter = await client.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
        Assert.NotNull(statusAfter);
        Assert.True(statusAfter!.IsInitialized);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Single(await db.OrganizationSettings.ToListAsync());

            var users = await db.Users.ToListAsync();
            var systemAdmin = Assert.Single(users.Where(user => user.IsSystemAdministrator));
            Assert.Single(users);
            Assert.Equal("sysadmin", systemAdmin.Username);

            Assert.Single(await db.UserRoles.Where(role => role.UserId == systemAdmin.Id).ToListAsync());
            Assert.Single(await db.AuditLogs
                .Where(entry => entry.EventType == "SETUP_INITIALIZED")
                .ToListAsync());
        }
    }

    [Fact]
    public async Task SecureContexts_UseHostPrefixedSessionCookies_AndDevelopmentHttpKeepsLegacyName()
    {
        var productionConnection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var productionRoot = Path.Combine(Path.GetTempPath(), $"promogest_host_cookie_production_{Guid.NewGuid():N}");
        var productionConfiguration = new Dictionary<string, string?>
        {
            ["Security:RequireHttpsCookies"] = "true"
        };

        await using var productionFactory = CreateFactory(
            productionConnection,
            productionRoot,
            environmentName: "Production",
            extraConfiguration: productionConfiguration,
            simulatedRemoteIp: IPAddress.Loopback);
        using var productionClient = productionFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://promogest.internal"),
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(productionClient);
        var productionSetup = await productionClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, productionSetup.StatusCode);

        var productionLogin = await productionClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, productionLogin.StatusCode);

        Assert.True(productionLogin.Headers.TryGetValues("Set-Cookie", out var productionCookies));
        var hostSessionCookie = Assert.Single(
            productionCookies!,
            value => value.StartsWith("__Host-promogest_session=", StringComparison.Ordinal));
        var hostCookieAttributes = hostSessionCookie.ToLowerInvariant();
        Assert.Contains("; path=/", hostCookieAttributes);
        Assert.Contains("; secure", hostCookieAttributes);
        Assert.Contains("; httponly", hostCookieAttributes);
        Assert.DoesNotContain("; domain=", hostCookieAttributes);
        Assert.Contains(productionCookies!, value =>
            value.StartsWith("promogest_session=;", StringComparison.Ordinal));

        await AttachCsrfTokenAsync(productionClient);
        Assert.Equal(HttpStatusCode.OK, (await productionClient.GetAsync("/api/auth/me")).StatusCode);

        var productionLogout = await productionClient.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.NoContent, productionLogout.StatusCode);
        Assert.True(productionLogout.Headers.TryGetValues("Set-Cookie", out var productionLogoutCookies));
        var deletedHostCookie = Assert.Single(
            productionLogoutCookies!,
            value => value.StartsWith("__Host-promogest_session=;", StringComparison.Ordinal));
        var deletionAttributes = deletedHostCookie.ToLowerInvariant();
        Assert.Contains("; path=/", deletionAttributes);
        Assert.Contains("; secure", deletionAttributes);
        Assert.DoesNotContain("; domain=", deletionAttributes);
        Assert.Equal(HttpStatusCode.Unauthorized, (await productionClient.GetAsync("/api/auth/me")).StatusCode);

        var previewConnection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var previewRoot = Path.Combine(Path.GetTempPath(), $"promogest_host_cookie_preview_{Guid.NewGuid():N}");
        var previewConfiguration = new Dictionary<string, string?>
        {
            ["Security:RequireHttpsCookies"] = "false"
        };

        await using var previewFactory = CreateFactory(
            previewConnection,
            previewRoot,
            environmentName: "Development",
            extraConfiguration: previewConfiguration,
            simulatedRemoteIp: IPAddress.Loopback);
        using var previewClient = previewFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://promogest-preview.run.app"),
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(previewClient);
        var previewSetup = await previewClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, previewSetup.StatusCode);

        var previewLogin = await previewClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, previewLogin.StatusCode);
        Assert.True(previewLogin.Headers.TryGetValues("Set-Cookie", out var previewCookies));
        var previewHostCookie = Assert.Single(
            previewCookies!,
            value => value.StartsWith("__Host-promogest_session=", StringComparison.Ordinal));
        var previewAttributes = previewHostCookie.ToLowerInvariant();
        Assert.Contains("; path=/", previewAttributes);
        Assert.Contains("; secure", previewAttributes);
        Assert.Contains("; samesite=none", previewAttributes);
        Assert.Contains("partitioned", previewAttributes);
        Assert.DoesNotContain("; domain=", previewAttributes);
        Assert.DoesNotContain(previewCookies!, value =>
            value.StartsWith("promogest_session=", StringComparison.Ordinal) &&
            !value.StartsWith("promogest_session=;", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Logout_RevokesServerSession_AndRejectsCurrentAndReplayedCookies()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_logout_acceptance_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(client);
        var setup = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, setup.StatusCode);

        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var loginSession = await login.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(loginSession);

        Assert.True(login.Headers.TryGetValues("Set-Cookie", out var setCookieHeaders));
        var sessionSetCookie = Assert.Single(
            setCookieHeaders!,
            value => value.StartsWith("promogest_session=", StringComparison.Ordinal));
        var replayableSessionCookie = sessionSetCookie.Split(';', 2)[0];

        await AttachCsrfTokenAsync(client);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        // An unsafe logout without CSRF proof must be rejected and must not revoke the session.
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        var csrfRejectedLogout = await client.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.Forbidden, csrfRejectedLogout.StatusCode);
        var csrfError = await csrfRejectedLogout.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CSRF_TOKEN_INVALID", csrfError!.Code);

        await AttachCsrfTokenAsync(client);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var logout = await client.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.True(logout.Headers.TryGetValues("Set-Cookie", out var logoutCookieHeaders));
        Assert.Contains(logoutCookieHeaders!, value =>
            value.StartsWith("promogest_session=;", StringComparison.Ordinal));

        // The browser client has received the deletion cookie.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/audit")).StatusCode);

        // Replaying the pre-logout cookie from a separate client proves server-side revocation,
        // rather than relying only on the browser cookie being cleared.
        using var replayClient = factory.CreateClient();
        Assert.True(replayClient.DefaultRequestHeaders.TryAddWithoutValidation(
            "Cookie",
            replayableSessionCookie));
        Assert.Equal(HttpStatusCode.Unauthorized, (await replayClient.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await replayClient.GetAsync("/api/audit")).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var session = await db.UserSessions.SingleAsync(item => item.UserId == loginSession!.User.Id);
            Assert.True(session.IsRevoked);
            Assert.NotNull(session.RevokedAtUtc);

            Assert.Single(await db.AuditLogs
                .Where(entry =>
                    entry.EventType == "AUTH_LOGOUT" &&
                    entry.ActorUserId == loginSession.User.Id)
                .ToListAsync());
        }
    }

    [Fact]
    public async Task ConcurrentFirstRunSetup_AllowsExactlyOneWinner_AndLocksDatabase()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_race_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var clientA = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        using var clientB = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(clientA);
        await AttachCsrfTokenAsync(clientB);

        var taskA = clientA.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        var taskB = clientB.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());

        var responses = await Task.WhenAll(taskA, taskB);
        var statuses = responses.Select(r => r.StatusCode).OrderBy(s => (int)s).ToArray();

        Assert.Equal(new[] { HttpStatusCode.Created, HttpStatusCode.Conflict }, statuses);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.OrganizationSettings.CountAsync());
        Assert.Equal(1, await db.Users.CountAsync(u => u.IsSystemAdministrator));
    }
    [Fact]
    public async Task OrganizationProfileUpdate_EnforcesPermission_AuditsDenial_AndRejectsStaleConcurrency()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_org_profile_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(adminClient);
        var initialize = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        var adminLogin = await adminClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, adminLogin.StatusCode);
        await AttachCsrfTokenAsync(adminClient);

        var adminSession = await adminClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(adminSession);
        Assert.NotEqual(Guid.Empty, adminSession!.Organization.ConcurrencyStamp);

        var employeeResponse = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "org.editor",
            "Organization Editor",
            "org.editor@atlasimmo.dz",
            null,
            "OrgEditorPass#2026",
            "fr",
            new[] { Role.CommercialManagerCode }));
        Assert.Equal(HttpStatusCode.Created, employeeResponse.StatusCode);

        using var employeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(employeeClient);
        await CompleteMandatoryPasswordChangeAsync(
            employeeClient,
            "org.editor",
            "OrgEditorPass#2026",
            "OrgEditorPersonal#2026");

        UpdateOrganizationProfileRequest CreateRequest(
            string legalName,
            Guid expectedStamp,
            string? email = "direction@atlasimmo.dz")
            => new(
                legalName,
                "Atlas Immo",
                "SPA",
                "001616098765432",
                "001616098765400",
                "16/00-9876543B21",
                "16098765432",
                100_000_000m,
                "16",
                "Alger",
                "Dely Ibrahim, Alger",
                "+21321000010",
                email,
                "ar",
                expectedStamp);

        var forbidden = await employeeClient.PutAsJsonAsync(
            "/api/organization",
            CreateRequest("Unauthorized Update", adminSession.Organization.ConcurrencyStamp));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        var forbiddenError = await forbidden.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("FORBIDDEN_ORGANIZATION_MANAGE", forbiddenError!.Code);

        using (var auditScope = factory.Services.CreateScope())
        {
            var db = auditScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                entry.EventType == "ACCESS_DENIED" &&
                entry.TargetEntityType == "OrganizationSettings");
        }

        // Test-only grant: production role seeding remains unchanged; the API resolves org.manage dynamically.
        var permissionDbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_fixture.GetMigrationConnectionString(connStr))
            .Options;
        await using (var permissionDb = new AppDbContext(permissionDbOptions))
        {
            var commercialRole = await permissionDb.Roles.SingleAsync(role => role.Code == Role.CommercialManagerCode);
            var orgManagePermission = await permissionDb.Permissions.SingleAsync(permission => permission.Code == "org.manage");
            Assert.False(await permissionDb.RolePermissions.AnyAsync(link =>
                link.RoleId == commercialRole.Id && link.PermissionId == orgManagePermission.Id));
            permissionDb.RolePermissions.Add(RolePermission.Create(commercialRole.Id, orgManagePermission.Id));
            await permissionDb.SaveChangesAsync();
        }

        var editorSession = await employeeClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(editorSession);
        Assert.Contains("org.manage", editorSession!.User.Permissions);
        Assert.DoesNotContain("organization.manage", editorSession.User.Permissions);

        var employeeAuthorizedRequest = CreateRequest(
            "Promotion Atlas Updated by Employee",
            editorSession.Organization.ConcurrencyStamp,
            "editor@atlasimmo.dz");
        var employeeUpdateResponse = await employeeClient.PutAsJsonAsync("/api/organization", employeeAuthorizedRequest);
        Assert.Equal(HttpStatusCode.OK, employeeUpdateResponse.StatusCode);
        var employeeUpdatedOrganization = await employeeUpdateResponse.Content.ReadFromJsonAsync<OrganizationSummaryResponse>();
        Assert.NotNull(employeeUpdatedOrganization);
        Assert.Equal("Promotion Atlas Updated by Employee", employeeUpdatedOrganization!.LegalName);

        using (var editorAuditScope = factory.Services.CreateScope())
        {
            var db = editorAuditScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Contains(await db.AuditLogs.ToListAsync(), entry =>
                entry.EventType == "ORGANIZATION_PROFILE_UPDATED" &&
                entry.ActorUserId == editorSession.User.Id);
        }

        var authorizedRequest = CreateRequest(
            "Promotion Atlas Updated",
            employeeUpdatedOrganization.ConcurrencyStamp,
            "contact@atlasimmo.dz");
        var updateResponse = await adminClient.PutAsJsonAsync("/api/organization", authorizedRequest);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updatedOrganization = await updateResponse.Content.ReadFromJsonAsync<OrganizationSummaryResponse>();
        Assert.NotNull(updatedOrganization);
        Assert.Equal("Promotion Atlas Updated", updatedOrganization!.LegalName);
        Assert.Equal("contact@atlasimmo.dz", updatedOrganization.Email);
        Assert.NotEqual(adminSession.Organization.ConcurrencyStamp, updatedOrganization.ConcurrencyStamp);
        Assert.Equal("DZD", updatedOrganization.CurrencyCode);

        var staleRequest = authorizedRequest with { LegalName = "Stale Organization Name" };
        var staleResponse = await adminClient.PutAsJsonAsync("/api/organization", staleRequest);
        Assert.Equal(HttpStatusCode.Conflict, staleResponse.StatusCode);
        var staleError = await staleResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("ORG_CONCURRENCY_CONFLICT", staleError!.Code);

        var refreshedSession = await adminClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(refreshedSession);
        Assert.Equal("Promotion Atlas Updated", refreshedSession!.Organization.LegalName);
        Assert.Equal(updatedOrganization.ConcurrencyStamp, refreshedSession.Organization.ConcurrencyStamp);

        var invalidRequest = authorizedRequest with
        {
            Email = "not-an-email",
            ExpectedConcurrencyStamp = updatedOrganization.ConcurrencyStamp
        };
        var invalidResponse = await adminClient.PutAsJsonAsync("/api/organization", invalidRequest);
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
        var invalidError = await invalidResponse.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("ORG_EMAIL_INVALID", invalidError!.Code);
    }

    [Fact]
    public async Task SetupBootstrapGuard_AndProductionHealthSuppression_EnforcedEndToEnd()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_bootstrap_{Guid.NewGuid():N}");

        // 1. Without token, non-loopback client is rejected with 403 SETUP_BOOTSTRAP_FORBIDDEN
        await using (var remoteFactory = CreateFactory(
            connStr,
            tempRoot,
            environmentName: "Production",
            simulatedRemoteIp: IPAddress.Parse("203.0.113.10")))
        {
            using var remoteClient = remoteFactory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(remoteClient);

            var status = await remoteClient.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
            Assert.NotNull(status);
            Assert.False(status!.IsInitialized);
            Assert.False(status.RequiresBootstrapToken);

            // Production health endpoints suppress environmentMode
            var liveJson = await remoteClient.GetFromJsonAsync<System.Text.Json.JsonElement>("/health/live");
            Assert.Equal(System.Text.Json.JsonValueKind.Null, liveJson.GetProperty("environmentMode").ValueKind);
            var ready = await remoteClient.GetFromJsonAsync<HealthStatusResponse>("/health/ready");
            Assert.NotNull(ready);
            Assert.Null(ready!.EnvironmentMode);

            var blockedInit = await remoteClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, blockedInit.StatusCode);
            var blockedError = await blockedInit.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("SETUP_BOOTSTRAP_FORBIDDEN", blockedError!.Code);
        }

        // 2. With Security:SetupBootstrapToken configured, status advertises RequiresBootstrapToken and requires X-PROMOGEST-SETUP-TOKEN
        const string expectedToken = "bootstrap-secret-token-2026";
        await using (var tokenFactory = CreateFactory(
            connStr,
            tempRoot,
            environmentName: "Production",
            extraConfiguration: new Dictionary<string, string?>
            {
                ["Security:SetupBootstrapToken"] = expectedToken
            },
            simulatedRemoteIp: IPAddress.Parse("203.0.113.10")))
        {
            using var client = tokenFactory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(client);

            var statusBefore = await client.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
            Assert.NotNull(statusBefore);
            Assert.True(statusBefore!.RequiresBootstrapToken);

            // Missing token -> 403
            var missingTokenResp = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, missingTokenResp.StatusCode);

            // Wrong token -> 403
            client.DefaultRequestHeaders.Remove("X-PROMOGEST-SETUP-TOKEN");
            client.DefaultRequestHeaders.Add("X-PROMOGEST-SETUP-TOKEN", "wrong-token");
            var wrongTokenResp = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, wrongTokenResp.StatusCode);

            // Valid token -> 201 Created
            client.DefaultRequestHeaders.Remove("X-PROMOGEST-SETUP-TOKEN");
            client.DefaultRequestHeaders.Add("X-PROMOGEST-SETUP-TOKEN", expectedToken);
            var okResp = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Created, okResp.StatusCode);

            var statusAfter = await client.GetFromJsonAsync<SetupStatusResponse>("/api/setup/status");
            Assert.NotNull(statusAfter);
            Assert.True(statusAfter!.IsInitialized);
            Assert.False(statusAfter.RequiresBootstrapToken);
        }
    }

    [Fact]
    public async Task ViewerDocumentDenial_AndCustomerIdentityDocumentIsolation_EnforcedEndToEnd()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_docs_pii_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(adminClient);

        Assert.Equal(HttpStatusCode.Created, (await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest())).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await adminClient.PostAsJsonAsync("/api/auth/login", new LoginRequest("sysadmin", "AtlasAdmin#2026"))).StatusCode);
        await AttachCsrfTokenAsync(adminClient);

        var projectResp = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
            "PRJ-PII-01", "مشروع الخصوصية", "Projet Confidentialité", "16", "Alger", "Hydra",
            null, null, null, null, "Planning", 0m, 1, 10));
        Assert.Equal(HttpStatusCode.Created, projectResp.StatusCode);
        var project = await projectResp.Content.ReadFromJsonAsync<ProjectDto>();

        var viewerResp = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "viewer.pii", "Viewer PII", "viewer.pii@atlasimmo.dz", null, "ViewerPass#2026", "fr", new[] { Role.ViewerCode }));
        Assert.Equal(HttpStatusCode.Created, viewerResp.StatusCode);
        var viewer = await viewerResp.Content.ReadFromJsonAsync<UserDto>();

        var siteResp = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "site.pii", "Site PII", "site.pii@atlasimmo.dz", null, "SitePass#2026", "fr", new[] { Role.SiteEngineerCode }));
        Assert.Equal(HttpStatusCode.Created, siteResp.StatusCode);
        var siteUser = await siteResp.Content.ReadFromJsonAsync<UserDto>();

        Assert.Equal(HttpStatusCode.OK, (await adminClient.PutAsJsonAsync(
            $"/api/projects/{project!.Id}/members",
            new AssignProjectMemberRequest(viewer!.Id, "ReadOnlyObserver", false, false, false, false))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await adminClient.PutAsJsonAsync(
            $"/api/projects/{project.Id}/members",
            new AssignProjectMemberRequest(siteUser!.Id, "SiteSupervisor", false, false, true, true))).StatusCode);

        // Upload one general 'Other' document and one identity document disguised under 'Other'
        Guid generalDocId;
        Guid identityDocId;
        using (var genForm = new MultipartFormDataContent())
        {
            genForm.Add(new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("general-note")), "file", "general.txt");
            genForm.Add(new StringContent("Other"), "category");
            var genUpload = await adminClient.PostAsync($"/api/projects/{project.Id}/documents", genForm);
            Assert.Equal(HttpStatusCode.Created, genUpload.StatusCode);
            generalDocId = (await genUpload.Content.ReadFromJsonAsync<ProjectDocumentDto>())!.Id;
        }
        using (var idForm = new MultipartFormDataContent())
        {
            idForm.Add(new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31 }), "file", "cni-buyer.pdf");
            idForm.Add(new StringContent("Other"), "category");
            var idUpload = await adminClient.PostAsync($"/api/projects/{project.Id}/documents", idForm);
            Assert.Equal(HttpStatusCode.Created, idUpload.StatusCode);
            identityDocId = (await idUpload.Content.ReadFromJsonAsync<ProjectDocumentDto>())!.Id;
        }

        var customerResp = await adminClient.PostAsJsonAsync(
            $"/api/projects/{project.Id}/customers",
            new CreateProjectCustomerRequest(
                CustomerType: "Individual",
                DisplayName: "Samira Buyer",
                ContactPerson: null,
                Phone: "0550123456",
                Email: "samira@example.dz",
                Address: null,
                PreferredLanguage: "fr",
                Source: "WalkIn",
                IdentityDocumentStoredFileId: identityDocId,
                PartyId: null));
        Assert.Equal(HttpStatusCode.Created, customerResp.StatusCode);
        var createdCustomer = await customerResp.Content.ReadFromJsonAsync<ProjectCustomerDto>();
        Assert.NotNull(createdCustomer?.IdentityDocument);
        Assert.Equal(identityDocId, createdCustomer!.IdentityDocument!.Id);

        // VIEWER does not hold files.read and is denied both document listing and download
        using var viewerClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(viewerClient);
        await CompleteMandatoryPasswordChangeAsync(
            viewerClient,
            "viewer.pii",
            "ViewerPass#2026",
            "ViewerPersonal#2026");
        var viewerSession = await viewerClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.DoesNotContain("files.read", viewerSession!.User.Permissions);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewerClient.GetAsync($"/api/projects/{project.Id}/documents")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewerClient.GetAsync($"/api/projects/{project.Id}/documents/{generalDocId}/download")).StatusCode);

        // SITE_ENGINEER has files.read and projects.structure.manage, but lacks customers.read
        using var siteClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(siteClient);
        await CompleteMandatoryPasswordChangeAsync(
            siteClient,
            "site.pii",
            "SitePass#2026",
            "SitePersonal#2026");
        var siteSession = await siteClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.Contains("projects.structure.manage", siteSession!.User.Permissions);
        Assert.DoesNotContain("customers.read", siteSession.User.Permissions);

        var siteDocs = await siteClient.GetFromJsonAsync<List<ProjectDocumentDto>>($"/api/projects/{project.Id}/documents");
        Assert.NotNull(siteDocs);
        Assert.Contains(siteDocs!, d => d.Id == generalDocId);
        Assert.DoesNotContain(siteDocs!, d => d.Id == identityDocId);

        var piiDownloadResp = await siteClient.GetAsync($"/api/projects/{project.Id}/documents/{identityDocId}/download");
        Assert.Equal(HttpStatusCode.Forbidden, piiDownloadResp.StatusCode);
        var piiError = await piiDownloadResp.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("PROJECT_DOCUMENT_ACCESS_DENIED", piiError!.Code);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Contains(await db.AuditLogs.ToListAsync(), a =>
            a.EventType == "ACCESS_DENIED" &&
            a.ActorUserId == siteUser.Id &&
            a.TargetEntityId == identityDocId.ToString());
    }

    [Fact]
    public async Task Postgres18_EnforcesProjectCustomerIdentityUniquenessAcrossConcurrentPartiesAndPartyUpdates()
    {
        var connStr = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_customer_identity_guard_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connStr, tempRoot);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(adminClient);

        var initialize = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);
        var login = await adminClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(adminClient);

        var session = await adminClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(session);

        var projectResponse = await adminClient.PostAsJsonAsync(
            "/api/projects",
            new CreateProjectRequest(
                "PRJ-DUP-01", "مشروع منع التكرار", "Projet Anti-doublon", "16", "Alger", "Hydra",
                null, null, null, null, "Planning", 0m, 1, 10));
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = await projectResponse.Content.ReadFromJsonAsync<ProjectDto>();
        Assert.NotNull(project);

        var now = DateTimeOffset.UtcNow;
        var concurrentPartyOne = Party.Create(Guid.NewGuid(), PartyKind.Person, "Concurrent Buyer", now);
        var concurrentPartyTwo = Party.Create(Guid.NewGuid(), PartyKind.Person, "Concurrent Buyer", now);
        using (var partyScope = factory.Services.CreateScope())
        {
            var db = partyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Parties.AddRange(concurrentPartyOne, concurrentPartyTwo);
            await db.SaveChangesAsync();
        }

        var bothCustomersReady = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var readyCount = 0;

        async Task<string> InsertConcurrentCustomerAsync(Guid partyId)
        {
            var signaledReady = false;
            void SignalReady()
            {
                if (signaledReady)
                    return;
                signaledReady = true;
                if (Interlocked.Increment(ref readyCount) == 2)
                    bothCustomersReady.TrySetResult(true);
            }

            try
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var strategy = db.Database.CreateExecutionStrategy();

                return await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await db.Database.BeginTransactionAsync();

                    var party = await db.Parties.SingleAsync(item => item.Id == partyId);
                    var customer = ProjectCustomer.Create(
                        project!.Id,
                        party.Id,
                        null,
                        "0550123456",
                        null,
                        null,
                        "ar",
                        CustomerSource.WalkIn,
                        null,
                        session!.User.Id,
                        now);
                    customer.AttachParty(party);
                    db.ProjectCustomers.Add(customer);
                    await db.SaveChangesAsync();

                    // Keep both inserts uncommitted until both transactions have written.
                    // The deferred PostgreSQL constraint trigger must serialize the final checks.
                    SignalReady();
                    await bothCustomersReady.Task;
                    await transaction.CommitAsync();
                    return "COMMITTED";
                });
            }
            catch (PostgresException exception)
            {
                SignalReady();
                return exception.SqlState;
            }
            catch (DbUpdateException exception)
            {
                SignalReady();
                return (exception.GetBaseException() as PostgresException)?.SqlState ?? "DB_UPDATE_ERROR";
            }
        }

        var concurrentResults = await Task.WhenAll(
            InsertConcurrentCustomerAsync(concurrentPartyOne.Id),
            InsertConcurrentCustomerAsync(concurrentPartyTwo.Id));

        Assert.Single(concurrentResults, result => result == "COMMITTED");
        Assert.Single(concurrentResults, result => result == "23505");

        var renamePartyOne = Party.Create(Guid.NewGuid(), PartyKind.Person, "Original Buyer One", now);
        var renamePartyTwo = Party.Create(Guid.NewGuid(), PartyKind.Person, "Original Buyer Two", now);
        using (var relationshipScope = factory.Services.CreateScope())
        {
            var db = relationshipScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var firstCustomer = ProjectCustomer.Create(
                project!.Id, renamePartyOne.Id, null, "0550999999", null, null, "fr",
                CustomerSource.WalkIn, null, session!.User.Id, now);
            firstCustomer.AttachParty(renamePartyOne);
            var secondCustomer = ProjectCustomer.Create(
                project.Id, renamePartyTwo.Id, null, "0550999999", null, null, "fr",
                CustomerSource.WalkIn, null, session.User.Id, now);
            secondCustomer.AttachParty(renamePartyTwo);

            db.Parties.AddRange(renamePartyOne, renamePartyTwo);
            db.ProjectCustomers.AddRange(firstCustomer, secondCustomer);
            await db.SaveChangesAsync();
        }

        Exception? partyRenameFailure = null;
        using (var updateScope = factory.Services.CreateScope())
        {
            var db = updateScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var party = await db.Parties.SingleAsync(item => item.Id == renamePartyTwo.Id);
            party.UpdateIdentity(PartyKind.Person, "Original Buyer One", now.AddMinutes(1));
            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception exception)
            {
                partyRenameFailure = exception;
            }
        }

        Assert.NotNull(partyRenameFailure);
        var postgresFailure = partyRenameFailure!.GetBaseException() as PostgresException;
        Assert.NotNull(postgresFailure);
        Assert.Equal("23505", postgresFailure!.SqlState);
        Assert.Equal("ux_project_customers_project_name_phone", postgresFailure.ConstraintName);

        using (var verifyScope = factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var unchangedParty = await db.Parties.SingleAsync(item => item.Id == renamePartyTwo.Id);
            Assert.Equal("Original Buyer Two", unchangedParty.DisplayName);
            Assert.Equal(
                1,
                await db.ProjectCustomers.CountAsync(customer => customer.ProjectId == project!.Id &&
                    (customer.PartyId == concurrentPartyOne.Id || customer.PartyId == concurrentPartyTwo.Id)));
        }
    }


    [Fact]
    public async Task Postgres18_ProjectCustomerIdentityGuardMigration_RollsBackAndFailsClosedOnExistingDuplicates()
    {
        var runtimeConnectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var migrationConnectionString = _fixture.GetMigrationConnectionString(runtimeConnectionString);
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_customer_guard_migration_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(runtimeConnectionString, tempRoot);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(adminClient);

        var initialize = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);
        var login = await adminClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(adminClient);

        var projectResponse = await adminClient.PostAsJsonAsync(
            "/api/projects",
            new CreateProjectRequest(
                "PRJ-MIGRATION-GUARD", "مشروع اختبار الترحيل", "Projet Test Migration", "16", "Alger", "Hydra",
                null, null, null, null, "Planning", 0m, 1, 10));
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = await projectResponse.Content.ReadFromJsonAsync<ProjectDto>();
        Assert.NotNull(project);

        async Task<ProjectCustomerDto> CreateCustomerAsync(string displayName)
        {
            var response = await adminClient.PostAsJsonAsync(
                $"/api/projects/{project!.Id}/customers",
                new CreateProjectCustomerRequest(
                    CustomerType: "Individual",
                    DisplayName: displayName,
                    ContactPerson: null,
                    Phone: "0550123456",
                    Email: null,
                    Address: null,
                    PreferredLanguage: "ar",
                    Source: "WalkIn",
                    IdentityDocumentStoredFileId: null,
                    PartyId: null));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var customer = await response.Content.ReadFromJsonAsync<ProjectCustomerDto>();
            Assert.NotNull(customer);
            return customer!;
        }

        var firstCustomer = await CreateCustomerAsync("Migration Guard Buyer A");
        var secondCustomer = await CreateCustomerAsync("Migration Guard Buyer B");
        Assert.NotEqual(firstCustomer.PartyId, secondCustomer.PartyId);

        var migrationOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(
                migrationConnectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using var migrationDb = new AppDbContext(migrationOptions);
        var migrator = migrationDb.GetService<IMigrator>();

        // Prove the Down path removes only the DB guard objects and leaves the schema/data intact.
        await migrator.MigrateAsync("20261116100000_RetireProjectCustomerIdentityMirrors");
        await using (var ownerConnection = new NpgsqlConnection(migrationConnectionString))
        {
            await ownerConnection.OpenAsync();
            await using var triggerCount = new NpgsqlCommand(
                "SELECT COUNT(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN " +
                "('trg_project_customers_identity_unique', 'trg_parties_identity_unique');",
                ownerConnection);
            Assert.Equal(0L, (long)(await triggerCount.ExecuteScalarAsync())!);
        }

        // Simulate duplicate legacy data that could have appeared before the guard migration.
        await migrationDb.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE parties
            SET display_name = {"Migration Guard Buyer A"},
                normalized_display_name = {"MIGRATION GUARD BUYER A"}
            WHERE id = {secondCustomer.PartyId};
            """);

        var migrationFailure = await Record.ExceptionAsync(() => migrator.MigrateAsync());
        Assert.NotNull(migrationFailure);
        var postgresFailure = migrationFailure!.GetBaseException() as PostgresException;
        Assert.NotNull(postgresFailure);
        Assert.Contains("Cannot enable project customer identity uniqueness", postgresFailure!.MessageText);

        var appliedAfterRejectedMigration = await migrationDb.Database.GetAppliedMigrationsAsync();
        Assert.DoesNotContain(
            "20261116120000_EnforceProjectCustomerIdentityUniqueness",
            appliedAfterRejectedMigration);

        // The failed preflight must not delete, merge, or rewrite customer records.
        Assert.Equal(
            2,
            await migrationDb.ProjectCustomers.CountAsync(customer => customer.ProjectId == project!.Id));
        var duplicateNames = await migrationDb.Parties
            .Where(party => party.Id == firstCustomer.PartyId || party.Id == secondCustomer.PartyId)
            .Select(party => party.NormalizedDisplayName)
            .Distinct()
            .CountAsync();
        Assert.Equal(1, duplicateNames);

        // Reconcile the synthetic duplicate and prove the migration can be applied cleanly.
        await migrationDb.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE parties
            SET display_name = {"Migration Guard Buyer B"},
                normalized_display_name = {"MIGRATION GUARD BUYER B"}
            WHERE id = {secondCustomer.PartyId};
            """);
        await migrator.MigrateAsync();

        var appliedAfterRecovery = await migrationDb.Database.GetAppliedMigrationsAsync();
        Assert.Contains(
            "20261116120000_EnforceProjectCustomerIdentityUniqueness",
            appliedAfterRecovery);

        await using (var ownerConnection = new NpgsqlConnection(migrationConnectionString))
        {
            await ownerConnection.OpenAsync();
            await using var triggerCount = new NpgsqlCommand(
                "SELECT COUNT(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN " +
                "('trg_project_customers_identity_unique', 'trg_parties_identity_unique');",
                ownerConnection);
            Assert.Equal(2L, (long)(await triggerCount.ExecuteScalarAsync())!);
        }
    }


    [Fact]
    public async Task TemporaryEmployeePassword_RequiresChangeBeforeBusinessAccess_ExpiresAndAdminResetRevokesSessions()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_password_lifecycle_{Guid.NewGuid():N}");

        await using var factory = CreateFactory(connectionString, tempRoot);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(adminClient);
        var setup = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, setup.StatusCode);

        var adminLogin = await adminClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, adminLogin.StatusCode);
        await AttachCsrfTokenAsync(adminClient);

        const string firstTemporaryPassword = "EmployeeTemp#2026";
        var create = await adminClient.PostAsJsonAsync(
            "/api/users",
            new CreateEmployeeRequest(
                "temp.employee",
                "Temporary Employee",
                "temporary.employee@atlasimmo.dz",
                null,
                firstTemporaryPassword,
                "fr",
                new[] { Role.CommercialManagerCode }));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var created = await create.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(created);
        Assert.True(created!.MustChangePasswordAtNextLogin);
        Assert.NotNull(created.PasswordChangeRequiredUntilUtc);
        Assert.InRange(
            created.PasswordChangeRequiredUntilUtc!.Value,
            DateTimeOffset.UtcNow.AddHours(23),
            DateTimeOffset.UtcNow.AddHours(25));

        using var employeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(employeeClient);
        await CompleteMandatoryPasswordChangeAsync(
            employeeClient,
            "temp.employee",
            firstTemporaryPassword,
            "EmployeePersonal#2026");

        var normalSession = await employeeClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(normalSession);
        Assert.False(normalSession!.User.MustChangePasswordAtNextLogin);
        Assert.Contains("projects.read", normalSession.User.Permissions);

        // Administrative reset starts a new temporary-password cycle and revokes every
        // currently authenticated session for that user.
        const string secondTemporaryPassword = "ResetTemp#2026";
        var reset = await adminClient.PostAsJsonAsync(
            $"/api/users/{created.Id}/reset-password",
            new ResetUserPasswordRequest(secondTemporaryPassword));
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await employeeClient.GetAsync("/api/auth/me")).StatusCode);

        using var resetEmployeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(resetEmployeeClient);
        await CompleteMandatoryPasswordChangeAsync(
            resetEmployeeClient,
            "temp.employee",
            secondTemporaryPassword,
            "EmployeeAfterReset#2026");

        // Expiry is enforced at login, not merely hidden by the UI or middleware.
        const string expiredTemporaryPassword = "ExpiredTemp#2026";
        var expiredReset = await adminClient.PostAsJsonAsync(
            $"/api/users/{created.Id}/reset-password",
            new ResetUserPasswordRequest(expiredTemporaryPassword));
        Assert.Equal(HttpStatusCode.NoContent, expiredReset.StatusCode);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE users SET password_change_required_until_utc = {DateTimeOffset.UtcNow.AddMinutes(-1)} WHERE id = {created.Id}");
        }

        using var expiredClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(expiredClient);
        var expiredLogin = await expiredClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("temp.employee", expiredTemporaryPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, expiredLogin.StatusCode);
        var expiredError = await expiredLogin.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("AUTH_INVALID_CREDENTIALS", expiredError!.Code);
        Assert.Equal(HttpStatusCode.Unauthorized, (await expiredClient.GetAsync("/api/auth/me")).StatusCode);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var employee = await db.Users.SingleAsync(item => item.Id == created.Id);
            Assert.True(employee.MustChangePasswordAtNextLogin);
            Assert.True(employee.PasswordChangeRequiredUntilUtc <= DateTimeOffset.UtcNow);

            var auditSummaries = await db.AuditLogs.Select(item => item.Summary).ToListAsync();
            Assert.DoesNotContain(auditSummaries, item =>
                item.Contains(firstTemporaryPassword, StringComparison.Ordinal) ||
                item.Contains(secondTemporaryPassword, StringComparison.Ordinal) ||
                item.Contains(expiredTemporaryPassword, StringComparison.Ordinal));
        }
    }


    [Fact]
    public async Task PasswordRotationMigration_PreservesExistingUsersWithoutForcingRotation()
    {
        var runtimeConnectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var migrationConnectionString = _fixture.GetMigrationConnectionString(runtimeConnectionString);
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(
                migrationConnectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using var db = new AppDbContext(options);
        var migrator = db.GetService<IMigrator>();
        const string previousMigration = "20261116120000_EnforceProjectCustomerIdentityUniqueness";
        const string passwordRotationMigration = "20261120130000_RequirePasswordChangeAfterAdminReset";

        // Return this isolated database to the schema immediately before password rotation.
        await migrator.MigrateAsync(previousMigration);

        var existingUserId = Guid.NewGuid();
        const string existingPasswordHash = "existing-password-hash-must-be-preserved";
        var createdAtUtc = new DateTimeOffset(2026, 11, 20, 12, 0, 0, TimeSpan.Zero);
        var securityStamp = Guid.NewGuid();
        var concurrencyStamp = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO users (
                id,
                username,
                normalized_username,
                full_name,
                email,
                normalized_email,
                phone,
                password_hash,
                is_system_administrator,
                is_active,
                preferred_language,
                failed_login_attempts,
                lockout_end_utc,
                last_login_at_utc,
                security_stamp,
                created_at_utc,
                updated_at_utc,
                concurrency_stamp
            )
            VALUES (
                {existingUserId},
                {"upgrade.employee"},
                {"UPGRADE.EMPLOYEE"},
                {"Existing Employee"},
                {"upgrade.employee@elbahdja.dz"},
                {"UPGRADE.EMPLOYEE@ELBAHDJA.DZ"},
                {(string?)null},
                {existingPasswordHash},
                {false},
                {true},
                {"ar"},
                {0},
                {(DateTimeOffset?)null},
                {(DateTimeOffset?)null},
                {securityStamp},
                {createdAtUtc},
                {createdAtUtc},
                {concurrencyStamp}
            );
            """);

        // The migration must add the new marker with a false default and leave stored credentials intact.
        await migrator.MigrateAsync(passwordRotationMigration);
        db.ChangeTracker.Clear();

        var upgradedUser = await db.Users.AsNoTracking()
            .SingleAsync(user => user.Id == existingUserId);
        Assert.Equal("upgrade.employee", upgradedUser.Username);
        Assert.Equal(existingPasswordHash, upgradedUser.PasswordHash);
        Assert.False(upgradedUser.MustChangePasswordAtNextLogin);
        Assert.Null(upgradedUser.PasswordChangeRequiredUntilUtc);
        Assert.Equal(createdAtUtc, upgradedUser.CreatedAtUtc);
        Assert.Contains(passwordRotationMigration, await db.Database.GetAppliedMigrationsAsync());
    }


}
