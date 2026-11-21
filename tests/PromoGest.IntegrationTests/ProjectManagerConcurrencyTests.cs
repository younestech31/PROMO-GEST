using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Projects;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Fact]
    public async Task ProjectManagerMembershipChanges_ConcurrentDemotionsAndRemovals_KeepOneManagerAndAtomicAudit()
    {
        var connectionString = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var tempRoot = Path.Combine(Path.GetTempPath(), $"promogest_project_manager_race_{Guid.NewGuid():N}");
        var barrier = new ProjectMembershipSaveChangesBarrier();
        await using var factory = CreateFactory(
            connectionString,
            tempRoot,
            saveChangesInterceptor: barrier);
        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await AttachCsrfTokenAsync(adminClient);
        var initialize = await adminClient.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, initialize.StatusCode);

        var managerAResponse = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "p1.race.manager.a",
            "P1 Race Manager A",
            "p1.race.manager.a@atlasimmo.dz",
            null,
            "P1RaceManagerA#2026",
            "ar",
            new[] { Role.ProjectDirectorCode }));
        Assert.Equal(HttpStatusCode.Created, managerAResponse.StatusCode);
        var managerA = await managerAResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(managerA);

        var managerBResponse = await adminClient.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "p1.race.manager.b",
            "P1 Race Manager B",
            "p1.race.manager.b@atlasimmo.dz",
            null,
            "P1RaceManagerB#2026",
            "fr",
            new[] { Role.ProjectDirectorCode }));
        Assert.Equal(HttpStatusCode.Created, managerBResponse.StatusCode);
        var managerB = await managerBResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(managerB);

        var projectResponse = await adminClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest(
            "PRJ-P115-001",
            "مشروع اختبار التزامن",
            "Projet test de concurrence",
            "16",
            "Alger",
            "Hydra",
            null,
            null,
            null,
            null,
            "Planning",
            100_000_000m,
            1,
            2));
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = await projectResponse.Content.ReadFromJsonAsync<ProjectDto>();
        Assert.NotNull(project);

        var projectMembersUrl = $"/api/projects/{project!.Id}/members";
        var assignA = await adminClient.PutAsJsonAsync(projectMembersUrl,
            new AssignProjectMemberRequest(managerA!.Id, "ProjectManager", true, true, true, true));
        Assert.Equal(HttpStatusCode.OK, assignA.StatusCode);
        var assignB = await adminClient.PutAsJsonAsync(projectMembersUrl,
            new AssignProjectMemberRequest(managerB!.Id, "ProjectManager", true, true, true, true));
        Assert.Equal(HttpStatusCode.OK, assignB.StatusCode);

        var assignmentAuditBefore = await CountProjectAuditAsync(
            factory,
            project.Id,
            "PROJECT_MEMBER_ASSIGNED");

        // Both requests must load the same two-manager aggregate before either SaveChanges can commit.
        barrier.Arm(2);
        HttpResponseMessage[] demotionResponses;
        try
        {
            demotionResponses = await Task.WhenAll(
                adminClient.PutAsJsonAsync(projectMembersUrl,
                    new AssignProjectMemberRequest(managerA.Id, "CommercialAgent", false, true, false, true)),
                adminClient.PutAsJsonAsync(projectMembersUrl,
                    new AssignProjectMemberRequest(managerB.Id, "CommercialAgent", false, true, false, true)));
        }
        finally
        {
            barrier.Disarm();
        }

        Assert.Equal(1, demotionResponses.Count(response => response.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, demotionResponses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
        var demotionConflict = await demotionResponses
            .Single(response => response.StatusCode == HttpStatusCode.Conflict)
            .Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CONCURRENCY_CONFLICT", demotionConflict!.Code);

        var afterDemotionManagers = await CountProjectManagersAsync(factory, project.Id);
        Assert.Equal(1, afterDemotionManagers);
        Assert.Equal(
            assignmentAuditBefore + 1,
            await CountProjectAuditAsync(factory, project.Id, "PROJECT_MEMBER_ASSIGNED"));

        var successfulDemotionIndex = Array.FindIndex(
            demotionResponses,
            response => response.StatusCode == HttpStatusCode.OK);
        var demotedUserId = successfulDemotionIndex == 0 ? managerA.Id : managerB.Id;
        var restoreManager = await adminClient.PutAsJsonAsync(projectMembersUrl,
            new AssignProjectMemberRequest(demotedUserId, "ProjectManager", true, true, true, true));
        Assert.Equal(HttpStatusCode.OK, restoreManager.StatusCode);
        Assert.Equal(2, await CountProjectManagersAsync(factory, project.Id));

        var removalAuditBefore = await CountProjectAuditAsync(
            factory,
            project.Id,
            "PROJECT_MEMBER_REVOKED");

        // RemoveMember already touches the root; this proves the invariant still holds under a real race.
        barrier.Arm(2);
        HttpResponseMessage[] removalResponses;
        try
        {
            removalResponses = await Task.WhenAll(
                adminClient.DeleteAsync($"/api/projects/{project.Id}/members/{managerA.Id}"),
                adminClient.DeleteAsync($"/api/projects/{project.Id}/members/{managerB.Id}"));
        }
        finally
        {
            barrier.Disarm();
        }

        Assert.Equal(1, removalResponses.Count(response => response.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, removalResponses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
        var removalConflict = await removalResponses
            .Single(response => response.StatusCode == HttpStatusCode.Conflict)
            .Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("CONCURRENCY_CONFLICT", removalConflict!.Code);

        Assert.Equal(1, await CountProjectManagersAsync(factory, project.Id));
        Assert.Equal(1, await CountProjectMembersAsync(factory, project.Id));
        Assert.Equal(
            removalAuditBefore + 1,
            await CountProjectAuditAsync(factory, project.Id, "PROJECT_MEMBER_REVOKED"));
    }

    private static async Task<int> CountProjectManagersAsync(WebApplicationFactory<Program> factory, Guid projectId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ProjectMembers.CountAsync(member =>
            member.ProjectId == projectId &&
            member.RoleInProject == ProjectRole.ProjectManager);
    }

    private static async Task<int> CountProjectMembersAsync(WebApplicationFactory<Program> factory, Guid projectId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ProjectMembers.CountAsync(member => member.ProjectId == projectId);
    }

    private static async Task<int> CountProjectAuditAsync(
        WebApplicationFactory<Program> factory,
        Guid projectId,
        string eventType)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.AuditLogs.CountAsync(entry =>
            entry.EventType == eventType &&
            entry.TargetEntityType == "Project" &&
            entry.TargetEntityId == projectId.ToString());
    }

    private sealed class ProjectMembershipSaveChangesBarrier : SaveChangesInterceptor
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
            var hasProjectMembershipMutation = context.ChangeTracker
                .Entries<ProjectMember>()
                .Any(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);
            if (!hasProjectMembershipMutation)
            {
                return result;
            }

            var release = Volatile.Read(ref _release);
            if (release is null)
            {
                throw new InvalidOperationException("Project membership test barrier was armed without a release gate.");
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
