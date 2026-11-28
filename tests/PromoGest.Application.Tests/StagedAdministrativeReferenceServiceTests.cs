using PromoGest.Application.Interfaces;
using PromoGest.Application.Services;
using PromoGest.Contracts.Reference;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Application.Tests;

public sealed partial class ApplicationSecurityAndFoundationTests
{
    private sealed class ReferenceReadSpy : IAdministrativeReferenceReadRepository
    {
        public int Reads { get; private set; }
        public (string Snapshot, string? Wilaya, string? Query, int Page, int Size)? LastQuery { get; private set; }
        public Task<StagedAdministrativeSnapshotDto?> GetSnapshotAsync(string snapshotId, CancellationToken ct = default)
        {
            Reads++;
            return Task.FromResult<StagedAdministrativeSnapshotDto?>(null);
        }
        public Task<StagedAdministrativeCommunePageDto?> GetCommunesAsync(string snapshotId,
            string? wilayaCode, string? query, int page, int pageSize, CancellationToken ct = default)
        {
            Reads++;
            LastQuery = (snapshotId, wilayaCode, query, page, pageSize);
            return Task.FromResult<StagedAdministrativeCommunePageDto?>(
                new(snapshotId, page, pageSize, 0, 0, []));
        }
    }

    [Fact]
    public async Task StagedReference_OnlyActiveAdministratorCanRead_AndDenialsAreAuditedBeforeQueryValidation()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var admin = User.CreateSystemAdministrator("sysadmin", "System Admin", "admin@example.test", null, "hash", "ar", clock.UtcNow);
        var employee = User.CreateEmployee("reader", "Reference Reader", "reader@example.test", null, "hash", "fr", clock.UtcNow);
        store.Users.AddRange([admin, employee]);
        var repository = new ReferenceReadSpy();
        var service = new StagedAdministrativeReferenceService(store, repository, store, clock);
        var meta = new RequestMetadata(null, "xUnit");
        await Assert.ThrowsAsync<UnauthorizedDomainException>(() => service.GetSnapshotAsync(Guid.NewGuid(), "invalid", meta));
        await Assert.ThrowsAsync<ForbiddenDomainException>(() => service.GetSnapshotAsync(employee.Id, "invalid", meta));
        employee.SetActiveStatus(false, clock.UtcNow);
        await Assert.ThrowsAsync<ForbiddenDomainException>(() => service.GetCommunesAsync(employee.Id, "invalid", null, null, 0, 0, meta));
        Assert.Equal(0, repository.Reads);
        Assert.Equal(2, store.AuditLogs.Count(x => x.EventType == "ACCESS_DENIED" && x.TargetEntityType == "AdministrativeReference"));
        var missing = await Assert.ThrowsAsync<NotFoundDomainException>(() => service.GetSnapshotAsync(admin.Id, "sheets-sha256-" + new string('a', 64), meta));
        Assert.Equal("REFERENCE_SNAPSHOT_NOT_FOUND", missing.Code);
        Assert.Equal(1, repository.Reads);
    }

    [Theory]
    [InlineData("bad", null, null, 1, 50)]
    [InlineData("uppercase", null, null, 1, 50)]
    [InlineData("valid", "1", null, 1, 50)]
    [InlineData("valid", "٠١", null, 1, 50)]
    [InlineData("valid", null, null, 0, 50)]
    [InlineData("valid", null, null, 1, 101)]
    [InlineData("valid", null, null, 1, 0)]
    [InlineData("valid", null, null, int.MaxValue, 100)]
    [InlineData("valid", null, "long", 1, 50)]
    public async Task StagedReference_RejectsInvalidQueriesWithoutReading(string snapshot, string? wilaya, string? query, int page, int size)
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var admin = User.CreateSystemAdministrator("sysadmin", "System Admin", "admin@example.test", null, "hash", "ar", clock.UtcNow);
        store.Users.Add(admin);
        var repository = new ReferenceReadSpy();
        var service = new StagedAdministrativeReferenceService(store, repository, store, clock);
        var id = snapshot == "valid" ? "sheets-sha256-" + new string('a', 64)
            : snapshot == "uppercase" ? "sheets-sha256-" + new string('A', 64) : snapshot;
        await Assert.ThrowsAsync<DomainException>(() => service.GetCommunesAsync(admin.Id, id, wilaya,
            query == "long" ? new string('a', 101) : query, page, size, new(null, null)));
        Assert.Equal(0, repository.Reads);
    }

    [Fact]
    public async Task StagedReference_NormalizesOnlyQueryWhitespaceAndRetainsExactSnapshotAndLiteralSearch()
    {
        var store = new InMemoryStore();
        var clock = new FakeClock();
        var admin = User.CreateSystemAdministrator("sysadmin", "System Admin", "admin@example.test", null, "hash", "ar", clock.UtcNow);
        store.Users.Add(admin);
        var repository = new ReferenceReadSpy();
        var service = new StagedAdministrativeReferenceService(store, repository, store, clock);
        var id = "sheets-sha256-" + new string('a', 64);
        var page = await service.GetCommunesAsync(admin.Id, id, " 01 ", "  %_\\  ", 2, 10, new(null, null));
        Assert.Equal((id, "01", "%_\\", 2, 10), repository.LastQuery!.Value);
        Assert.Empty(page.Items);
        Assert.Equal(id, page.SnapshotId);
    }
}
