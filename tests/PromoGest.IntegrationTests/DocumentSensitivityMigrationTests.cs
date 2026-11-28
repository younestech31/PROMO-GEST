using Microsoft.EntityFrameworkCore;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    [Fact]
    public async Task DocumentSensitivityMigration_ProtectsAllLegacyFilesAndPreservesLinkedIdentity()
    {
        var runtime = await _fixture.CreateIsolatedDatabaseConnectionStringAsync("20261123230000_ProjectSalesReservationReviewQueue");
        var owner = _fixture.GetMigrationConnectionString(runtime);
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(runtime).Options;
        var now = DateTimeOffset.UtcNow;
        Guid userId;
        Guid projectId;
        Guid partyId;
        await using (var db = new AppDbContext(options))
        {
            var user = User.CreateEmployee("legacy.doc", "Legacy Documents", "legacy.doc@example.dz", null, "test-hash", "fr", now);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
            var project = Project.Create("LEGACY-DOC", "Projet", "Projet", "16", "Alger", "Hydra", null, null, null, null,
                ProjectStatus.Planning, 0m, 0, 0, userId, now);
            var party = Party.Create(Guid.NewGuid(), PartyKind.Person, "Legacy Customer", now);
            db.Projects.Add(project);
            db.Parties.Add(party);
            await db.SaveChangesAsync();
            projectId = project.Id;
            partyId = party.Id;
        }

        var linkedId = Guid.NewGuid();
        var unlinkedId = Guid.NewGuid();
        await using (var connection = new Npgsql.NpgsqlConnection(owner))
        {
            await connection.OpenAsync();
            await using var command = new Npgsql.NpgsqlCommand("""
                INSERT INTO stored_files (id, original_file_name, stored_relative_path, content_type, size_bytes,
                    sha256_checksum, category, scope, project_id, uploaded_by_user_id, created_at_utc, updated_at_utc, concurrency_stamp)
                VALUES (@linked, 'linked.txt', 'legacy/linked.txt', 'text/plain', 1, @hash, 'Financial', 'Project', @project, @user, @now, @now, @stamp1),
                       (@unlinked, 'unlinked.txt', 'legacy/unlinked.txt', 'text/plain', 1, @hash, 'Other', 'Project', @project, @user, @now, @now, @stamp2);
                """, connection);
            command.Parameters.AddWithValue("linked", linkedId);
            command.Parameters.AddWithValue("unlinked", unlinkedId);
            command.Parameters.AddWithValue("project", projectId);
            command.Parameters.AddWithValue("user", userId);
            command.Parameters.AddWithValue("hash", new string('a', 64));
            command.Parameters.AddWithValue("now", now);
            command.Parameters.AddWithValue("stamp1", Guid.NewGuid());
            command.Parameters.AddWithValue("stamp2", Guid.NewGuid());
            Assert.Equal(2, await command.ExecuteNonQueryAsync());
        }
        await using (var db = new AppDbContext(options))
        {
            db.ProjectCustomers.Add(ProjectCustomer.Create(projectId, partyId, null, "0550123456", null, null, "fr",
                CustomerSource.WalkIn, linkedId, userId, now));
            await db.SaveChangesAsync();
        }
        await using (var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(owner).Options))
        {
            await db.Database.MigrateAsync();
            var files = await db.StoredFiles.AsNoTracking().Where(f => f.Id == linkedId || f.Id == unlinkedId).ToListAsync();
            Assert.Equal(2, files.Count);
            Assert.All(files, f => Assert.True(f.IsCustomerIdentitySensitive));
            Assert.False(files.Single(f => f.Id == linkedId).RequiresSensitivityReview);
            Assert.True(files.Single(f => f.Id == unlinkedId).RequiresSensitivityReview);
            Assert.Equal("Financial", files.Single(f => f.Id == linkedId).Category);
            await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlRawAsync(
                "UPDATE stored_files SET is_customer_identity_sensitive = FALSE WHERE id = {0}", unlinkedId));
        }
    }
}
