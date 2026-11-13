using Npgsql;
using PromoGest.Infrastructure;
using Xunit;

namespace PromoGest.IntegrationTests;

public sealed class CloudSqlDevelopmentConnectionStringsTests
{
    [Fact]
    public void BuildsSeparateRuntimeAndMigrationConnectionsForUnixSocket()
    {
        if (!OperatingSystem.IsLinux())
        {
            return;
        }

        const string host = "/app/cloudsql/test-project:europe-west3:ai-studio-test";
        var settings = new Dictionary<string, string?>
        {
            ["SQL_HOST"] = host,
            ["SQL_DB_NAME"] = "cloud_sql_development_database",
            ["SQL_USER"] = "ai_studio_app_user",
            ["SQL_PASSWORD"] = "runtime;password=with-special-chars",
            ["SQL_ADMIN_USER"] = "ai_studio_admin",
            ["SQL_ADMIN_PASSWORD"] = "migration;password=with-special-chars"
        };

        var result = CloudSqlDevelopmentConnectionStrings.TryCreate(
            key => settings.GetValueOrDefault(key),
            isDevelopment: true);

        Assert.NotNull(result);

        var runtime = new NpgsqlConnectionStringBuilder(result!.RuntimeConnectionString);
        var migration = new NpgsqlConnectionStringBuilder(result.MigrationConnectionString);

        Assert.Equal(host, runtime.Host);
        Assert.Equal(host, migration.Host);
        Assert.Equal(5432, runtime.Port);
        Assert.Equal(5432, migration.Port);
        Assert.Equal("cloud_sql_development_database", runtime.Database);
        Assert.Equal("ai_studio_app_user", runtime.Username);
        Assert.Equal("ai_studio_admin", migration.Username);
        Assert.Equal("runtime;password=with-special-chars", runtime.Password);
        Assert.Equal("migration;password=with-special-chars", migration.Password);
        Assert.Equal("ai_studio_app_user", result.RuntimeUsername);
    }

    [Fact]
    public void DoesNotEnableCloudSqlWhenSqlHostIsAbsent()
    {
        var result = CloudSqlDevelopmentConnectionStrings.TryCreate(
            _ => null,
            isDevelopment: false);

        Assert.Null(result);
    }

    [Fact]
    public void RejectsCloudSqlOutsideDevelopment()
    {
        var settings = new Dictionary<string, string?>
        {
            ["SQL_HOST"] = "/app/cloudsql/test-instance"
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            CloudSqlDevelopmentConnectionStrings.TryCreate(
                key => settings.GetValueOrDefault(key),
                isDevelopment: false));

        Assert.Contains("Development", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void RequiresDistinctMigrationAndRuntimeIdentities()
    {
        if (!OperatingSystem.IsLinux())
        {
            return;
        }

        var settings = new Dictionary<string, string?>
        {
            ["SQL_HOST"] = "/app/cloudsql/test-instance",
            ["SQL_DB_NAME"] = "promogest_test",
            ["SQL_USER"] = "same_role",
            ["SQL_PASSWORD"] = "runtime-password",
            ["SQL_ADMIN_USER"] = "same_role",
            ["SQL_ADMIN_PASSWORD"] = "admin-password"
        };

        Assert.Throws<InvalidOperationException>(() =>
            CloudSqlDevelopmentConnectionStrings.TryCreate(
                key => settings.GetValueOrDefault(key),
                isDevelopment: true));
    }

    [Fact]
    public void RejectsSocketFilenameInsteadOfSocketDirectory()
    {
        if (!OperatingSystem.IsLinux())
        {
            return;
        }

        var settings = new Dictionary<string, string?>
        {
            ["SQL_HOST"] = "/app/cloudsql/test-instance/.s.PGSQL.5432",
            ["SQL_DB_NAME"] = "promogest_test",
            ["SQL_USER"] = "app_user",
            ["SQL_PASSWORD"] = "runtime-password",
            ["SQL_ADMIN_USER"] = "admin_user",
            ["SQL_ADMIN_PASSWORD"] = "admin-password"
        };

        Assert.Throws<InvalidOperationException>(() =>
            CloudSqlDevelopmentConnectionStrings.TryCreate(
                key => settings.GetValueOrDefault(key),
                isDevelopment: true));
    }
}
