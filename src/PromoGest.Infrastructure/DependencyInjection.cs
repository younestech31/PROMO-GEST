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
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ISessionTokenGenerator, CryptoSessionTokenGenerator>();
        services.AddSingleton<LocalFileStorageService>();

        services.AddScoped<IAuditWriter, EfAuditWriter>();
        services.AddScoped<IAuditQueryRepository, EfAuditWriter>();
        services.AddScoped<IInstallationRepository, EfInstallationRepository>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IProjectRepository, EfProjectRepository>();

        services.AddScoped<SetupService>();
        services.AddScoped<AuthService>();
        services.AddScoped<UserManagementService>();
        services.AddScoped<ProjectService>();
        services.AddScoped<AuditQueryService>();
        services.AddScoped<AdminRecoveryService>();

        return services;
    }
}
