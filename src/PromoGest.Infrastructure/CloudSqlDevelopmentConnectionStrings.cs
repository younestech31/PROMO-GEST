using Npgsql;

namespace PromoGest.Infrastructure;

/// <summary>
/// Builds optional Google AI Studio Cloud SQL connections from server-only environment
/// variables. This integration is deliberately restricted to Linux Development hosts.
/// </summary>
public sealed record CloudSqlDevelopmentConnectionStrings(
    string RuntimeConnectionString,
    string MigrationConnectionString,
    string RuntimeUsername)
{
    public static CloudSqlDevelopmentConnectionStrings? TryCreate(
        Func<string, string?> readSetting,
        bool isDevelopment)
    {
        ArgumentNullException.ThrowIfNull(readSetting);

        var host = readSetting("SQL_HOST");
        if (string.IsNullOrWhiteSpace(host))
        {
            return null;
        }

        if (!isDevelopment)
        {
            throw new InvalidOperationException(
                "Cloud SQL environment variables are only supported when ASPNETCORE_ENVIRONMENT=Development.");
        }

        if (!OperatingSystem.IsLinux())
        {
            throw new PlatformNotSupportedException(
                "The Google AI Studio Cloud SQL integration requires its Linux Unix-domain socket.");
        }

        if (!Path.IsPathRooted(host) || host.Contains("/.s.PGSQL.", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "SQL_HOST must contain the absolute Unix socket directory, not the .s.PGSQL.5432 socket filename.");
        }

        var database = Required(readSetting, "SQL_DB_NAME");
        var runtimeUsername = Required(readSetting, "SQL_USER");
        var runtimePassword = Required(readSetting, "SQL_PASSWORD");
        var migrationUsername = Required(readSetting, "SQL_ADMIN_USER");
        var migrationPassword = Required(readSetting, "SQL_ADMIN_PASSWORD");

        ValidateRoleIdentifier(runtimeUsername, "SQL_USER");
        ValidateRoleIdentifier(migrationUsername, "SQL_ADMIN_USER");

        if (string.Equals(runtimeUsername, migrationUsername, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "SQL_USER and SQL_ADMIN_USER must be separate PostgreSQL identities.");
        }

        return new CloudSqlDevelopmentConnectionStrings(
            BuildConnectionString(host, database, runtimeUsername, runtimePassword),
            BuildConnectionString(host, database, migrationUsername, migrationPassword),
            runtimeUsername);
    }

    private static string BuildConnectionString(
        string host,
        string database,
        string username,
        string password)
    {
        // Npgsql interprets an absolute Host path as a Unix-domain socket directory.
        // Port remains explicit because Npgsql requires it for Unix-domain sockets.
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = 5432,
            Database = database,
            Username = username,
            Password = password,
            Timeout = 15,
            CommandTimeout = 30,
            Pooling = true,
            ApplicationName = "PROMO-GEST-AI-Studio-Development"
        };

        return builder.ConnectionString;
    }

    private static string Required(Func<string, string?> readSetting, string name)
    {
        var value = readSetting(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Cloud SQL is enabled because SQL_HOST is present, but required setting {name} is missing.");
        }

        return value;
    }

    private static void ValidateRoleIdentifier(string value, string settingName)
    {
        if (value.Length is 0 or > 63 ||
            !(char.IsAsciiLetter(value[0]) || value[0] == '_') ||
            value.Any(character => !(char.IsAsciiLetterOrDigit(character) || character == '_')))
        {
            throw new InvalidOperationException(
                $"{settingName} must be a simple PostgreSQL role identifier (letters, digits, and underscores; max 63 characters).");
        }
    }
}
