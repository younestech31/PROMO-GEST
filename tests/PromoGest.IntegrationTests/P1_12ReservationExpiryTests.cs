using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PromoGest.Api.HostedServices;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Fact]
    public async Task ExpiryWorker_ProcessesDueReservationsImmediatelyOnStartupAndAfterRestart()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var factory = CreateFactory(
            connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_startup_{Guid.NewGuid():N}"));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);

        await SetReservationExpiryDueAsync(factory, fixture.HoldId);
        await RunExpiryWorkerUntilFirstExpiryAsync(factory);
        await AssertReservationExpiredAsync(factory, fixture.HoldId, fixture.HeldUnitId);

        // A newly started worker instance represents a service restart. It must not wait for
        // the first one-minute timer tick before reconciling a reservation that became due meanwhile.
        using var secondCreate = await client.PostAsJsonAsync(
            $"/api/projects/{fixture.ProjectId}/reservations",
            new CreateProjectSalesReservationRequest(
                fixture.FreeUnitId,
                fixture.CustomerId,
                DateTimeOffset.UtcNow.AddDays(3)));
        Assert.Equal(System.Net.HttpStatusCode.Created, secondCreate.StatusCode);
        var secondHold = (await secondCreate.Content.ReadFromJsonAsync<ProjectSalesReservationDto>())!;
        await SetReservationExpiryDueAsync(factory, secondHold.Id);
        await RunExpiryWorkerUntilFirstExpiryAsync(factory);
        await AssertReservationExpiredAsync(factory, secondHold.Id, fixture.FreeUnitId);

        using var repeatScope = factory.Services.CreateScope();
        var processor = repeatScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        Assert.Equal(0, await processor.ProcessDueAsync());
        var db = repeatScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.AuditLogs.CountAsync(entry =>
            entry.EventType == "PROJECT_RESERVATION_EXPIRED" &&
            entry.TargetEntityId == secondHold.Id.ToString()));
    }

    [Fact]
    public async Task ExpiryWorkerAndLateCancellation_CompeteOnProjectRoot_AndWriteExpiryExactlyOnce()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var gate = new ReservationExpirySaveGate();
        await using var factory = CreateFactory(
            connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_cancel_race_{Guid.NewGuid():N}"),
            saveChangesInterceptor: gate);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        await SetReservationExpiryDueAsync(factory, fixture.HoldId);

        Guid concurrencyStamp;
        using (var readScope = factory.Services.CreateScope())
        {
            var db = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
            concurrencyStamp = (await db.ProjectSalesReservations.SingleAsync(item => item.Id == fixture.HoldId))
                .ConcurrencyStamp;
        }

        using var expiryScope = factory.Services.CreateScope();
        var processor = expiryScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        gate.Arm(fixture.HoldId);
        var workerTask = processor.ProcessDueAsync();

        HttpResponseMessage? cancellationResponse = null;
        try
        {
            // Pause the worker immediately before its atomic SaveChanges. The API then
            // reconciles the same due hold through the shared processor and wins the project CAS.
            await gate.Arrived.Task.WaitAsync(TimeSpan.FromSeconds(30));
            cancellationResponse = await client.PostAsJsonAsync(
                $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}/cancel",
                new CancelProjectSalesReservationRequest("Late cancellation", concurrencyStamp));
        }
        finally
        {
            gate.Release();
        }

        using (cancellationResponse)
        {
            Assert.NotNull(cancellationResponse);
            Assert.Equal(System.Net.HttpStatusCode.Conflict, cancellationResponse.StatusCode);
            Assert.Contains("RESERVATION_EXPIRY_REACHED", await cancellationResponse.Content.ReadAsStringAsync());
        }

        // The worker skips its stale candidate; the competing request already expired it.
        Assert.Equal(0, await workerTask);
        await AssertReservationExpiredAsync(factory, fixture.HoldId, fixture.HeldUnitId);
    }

    [Fact]
    public async Task ExpiryBatch_ContinuesAfterOneReservationConflicts()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var gate = new ReservationExpirySaveGate();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_batch_{Guid.NewGuid():N}"),
            saveChangesInterceptor: gate);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        using var create = await client.PostAsJsonAsync($"/api/projects/{fixture.ProjectId}/reservations",
            new CreateProjectSalesReservationRequest(fixture.FreeUnitId, fixture.CustomerId, DateTimeOffset.UtcNow.AddDays(3)));
        Assert.Equal(System.Net.HttpStatusCode.Created, create.StatusCode);
        var second = (await create.Content.ReadFromJsonAsync<ProjectSalesReservationDto>())!;
        // Explicitly order the two candidates so the conflict happens first.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var due = DateTimeOffset.UtcNow.AddMinutes(-3);
            await db.ProjectSalesReservations.Where(item => item.Id == fixture.HoldId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.ReservedAtUtc, due.AddDays(-7))
                    .SetProperty(item => item.ExpiresAtUtc, due));
            await db.ProjectSalesReservations.Where(item => item.Id == second.Id)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.ReservedAtUtc, due.AddDays(-7))
                    .SetProperty(item => item.ExpiresAtUtc, due.AddMinutes(1)));
        }
        var first = (await client.GetFromJsonAsync<ProjectSalesReservationDto>(
            $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}"))!;
        using var workerScope = factory.Services.CreateScope();
        var processor = workerScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        gate.Arm(fixture.HoldId);
        var task = processor.ProcessDueAsync();
        try
        {
            await gate.Arrived.Task.WaitAsync(TimeSpan.FromSeconds(30));
            using var cancel = await client.PostAsJsonAsync(
                $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}/cancel",
                new CancelProjectSalesReservationRequest("Late cancellation", first.ConcurrencyStamp));
            Assert.Equal(System.Net.HttpStatusCode.Conflict, cancel.StatusCode);
        }
        finally { gate.Release(); }

        Assert.Equal(1, await task);
        await AssertReservationExpiredAsync(factory, fixture.HoldId, fixture.HeldUnitId);
        await AssertReservationExpiredAsync(factory, second.Id, fixture.FreeUnitId);
    }

    [Fact]
    public async Task ExpiryAndSuspension_ConflictOnProjectRoot_AndPreserveTheQueuedHold()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var gate = new ReservationExpirySaveGate();
        await using var factory = CreateFactory(
            connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_suspend_race_{Guid.NewGuid():N}"),
            saveChangesInterceptor: gate);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        // This test intentionally changes the expiry. Compare suspension preservation
        // against that persisted due value, not the original four-days-future fixture.
        fixture = fixture with { ExpiresAtUtc = await SetReservationExpiryDueAsync(factory, fixture.HoldId) };

        using var expiryScope = factory.Services.CreateScope();
        var processor = expiryScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        gate.Arm(fixture.HoldId);
        var expiryTask = processor.ProcessDueAsync();

        HttpResponseMessage? suspensionResponse = null;
        try
        {
            await gate.Arrived.Task.WaitAsync(TimeSpan.FromSeconds(30));
            var before = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
            Assert.NotNull(before);
            suspensionResponse = await client.PutAsJsonAsync(
                $"/api/projects/{fixture.ProjectId}",
                SuspensionUpdate(before!));
            Assert.Equal(System.Net.HttpStatusCode.OK, suspensionResponse.StatusCode);
        }
        finally
        {
            gate.Release();
        }

        using (suspensionResponse)
        {
            Assert.NotNull(suspensionResponse);
        }

        Assert.Equal(0, await expiryTask);

        using (var verifyScope = factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var project = await db.Projects.SingleAsync(item => item.Id == fixture.ProjectId);
            var hold = await db.ProjectSalesReservations.SingleAsync(item => item.Id == fixture.HoldId);
            var unit = await db.PropertyUnits.SingleAsync(item => item.Id == fixture.HeldUnitId);
            Assert.Equal(ProjectStatus.Suspended, project.Status);
            Assert.Equal(SalesReservationStatus.Active, hold.Status);
            Assert.True(hold.IsAwaitingReview);
            Assert.Equal(PropertyUnitStatus.Reserved, unit.Status);
            Assert.Equal(0, await db.AuditLogs.CountAsync(entry =>
                entry.EventType == "PROJECT_RESERVATION_EXPIRED" &&
                entry.TargetEntityId == fixture.HoldId.ToString()));
        }

        // A later worker pass must also skip a suspended/review-required hold without
        // mutating the reservation, unit, or expiry audit history.
        using var retryScope = factory.Services.CreateScope();
        var retryProcessor = retryScope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        Assert.Equal(0, await retryProcessor.ProcessDueAsync());
        await AssertSuspensionFixtureIntegrityAsync(factory, fixture, 1);
        var retryDb = retryScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await retryDb.AuditLogs.CountAsync(entry =>
            entry.EventType == "PROJECT_RESERVATION_EXPIRED" &&
            entry.TargetEntityId == fixture.HoldId.ToString()));
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public async Task Expiry_SkipsSuspendedOrAwaitingReview_InWorkerAndLateCancel(
        bool remainSuspended, bool completeReview)
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_preserve_{Guid.NewGuid():N}"));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        var project = (await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}"))!;
        using var suspend = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", SuspensionUpdate(project));
        Assert.Equal(System.Net.HttpStatusCode.OK, suspend.StatusCode);
        var hold = (await client.GetFromJsonAsync<ProjectSalesReservationDto>(
            $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}"))!;
        if (completeReview)
        {
            using var review = await client.PostAsJsonAsync(
                $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}/review",
                new ReviewProjectSalesReservationRequest(hold.ConcurrencyStamp));
            Assert.Equal(System.Net.HttpStatusCode.OK, review.StatusCode);
        }
        if (!remainSuspended)
        {
            project = (await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}"))!;
            using var resume = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}",
                SuspensionUpdate(project) with { Status = "Commercialization" });
            Assert.Equal(System.Net.HttpStatusCode.OK, resume.StatusCode);
        }
        await SetReservationExpiryDueAsync(factory, fixture.HoldId);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var beforeHold = await db.ProjectSalesReservations.AsNoTracking().SingleAsync(h => h.Id == fixture.HoldId);
        var beforeUnit = await db.PropertyUnits.AsNoTracking().SingleAsync(u => u.Id == fixture.HeldUnitId);
        var beforeProject = await db.Projects.AsNoTracking().SingleAsync(p => p.Id == fixture.ProjectId);
        var auditsBefore = await db.AuditLogs.CountAsync();
        var processor = scope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
        Assert.Equal(0, await processor.ProcessDueAsync());
        Assert.False(await processor.ProcessReservationIfDueAsync(fixture.ProjectId, fixture.HoldId));
        using var cancel = await client.PostAsJsonAsync(
            $"/api/projects/{fixture.ProjectId}/reservations/{fixture.HoldId}/cancel",
            new CancelProjectSalesReservationRequest("Must not release preserved hold", beforeHold.ConcurrencyStamp));
        Assert.Equal(System.Net.HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Contains("RESERVATION_EXPIRY_REACHED", await cancel.Content.ReadAsStringAsync());

        var afterHold = await db.ProjectSalesReservations.AsNoTracking().SingleAsync(h => h.Id == fixture.HoldId);
        var afterUnit = await db.PropertyUnits.AsNoTracking().SingleAsync(u => u.Id == fixture.HeldUnitId);
        var afterProject = await db.Projects.AsNoTracking().SingleAsync(p => p.Id == fixture.ProjectId);
        Assert.Equal(SalesReservationStatus.Active, afterHold.Status);
        Assert.Equal(PropertyUnitStatus.Reserved, afterUnit.Status);
        Assert.Equal(beforeHold.ConcurrencyStamp, afterHold.ConcurrencyStamp);
        Assert.Equal(beforeHold.ExpiresAtUtc, afterHold.ExpiresAtUtc);
        Assert.Equal(beforeHold.ReviewRequiredAtUtc, afterHold.ReviewRequiredAtUtc);
        Assert.Equal(beforeHold.ReviewCompletedAtUtc, afterHold.ReviewCompletedAtUtc);
        Assert.Null(afterHold.ClosedAtUtc);
        Assert.Equal(beforeUnit.ConcurrencyStamp, afterUnit.ConcurrencyStamp);
        Assert.Equal(beforeProject.ConcurrencyStamp, afterProject.ConcurrencyStamp);
        Assert.Equal(auditsBefore, await db.AuditLogs.CountAsync());
    }

    [Fact]
    public async Task Expiry_InclusiveBoundary_IsIdempotent_AndDoesNotReleaseSoldUnit()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_expiry_boundary_{Guid.NewGuid():N}"));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        // Test-only persisted mismatch: a unit changed state elsewhere must never be made available.
        using (var seedScope = factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(1, await seedDb.PropertyUnits.Where(u => u.Id == fixture.HeldUnitId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.Status, PropertyUnitStatus.Sold)));
        }
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var beforeUnit = await db.PropertyUnits.AsNoTracking().SingleAsync(u => u.Id == fixture.HeldUnitId);
        var clock = new ReservationExpiryTestClock(fixture.ExpiresAtUtc.AddTicks(-1));
        var processor = ActivatorUtilities.CreateInstance<ProjectSalesReservationExpiryProcessor>(scope.ServiceProvider, clock);
        Assert.Equal(0, await processor.ProcessDueAsync());
        clock.UtcNow = fixture.ExpiresAtUtc;
        Assert.Equal(1, await processor.ProcessDueAsync());
        Assert.Equal(0, await processor.ProcessDueAsync());
        Assert.False(await processor.ProcessReservationIfDueAsync(fixture.ProjectId, fixture.HoldId));
        var hold = await db.ProjectSalesReservations.AsNoTracking().SingleAsync(h => h.Id == fixture.HoldId);
        Assert.Equal(SalesReservationStatus.Expired, hold.Status);
        Assert.Equal("EXPIRED", hold.CloseReason);
        Assert.Equal(fixture.ExpiresAtUtc, hold.ClosedAtUtc);
        var afterUnit = await db.PropertyUnits.AsNoTracking().SingleAsync(u => u.Id == fixture.HeldUnitId);
        Assert.Equal(PropertyUnitStatus.Sold, afterUnit.Status);
        Assert.Equal(beforeUnit.ConcurrencyStamp, afterUnit.ConcurrencyStamp);
        Assert.Equal(1, await db.AuditLogs.CountAsync(a => a.TargetEntityId == fixture.HoldId.ToString() &&
            a.EventType == "PROJECT_RESERVATION_EXPIRED_UNIT_STATE_MISMATCH"));
        Assert.Equal(0, await db.AuditLogs.CountAsync(a => a.TargetEntityId == fixture.HoldId.ToString() &&
            a.EventType == "PROJECT_RESERVATION_CANCELLED"));
    }

    private sealed class ReservationExpiryTestClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = now;
    }

    private static async Task<DateTimeOffset> SetReservationExpiryDueAsync(WebApplicationFactory<Program> factory, Guid reservationId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dueAtUtc = DateTimeOffset.UtcNow.AddMinutes(-1);
        var updated = await db.ProjectSalesReservations
            .Where(item => item.Id == reservationId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.ReservedAtUtc, dueAtUtc.AddDays(-7))
                .SetProperty(item => item.ExpiresAtUtc, dueAtUtc));
        Assert.Equal(1, updated);
        // PostgreSQL stores microseconds; return the actual persisted instant.
        return await db.ProjectSalesReservations.Where(item => item.Id == reservationId)
            .Select(item => item.ExpiresAtUtc).SingleAsync();
    }

    private static async Task AssertReservationExpiredAsync(
        WebApplicationFactory<Program> factory,
        Guid reservationId,
        Guid unitId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hold = await db.ProjectSalesReservations.SingleAsync(item => item.Id == reservationId);
        var unit = await db.PropertyUnits.SingleAsync(item => item.Id == unitId);
        Assert.Equal(SalesReservationStatus.Expired, hold.Status);
        Assert.Equal("EXPIRED", hold.CloseReason);
        Assert.Equal(PropertyUnitStatus.AvailableForSale, unit.Status);
        Assert.Equal(1, await db.AuditLogs.CountAsync(entry =>
            entry.EventType == "PROJECT_RESERVATION_EXPIRED" &&
            entry.TargetEntityId == reservationId.ToString()));
    }

    private static async Task RunExpiryWorkerUntilFirstExpiryAsync(WebApplicationFactory<Program> factory)
    {
        var logger = new ExpiryWorkerSignalLogger();
        using var worker = new ProjectSalesReservationExpiryWorker(
            factory.Services.GetRequiredService<IServiceScopeFactory>(),
            logger);
        await worker.StartAsync(CancellationToken.None);
        try
        {
            await logger.FirstExpiry.Task.WaitAsync(TimeSpan.FromSeconds(30));
        }
        finally
        {
            await worker.StopAsync(CancellationToken.None);
        }
    }

    private sealed class ExpiryWorkerSignalLogger : ILogger<ProjectSalesReservationExpiryWorker>
    {
        public TaskCompletionSource<string> FirstExpiry { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => EmptyScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var message = formatter(state, exception);
            if (message.StartsWith("Automatically expired", StringComparison.Ordinal))
                FirstExpiry.TrySetResult(message);
        }

        private sealed class EmptyScope : IDisposable
        {
            public static EmptyScope Instance { get; } = new();
            public void Dispose() { }
        }
    }

    private sealed class ReservationExpirySaveGate : SaveChangesInterceptor
    {
        private Guid _reservationId;
        private bool _armed;

        public TaskCompletionSource<bool> Arrived { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<bool> _release =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public void Arm(Guid reservationId)
        {
            _reservationId = reservationId;
            _armed = true;
        }

        public void Release() => _release.TrySetResult(true);

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (!_armed || eventData.Context is not DbContext db)
                return result;

            db.ChangeTracker.DetectChanges();
            var isExpiring = db.ChangeTracker.Entries<ProjectSalesReservation>().Any(entry =>
                entry.State == EntityState.Modified &&
                entry.Entity.Id == _reservationId &&
                entry.Entity.Status == SalesReservationStatus.Expired);
            if (!isExpiring)
                return result;

            _armed = false;
            Arrived.TrySetResult(true);
            await _release.Task.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            return result;
        }
    }
}
