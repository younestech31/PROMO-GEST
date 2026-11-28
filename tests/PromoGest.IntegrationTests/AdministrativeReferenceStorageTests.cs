using Microsoft.EntityFrameworkCore;
using Npgsql;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Reference;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    private const string BeforeReferenceStorage = "20261123230000_ProjectSalesReservationReviewQueue";
    private const string ReferenceStorageMigration = "20261127120000_AddVersionedAdministrativeReference";
    private static readonly string[] ReferenceTables =
    [
        "admin_reference_versions", "admin_wilaya_identities", "admin_commune_identities",
        "admin_wilaya_versions", "admin_commune_versions", "admin_commune_aliases"
    ];

    [Fact]
    public async Task AdministrativeReferenceStorage_UpDownUp_PreservesLegacyTextAndDoesNotSeedOrActivate()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync(BeforeReferenceStorage);
        await using var db = ReferenceDb(_fixture.GetMigrationConnectionString(runtime));
        var legacy = OrganizationSettings.Initialize(
            "Synthetic reference migration fixture", null, "SARL", null, null, null, null, null,
            "31", "وهران / Oran", "عنوان تاريخي / adresse historique", null, null, "ar", DateTimeOffset.UtcNow);
        db.OrganizationSettings.Add(legacy);
        await db.SaveChangesAsync();

        await db.Database.MigrateAsync();
        Assert.Contains(ReferenceStorageMigration, await db.Database.GetAppliedMigrationsAsync());
        // Fixture bootstrap ran before Up: this proves the migration itself revokes DML defaults.
        await AssertReferenceRuntimeGrantsAsync(runtime);
        Assert.False(db.Database.HasPendingModelChanges());
        Assert.Empty(await db.AdministrativeReferenceVersions.ToListAsync());
        Assert.Empty(await db.AdministrativeCommuneIdentities.ToListAsync());
        Assert.Empty(await db.AdministrativeWilayaIdentities.ToListAsync());
        Assert.Equal(0, AlgerianAdministrativeReference.CommunesCount);

        // Exercise Down with dependent reference rows too, not only an empty schema.
        await SeedSyntheticReferenceAsync(db);
        await db.Database.MigrateAsync(BeforeReferenceStorage);
        await using (var connection = new NpgsqlConnection(_fixture.GetMigrationConnectionString(runtime)))
        {
            await connection.OpenAsync();
            foreach (var table in ReferenceTables)
            {
                await using var command = new NpgsqlCommand("SELECT to_regclass(@table)::text", connection);
                command.Parameters.AddWithValue("table", "public." + table);
                Assert.Equal(DBNull.Value, await command.ExecuteScalarAsync());
            }
        }
        db.ChangeTracker.Clear();
        var restored = await db.OrganizationSettings.SingleAsync();
        Assert.Equal(legacy.Id, restored.Id);
        Assert.Equal("31", restored.WilayaCode);
        Assert.Equal("وهران / Oran", restored.WilayaName);
        Assert.Equal("عنوان تاريخي / adresse historique", restored.Address);

        await db.Database.MigrateAsync();
        Assert.Empty(await db.AdministrativeReferenceVersions.ToListAsync());
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task AdministrativeReferenceStorage_KeepsStableIdentityUnknownSeatsSourceLabelsAndExplicitParent()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        await using var db = ReferenceDb(_fixture.GetMigrationConnectionString(runtime));
        var seeded = await SeedSyntheticReferenceAsync(db);
        db.ChangeTracker.Clear();
        var commune = await db.AdministrativeCommuneVersions.SingleAsync();
        Assert.Null(commune.IsDairaSeat);
        Assert.Null(commune.ParentEffectiveFrom);
        Assert.Null(commune.ParentEffectiveTo);
        Assert.Null(commune.ParentDateEvidence);
        Assert.Equal("0101", commune.SystemCode);
        Assert.Equal("Original FR", commune.NameFr);
        Assert.Equal("الاسم الأصلي", commune.NameAr);
        Assert.Equal(seeded.Wilaya, commune.WilayaId);
        var alias = await db.AdministrativeCommuneAliases.SingleAsync();
        Assert.Equal("Display FR", alias.AliasNameFr);
        Assert.Equal("Original FR", alias.ReferenceNameFr);
        Assert.Equal("دليل اصطناعي / synthetic evidence", alias.Evidence);

        // Same internal identity, different source code/parent in another reviewed snapshot.
        // This fixture deliberately has a commune prefix different from its explicit parent.
        var next = SyntheticReferenceVersion('b');
        var nextWilaya = Guid.NewGuid();
        db.AdministrativeReferenceVersions.Add(next);
        db.AdministrativeWilayaIdentities.Add(new() { Id = nextWilaya });
        db.AdministrativeWilayaVersions.Add(SyntheticWilaya(next.Id, nextWilaya, "02"));
        db.AdministrativeCommuneVersions.Add(new()
        {
            SnapshotId = next.Id, CommuneId = seeded.Commune, SystemCode = "0101",
            WilayaId = nextWilaya, NameFr = "Original FR", NameAr = "الاسم الأصلي",
            DairaNameFr = "Observed daira", DairaNameAr = "دائرة مرصودة", IsDairaSeat = false,
            ParentEffectiveFrom = new DateOnly(2026, 1, 1),
            ParentEffectiveTo = new DateOnly(2027, 1, 1), ParentDateEvidence = "Synthetic dated-parent evidence"
        });
        await db.SaveChangesAsync();
        Assert.Equal(1, await db.AdministrativeCommuneIdentities.CountAsync());
        Assert.Equal(2, await db.AdministrativeCommuneVersions.CountAsync());
        Assert.Null((await db.AdministrativeCommuneVersions.SingleAsync(x => x.SnapshotId == seeded.Snapshot)).IsDairaSeat);
        Assert.False((await db.AdministrativeCommuneVersions.SingleAsync(x => x.SnapshotId == next.Id)).IsDairaSeat);
    }

    [Fact]
    public async Task AdministrativeReferenceStorage_RejectsDuplicateCodesCrossSnapshotParentsAndInventedDates()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var migrationConnection = _fixture.GetMigrationConnectionString(runtime);
        await using var db = ReferenceDb(migrationConnection);
        var seeded = await SeedSyntheticReferenceAsync(db);
        var next = SyntheticReferenceVersion('b');
        var otherWilaya = Guid.NewGuid();
        db.AdministrativeReferenceVersions.Add(next);
        db.AdministrativeWilayaIdentities.Add(new() { Id = otherWilaya });
        db.AdministrativeCommuneIdentities.Add(new() { Id = otherWilaya });
        db.AdministrativeWilayaVersions.Add(SyntheticWilaya(next.Id, otherWilaya, "02"));
        await db.SaveChangesAsync();

        await using var connection = new NpgsqlConnection(migrationConnection);
        await connection.OpenAsync();
        async Task Reject(string sql, string state, string constraint)
        {
            await using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("snapshot", seeded.Snapshot);
            command.Parameters.AddWithValue("commune", seeded.Commune);
            command.Parameters.AddWithValue("parent", otherWilaya);
            var error = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());
            Assert.Equal(state, error.SqlState);
            Assert.Equal(constraint, error.ConstraintName);
        }

        await Reject("UPDATE admin_commune_versions SET wilaya_id = @parent WHERE snapshot_id = @snapshot",
            PostgresErrorCodes.ForeignKeyViolation, "fk_admin_commune_version_wilaya");
        await Reject("UPDATE admin_commune_versions SET parent_effective_from = DATE '2026-01-01' WHERE snapshot_id = @snapshot",
            PostgresErrorCodes.CheckViolation, "ck_admin_commune_parent_dates");
        await Reject("""
            UPDATE admin_commune_versions SET parent_effective_from = DATE '2026-01-01',
                parent_effective_to = DATE '2026-01-01', parent_date_evidence = 'fixture'
            WHERE snapshot_id = @snapshot
            """, PostgresErrorCodes.CheckViolation, "ck_admin_commune_parent_dates");
        await Reject("UPDATE admin_commune_versions SET system_code = '101' WHERE snapshot_id = @snapshot",
            PostgresErrorCodes.CheckViolation, "ck_admin_commune_code");
        await Reject("UPDATE admin_reference_versions SET canonical_content_sha256 = 'not-a-hash' WHERE id = @snapshot",
            PostgresErrorCodes.CheckViolation, "ck_admin_reference_hashes");
        await Reject("""
            INSERT INTO admin_commune_versions
                (snapshot_id, commune_id, system_code, name_fr, name_ar, wilaya_id, daira_name_fr, daira_name_ar)
            SELECT snapshot_id, @parent, system_code, name_fr, name_ar, wilaya_id, daira_name_fr, daira_name_ar
            FROM admin_commune_versions WHERE snapshot_id = @snapshot
            """, PostgresErrorCodes.UniqueViolation, "ux_admin_commune_version_code");
        await Reject("DELETE FROM admin_wilaya_versions WHERE snapshot_id = @snapshot",
            PostgresErrorCodes.RestrictViolation, "fk_admin_commune_version_wilaya");
        Assert.Null((await db.AdministrativeCommuneVersions.AsNoTracking().SingleAsync()).ParentEffectiveFrom);
    }

    [Fact]
    public async Task AdministrativeReferenceStorage_RuntimeReadOnlyGrantsSurviveCloudSqlBootstrap()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync();
        var migration = _fixture.GetMigrationConnectionString(runtime);
        await AssertReferenceRuntimeGrantsAsync(runtime);
        // Deliberately simulate stale broad defaults, then verify the bootstrap repairs them.
        await using (var owner = new NpgsqlConnection(migration))
        {
            await owner.OpenAsync();
            foreach (var table in ReferenceTables)
            {
                await using var grant = new NpgsqlCommand($"GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.{table} TO promogest_app", owner);
                await grant.ExecuteNonQueryAsync();
            }
        }
        await CloudSqlRuntimePermissions.ApplyAsync(migration, "promogest_app");
        await AssertReferenceRuntimeGrantsAsync(runtime);
    }

    private static async Task AssertReferenceRuntimeGrantsAsync(string runtime)
    {
        await using var connection = new NpgsqlConnection(runtime);
        await connection.OpenAsync();
        foreach (var table in ReferenceTables)
        {
            foreach (var privilege in new[] { "SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER" })
            {
                await using var command = new NpgsqlCommand("SELECT has_table_privilege(current_user, @table, @privilege)", connection);
                command.Parameters.AddWithValue("table", "public." + table);
                command.Parameters.AddWithValue("privilege", privilege);
                Assert.Equal(privilege == "SELECT", (bool)(await command.ExecuteScalarAsync())!);
            }
        }
        await using var denied = new NpgsqlCommand("DELETE FROM admin_reference_versions", connection);
        var error = await Assert.ThrowsAsync<PostgresException>(() => denied.ExecuteNonQueryAsync());
        Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, error.SqlState);
    }

    private static AppDbContext ReferenceDb(string connection) => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection).Options);

    private static AdministrativeReferenceVersion SyntheticReferenceVersion(char hash) => new()
    {
        Id = "sheets-sha256-" + new string(hash, 64), CanonicalContentSha256 = new string(hash, 64),
        ManifestSha256 = new string('c', 64), SourceSpreadsheetId = "synthetic-not-source-evidence",
        ClaimedCaptureAtUtc = DateTimeOffset.UtcNow,
        WilayaCount = 1, CommuneCount = 1, AliasCount = 1, DeclaredDairaCount = 1, ObservedDairaCount = 1
    };

    private static AdministrativeWilayaVersion SyntheticWilaya(string snapshot, Guid identity, string code) => new()
    {
        SnapshotId = snapshot, WilayaId = identity, SystemCode = code,
        NameAr = "ولاية اصطناعية", NameFr = "Synthetic wilaya", NameArSource = "Synthetic evidence",
        DeclaredCommuneCount = 1, DeclaredDairaCount = 1
    };

    private static async Task<(string Snapshot, Guid Wilaya, Guid Commune)> SeedSyntheticReferenceAsync(AppDbContext db)
    {
        var version = SyntheticReferenceVersion('a');
        var wilaya = Guid.NewGuid();
        var commune = Guid.NewGuid();
        db.AdministrativeReferenceVersions.Add(version);
        db.AdministrativeWilayaIdentities.Add(new() { Id = wilaya });
        db.AdministrativeCommuneIdentities.Add(new() { Id = commune });
        db.AdministrativeWilayaVersions.Add(SyntheticWilaya(version.Id, wilaya, "01"));
        db.AdministrativeCommuneVersions.Add(new()
        {
            SnapshotId = version.Id, CommuneId = commune, SystemCode = "0101", WilayaId = wilaya,
            NameFr = "Original FR", NameAr = "الاسم الأصلي",
            DairaNameFr = "Observed daira", DairaNameAr = "دائرة مرصودة"
        });
        db.AdministrativeCommuneAliases.Add(new()
        {
            SnapshotId = version.Id, CommuneId = commune,
            ReferenceNameFr = "Original FR", AliasNameFr = "Display FR",
            ReferenceNameAr = "الاسم الأصلي", RepositoryNameAr = "اسم العرض",
            Evidence = "دليل اصطناعي / synthetic evidence"
        });
        await db.SaveChangesAsync();
        return (version.Id, wilaya, commune);
    }
}
