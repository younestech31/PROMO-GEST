using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    // #280: deterministic gates at SaveChanges, not sleeps or probabilistic Task.WhenAll races.
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SuspensionAndHoldCreation_SerializeAtProjectRoot_AndRollbackLosingAudit(bool pauseCreate)
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var gate = new SuspensionSaveGate();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_suspension_race_{Guid.NewGuid():N}"),
            saveChangesInterceptor: gate);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        var project = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
        Assert.NotNull(project);
        var suspend = SuspensionUpdate(project!);
        var createdAuditBefore = await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_CREATED");
        var projectAuditBefore = await CountSuspensionAuditAsync(factory, "PROJECT_UPDATED");

        gate.Arm(fixture.ProjectId, pauseCreate ? "create" : "suspend");
        Task<HttpResponseMessage> StartCreate() => client.PostAsJsonAsync(
            $"/api/projects/{fixture.ProjectId}/reservations",
            new CreateProjectSalesReservationRequest(fixture.FreeUnitId, fixture.CustomerId, DateTimeOffset.UtcNow.AddDays(3)));
        Task<HttpResponseMessage> StartSuspend() => client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", suspend);

        var paused = pauseCreate ? StartCreate() : StartSuspend();
        HttpResponseMessage winner;
        try
        {
            await gate.Arrived.Task.WaitAsync(TimeSpan.FromSeconds(30));
            // The paused request has already read the old project state and prepared its changes.
            // Commit the other request completely, then let the stale request try to save.
            winner = await (pauseCreate ? StartSuspend() : StartCreate());
            Assert.Equal(pauseCreate ? HttpStatusCode.OK : HttpStatusCode.Created, winner.StatusCode);
        }
        finally
        {
            gate.Release();
        }
        using var losingResponse = await paused;
        using var winningResponse = winner;
        Assert.Equal(HttpStatusCode.Conflict, losingResponse.StatusCode);

        Assert.Equal(createdAuditBefore + (pauseCreate ? 0 : 1),
            await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_CREATED"));
        Assert.Equal(projectAuditBefore + (pauseCreate ? 1 : 0),
            await CountSuspensionAuditAsync(factory, "PROJECT_UPDATED"));
        Assert.Equal(pauseCreate ? 1 : 0,
            await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED"));

        if (!pauseCreate)
        {
            // Retrying with fresh project CAS queues BOTH holds; the failed transition committed nothing.
            var current = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
            Assert.Equal("Commercialization", current!.Status);
            using var retry = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", SuspensionUpdate(current));
            Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        }

        var queue = await client.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
            $"/api/projects/{fixture.ProjectId}/reservations?reviewRequired=true");
        Assert.NotNull(queue);
        Assert.Equal(pauseCreate ? 1 : 2, queue!.Count);
        Assert.All(queue, hold =>
        {
            Assert.Equal("Active", hold.Status);
            Assert.NotNull(hold.ReviewRequiredAtUtc);
            Assert.Null(hold.ReviewCompletedAtUtc);
        });
        await AssertSuspensionFixtureIntegrityAsync(factory, fixture, pauseCreate ? 1 : 2);

        // Re-saving Suspended must not duplicate the transition audit or re-queue a completed review.
        var queued = queue.First(hold => hold.Id == fixture.HoldId);
        using var review = await client.PostAsJsonAsync(
            $"/api/projects/{fixture.ProjectId}/reservations/{queued.Id}/review",
            new ReviewProjectSalesReservationRequest(queued.ConcurrencyStamp));
        Assert.Equal(HttpStatusCode.OK, review.StatusCode);
        var suspended = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
        using var repeated = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", SuspensionUpdate(suspended!));
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        Assert.Equal(1, await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED"));
        var after = await client.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
            $"/api/projects/{fixture.ProjectId}/reservations?reviewRequired=true");
        Assert.DoesNotContain(after!, hold => hold.Id == queued.Id);
    }

    [Fact]
    public async Task SuspensionReviewSaveFailure_RollsBackProjectStampMarkersAndAudits_AndPreservesProjectIsolation()
    {
        var connection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var gate = new SuspensionSaveGate();
        await using var factory = CreateFactory(connection,
            Path.Combine(Path.GetTempPath(), $"promogest_suspension_failure_{Guid.NewGuid():N}"),
            saveChangesInterceptor: gate);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var fixture = await PrepareSuspensionFixtureAsync(client);
        var before = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
        var projectAudits = await CountSuspensionAuditAsync(factory, "PROJECT_UPDATED");
        gate.Arm(fixture.ProjectId, "fail-review");
        using var failed = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", SuspensionUpdate(before!));
        Assert.Equal(HttpStatusCode.InternalServerError, failed.StatusCode);
        Assert.True(gate.InjectedFailure);
        var unchanged = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{fixture.ProjectId}");
        Assert.Equal("Commercialization", unchanged!.Status);
        Assert.Equal(before!.ConcurrencyStamp, unchanged.ConcurrencyStamp);
        Assert.Equal(projectAudits, await CountSuspensionAuditAsync(factory, "PROJECT_UPDATED"));
        Assert.Equal(0, await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED"));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var hold = await db.ProjectSalesReservations.SingleAsync(item => item.Id == fixture.HoldId);
            Assert.Null(hold.ReviewRequiredAtUtc);
            Assert.Null(hold.ReviewCompletedAtUtc);
        }
        using var retry = await client.PutAsJsonAsync($"/api/projects/{fixture.ProjectId}", SuspensionUpdate(unchanged));
        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        await AssertSuspensionFixtureIntegrityAsync(factory, fixture, 1);

        // Admin is authorized for both projects: these are genuine scope checks, not permission denials.
        using var otherResponse = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
            "SUSP-OTHER", "مشروع آخر", "Autre projet", "16", "Alger", "Hydra", null, null, null, null,
            "Commercialization", 0m, 1, 2));
        Assert.Equal(HttpStatusCode.Created, otherResponse.StatusCode);
        var other = (await otherResponse.Content.ReadFromJsonAsync<ProjectDto>())!;
        using var foreignGet = await client.GetAsync($"/api/projects/{other.Id}/reservations/{fixture.HoldId}");
        Assert.Equal(HttpStatusCode.NotFound, foreignGet.StatusCode);
        var ownQueue = await client.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
            $"/api/projects/{fixture.ProjectId}/reservations?reviewRequired=true");
        var holdStamp = Assert.Single(ownQueue!).ConcurrencyStamp;
        using var foreignReview = await client.PostAsJsonAsync(
            $"/api/projects/{other.Id}/reservations/{fixture.HoldId}/review",
            new ReviewProjectSalesReservationRequest(holdStamp));
        Assert.Equal(HttpStatusCode.NotFound, foreignReview.StatusCode);
        using var foreignCreate = await client.PostAsJsonAsync($"/api/projects/{other.Id}/reservations",
            new CreateProjectSalesReservationRequest(fixture.FreeUnitId, fixture.CustomerId, DateTimeOffset.UtcNow.AddDays(3)));
        Assert.Equal(HttpStatusCode.NotFound, foreignCreate.StatusCode);
        Assert.Contains("RESERVATION_UNIT_NOT_FOUND", await foreignCreate.Content.ReadAsStringAsync());
        // With a valid unit in the route project, a foreign customer must independently fail scope.
        var session = (await client.GetFromJsonAsync<SessionResponse>("/api/auth/me"))!;
        Guid otherUnitId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTimeOffset.UtcNow;
            var building = Building.Create(other.Id, "B", "عمارة", "Bâtiment", BuildingStatus.Planned, session.User.Id, now);
            var floor = BuildingFloor.Create(building.Id, 0, "أرضي", "RDC", now);
            var unit = PropertyUnit.Create(floor.Id, "B-001", PropertyUnitType.Apartment,
                PropertyUnitStatus.AvailableForSale, 90m, 80m, 3, session.User.Id, now);
            db.Buildings.Add(building);
            db.BuildingFloors.Add(floor);
            db.PropertyUnits.Add(unit);
            await db.SaveChangesAsync();
            otherUnitId = unit.Id;
        }
        using var foreignCustomer = await client.PostAsJsonAsync($"/api/projects/{other.Id}/reservations",
            new CreateProjectSalesReservationRequest(otherUnitId, fixture.CustomerId, DateTimeOffset.UtcNow.AddDays(3)));
        Assert.Equal(HttpStatusCode.NotFound, foreignCustomer.StatusCode);
        Assert.Contains("RESERVATION_CUSTOMER_NOT_FOUND", await foreignCustomer.Content.ReadAsStringAsync());
        var otherQueue = await client.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
            $"/api/projects/{other.Id}/reservations?reviewRequired=true");
        Assert.Empty(otherQueue!);
        var stillQueued = await client.GetFromJsonAsync<List<ProjectSalesReservationDto>>(
            $"/api/projects/{fixture.ProjectId}/reservations?reviewRequired=true");
        Assert.Equal(holdStamp, Assert.Single(stillQueued!).ConcurrencyStamp);
        Assert.Equal(0, await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_REVIEW_COMPLETED"));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await db.ProjectSalesReservations.AnyAsync(h => h.ProjectId == other.Id));
            Assert.Equal(other.ConcurrencyStamp, (await db.Projects.SingleAsync(p => p.Id == other.Id)).ConcurrencyStamp);
            Assert.Equal(PropertyUnitStatus.AvailableForSale,
                (await db.PropertyUnits.SingleAsync(u => u.Id == otherUnitId)).Status);
        }
        Assert.Equal(1, await CountSuspensionAuditAsync(factory, "PROJECT_RESERVATION_CREATED"));
    }

    private sealed record SuspensionFixture(Guid ProjectId, Guid CustomerId, Guid HeldUnitId, Guid FreeUnitId,
        Guid HoldId, DateTimeOffset ExpiresAtUtc);

    private static UpdateProjectRequest SuspensionUpdate(ProjectDto project) => new(
        project.NameAr, project.NameFr, project.WilayaCode, project.WilayaName, project.Municipality,
        project.Address, project.LandTitleReference, project.BuildingPermitNumber, project.BuildingPermitDate,
        "Suspended", null, project.PlannedBlocksCount, project.PlannedUnitsCount, project.ConcurrencyStamp);

    private async Task<SuspensionFixture> PrepareSuspensionFixtureAsync(HttpClient client)
    {
        await AttachCsrfTokenAsync(client);
        using var init = await client.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, init.StatusCode);
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(client);
        using var projectResponse = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
            "SUSP-TEST", "مشروع اختبار التعليق", "Projet test suspension", "16", "Alger", "Hydra",
            null, null, null, null, "Commercialization", 0m, 1, 2));
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = (await projectResponse.Content.ReadFromJsonAsync<ProjectDto>())!;
        using var buildingResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structure/buildings",
            new CreateBuildingRequest("A", "عمارة", "Bâtiment", "Planned"));
        Assert.Equal(HttpStatusCode.OK, buildingResponse.StatusCode);
        var structure = (await buildingResponse.Content.ReadFromJsonAsync<ProjectStructureDto>())!;
        var building = Assert.Single(structure.Buildings);
        using var floorResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structure/buildings/{building.Id}/floors",
            new CreateBuildingFloorRequest(0, "أرضي", "RDC"));
        Assert.Equal(HttpStatusCode.OK, floorResponse.StatusCode);
        var floorStructure = (await floorResponse.Content.ReadFromJsonAsync<ProjectStructureDto>())!;
        var floor = Assert.Single(Assert.Single(floorStructure.Buildings).Floors);
        var unitsUrl = $"/api/projects/{project.Id}/structure/buildings/{building.Id}/floors/{floor.Id}/units";
        using var firstUnit = await client.PostAsJsonAsync(unitsUrl,
            new CreatePropertyUnitRequest("A-001", "Apartment", "AvailableForSale", 90m, 80m, 3));
        Assert.Equal(HttpStatusCode.OK, firstUnit.StatusCode);
        using var secondUnit = await client.PostAsJsonAsync(unitsUrl,
            new CreatePropertyUnitRequest("A-002", "Apartment", "AvailableForSale", 90m, 80m, 3));
        Assert.Equal(HttpStatusCode.OK, secondUnit.StatusCode);
        var unitStructure = (await secondUnit.Content.ReadFromJsonAsync<ProjectStructureDto>())!;
        var units = unitStructure.Buildings.SelectMany(b => b.Floors).SelectMany(f => f.Units).ToArray();
        using var customerResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/customers",
            new CreateProjectCustomerRequest("Individual", "Synthetic Suspension Buyer", null,
                "0550123456", null, null, "ar", "WalkIn", null));
        Assert.Equal(HttpStatusCode.Created, customerResponse.StatusCode);
        var customer = (await customerResponse.Content.ReadFromJsonAsync<ProjectCustomerDto>())!;
        var held = units.Single(u => u.UnitNumber == "A-001");
        var free = units.Single(u => u.UnitNumber == "A-002");
        using var holdResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/reservations",
            new CreateProjectSalesReservationRequest(held.Id, customer.Id, DateTimeOffset.UtcNow.AddDays(4)));
        Assert.Equal(HttpStatusCode.Created, holdResponse.StatusCode);
        var hold = (await holdResponse.Content.ReadFromJsonAsync<ProjectSalesReservationDto>())!;
        // Compare persisted PostgreSQL microsecond precision, not the pre-save request ticks.
        var persistedHold = (await client.GetFromJsonAsync<ProjectSalesReservationDto>(
            $"/api/projects/{project.Id}/reservations/{hold.Id}"))!;
        return new(project.Id, customer.Id, held.Id, free.Id, hold.Id, persistedHold.ExpiresAtUtc);
    }

    private static async Task<int> CountSuspensionAuditAsync(WebApplicationFactory<Program> factory, string eventType)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditLogs.CountAsync(a => a.EventType == eventType);
    }

    private static async Task AssertSuspensionFixtureIntegrityAsync(WebApplicationFactory<Program> factory,
        SuspensionFixture fixture, int activeCount)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(ProjectStatus.Suspended, (await db.Projects.SingleAsync(p => p.Id == fixture.ProjectId)).Status);
        var holds = await db.ProjectSalesReservations.Where(h => h.ProjectId == fixture.ProjectId).ToListAsync();
        Assert.Equal(activeCount, holds.Count);
        Assert.All(holds, hold => Assert.Equal(SalesReservationStatus.Active, hold.Status));
        var original = holds.Single(h => h.Id == fixture.HoldId);
        Assert.Equal(fixture.ExpiresAtUtc, original.ExpiresAtUtc);
        Assert.Null(original.ClosedAtUtc);
        Assert.Equal(PropertyUnitStatus.Reserved, (await db.PropertyUnits.SingleAsync(u => u.Id == fixture.HeldUnitId)).Status);
        Assert.Equal(activeCount == 1 ? PropertyUnitStatus.AvailableForSale : PropertyUnitStatus.Reserved,
            (await db.PropertyUnits.SingleAsync(u => u.Id == fixture.FreeUnitId)).Status);
    }

    private sealed class SuspensionSaveGate : SaveChangesInterceptor
    {
        private Guid _projectId;
        private string? _mode;
        private readonly TaskCompletionSource<bool> _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> Arrived { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public bool InjectedFailure { get; private set; }

        public void Arm(Guid projectId, string mode) { _projectId = projectId; _mode = mode; }
        public void Release() => _release.TrySetResult(true);

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context is not DbContext db || _mode is null) return result;
            db.ChangeTracker.DetectChanges();
            var createsHold = db.ChangeTracker.Entries<ProjectSalesReservation>()
                .Any(e => e.State == EntityState.Added && e.Entity.ProjectId == _projectId);
            var suspendsProject = db.ChangeTracker.Entries<Project>()
                .Any(e => e.State == EntityState.Modified && e.Entity.Id == _projectId && e.Entity.Status == ProjectStatus.Suspended);
            var queuesReview = db.ChangeTracker.Entries<ProjectSalesReservation>()
                .Any(e => e.State == EntityState.Modified && e.Entity.ProjectId == _projectId && e.Entity.ReviewRequiredAtUtc != null);
            if (_mode == "fail-review" && queuesReview)
            {
                _mode = null;
                InjectedFailure = true;
                throw new InvalidOperationException("Injected suspension review save failure (#280).");
            }
            if ((_mode == "create" && createsHold) || (_mode == "suspend" && suspendsProject))
            {
                _mode = null; // Only the selected request waits; the competing request can finish.
                Arrived.TrySetResult(true);
                await _release.Task.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            }
            return result;
        }
    }
}
