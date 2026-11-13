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
builder.Logging.AddEventLog(options => options.SourceName = "PromoGestLocalErp");

var requireHttpsCookies = builder.Configuration.GetValue<bool>("Security:RequireHttpsCookies", true);

builder.Services.AddPromoGestInfrastructure(builder.Configuration);

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
    dpBuilder.ProtectKeysWithDpapi();
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
