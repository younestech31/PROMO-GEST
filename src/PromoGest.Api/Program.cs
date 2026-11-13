using System.Security.Cryptography.X509Certificates;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using PromoGest.Api.Middleware;
using PromoGest.Api.Security;
using PromoGest.Application.Services;
using PromoGest.Contracts.Common;
using PromoGest.Infrastructure;
using PromoGest.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

builder.Host.UseWindowsService();
if (OperatingSystem.IsWindows())
{
    builder.Logging.AddEventLog();
}

var migrationMode = args.Contains("--migrate", StringComparer.OrdinalIgnoreCase);
var localRecoveryMode =
    args.Contains("--unlock-admin", StringComparer.OrdinalIgnoreCase) ||
    args.Contains("--reset-admin-password", StringComparer.OrdinalIgnoreCase);

// SQL_HOST is supplied by the Google AI Studio Cloud SQL integration. It is accepted
// only in Development and only through the Linux Unix-domain socket; production always
// retains the local PostgreSQL connection configured for the organization.
var cloudSql = CloudSqlDevelopmentConnectionStrings.TryCreate(
    key => builder.Configuration[key],
    builder.Environment.IsDevelopment());

if (cloudSql is not null)
{
    builder.Configuration["ConnectionStrings:DefaultConnection"] = cloudSql.RuntimeConnectionString;
}

var usingCloudSqlMigrationIdentity = false;
string? migrationConnection = null;
if (migrationMode)
{
    migrationConnection = Environment.GetEnvironmentVariable("PROMOGEST_MIGRATE_DB_CONNECTION")
        ?? builder.Configuration["PROMOGEST_MIGRATE_DB_CONNECTION"];

    if (string.IsNullOrWhiteSpace(migrationConnection) && cloudSql is not null)
    {
        migrationConnection = cloudSql.MigrationConnectionString;
        usingCloudSqlMigrationIdentity = true;
    }

    if (string.IsNullOrWhiteSpace(migrationConnection))
    {
        throw new InvalidOperationException(
            "PROMOGEST_MIGRATE_DB_CONNECTION must be supplied for --migrate, or SQL_ADMIN_USER/SQL_ADMIN_PASSWORD must be configured for the Development Cloud SQL integration. The runtime database identity must never perform schema migrations.");
    }

    builder.Configuration["ConnectionStrings:DefaultConnection"] = migrationConnection;
}

var requireHttpsCookies = builder.Configuration.GetValue<bool>("Security:RequireHttpsCookies", true);

builder.Services.AddPromoGestInfrastructure(builder.Configuration);

// Database migration is a database-maintenance operation and must not depend on
// the runtime application's Data Protection key ring or platform encryption secrets.
// The runtime host configures Data Protection below; the --migrate path resolves only
// AppDbContext and therefore does not need to create or unlock application keys.
// Console-only admin recovery must remain available even when the runtime Data Protection
// certificate/key ring is damaged or missing. These commands do not issue HTTP tokens.
if (!migrationMode && !localRecoveryMode)
{
    var certificatePath = builder.Configuration["Security:DataProtectionCertificatePath"];
    var certificatePassword = builder.Configuration["PROMOGEST_DATA_PROTECTION_CERT_PASSWORD"]
        ?? Environment.GetEnvironmentVariable("PROMOGEST_DATA_PROTECTION_CERT_PASSWORD");

    if (OperatingSystem.IsLinux() &&
        builder.Environment.IsDevelopment() &&
        string.IsNullOrWhiteSpace(certificatePath) &&
        string.IsNullOrWhiteSpace(certificatePassword))
    {
        // AI Studio is a disposable development host. Ephemeral keys avoid weakening
        // the Linux production certificate requirement; protected cookies are invalid
        // after this development process exits and users simply sign in again.
        builder.Services.AddDataProtection()
            .SetApplicationName("PromoGest")
            .UseEphemeralDataProtectionProvider();
    }
    else
    {
        var storageRoot = builder.Configuration["Storage:RootDirectory"] ?? Path.Combine(AppContext.BaseDirectory, "storage");
        var defaultKeyDirectory = Path.Combine(
            Path.GetDirectoryName(Path.GetFullPath(storageRoot)) ?? AppContext.BaseDirectory,
            "dataprotection-keys");
        var dpKeyDirectory = builder.Configuration["Security:DataProtectionKeyDirectory"] ?? defaultKeyDirectory;
        Directory.CreateDirectory(dpKeyDirectory);

        var dpBuilder = builder.Services.AddDataProtection()
            .SetApplicationName("PromoGest")
            .PersistKeysToFileSystem(new DirectoryInfo(dpKeyDirectory));

        if (OperatingSystem.IsWindows())
        {
            // The service runs under a virtual service account, while maintenance and recovery
            // may run under SYSTEM or an administrator account. Machine-scope DPAPI keeps the
            // key ring decryptable on this Windows installation by those identities; filesystem
            // ACLs on the key directory remain restricted to the service, SYSTEM, and Administrators.
            dpBuilder.ProtectKeysWithDpapi(protectToLocalMachine: true);
        }
        else if (OperatingSystem.IsLinux())
        {
            // PersistKeysToFileSystem disables the default at-rest encryption heuristic.
            // Production Linux deployments must provide a local PKCS#12 certificate and its password;
            // never fall back to plaintext key-ring files.
            if (string.IsNullOrWhiteSpace(certificatePath) || !Path.IsPathRooted(certificatePath))
            {
                throw new InvalidOperationException(
                    "Security:DataProtectionCertificatePath must be an absolute path to a local PKCS#12 certificate on Linux.");
            }

            if (!File.Exists(certificatePath))
            {
                throw new FileNotFoundException(
                    "The Linux Data Protection certificate file was not found.",
                    certificatePath);
            }

            if (string.IsNullOrWhiteSpace(certificatePassword))
            {
                throw new InvalidOperationException(
                    "PROMOGEST_DATA_PROTECTION_CERT_PASSWORD must be supplied by the Linux service environment.");
            }

            var dataProtectionCertificate = X509CertificateLoader.LoadPkcs12FromFile(
                certificatePath,
                certificatePassword,
                X509KeyStorageFlags.EphemeralKeySet);

            if (!dataProtectionCertificate.HasPrivateKey)
            {
                dataProtectionCertificate.Dispose();
                throw new InvalidOperationException(
                    "The Linux Data Protection certificate must contain its private key.");
            }

            dpBuilder.ProtectKeysWithCertificate(dataProtectionCertificate);
        }
        else
        {
            throw new PlatformNotSupportedException(
                "PROMO GEST requires Windows DPAPI or a Linux X.509 Data Protection certificate for key-at-rest protection.");
        }
    }
}

builder.Services.AddAntiforgery(options =>
{
    options.Cookie.Name = ".PromoGest.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = requireHttpsCookies ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    options.Cookie.Path = "/";
    options.Cookie.IsEssential = true;
    options.HeaderName = SessionCookieDefaults.CsrfHeaderName;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
});

builder.Services.AddAuthentication(SessionCookieDefaults.AuthenticationScheme)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionCookieDefaults.AuthenticationScheme,
        _ => { });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "local",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var allowedOrigins = builder.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("LocalOrigins", policy =>
        {
            policy.WithOrigins(allowedOrigins)
                .AllowCredentials()
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
    await DbInitializer.SeedRolesAndPermissionsAsync(dbContext);

    if (usingCloudSqlMigrationIdentity && cloudSql is not null && migrationConnection is not null)
    {
        await CloudSqlRuntimePermissions.ApplyAsync(
            migrationConnection,
            cloudSql.RuntimeUsername);
        Console.WriteLine("Cloud SQL development runtime permissions applied successfully.");
    }

    Console.WriteLine("Database migrations and seeding completed successfully.");
    return;
}

// Local server-console-only System Administrator recovery commands (never exposed via HTTP)
if (args.Contains("--unlock-admin", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var recovery = scope.ServiceProvider.GetRequiredService<AdminRecoveryService>();
    try
    {
        var username = await recovery.UnlockSystemAdministratorAsync(Environment.UserName);
        Console.WriteLine($"System Administrator '{username}' unlocked cleanly.");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Admin unlock failed: {ex.Message}");
        Environment.ExitCode = 1;
    }
    return;
}

if (args.Contains("--reset-admin-password", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var recovery = scope.ServiceProvider.GetRequiredService<AdminRecoveryService>();
    try
    {
        var newPassword = ReadPasswordFromEnvOrConsole(args);
        if (string.IsNullOrWhiteSpace(newPassword))
        {
            Console.Error.WriteLine("No password provided. Set --password-env <ENV_VAR> or pipe/enter password via console stdin.");
            Environment.ExitCode = 1;
            return;
        }

        var username = await recovery.ResetSystemAdministratorPasswordAsync(newPassword, Environment.UserName);
        Console.WriteLine($"Password recovered and active sessions revoked for System Administrator '{username}'.");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Admin password recovery failed: {ex.Message}");
        Environment.ExitCode = 1;
    }
    return;
}

app.UseForwardedHeaders();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (allowedOrigins.Length > 0)
{
    app.UseCors("LocalOrigins");
}

app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseMiddleware<CsrfValidationMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.MapFallback("/api/{**slug}", (HttpContext context) =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    return context.Response.WriteAsJsonAsync(new ApiErrorResponse("ENDPOINT_NOT_FOUND", "The requested API endpoint does not exist."));
}).AllowAnonymous();

app.MapFallback("/health/{**slug}", (HttpContext context) =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    return context.Response.WriteAsJsonAsync(new ApiErrorResponse("ENDPOINT_NOT_FOUND", "The requested health endpoint does not exist."));
}).AllowAnonymous();

app.MapFallbackToFile("index.html");

app.Run();

static string? ReadPasswordFromEnvOrConsole(string[] cliArgs)
{
    var envFlagIndex = Array.FindIndex(cliArgs, a => string.Equals(a, "--password-env", StringComparison.OrdinalIgnoreCase));
    if (envFlagIndex >= 0 && envFlagIndex + 1 < cliArgs.Length)
    {
        return Environment.GetEnvironmentVariable(cliArgs[envFlagIndex + 1]);
    }

    if (Console.IsInputRedirected)
    {
        return Console.In.ReadLine()?.TrimEnd('\r', '\n');
    }

    Console.Write("Enter new System Administrator password: ");
    var chars = new List<char>();
    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter)
        {
            Console.WriteLine();
            break;
        }
        if (key.Key == ConsoleKey.Backspace)
        {
            if (chars.Count > 0) chars.RemoveAt(chars.Count - 1);
            continue;
        }
        if (!char.IsControl(key.KeyChar))
        {
            chars.Add(key.KeyChar);
        }
    }
    return new string(chars.ToArray());
}

public partial class Program;
