using System.Net;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PromoGest.Contracts.Common;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            var statusCode = ex switch
            {
                UnauthorizedDomainException => HttpStatusCode.Unauthorized,
                ForbiddenDomainException => HttpStatusCode.Forbidden,
                NotFoundDomainException => HttpStatusCode.NotFound,
                ConflictDomainException or CommittedWriteResponseException => HttpStatusCode.Conflict,
                _ => HttpStatusCode.BadRequest
            };
            if (ex is CommittedWriteResponseException)
                _logger.LogWarning("A structure write committed but the response refresh failed. Exception type: {ExceptionType}",
                    ex.InnerException?.GetType().Name);

            context.Response.StatusCode = (int)statusCode;
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse(ex.Code, ex.Message));
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState is "23505" or "40001")
        {
            await WriteDatabaseConflictAsync(context, pgEx);
        }
        catch (PostgresException ex) when (ex.SqlState is "23505" or "40001")
        {
            await WriteDatabaseConflictAsync(context, ex);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Optimistic concurrency conflict on {Method} {Path}", context.Request.Method, context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            await context.Response.WriteAsJsonAsync(
                new ApiErrorResponse("CONCURRENCY_CONFLICT", "The record was changed by another operation. Reload the data and try again."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            await context.Response.WriteAsJsonAsync(
                new ApiErrorResponse("INTERNAL_ERROR", "An unexpected internal error occurred. Contact your local System Administrator."));
        }
    }

    private async Task WriteDatabaseConflictAsync(HttpContext context, PostgresException postgresException)
    {
        _logger.LogWarning(
            postgresException,
            "PostgreSQL concurrency or uniqueness conflict ({SqlState}) on {Method} {Path}",
            postgresException.SqlState,
            context.Request.Method,
            context.Request.Path);

        var code = postgresException.ConstraintName switch
        {
            "ux_organization_settings_singleton" or "ux_users_single_system_admin"
                => "SETUP_ALREADY_INITIALIZED",
            "ux_project_customers_project_name_phone"
                => "CUSTOMER_DUPLICATE",
            _ when postgresException.SqlState == "40001"
                => "CONCURRENCY_CONFLICT",
            _ => "CONFLICT"
        };

        context.Response.StatusCode = (int)HttpStatusCode.Conflict;
        await context.Response.WriteAsJsonAsync(
            new ApiErrorResponse(code, "The requested operation conflicted with an existing or concurrent change."));
    }
}

public sealed class CsrfValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IAntiforgery _antiforgery;
    private readonly ILogger<CsrfValidationMiddleware> _logger;

    public CsrfValidationMiddleware(
        RequestDelegate next,
        IAntiforgery antiforgery,
        ILogger<CsrfValidationMiddleware> logger)
    {
        _next = next;
        _antiforgery = antiforgery;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase) &&
            IsStateChangingMethod(context.Request.Method))
        {
            try
            {
                await _antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException ex)
            {
                _logger.LogWarning(ex, "Rejected state-changing request without valid CSRF token: {Method} {Path}", context.Request.Method, context.Request.Path);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(
                    new ApiErrorResponse("CSRF_TOKEN_INVALID", "Missing or invalid anti-forgery (CSRF) token."));
                return;
            }
        }

        await _next(context);
    }

    private static bool IsStateChangingMethod(string method)
        => HttpMethods.IsPost(method) ||
           HttpMethods.IsPut(method) ||
           HttpMethods.IsPatch(method) ||
           HttpMethods.IsDelete(method);
}

public sealed class PasswordChangeRequiredMiddleware
{
    private readonly RequestDelegate _next;

    public PasswordChangeRequiredMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!string.Equals(
                context.User.FindFirst("must_change_password")?.Value,
                "true",
                StringComparison.Ordinal))
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path;
        var isAllowed =
            (HttpMethods.IsGet(context.Request.Method) &&
             (path.Equals("/api/auth/me", StringComparison.OrdinalIgnoreCase) ||
              path.Equals("/api/auth/csrf", StringComparison.OrdinalIgnoreCase) ||
              path.Equals("/health/live", StringComparison.OrdinalIgnoreCase) ||
              path.Equals("/health/ready", StringComparison.OrdinalIgnoreCase))) ||
            (HttpMethods.IsGet(context.Request.Method) &&
             !path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase) &&
             !path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase)) ||
            (HttpMethods.IsPost(context.Request.Method) &&
             (path.Equals("/api/auth/change-password", StringComparison.OrdinalIgnoreCase) ||
              path.Equals("/api/auth/logout", StringComparison.OrdinalIgnoreCase)));

        if (isAllowed)
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(
            new ApiErrorResponse(
                "PASSWORD_CHANGE_REQUIRED",
                "Change the temporary password before accessing organization or project data."));
    }
}

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

        // API and health responses can contain session, customer, project, or operational
        // data. Prevent browser and intermediary HTTP caches from storing those responses.
        // Static SPA assets are intentionally excluded so their existing cache policy is unchanged.
        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Headers["Cache-Control"] = "no-store";
        }

        await _next(context);
    }
}
