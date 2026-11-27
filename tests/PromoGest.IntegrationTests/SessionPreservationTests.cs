using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;
using PromoGest.Infrastructure.Security;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SessionManagement_ResetOrDeactivationRevokesAllEmployeeSessionsWithoutRevokingAdministrator(bool resetPassword)
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_session_preservation_{Guid.NewGuid():N}"));
        using var admin = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(admin);
        using var initialize = await admin.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);
        await AttachCsrfTokenAsync(admin);
        using var adminLogin = await admin.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, adminLogin.StatusCode);
        var administrator = await adminLogin.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(administrator);
        await AttachCsrfTokenAsync(admin);

        Guid employeeId;
        Guid employeeSecurityStamp;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var employee = User.CreateEmployee("sessions.employee", "Session Employee", "sessions@example.test", null,
                new Pbkdf2PasswordHasher().HashPassword("SessionEmployee#2026"), "fr", DateTimeOffset.UtcNow);
            db.Users.Add(employee);
            await db.SaveChangesAsync();
            employeeId = employee.Id;
            employeeSecurityStamp = employee.SecurityStamp;
        }

        // Independent jars retain both original cookies in memory only; never uploaded as evidence.
        using var first = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        using var second = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var originalCookies = new List<string>();
        foreach (var device in new[] { first, second })
        {
            await AttachCsrfTokenAsync(device);
            using var login = await device.PostAsJsonAsync("/api/auth/login",
                new LoginRequest("sessions.employee", "SessionEmployee#2026"));
            Assert.Equal(HttpStatusCode.OK, login.StatusCode);
            var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie"), value =>
                value.StartsWith("promogest_session=", StringComparison.Ordinal));
            originalCookies.Add(cookie.Split(';', 2)[0]);
            Assert.Equal(HttpStatusCode.OK, (await device.GetAsync("/api/auth/me")).StatusCode);
            var inventory = await device.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
            Assert.NotNull(inventory);
            Assert.Single(inventory!, item => item.IsCurrentSession);
        }
        Assert.NotEqual(originalCookies[0], originalCookies[1]);
        var before = await first.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
        Assert.Equal(2, before!.Count);
        var sessionIds = before.Select(item => item.Id).ToHashSet();

        if (resetPassword)
        {
            using var reset = await admin.PostAsJsonAsync($"/api/users/{employeeId}/reset-password",
                new ResetUserPasswordRequest("SessionReplacement#2026"));
            Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        }
        else
        {
            using var deactivate = await admin.PatchAsJsonAsync($"/api/users/{employeeId}/status", new SetUserStatusRequest(false));
            Assert.Equal(HttpStatusCode.OK, deactivate.StatusCode);
        }

        // Replaying each pre-action cookie from clients that never received a deletion cookie
        // proves server-side invalidation, not only the normal client's cookie cleanup.
        foreach (var cookie in originalCookies)
        {
            using var replay = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
            Assert.True(replay.DefaultRequestHeaders.TryAddWithoutValidation("Cookie", cookie));
            Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/auth/me")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/auth/sessions")).StatusCode);
        }
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/auth/me")).StatusCode);
        var adminSessions = await admin.GetFromJsonAsync<List<UserSessionDto>>("/api/auth/sessions");
        Assert.True(Assert.Single(adminSessions!).IsCurrentSession);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var employee = await db.Users.SingleAsync(user => user.Id == employeeId);
            Assert.NotEqual(employeeSecurityStamp, employee.SecurityStamp);
            Assert.Equal(resetPassword, employee.IsActive);
            Assert.Equal(resetPassword, employee.MustChangePasswordAtNextLogin);
            var revoked = await db.UserSessions.Where(item => item.UserId == employeeId).ToListAsync();
            Assert.Equal(2, revoked.Count);
            Assert.True(sessionIds.SetEquals(revoked.Select(item => item.Id)));
            Assert.All(revoked, item =>
            {
                Assert.True(item.IsRevoked);
                Assert.NotNull(item.RevokedAtUtc);
            });
            var auditType = resetPassword ? "USER_PASSWORD_RESET" : "USER_DEACTIVATED";
            var audit = Assert.Single(await db.AuditLogs.Where(entry => entry.EventType == auditType).ToListAsync());
            Assert.Equal(administrator!.User.Id, audit.ActorUserId);
            Assert.Equal(employeeId.ToString(), audit.TargetEntityId);
            Assert.False((await db.UserSessions.SingleAsync(item => item.UserId == administrator.User.Id)).IsRevoked);
        }

        if (!resetPassword)
        {
            using var reactivate = await admin.PatchAsJsonAsync($"/api/users/{employeeId}/status", new SetUserStatusRequest(true));
            Assert.Equal(HttpStatusCode.OK, reactivate.StatusCode);
            foreach (var cookie in originalCookies)
            {
                using var replay = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
                Assert.True(replay.DefaultRequestHeaders.TryAddWithoutValidation("Cookie", cookie));
                Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/auth/me")).StatusCode);
            }
        }
    }
}
