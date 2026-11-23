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

    /// <summary>
    /// Append-only audit event recorded every time a project enters
    /// <see cref="ProjectStatus.Suspended"/>. It is the durable, auditable review marker required by
    /// ADR-0018: suspension blocks new holds, but existing holds must be surfaced for review and are
    /// never cancelled, expired, or released by the transition itself.
    /// </summary>
    public const string SuspensionReviewEventType = "PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED";

    private const string DeniedMessage =
        "Marketing and new internal reservations are allowed only while the project is in commercialization.";

    /// <summary>
    /// True only for the single allow-listed status. Undefined enum values are rejected because
    /// the comparison is against the allow-listed member rather than against a list of denials.
    /// </summary>
    public static bool AllowsMarketingAndNewReservation(ProjectStatus status)
        => status == ProjectStatus.Commercialization;

    /// <summary>
    /// True only for a real transition into <see cref="ProjectStatus.Suspended"/>. Saving a project
    /// that is already suspended is not a new transition and must not duplicate the review marker.
    /// </summary>
    public static bool RequiresSuspensionReview(ProjectStatus previousStatus, ProjectStatus currentStatus)
        => currentStatus == ProjectStatus.Suspended && previousStatus != ProjectStatus.Suspended;

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
