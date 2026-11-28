using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using PromoGest.Contracts.Auth;
using PromoGest.Contracts.Reference;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Fact]
    public async Task StagedReference_RuntimeReadOnlyInspection_IsAdminOnlyPaginatedLiteralAndNotPublicActivation()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var owner = ReferenceDb(_fixture.GetMigrationConnectionString(runtime));
        var seeded = await SeedSyntheticReferenceAsync(owner);
        using var factory = CreateFactory(runtime, Path.Combine(Path.GetTempPath(), $"promogest_inspection_{Guid.NewGuid():N}"));
        using var admin = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(admin);
        var setup = await admin.PostAsJsonAsync("/api/setup/initialize", ValidInitRequest());
        Assert.Equal(HttpStatusCode.Created, setup.StatusCode);
        var login = await admin.PostAsJsonAsync("/api/auth/login", new LoginRequest("sysadmin", "AtlasAdmin#2026"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        await AttachCsrfTokenAsync(admin);
        var url = "/api/reference/staged/" + seeded.Snapshot;

        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(url + "/communes")).StatusCode);

        var response = await admin.GetAsync(url);
        response.EnsureSuccessStatusCode();
        Assert.True(response.Headers.CacheControl?.NoStore == true);
        var metadata = (await response.Content.ReadFromJsonAsync<StagedAdministrativeSnapshotDto>())!;
        Assert.Equal(seeded.Snapshot, metadata.SnapshotId);
        Assert.Equal("StagedNotActivated", metadata.PublicationStatus);
        Assert.True(metadata.CountsMatchMetadata);
        Assert.Equal(1, metadata.StoredCommuneCount);
        Assert.Equal(seeded.Wilaya, Assert.Single(metadata.Wilayas).Id);
        Assert.Equal("synthetic-not-source-evidence", metadata.SourceSpreadsheetId);

        var pageResponse = await admin.GetAsync(url + "/communes?pageSize=1&wilayaCode=01&q=DISPLAY");
        pageResponse.EnsureSuccessStatusCode();
        Assert.True(pageResponse.Headers.CacheControl?.NoStore == true);
        var page = (await pageResponse.Content.ReadFromJsonAsync<StagedAdministrativeCommunePageDto>())!;
        Assert.Equal(1, page.TotalCount);
        Assert.Equal(1, page.TotalPages);
        var commune = Assert.Single(page.Items);
        Assert.Equal(seeded.Commune, commune.Id);
        Assert.Equal(seeded.Wilaya, commune.WilayaId);
        Assert.Equal("Original FR", commune.NameFr);
        Assert.Equal("الاسم الأصلي", commune.NameAr);
        Assert.Null(commune.IsDairaSeat);
        Assert.Null(commune.ParentEffectiveFrom);
        Assert.Null(commune.ParentEffectiveTo);
        Assert.Null(commune.ParentDateEvidence);
        Assert.Equal("Display FR", commune.Alias!.AliasNameFr);
        Assert.Equal("Original FR", commune.Alias.ReferenceNameFr);
        foreach (var filter in new[] { "q=%25", "q=_", "q=%5C", "wilayaCode=02", "page=2&pageSize=1" })
        {
            var empty = await admin.GetFromJsonAsync<StagedAdministrativeCommunePageDto>(url + "/communes?" + filter);
            Assert.Empty(empty!.Items);
        }
        var arabic = await admin.GetFromJsonAsync<StagedAdministrativeCommunePageDto>(url + "/communes?q=" + Uri.EscapeDataString("الأصلي"));
        Assert.Single(arabic!.Items);
        foreach (var filter in new[] { "page=0", "pageSize=101", "page=2147483647&pageSize=100", "wilayaCode=1", "q=" + new string('x', 101) })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync(url + "/communes?" + filter)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/reference/staged/invalid")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/api/reference/staged/sheets-sha256-" + new string('b', 64))).StatusCode);

        var createEmployee = await admin.PostAsJsonAsync("/api/users", new CreateEmployeeRequest(
            "reference.reader", "Reference Reader", "reader@example.test", null, "ReferenceReader#2026", "fr", [Role.ProjectDirectorCode]));
        Assert.Equal(HttpStatusCode.Created, createEmployee.StatusCode);
        using var reader = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await AttachCsrfTokenAsync(reader);
        await CompleteMandatoryPasswordChangeAsync(reader, "reference.reader", "ReferenceReader#2026", "ReferencePersonal#2026");
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.GetAsync(url + "/communes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.GetAsync("/api/reference/staged/invalid")).StatusCode);
        Assert.True(await owner.AuditLogs.AnyAsync(x => x.EventType == "ACCESS_DENIED" && x.TargetEntityType == "AdministrativeReference"));

        // Staging does not replace the anonymous reference used by setup and business forms.
        var canonical = await anonymous.GetFromJsonAsync<AdministrativeUnitsReferenceDto>("/api/reference/administrative-units");
        Assert.Equal(69, canonical!.Wilayas.Count);
        Assert.Equal(0, canonical.CommunesCount);
        Assert.Equal(1, await owner.AdministrativeReferenceVersions.CountAsync());
        await owner.AdministrativeReferenceVersions.ExecuteUpdateAsync(s => s.SetProperty(x => x.AliasCount, 2));
        Assert.False((await admin.GetFromJsonAsync<StagedAdministrativeSnapshotDto>(url))!.CountsMatchMetadata);

        // Removal cannot be represented to an operator as a valid, empty catalogue.
        await owner.AdministrativeCommuneAliases.ExecuteDeleteAsync();
        await owner.AdministrativeCommuneVersions.ExecuteDeleteAsync();
        await owner.AdministrativeWilayaVersions.ExecuteDeleteAsync();
        await owner.AdministrativeReferenceVersions.ExecuteDeleteAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(url + "/communes")).StatusCode);
        Assert.Equal(1, await owner.AdministrativeCommuneIdentities.CountAsync());
    }
}
