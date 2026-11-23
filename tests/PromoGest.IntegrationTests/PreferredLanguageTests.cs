using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
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
    public async Task PreferredLanguageEndpoint_PersistsSelfPreferenceAndProtectsSessionAndOrganizationState()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_preferred_language_{Guid.NewGuid():N}");
        await using var factory = CreateFactory(connectionString, tempRoot);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(client);
        var initialize = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        await AttachCsrfTokenAsync(client);
        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(client);

        var before = await client.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(before);
        Assert.Equal("ar", before!.User.PreferredLanguage);
        Assert.NotEqual(Guid.Empty, before.User.ConcurrencyStamp);
        var organizationDefaultLanguage = before.Organization.DefaultLanguage;
        var initialConcurrencyStamp = before.User.ConcurrencyStamp;

        // A cookie-authenticated state-changing request without CSRF proof must be rejected.
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        var csrfRejected = await client.PutAsJsonAsync(
            "/api/auth/preferred-language",
            new UpdatePreferredLanguageRequest("fr", initialConcurrencyStamp));
        Assert.Equal(HttpStatusCode.Forbidden, csrfRejected.StatusCode);
        var csrfError = await csrfRejected.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CSRF_TOKEN_INVALID", csrfError!.Code);
        await AttachCsrfTokenAsync(client);

        var update = await client.PutAsJsonAsync(
            "/api/auth/preferred-language",
            new UpdatePreferredLanguageRequest("fr", initialConcurrencyStamp));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updatedSession = await update.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(updatedSession);
        Assert.Equal("fr", updatedSession!.User.PreferredLanguage);
        Assert.NotEqual(initialConcurrencyStamp, updatedSession.User.ConcurrencyStamp);
        Assert.Equal(organizationDefaultLanguage, updatedSession.Organization.DefaultLanguage);

        var reloadedSession = await client.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(reloadedSession);
        Assert.Equal("fr", reloadedSession!.User.PreferredLanguage);
        Assert.Equal(updatedSession.User.ConcurrencyStamp, reloadedSession.User.ConcurrencyStamp);

        // A stale session token cannot overwrite a newer user preference.
        var staleUpdate = await client.PutAsJsonAsync(
            "/api/auth/preferred-language",
            new UpdatePreferredLanguageRequest("ar", initialConcurrencyStamp));
        Assert.Equal(HttpStatusCode.Conflict, staleUpdate.StatusCode);
        var staleError = await staleUpdate.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("USER_CONCURRENCY_CONFLICT", staleError!.Code);

        var invalidUpdate = await client.PutAsJsonAsync(
            "/api/auth/preferred-language",
            new UpdatePreferredLanguageRequest("en", updatedSession.User.ConcurrencyStamp));
        Assert.Equal(HttpStatusCode.BadRequest, invalidUpdate.StatusCode);
        var invalidError = await invalidUpdate.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("USER_PREFERRED_LANGUAGE_INVALID", invalidError!.Code);

        using var freshClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(freshClient);
        var freshLogin = await freshClient.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, freshLogin.StatusCode);
        var freshSession = await freshLogin.Content.ReadFromJsonAsync<SessionResponse>();
        Assert.NotNull(freshSession);
        Assert.Equal("fr", freshSession!.User.PreferredLanguage);
        Assert.Equal(organizationDefaultLanguage, freshSession.Organization.DefaultLanguage);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedAdmin = await db.Users.SingleAsync(user => user.IsSystemAdministrator);
        var persistedOrganization = await db.OrganizationSettings.SingleAsync();
        Assert.Equal("fr", persistedAdmin.PreferredLanguage);
        Assert.Equal(organizationDefaultLanguage, persistedOrganization.DefaultLanguage);
        Assert.Equal(
            1,
            await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "USER_PREFERRED_LANGUAGE_UPDATED" &&
                entry.TargetEntityType == "User" &&
                entry.TargetEntityId == persistedAdmin.Id.ToString()));
    }

    [Fact]
    public async Task PreferredLanguageEndpoint_ConcurrentUpdatesWithSameSessionStamp_CommitOneChangeAndOneAudit()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_preferred_language_race_{Guid.NewGuid():N}");
        var barrier = new PreferredLanguageSaveChangesBarrier();
        await using var factory = CreateFactory(
            connectionString,
            tempRoot,
            saveChangesInterceptor: barrier);
        using var firstClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        using var secondClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

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

        var firstSession = await firstClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        var secondSession = await secondClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(firstSession);
        Assert.NotNull(secondSession);
        Assert.Equal("ar", firstSession!.User.PreferredLanguage);
        Assert.Equal(firstSession.User.ConcurrencyStamp, secondSession!.User.ConcurrencyStamp);
        var expectedStamp = firstSession.User.ConcurrencyStamp;

        barrier.Arm(2);
        HttpResponseMessage[] responses;
        try
        {
            responses = await Task.WhenAll(
                firstClient.PutAsJsonAsync(
                    "/api/auth/preferred-language",
                    new UpdatePreferredLanguageRequest("fr", expectedStamp)),
                secondClient.PutAsJsonAsync(
                    "/api/auth/preferred-language",
                    new UpdatePreferredLanguageRequest("fr", expectedStamp)));
        }
        finally
        {
            barrier.Disarm();
        }

        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
        var conflict = await responses
            .Single(response => response.StatusCode == HttpStatusCode.Conflict)
            .Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CONCURRENCY_CONFLICT", conflict!.Code);

        var finalSession = await firstClient.GetFromJsonAsync<SessionResponse>("/api/auth/me");
        Assert.NotNull(finalSession);
        Assert.Equal("fr", finalSession!.User.PreferredLanguage);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedAdmin = await db.Users.SingleAsync(user => user.IsSystemAdministrator);
        Assert.Equal("fr", persistedAdmin.PreferredLanguage);
        Assert.Equal(
            1,
            await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "USER_PREFERRED_LANGUAGE_UPDATED" &&
                entry.TargetEntityType == "User" &&
                entry.TargetEntityId == persistedAdmin.Id.ToString()));
    }

    private sealed class PreferredLanguageSaveChangesBarrier : SaveChangesInterceptor
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
            var hasPreferredLanguageMutation = context.ChangeTracker
                .Entries<User>()
                .Any(entry =>
                    entry.State == EntityState.Modified &&
                    entry.Property(user => user.PreferredLanguage).IsModified);
            if (!hasPreferredLanguageMutation)
            {
                return result;
            }

            var release = Volatile.Read(ref _release);
            if (release is null)
            {
                throw new InvalidOperationException(
                    "Preferred-language test barrier was armed without a release gate.");
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
