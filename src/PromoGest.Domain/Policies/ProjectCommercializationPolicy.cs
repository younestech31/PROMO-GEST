using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Domain.Policies;

/// <summary>
/// ADR-0018 — project commercialization eligibility.
/// Marketing and new internal reservations are allowed only while the project is explicitly in
/// <see cref="ProjectStatus.Commercialization"/>. Every other value is denied by default:
/// <see cref="ProjectStatus.Planning"/>, <see cref="ProjectStatus.UnderConstruction"/>,
/// <see cref="ProjectStatus.Delivered"/>, <see cref="ProjectStatus.Suspended"/>, an undefined
/// numeric value, and any status added to the enum later without an explicit review.
/// This is an allow-list, not a deny-list: silence means "not allowed".
/// </summary>
public static class ProjectCommercializationPolicy
{
    /// <summary>Stable API/audit code returned when the rule denies the operation.</summary>
    public const string DeniedCode = "PROJECT_NOT_COMMERCIALIZABLE";

    private const string DeniedMessage =
        "Marketing and new internal reservations are allowed only while the project is in commercialization.";

    /// <summary>
    /// True only for the single allow-listed status. Undefined enum values are rejected because
    /// the comparison is against the allow-listed member rather than against a list of denials.
    /// </summary>
    public static bool AllowsMarketingAndNewReservation(ProjectStatus status)
        => status == ProjectStatus.Commercialization;

    /// <summary>
    /// Throws <see cref="ConflictDomainException"/> (HTTP 409) when the rule denies the operation.
    /// Callers must apply this before creating or mutating any reservation state.
    /// </summary>
    public static void EnsureMarketingAndNewReservation(ProjectStatus status)
    {
        if (!AllowsMarketingAndNewReservation(status))
            throw new ConflictDomainException(DeniedCode, DeniedMessage);
    }
}
