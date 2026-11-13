using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Npgsql;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Audit;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Projects;
using PromoGest.Contracts.Setup;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class PostgreSql18IntegrationFixture : IAsyncLifetime
{
    private PostgreSqlContainer? _container;
    private string _provisionConnectionString = string.Empty;
    private string _migrationConnectionString = string.Empty;
    private string _runtimeConnectionString = string.Empty;

    public async Task InitializeAsync()
    {
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

    public async Task<string> CreateIsolatedDatabaseConnectionStringAsync()
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

        await using (var ownerConnection = new NpgsqlConnection(migrationConnection))
        {
            await ownerConnection.OpenAsync();
            await using var grants = new NpgsqlCommand(
                "GRANT USAGE ON SCHEMA public TO promogest_app; " +
                "ALTER DEFAULT PRIVILEGES FOR ROLE promogest_owner IN SCHEMA public " +
                "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO promogest_app; " +
                "ALTER DEFAULT PRIVILEGES FOR ROLE promogest_owner IN SCHEMA public " +
                "GRANT USAGE, SELECT ON SEQUENCES TO promogest_app;",
                ownerConnection);
            await grants.ExecuteNonQueryAsync();
        }

        var migrationOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(migrationConnection, npgsql =>
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using (var migrationDb = new AppDbContext(migrationOptions))
        {
            await migrationDb.Database.MigrateAsync();
            await DbInitializer.SeedRolesAndPermissionsAsync(migrationDb);

            var applied = await migrationDb.Database.GetAppliedMigrationsAsync();
            if (!applied.Contains("20261113000003_SystemAdministratorInvariant"))
            {
                throw new InvalidOperationException(
                    "The SystemAdministratorInvariant migration was not discovered and applied.");
            }
        }

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

    public async Task DisposeAsync()
    {
        if (_container is not null)
        {
            await _container.DisposeAsync();
        }
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

            entries.Enqueue($"[{logLevel}] {categoryName}: {message}");
        }
    }
}

public sealed class PostgresEndToEndTests : IClassFixture<PostgreSql18IntegrationFixture>
{
    private readonly PostgreSql18IntegrationFixture _fixture;
    private readonly BufferingLoggerProvider _serverLogs = new();

    public PostgresEndToEndTests(PostgreSql18IntegrationFixture fixture)
    {
        _fixture = fixture;
    }

    private WebApplicationFactory<Program> CreateFactory(string connectionString, string tempRoot)
    {
        Directory.CreateDirectory(tempRoot);
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureLogging(logging =>
            {
                logging.AddProvider(_serverLogs);
                logging.SetMinimumLevel(LogLevel.Information);
            });
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = connectionString,
                    ["Security:RequireHttpsCookies"] = "false",
                    ["Storage:RootDirectory"] = Path.Combine(tempRoot, "storage"),
                    ["Security:DataProtectionKeyDirectory"] = Path.Combine(tempRoot, "dp-keys")
                });
            });
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<AppDbContext>();
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql(connectionString, npgsql =>
                        npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));
            });
        });
    }

    private static async Task AttachCsrfTokenAsync(HttpClient client)
    {
        var resp = await client.GetAsync("/api/auth/csrf");
        resp.EnsureSuccessStatusCode();
        var payload = await resp.Content.ReadFromJsonAsync<CsrfTokenResponse>();
        Assert.NotNull(payload);
        client.DefaultRequestHeaders.Remove(payload!.HeaderName);
        client.DefaultRequestHeaders.Add(payload.HeaderName, payload.Token);
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

            var apiNotFound = await adminClient.GetAsync("/api/nonexistent-endpoint");
            Assert.Equal(HttpStatusCode.NotFound, apiNotFound.StatusCode);
            var notFoundErr = await apiNotFound.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("ENDPOINT_NOT_FOUND", notFoundErr!.Code);

            var healthNotFound = await adminClient.GetAsync("/health/nonexistent");
            Assert.Equal(HttpStatusCode.NotFound, healthNotFound.StatusCode);

            var readyResp = await adminClient.GetFromJsonAsync<HealthStatusResponse>("/health/ready");
            Assert.NotNull(readyResp);
            Assert.True(readyResp!.DatabaseConnected);
            Assert.False(readyResp.IsInitialized);

            // 2. CSRF protection blocks state-changing requests lacking X-CSRF-TOKEN
            var missingCsrfInit = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
            Assert.Equal(HttpStatusCode.Forbidden, missingCsrfInit.StatusCode);
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

            var projectResp = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
                "PRJ-16-009", "إقامة الأطلس", "Résidence Atlas", "16", "Alger", "Dely Ibrahim",
                null, null, null, null, "Commercialization", 450_000_000m, 4, 64));
            Assert.Equal(HttpStatusCode.Created, projectResp.StatusCode);
            var createdProject = await projectResp.Content.ReadFromJsonAsync<ProjectDto>();

            // 8. Authenticate as employee -> test CSRF check, IDOR rejection, role escalation rejection, membership grant & revoke, deactivation session invalidation
            using var employeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(employeeClient);

            var empLogin = await employeeClient.PostAsJsonAsync("/api/auth/login", new LoginRequest("yasmine.sales", "YasminePass#2026"));
            Assert.Equal(HttpStatusCode.OK, empLogin.StatusCode);
            await AttachCsrfTokenAsync(employeeClient);

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

            var allowedAttempt = await employeeClient.GetAsync($"/api/projects/{createdProject.Id}");
            Assert.Equal(HttpStatusCode.OK, allowedAttempt.StatusCode);

            // Revoke membership -> access blocked again
            var revokeResp = await adminClient.DeleteAsync($"/api/projects/{createdProject.Id}/members/{createdEmployee.Id}");
            Assert.Equal(HttpStatusCode.OK, revokeResp.StatusCode);

            var revokedAttempt = await employeeClient.GetAsync($"/api/projects/{createdProject.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, revokedAttempt.StatusCode);

            // Deactivate employee -> existing session cookie becomes invalid immediately (401)
            var deactivateResp = await adminClient.PatchAsJsonAsync($"/api/users/{createdEmployee.Id}/status", new SetUserStatusRequest(false));
            Assert.Equal(HttpStatusCode.OK, deactivateResp.StatusCode);

            var postDeactivateMe = await employeeClient.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, postDeactivateMe.StatusCode);
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
}
