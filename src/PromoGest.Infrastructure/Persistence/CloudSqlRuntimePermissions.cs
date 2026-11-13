using Npgsql;

namespace PromoGest.Infrastructure.Persistence;

/// <summary>
/// Applies the runtime application's least-privilege grants after Cloud SQL development
/// migrations. Existing production migrations continue to manage the promogest_app role.
/// </summary>
public static class CloudSqlRuntimePermissions
{
    public static async Task ApplyAsync(
        string migrationConnectionString,
        string runtimeRoleName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(migrationConnectionString);
        ValidateRoleIdentifier(runtimeRoleName);

        await using var connection = new NpgsqlConnection(migrationConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var migrationRoleName = await ScalarStringAsync(
            connection,
            transaction,
            "SELECT current_user;",
            cancellationToken);

        if (string.Equals(migrationRoleName, runtimeRoleName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "The Cloud SQL migration identity and runtime identity must be different.");
        }

        await using (var roleCommand = new NpgsqlCommand(
            "SELECT rolcanlogin FROM pg_roles WHERE rolname = @roleName;",
            connection,
            transaction))
        {
            roleCommand.Parameters.AddWithValue("roleName", runtimeRoleName);
            var canLogin = await roleCommand.ExecuteScalarAsync(cancellationToken);
            if (canLogin is not bool canLoginValue || !canLoginValue)
            {
                throw new InvalidOperationException(
                    $"The configured Cloud SQL runtime role '{runtimeRoleName}' does not exist or cannot log in.");
            }
        }

        var quotedRuntimeRole = QuoteIdentifier(runtimeRoleName);
        var quotedMigrationRole = QuoteIdentifier(migrationRoleName);
        var quotedDatabase = QuoteIdentifier(connection.Database);

        await ExecuteAsync(
            connection,
            transaction,
            $"GRANT CONNECT ON DATABASE {quotedDatabase} TO {quotedRuntimeRole};",
            cancellationToken);
        await ExecuteAsync(
            connection,
            transaction,
            $"GRANT USAGE ON SCHEMA public TO {quotedRuntimeRole};",
            cancellationToken);

        var tableNames = new List<string>();
        await using (var tablesCommand = new NpgsqlCommand(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
            connection,
            transaction))
        await using (var reader = await tablesCommand.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                tableNames.Add(reader.GetString(0));
            }
        }

        if (!tableNames.Contains("audit_logs", StringComparer.Ordinal))
        {
            throw new InvalidOperationException(
                "Cloud SQL migrations did not create the expected public.audit_logs table.");
        }

        if (!tableNames.Contains("__EFMigrationsHistory", StringComparer.Ordinal))
        {
            throw new InvalidOperationException(
                "Cloud SQL migrations did not create the EF Core migration history table.");
        }

        foreach (var tableName in tableNames)
        {
            // Schema history is reserved to the migration identity, never the runtime API.
            if (string.Equals(tableName, "__EFMigrationsHistory", StringComparison.Ordinal))
            {
                continue;
            }

            await ExecuteAsync(
                connection,
                transaction,
                $"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.{QuoteIdentifier(tableName)} TO {quotedRuntimeRole};",
                cancellationToken);
        }

        await ExecuteAsync(
            connection,
            transaction,
            $"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {quotedRuntimeRole};",
            cancellationToken);

        // Audit rows are append-only at both the trigger and database-privilege layers.
        await ExecuteAsync(
            connection,
            transaction,
            $"REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.audit_logs FROM {quotedRuntimeRole};",
            cancellationToken);
        await ExecuteAsync(
            connection,
            transaction,
            $"GRANT SELECT, INSERT ON TABLE public.audit_logs TO {quotedRuntimeRole};",
            cancellationToken);

        await ExecuteAsync(
            connection,
            transaction,
            $"REVOKE ALL PRIVILEGES ON TABLE public.{QuoteIdentifier("__EFMigrationsHistory")} FROM {quotedRuntimeRole};",
            cancellationToken);

        // Future tables and sequences created by the migration owner receive the same
        // least-privilege runtime grants. The audit_logs exception is re-applied whenever
        // this bootstrap is run after a migration.
        await ExecuteAsync(
            connection,
            transaction,
            $"ALTER DEFAULT PRIVILEGES FOR ROLE {quotedMigrationRole} IN SCHEMA public " +
            $"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {quotedRuntimeRole};",
            cancellationToken);
        await ExecuteAsync(
            connection,
            transaction,
            $"ALTER DEFAULT PRIVILEGES FOR ROLE {quotedMigrationRole} IN SCHEMA public " +
            $"GRANT USAGE, SELECT ON SEQUENCES TO {quotedRuntimeRole};",
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);
    }

    private static async Task<string> ScalarStringAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value as string
            ?? throw new InvalidOperationException("PostgreSQL did not return the current migration role.");
    }

    private static async Task ExecuteAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string QuoteIdentifier(string identifier) =>
        "\"" + identifier.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";

    private static void ValidateRoleIdentifier(string value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length > 63 ||
            !(char.IsAsciiLetter(value[0]) || value[0] == '_') ||
            value.Any(character => !(char.IsAsciiLetterOrDigit(character) || character == '_')))
        {
            throw new ArgumentException(
                "The runtime PostgreSQL role must be a simple identifier (letters, digits, and underscores; max 63 characters).",
                nameof(value));
        }
    }
}
