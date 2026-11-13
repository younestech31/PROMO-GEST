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
                ConflictDomainException => HttpStatusCode.Conflict,
                _ => HttpStatusCode.BadRequest
            };

            context.Response.StatusCode = (int)statusCode;
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse(ex.Code, ex.Message));
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState is "23505" or "40001")
        {
            _logger.LogWarning(pgEx, "PostgreSQL concurrency or uniqueness conflict ({SqlState}) on {Method} {Path}", pgEx.SqlState, context.Request.Method, context.Request.Path);
            var code = pgEx.ConstraintName is "ux_organization_settings_singleton" or "ux_users_single_system_admin"
                ? "SETUP_ALREADY_INITIALIZED"
                : pgEx.SqlState == "40001"
                    ? "CONCURRENCY_CONFLICT"
                    : "CONFLICT";

            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse(code, "The requested operation conflicted with an existing or concurrent change."));
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
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

        await _next(context);
    }
}
