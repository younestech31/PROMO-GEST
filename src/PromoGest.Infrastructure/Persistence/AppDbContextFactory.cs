using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using PromoGest.Infrastructure;

namespace PromoGest.Infrastructure.Persistence;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        var environmentName =
            Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var isDevelopment = string.Equals(
            environmentName,
            "Development",
            StringComparison.OrdinalIgnoreCase);
        var cloudSql = CloudSqlDevelopmentConnectionStrings.TryCreate(
            Environment.GetEnvironmentVariable,
            isDevelopment);

        var connectionString =
            Environment.GetEnvironmentVariable("PROMOGEST_MIGRATE_DB_CONNECTION")
            ?? cloudSql?.MigrationConnectionString
            ?? Environment.GetEnvironmentVariable("PROMOGEST_DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=promogest_design;Username=promogest_owner;Password=dev_only_placeholder";

        optionsBuilder.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
        });

        return new AppDbContext(optionsBuilder.Options);
    }
}
