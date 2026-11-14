using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
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
using PromoGest.Infrastructure;
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
                    ["Storage:RootDirectory"] = Path.Combine(tempRoot, "storage")
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

            var projectResp = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
                "PRJ-16-009", "إقامة الأطلس", "Résidence Atlas", "16", "Alger", "Dely Ibrahim",
                null, null, null, null, "Commercialization", 450_000_000m, 4, 64));
            Assert.Equal(HttpStatusCode.Created, projectResp.StatusCode);
            var createdProject = await projectResp.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(createdProject);

            // Project master-data updates are permitted to the system administrator and preserve the immutable project code.
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
                470_000_000m,
                4,
                64);
            var updateProjectResp = await adminClient.PutAsJsonAsync($"/api/projects/{createdProject!.Id}", projectUpdate);
            Assert.Equal(HttpStatusCode.OK, updateProjectResp.StatusCode);
            var updatedProject = await updateProjectResp.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(updatedProject);
            Assert.Equal(createdProject.Code, updatedProject!.Code);
            Assert.Equal(projectUpdate.NameAr, updatedProject.NameAr);
            Assert.Equal(projectUpdate.WilayaCode, updatedProject.WilayaCode);
            Assert.Equal(projectUpdate.Status, updatedProject.Status);
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var persistedProject = await db.Projects.SingleAsync(project => project.Id == createdProject.Id);
                Assert.Equal(projectUpdate.NameFr, persistedProject.NameFr);
                Assert.Equal(projectUpdate.EstimatedBudgetDzd, persistedProject.EstimatedBudgetDzd);
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

            using var directorClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(directorClient);
            var directorLoginResp = await directorClient.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest("youssef.director", "YoussefDirector#2026"));
            Assert.Equal(HttpStatusCode.OK, directorLoginResp.StatusCode);
            await AttachCsrfTokenAsync(directorClient);

            var directorUpdate = projectUpdate with
            {
                NameAr = "إقامة الأطلس - تحديث مدير المشاريع",
                NameFr = "Résidence Atlas - Mise à jour du directeur"
            };
            var directorUpdateResp = await directorClient.PutAsJsonAsync(
                $"/api/projects/{createdProject.Id}",
                directorUpdate);
            Assert.Equal(HttpStatusCode.OK, directorUpdateResp.StatusCode);
            var directorUpdatedProject = await directorUpdateResp.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.NotNull(directorUpdatedProject);
            Assert.Equal(directorUpdate.NameAr, directorUpdatedProject!.NameAr);

            var directorBuildingResponse = await directorClient.PostAsJsonAsync(
                $"{structureUrl}/buildings",
                new CreateBuildingRequest("B", "العمارة ب", "Bâtiment B", "Planned"));
            Assert.Equal(HttpStatusCode.OK, directorBuildingResponse.StatusCode);

            // 8. Authenticate as employee -> test CSRF check, IDOR rejection, role escalation rejection, membership grant & revoke, deactivation session invalidation
            using var employeeClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await AttachCsrfTokenAsync(employeeClient);

            var empLogin = await employeeClient.PostAsJsonAsync("/api/auth/login", new LoginRequest("yasmine.sales", "YasminePass#2026"));
            Assert.Equal(HttpStatusCode.OK, empLogin.StatusCode);
            await AttachCsrfTokenAsync(employeeClient);

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

            // Reassign the same employee to cover the existing-membership UPDATE path.
            var updateMembershipResp = await adminClient.PutAsJsonAsync($"/api/projects/{createdProject.Id}/members",
                new AssignProjectMemberRequest(createdEmployee.Id, "CommercialAgent", true, false, false, false));
            Assert.Equal(HttpStatusCode.OK, updateMembershipResp.StatusCode);

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
            }

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
