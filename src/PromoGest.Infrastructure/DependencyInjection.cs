using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PromoGest.Application.Interfaces;
using PromoGest.Application.Services;
using PromoGest.Domain.Interfaces;
using PromoGest.Infrastructure.Persistence;
using PromoGest.Infrastructure.Repositories;
using PromoGest.Infrastructure.Security;
using PromoGest.Infrastructure.Storage;

namespace PromoGest.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddPromoGestInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured for PostgreSQL.");

        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                npgsql.EnableRetryOnFailure(maxRetryCount: 3);
            });
        });

        var storageRoot = configuration["Storage:RootDirectory"] ?? Path.Combine(AppContext.BaseDirectory, "storage");
        services.AddSingleton(new LocalStorageOptions { RootDirectory = storageRoot });
        services.AddSingleton<IClock, SystemClock>();

        // Absolute lifetime, idle timeout and touch interval are all server-enforced. They are
        // clamped to safe ranges here so a mistyped configuration cannot silently disable the
        // idle lock, and an inconsistent combination fails at startup instead of at first request.
        var sessionPolicy = new SessionPolicy(
            AbsoluteLifetime: TimeSpan.FromHours(ReadBoundedInt(configuration, "Security:SessionAbsoluteLifetimeHours", 12, 1, 72)),
            IdleTimeout: TimeSpan.FromMinutes(ReadBoundedInt(configuration, "Security:SessionIdleTimeoutMinutes", 30, 5, 480)),
            TouchInterval: TimeSpan.FromMinutes(ReadBoundedInt(configuration, "Security:SessionTouchIntervalMinutes", 1, 1, 30)));
        sessionPolicy.EnsureConsistent();
        services.AddSingleton(sessionPolicy);

        var temporaryPasswordLifetimeHours = ReadBoundedInt(configuration, "Security:TemporaryPasswordLifetimeHours", 24, 1, 168);
        services.AddSingleton(new PasswordLifecyclePolicy(TimeSpan.FromHours(temporaryPasswordLifetimeHours)));
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ISessionTokenGenerator, CryptoSessionTokenGenerator>();
        services.AddSingleton<LocalFileStorageService>();
        services.AddSingleton<IProjectFileStorage>(sp => sp.GetRequiredService<LocalFileStorageService>());

        services.AddScoped<IAuditWriter, EfAuditWriter>();
        services.AddScoped<IAuditQueryRepository, EfAuditWriter>();
        services.AddScoped<IInstallationRepository, EfInstallationRepository>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IProjectRepository, EfProjectRepository>();
        services.AddScoped<IProjectStructureRepository, EfProjectStructureRepository>();
        services.AddScoped<IProjectDocumentRepository, EfProjectDocumentRepository>();
        services.AddScoped<IPartyRepository, EfPartyRepository>();
        services.AddScoped<IProjectCustomerRepository, EfProjectCustomerRepository>();
        services.AddScoped<IProjectSalesReservationRepository, EfProjectSalesReservationRepository>();

        services.AddScoped<SetupService>();
        services.AddScoped<AuthService>();
        services.AddScoped<OrganizationProfileService>();
        services.AddScoped<UserManagementService>();
        services.AddScoped<ProjectService>();
        services.AddScoped<ProjectStructureService>();
        services.AddScoped<ProjectDocumentService>();
        services.AddScoped<PartyDirectoryService>();
        services.AddScoped<ProjectCustomerService>();
        services.AddScoped<ProjectSalesReservationService>();
        services.AddScoped<ProjectSalesReservationExpiryProcessor>();
        services.AddScoped<AuditQueryService>();
        services.AddScoped<AdminRecoveryService>();

        return services;
    }

    /// <summary>
    /// Reads an integer setting, falls back to the documented default when the value is absent or
    /// malformed, and clamps it into the supported range. A malformed value must not silently
    /// disable a security control, and must not stop the service from starting either.
    /// </summary>
    private static int ReadBoundedInt(IConfiguration configuration, string key, int fallback, int minimum, int maximum)
    {
        if (!int.TryParse(configuration[key], NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
            return fallback;
        return Math.Clamp(value, minimum, maximum);
    }
}
