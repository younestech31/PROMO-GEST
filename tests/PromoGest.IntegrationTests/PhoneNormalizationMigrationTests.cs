using Microsoft.EntityFrameworkCore;
using Npgsql;
using PromoGest.Infrastructure.Persistence;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed partial class PostgresEndToEndTests
{
    private const string PreviousPhoneMigration = "20261116120000_EnforceProjectCustomerIdentityUniqueness";
    private const string PhoneNormalizationMigration = "20261121120000_CanonicalizeAlgerianProjectCustomerPhones";

    [Fact]
    public async Task PhoneNormalizationMigration_RewritesDerivedKeysAndDownRestoresLegacyKeys()
    {
        var runtimeConnection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync(PreviousPhoneMigration);
        var migrationConnection = _fixture.GetMigrationConnectionString(runtimeConnection);
        var ids = await SeedProjectCustomerAsync(
            migrationConnection,
            displayName: "Amine Bouzid",
            normalizedDisplayName: "AMINE BOUZID",
            phone: "0555 123 456",
            legacyNormalizedPhone: "0555123456");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(migrationConnection, npgsql =>
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();

        var canonicalPhone = await ReadNormalizedPhoneAsync(migrationConnection, ids.CustomerId);
        Assert.Equal("213555123456", canonicalPhone);
        Assert.Contains(PhoneNormalizationMigration, await db.Database.GetAppliedMigrationsAsync());

        // Down is a reversible re-derivation from the unchanged source Phone field.
        await db.Database.MigrateAsync(PreviousPhoneMigration);
        var restoredPhone = await ReadNormalizedPhoneAsync(migrationConnection, ids.CustomerId);
        var originalPhone = await ReadSourcePhoneAsync(migrationConnection, ids.CustomerId);
        Assert.Equal("0555123456", restoredPhone);
        Assert.Equal("0555 123 456", originalPhone);
        Assert.DoesNotContain(PhoneNormalizationMigration, await db.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task PhoneNormalizationMigration_FailsClosedOnNewCanonicalCollisionWithoutChangingRows()
    {
        var runtimeConnection = await _fixture.CreateIsolatedDatabaseConnectionStringAsync(PreviousPhoneMigration);
        var migrationConnection = _fixture.GetMigrationConnectionString(runtimeConnection);
        var first = await SeedProjectCustomerAsync(
            migrationConnection,
            displayName: "Samir Bouzid",
            normalizedDisplayName: "SAMIR BOUZID",
            phone: "0555 123 456",
            legacyNormalizedPhone: "0555123456");
        var second = await SeedProjectCustomerAsync(
            migrationConnection,
            displayName: "SAMIR BOUZID",
            normalizedDisplayName: "SAMIR BOUZID",
            phone: "+213 555 123 456",
            legacyNormalizedPhone: "213555123456",
            existingUserId: first.UserId,
            existingProjectId: first.ProjectId);

        var report = await RunPhonePreflightAsync(migrationConnection);
        Assert.Equal(2L, report.CustomerRows);
        Assert.Equal(1L, report.RowsToRewrite);
        Assert.Equal(0L, report.InvalidPhoneRows);
        var collision = Assert.Single(report.Collisions);
        Assert.Equal(2L, collision.CustomerCount);
        Assert.Contains(first.CustomerId.ToString(), collision.CustomerIds);
        Assert.Contains(second.CustomerId.ToString(), collision.CustomerIds);
        Assert.Equal(new[] { "project_id", "customer_count", "customer_ids", "party_ids" }, report.CollisionColumns);
        Assert.DoesNotContain(report.CollisionColumns, column =>
            column.Contains("phone", StringComparison.OrdinalIgnoreCase) ||
            column.Contains("name", StringComparison.OrdinalIgnoreCase));

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(migrationConnection, npgsql =>
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        await using var db = new AppDbContext(options);
        var exception = await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());
        Assert.Contains("collision group", exception.Message.ToLowerInvariant());

        var firstPhone = await ReadNormalizedPhoneAsync(migrationConnection, first.CustomerId);
        var secondPhone = await ReadNormalizedPhoneAsync(migrationConnection, second.CustomerId);
        Assert.Equal("0555123456", firstPhone);
        Assert.Equal("213555123456", secondPhone);
        Assert.DoesNotContain(PhoneNormalizationMigration, await db.Database.GetAppliedMigrationsAsync());

        var remainingRows = await ReadProjectCustomerCountAsync(migrationConnection, first.ProjectId);
        Assert.Equal(2, remainingRows);
    }

    private static async Task<(Guid UserId, Guid ProjectId, Guid CustomerId)> SeedProjectCustomerAsync(
        string connectionString,
        string displayName,
        string normalizedDisplayName,
        string phone,
        string legacyNormalizedPhone,
        Guid? existingUserId = null,
        Guid? existingProjectId = null)
    {
        var userId = existingUserId ?? Guid.NewGuid();
        var projectId = existingProjectId ?? Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var partyId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var suffix = Guid.NewGuid().ToString("N")[..12];

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        if (!existingUserId.HasValue)
        {
            await using var user = new NpgsqlCommand("""
                INSERT INTO users (
                    id, username, normalized_username, full_name, email, normalized_email,
                    phone, password_hash, is_system_administrator, is_active, preferred_language,
                    failed_login_attempts, lockout_end_utc, last_login_at_utc, security_stamp,
                    created_at_utc, updated_at_utc, concurrency_stamp
                )
                VALUES (
                    @id, @username, @normalized_username, @full_name, @email, @normalized_email,
                    NULL, @password_hash, FALSE, TRUE, 'ar', 0, NULL, NULL, @security_stamp,
                    @created_at_utc, @updated_at_utc, @concurrency_stamp
                );
                """, connection);
            user.Parameters.AddWithValue("id", userId);
            user.Parameters.AddWithValue("username", $"phone.it.{suffix}");
            user.Parameters.AddWithValue("normalized_username", $"PHONE.IT.{suffix}".ToUpperInvariant());
            user.Parameters.AddWithValue("full_name", "Phone migration test operator");
            user.Parameters.AddWithValue("email", $"phone.it.{suffix}@example.invalid");
            user.Parameters.AddWithValue("normalized_email", $"PHONE.IT.{suffix}@EXAMPLE.INVALID");
            user.Parameters.AddWithValue("password_hash", "integration-test-hash");
            user.Parameters.AddWithValue("security_stamp", Guid.NewGuid());
            user.Parameters.AddWithValue("created_at_utc", now);
            user.Parameters.AddWithValue("updated_at_utc", now);
            user.Parameters.AddWithValue("concurrency_stamp", Guid.NewGuid());
            await user.ExecuteNonQueryAsync();
        }

        if (!existingProjectId.HasValue)
        {
            await using var project = new NpgsqlCommand("""
                INSERT INTO projects (
                    id, code, normalized_code, name_ar, name_fr, wilaya_code, wilaya_name,
                    municipality, address, land_title_reference, building_permit_number,
                    building_permit_date, status, estimated_budget_dzd, planned_blocks_count,
                    planned_units_count, created_by_user_id, created_at_utc, updated_at_utc,
                    concurrency_stamp
                )
                VALUES (
                    @id, @code, @normalized_code, 'مشروع اختبار الهاتف', 'Phone test project',
                    '31', 'وهران', 'وهران', NULL, NULL, NULL, NULL, 'Planning', 0, 0, 0,
                    @created_by_user_id, @created_at_utc, @updated_at_utc, @concurrency_stamp
                );
                """, connection);
            project.Parameters.AddWithValue("id", projectId);
            project.Parameters.AddWithValue("code", $"PHONE-{suffix}");
            project.Parameters.AddWithValue("normalized_code", $"PHONE-{suffix}");
            project.Parameters.AddWithValue("created_by_user_id", userId);
            project.Parameters.AddWithValue("created_at_utc", now);
            project.Parameters.AddWithValue("updated_at_utc", now);
            project.Parameters.AddWithValue("concurrency_stamp", Guid.NewGuid());
            await project.ExecuteNonQueryAsync();
        }

        await using (var party = new NpgsqlCommand("""
            INSERT INTO parties (
                id, party_kind, display_name, normalized_display_name,
                created_at_utc, updated_at_utc, concurrency_stamp
            )
            VALUES (@id, 'Person', @display_name, @normalized_display_name,
                    @created_at_utc, @updated_at_utc, @concurrency_stamp);
            """, connection))
        {
            party.Parameters.AddWithValue("id", partyId);
            party.Parameters.AddWithValue("display_name", displayName);
            party.Parameters.AddWithValue("normalized_display_name", normalizedDisplayName);
            party.Parameters.AddWithValue("created_at_utc", now);
            party.Parameters.AddWithValue("updated_at_utc", now);
            party.Parameters.AddWithValue("concurrency_stamp", Guid.NewGuid());
            await party.ExecuteNonQueryAsync();
        }

        await using (var customer = new NpgsqlCommand("""
            INSERT INTO project_customers (
                id, project_id, party_id, contact_person, phone, normalized_phone,
                email, normalized_email, address, preferred_language, source, status,
                identity_document_stored_file_id, created_by_user_id, created_at_utc,
                updated_at_utc, concurrency_stamp
            )
            VALUES (
                @id, @project_id, @party_id, NULL, @phone, @normalized_phone,
                NULL, NULL, NULL, 'ar', 'Referral', 'Prospect', NULL, @created_by_user_id,
                @created_at_utc, @updated_at_utc, @concurrency_stamp
            );
            """, connection))
        {
            customer.Parameters.AddWithValue("id", customerId);
            customer.Parameters.AddWithValue("project_id", projectId);
            customer.Parameters.AddWithValue("party_id", partyId);
            customer.Parameters.AddWithValue("phone", phone);
            customer.Parameters.AddWithValue("normalized_phone", legacyNormalizedPhone);
            customer.Parameters.AddWithValue("created_by_user_id", userId);
            customer.Parameters.AddWithValue("created_at_utc", now);
            customer.Parameters.AddWithValue("updated_at_utc", now);
            customer.Parameters.AddWithValue("concurrency_stamp", Guid.NewGuid());
            await customer.ExecuteNonQueryAsync();
        }

        return (userId, projectId, customerId);
    }

    private sealed record PhoneCollisionGroup(
        Guid ProjectId,
        long CustomerCount,
        string[] CustomerIds,
        string[] PartyIds);

    private sealed record PhonePreflightReport(
        long CustomerRows,
        long RowsToRewrite,
        long LegacyKeyDriftRows,
        long InvalidPhoneRows,
        string[] CollisionColumns,
        IReadOnlyList<PhoneCollisionGroup> Collisions);

    private static async Task<PhonePreflightReport> RunPhonePreflightAsync(string connectionString)
    {
        const string resourceName =
            "PromoGest.IntegrationTests.P1_11PhoneNormalizationPreflight.sql";

        await using var stream = typeof(PhoneNormalizationMigrationTests).Assembly
            .GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Missing embedded SQL resource: {resourceName}");
        using var textReader = new StreamReader(stream);
        var source = await textReader.ReadToEndAsync();

        // The source is also a psql script. Remove psql meta-commands and SQL
        // comments before executing its statements individually through Npgsql.
        var sql = string.Join(
            Environment.NewLine,
            source.Split('\n')
                .Where(line =>
                    !line.TrimStart().StartsWith("\\set", StringComparison.Ordinal) &&
                    !line.TrimStart().StartsWith("--", StringComparison.Ordinal)));
        var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        long customerRows = -1;
        long rowsToRewrite = -1;
        long legacyKeyDriftRows = -1;
        long invalidPhoneRows = -1;
        string[] collisionColumns = Array.Empty<string>();
        var collisions = new List<PhoneCollisionGroup>();

        foreach (var statement in statements)
        {
            if (statement.StartsWith("BEGIN TRANSACTION", StringComparison.OrdinalIgnoreCase) ||
                statement.StartsWith("COMMIT", StringComparison.OrdinalIgnoreCase))
            {
                await using var transactionCommand = new NpgsqlCommand(statement, connection);
                await transactionCommand.ExecuteNonQueryAsync();
                continue;
            }

            if (!statement.StartsWith("WITH", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Unexpected statement in the P1-11 preflight script.");

            await using var command = new NpgsqlCommand(statement, connection);
            await using var reader = await command.ExecuteReaderAsync();

            if (customerRows < 0)
            {
                if (!await reader.ReadAsync())
                    throw new InvalidOperationException("The preflight summary query returned no row.");

                customerRows = reader.GetInt64(0);
                rowsToRewrite = reader.GetInt64(1);
                legacyKeyDriftRows = reader.GetInt64(2);
                invalidPhoneRows = reader.GetInt64(3);
            }
            else
            {
                collisionColumns = Enumerable.Range(0, reader.FieldCount)
                    .Select(reader.GetName)
                    .ToArray();

                while (await reader.ReadAsync())
                {
                    collisions.Add(new PhoneCollisionGroup(
                        reader.GetGuid(0),
                        reader.GetInt64(1),
                        reader.GetFieldValue<string[]>(2),
                        reader.GetFieldValue<string[]>(3)));
                }
            }
        }

        if (customerRows < 0 || collisionColumns.Length != 4)
            throw new InvalidOperationException("The P1-11 preflight script did not return both expected reports.");

        return new PhonePreflightReport(
            customerRows,
            rowsToRewrite,
            legacyKeyDriftRows,
            invalidPhoneRows,
            collisionColumns,
            collisions);
    }

    private static async Task<string> ReadNormalizedPhoneAsync(string connectionString, Guid customerId)
        => await ReadCustomerColumnAsync(connectionString, customerId, "normalized_phone");

    private static async Task<string> ReadSourcePhoneAsync(string connectionString, Guid customerId)
        => await ReadCustomerColumnAsync(connectionString, customerId, "phone");

    private static async Task<string> ReadCustomerColumnAsync(
        string connectionString,
        Guid customerId,
        string columnName)
    {
        if (columnName is not ("phone" or "normalized_phone"))
            throw new ArgumentOutOfRangeException(nameof(columnName));

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            $"SELECT {columnName} FROM project_customers WHERE id = @id;",
            connection);
        command.Parameters.AddWithValue("id", customerId);
        return (string)(await command.ExecuteScalarAsync()
            ?? throw new InvalidOperationException("Expected the test customer row to exist."));
    }

    private static async Task<int> ReadProjectCustomerCountAsync(string connectionString, Guid projectId)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT COUNT(*) FROM project_customers WHERE project_id = @project_id;",
            connection);
        command.Parameters.AddWithValue("project_id", projectId);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
}
