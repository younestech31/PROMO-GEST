using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Common;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Fact]
    public async Task UserSessionConcurrencyMigration_BackfillsExistingSessionsBeforeEnforcingNotNull()
    {
        var runtimeConnectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync(
            "20261121120000_CanonicalizeAlgerianProjectCustomerPhones");
        var migrationConnectionString = _fixture.GetMigrationConnectionString(runtimeConnectionString);
        var nowUtc = DateTimeOffset.UtcNow;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(runtimeConnectionString)
            .Options;

        Guid userId;
        Guid securityStamp;
        await using (var runtimeDb = new AppDbContext(options))
        {
            var user = User.CreateEmployee(
                "session.migration",
                "Session Migration User",
                "session.migration@promogest.dz",
                null,
                "migration-test-only-hash",
                "ar",
                nowUtc);
            await runtimeDb.Users.AddAsync(user);
            await runtimeDb.SaveChangesAsync();
            userId = user.Id;
            securityStamp = user.SecurityStamp;
        }

        var firstSessionId = Guid.NewGuid();
        var secondSessionId = Guid.NewGuid();
        await using (var ownerConnection = new Npgsql.NpgsqlConnection(migrationConnectionString))
        {
            await ownerConnection.OpenAsync();
            await using var insertLegacySessions = new Npgsql.NpgsqlCommand(
                """
                INSERT INTO user_sessions (
                    id, user_id, token_hash, security_stamp,
                    created_at_utc, expires_at_utc, last_seen_at_utc,
                    ip_address, user_agent, is_revoked, revoked_at_utc)
                VALUES
                    (@first_id, @user_id, @first_hash, @security_stamp,
                     @created_at, @expires_at, @last_seen_at,
                     '192.0.2.40', 'Migration test device one', FALSE, NULL),
                    (@second_id, @user_id, @second_hash, @security_stamp,
                     @created_at, @expires_at, @last_seen_at,
                     '192.0.2.41', 'Migration test device two', FALSE, NULL);
                """,
                ownerConnection);
            insertLegacySessions.Parameters.AddWithValue("first_id", firstSessionId);
            insertLegacySessions.Parameters.AddWithValue("second_id", secondSessionId);
            insertLegacySessions.Parameters.AddWithValue("user_id", userId);
            insertLegacySessions.Parameters.AddWithValue("first_hash", new string('d', 64));
            insertLegacySessions.Parameters.AddWithValue("second_hash", new string('e', 64));
            insertLegacySessions.Parameters.AddWithValue("security_stamp", securityStamp);
            insertLegacySessions.Parameters.AddWithValue("created_at", nowUtc);
            insertLegacySessions.Parameters.AddWithValue("expires_at", nowUtc.AddHours(12));
            insertLegacySessions.Parameters.AddWithValue("last_seen_at", nowUtc);
            Assert.Equal(2, await insertLegacySessions.ExecuteNonQueryAsync());
        }

        await using (var migrationDb = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(migrationConnectionString)
                .Options))
        {
            await migrationDb.Database.MigrateAsync();
            var applied = await migrationDb.Database.GetAppliedMigrationsAsync();
            Assert.Contains("20261123151500_UserSessionConcurrencyStamp", applied);

            var migratedSessions = await migrationDb.UserSessions
                .AsNoTracking()
                .Where(session => session.UserId == userId)
                .ToListAsync();
            Assert.Equal(2, migratedSessions.Count);
            Assert.All(migratedSessions, session => Assert.NotEqual(Guid.Empty, session.ConcurrencyStamp));
            Assert.Equal(
                2,
                migratedSessions.Select(session => session.ConcurrencyStamp).Distinct().Count());
        }
    }

    [Fact]
    public async Task SessionManagement_ListOwnActiveSessionsWithoutSecrets_AndRevokeSelectedSession()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_sessions_list_{Guid.NewGuid():N}");
        await using var factory = CreateFactory(connectionString, tempRoot);
        using var firstClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
        using var secondClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(firstClient);
        var initialize = await firstClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        await AttachCsrfTokenAsync(firstClient);
        var firstLogin = await firstClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, firstLogin.StatusCode);
        await AttachCsrfTokenAsync(firstClient);

        await AttachCsrfTokenAsync(secondClient);
        var secondLogin = await secondClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, secondLogin.StatusCode);
        await AttachCsrfTokenAsync(secondClient);

        var listResponse = await firstClient.GetAsync("/api/auth/sessions");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var sessions = await listResponse.Content.ReadFromJsonAsync<List<UserSessionDto>>();
        Assert.NotNull(sessions);
        Assert.Equal(2, sessions!.Count);
        var currentSession = Assert.Single(sessions, session => session.IsCurrentSession);
        var otherSession = Assert.Single(sessions, session => !session.IsCurrentSession);
        Assert.NotEqual(currentSession.Id, otherSession.Id);

        var json = await listResponse.Content.ReadAsStringAsync();
        Assert.False(json.Contains("tokenHash", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("securityStamp", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("opaqueToken", StringComparison.OrdinalIgnoreCase));

        // CSRF is required even though the endpoint only acts on the current user's sessions.
        firstClient.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        var blocked = await firstClient.PostAsJsonAsync(
            $"/api/auth/sessions/{otherSession.Id}/revoke",
            new RevokeUserSessionRequest(EndCurrentSession: false));
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        var blockedError = await blocked.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CSRF_TOKEN_INVALID", blockedError!.Code);
        await AttachCsrfTokenAsync(firstClient);

        var revoke = await firstClient.PostAsJsonAsync(
            $"/api/auth/sessions/{otherSession.Id}/revoke",
            new RevokeUserSessionRequest(EndCurrentSession: false));
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);

        // The other device's still-present cookie is no longer accepted by the server.
        var replay = await secondClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var remainingResponse = await firstClient.GetAsync("/api/auth/sessions");
        Assert.Equal(HttpStatusCode.OK, remainingResponse.StatusCode);
        var remaining = await remainingResponse.Content.ReadFromJsonAsync<List<UserSessionDto>>();
        Assert.NotNull(remaining);
        var onlySession = Assert.Single(remaining!);
        Assert.Equal(currentSession.Id, onlySession.Id);
        Assert.True(onlySession.IsCurrentSession);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            1,
            await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "AUTH_SESSION_REVOKED_BY_USER" &&
                entry.TargetEntityType == "UserSession" &&
                entry.TargetEntityId == otherSession.Id.ToString()));
    }

    [Fact]
    public async Task SessionManagement_RejectsForeignExpiredAndAlreadyRevokedSessionIds()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_sessions_scope_{Guid.NewGuid():N}");
        await using var factory = CreateFactory(connectionString, tempRoot);
        using var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(client);
        var initialize = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        await AttachCsrfTokenAsync(client);
        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(client);

        var current = await client.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(current);
        var nowUtc = DateTimeOffset.UtcNow;

        Guid foreignSessionId;
        Guid expiredSessionId;
        Guid revokedSessionId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var currentUser = await db.Users.SingleAsync(user => user.Id == current!.User.Id);
            var foreignUser = User.CreateEmployee(
                "session.other",
                "Other Session Owner",
                "session.other@promogest.dz",
                null,
                "test-only-hash",
                "ar",
                nowUtc);

            var expired = UserSession.Create(
                currentUser.Id,
                new string('a', 64),
                currentUser.SecurityStamp,
                nowUtc.AddHours(-3),
                nowUtc.AddHours(-2),
                "192.0.2.21",
                "Expired session");
            var revoked = UserSession.Create(
                currentUser.Id,
                new string('b', 64),
                currentUser.SecurityStamp,
                nowUtc.AddMinutes(-5),
                nowUtc.AddHours(2),
                "192.0.2.22",
                "Revoked session");
            revoked.Revoke(nowUtc.AddMinutes(-1));
            var foreign = UserSession.Create(
                foreignUser.Id,
                new string('c', 64),
                foreignUser.SecurityStamp,
                nowUtc,
                nowUtc.AddHours(2),
                "192.0.2.23",
                "Foreign account session");

            await db.Users.AddAsync(foreignUser);
            await db.UserSessions.AddRangeAsync(expired, revoked, foreign);
            await db.SaveChangesAsync();

            foreignSessionId = foreign.Id;
            expiredSessionId = expired.Id;
            revokedSessionId = revoked.Id;
        }

        foreach (var sessionId in new[] { foreignSessionId, expiredSessionId, revokedSessionId })
        {
            var attempt = await client.PostAsJsonAsync(
                $"/api/auth/sessions/{sessionId}/revoke",
                new RevokeUserSessionRequest(EndCurrentSession: false));
            Assert.Equal(HttpStatusCode.NotFound, attempt.StatusCode);
            var error = await attempt.Content.ReadFromJsonAsync<ApiErrorResponse>();
            Assert.Equal("SESSION_NOT_FOUND", error!.Code);
        }

        var listed = await client.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
        Assert.NotNull(listed);
        var onlyCurrent = Assert.Single(listed!);
        Assert.True(onlyCurrent.IsCurrentSession);
    }

    [Fact]
    public async Task SessionManagement_CurrentSessionRevocationRequiresConfirmationAndClearsCookie()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_sessions_current_{Guid.NewGuid():N}");
        await using var factory = CreateFactory(connectionString, tempRoot);
        using var currentClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
        using var otherClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(currentClient);
        var initialize = await currentClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        await AttachCsrfTokenAsync(currentClient);
        Assert.Equal(
            HttpStatusCode.OK,
            (await currentClient.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest("sysadmin", "AtlasAdmin#2026"))).StatusCode);
        await AttachCsrfTokenAsync(currentClient);

        await AttachCsrfTokenAsync(otherClient);
        Assert.Equal(
            HttpStatusCode.OK,
            (await otherClient.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest("sysadmin", "AtlasAdmin#2026"))).StatusCode);
        await AttachCsrfTokenAsync(otherClient);

        var sessions = await currentClient.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
        Assert.NotNull(sessions);
        var current = Assert.Single(sessions!, session => session.IsCurrentSession);

        var unconfirmed = await currentClient.PostAsJsonAsync(
            $"/api/auth/sessions/{current.Id}/revoke",
            new RevokeUserSessionRequest(EndCurrentSession: false));
        Assert.Equal(HttpStatusCode.Conflict, unconfirmed.StatusCode);
        var unconfirmedError = await unconfirmed.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CURRENT_SESSION_CONFIRMATION_REQUIRED", unconfirmedError!.Code);

        var confirmed = await currentClient.PostAsJsonAsync(
            $"/api/auth/sessions/{current.Id}/revoke",
            new RevokeUserSessionRequest(EndCurrentSession: true));
        Assert.Equal(HttpStatusCode.NoContent, confirmed.StatusCode);
        Assert.True(confirmed.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies!, value => value.StartsWith("promogest_session=;", StringComparison.Ordinal));

        Assert.Equal(HttpStatusCode.Unauthorized, (await currentClient.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await otherClient.GetAsync("/api/auth/me")).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            1,
            await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "AUTH_SESSION_REVOKED_BY_USER" &&
                entry.TargetEntityType == "UserSession" &&
                entry.TargetEntityId == current.Id.ToString()));
    }

    [Fact]
    public async Task SessionManagement_ConcurrentRevocationCommitsOneUpdateAndOneAudit()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_sessions_concurrent_{Guid.NewGuid():N}");
        var barrier = new SessionRevocationSaveChangesBarrier();
        await using var factory = CreateFactory(
            connectionString,
            tempRoot,
            saveChangesInterceptor: barrier);
        using var firstClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
        using var secondClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
        using var targetClient = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        await AttachCsrfTokenAsync(firstClient);
        var initialize = await firstClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        foreach (var client in new[] { firstClient, secondClient, targetClient })
        {
            await AttachCsrfTokenAsync(client);
            var login = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest("sysadmin", "AtlasAdmin#2026"));
            Assert.Equal(HttpStatusCode.OK, login.StatusCode);
            await AttachCsrfTokenAsync(client);
        }

        var targetSessions = await targetClient.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
        Assert.NotNull(targetSessions);
        var target = Assert.Single(targetSessions!, session => session.IsCurrentSession);

        barrier.Arm(2);
        HttpResponseMessage[] responses;
        try
        {
            responses = await Task.WhenAll(
                firstClient.PostAsJsonAsync(
                    $"/api/auth/sessions/{target.Id}/revoke",
                    new RevokeUserSessionRequest(EndCurrentSession: false)),
                secondClient.PostAsJsonAsync(
                    $"/api/auth/sessions/{target.Id}/revoke",
                    new RevokeUserSessionRequest(EndCurrentSession: false)));
        }
        finally
        {
            barrier.Disarm();
        }

        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.NoContent));
        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
        var conflict = await responses
            .Single(response => response.StatusCode == HttpStatusCode.Conflict)
            .Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CONCURRENCY_CONFLICT", conflict!.Code);
        Assert.Equal(HttpStatusCode.Unauthorized, (await targetClient.GetAsync("/api/auth/me")).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            1,
            await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "AUTH_SESSION_REVOKED_BY_USER" &&
                entry.TargetEntityType == "UserSession" &&
                entry.TargetEntityId == target.Id.ToString()));
    }

    private sealed class SessionRevocationSaveChangesBarrier : SaveChangesInterceptor
    {
        private int _armed;
        private int _expectedArrivals;
        private int _arrivals;
        private TaskCompletionSource<bool>? _release;

        public void Arm(int expectedArrivals)
        {
            if (expectedArrivals < 2)
            {
                throw new ArgumentOutOfRangeException(nameof(expectedArrivals));
            }

            Interlocked.Exchange(ref _arrivals, 0);
            Volatile.Write(ref _expectedArrivals, expectedArrivals);
            Volatile.Write(
                ref _release,
                new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously));
            Volatile.Write(ref _armed, 1);
        }

        public void Disarm()
        {
            Interlocked.Exchange(ref _armed, 0);
            Volatile.Read(ref _release)?.TrySetResult(true);
        }

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (Volatile.Read(ref _armed) == 0 || eventData.Context is not DbContext context)
            {
                return result;
            }

            context.ChangeTracker.DetectChanges();
            var hasSessionRevocation = context.ChangeTracker
                .Entries<UserSession>()
                .Any(entry =>
                    entry.State == EntityState.Modified &&
                    entry.Property(session => session.IsRevoked).IsModified &&
                    entry.Property(session => session.IsRevoked).CurrentValue);

            if (!hasSessionRevocation)
            {
                return result;
            }

            var release = Volatile.Read(ref _release);
            if (release is null)
            {
                throw new InvalidOperationException(
                    "Session-revocation test barrier was armed without a release gate.");
            }

            if (Interlocked.Increment(ref _arrivals) == Volatile.Read(ref _expectedArrivals))
            {
                release.TrySetResult(true);
            }

            await release.Task.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            return result;
        }
    }
}
