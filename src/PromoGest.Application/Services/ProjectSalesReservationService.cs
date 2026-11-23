using System.Text.Json;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;
using PromoGest.Domain.Policies;

namespace PromoGest.Application.Services;

public sealed class ProjectSalesReservationService
{
    private readonly IProjectSalesReservationRepository _reservationRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IProjectCustomerRepository _customerRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectSalesReservationService(
        IProjectSalesReservationRepository reservationRepository,
        IProjectRepository projectRepository,
        IProjectCustomerRepository customerRepository,
        IUserRepository userRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _reservationRepository = reservationRepository;
        _projectRepository = projectRepository;
        _customerRepository = customerRepository;
        _userRepository = userRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProjectSalesReservationDto>> ListAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct = default)
        => await ListAsync(actorUserId, projectId, metadata, reviewQueueOnly: false, ct);

    public async Task<IReadOnlyList<ProjectSalesReservationDto>> ListAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        bool reviewQueueOnly,
        CancellationToken ct = default)
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);

        var reservations = await _reservationRepository.ListByProjectAsync(project.Id, ct);
        var visible = reviewQueueOnly
            ? reservations.Where(item => item.Reservation.IsAwaitingReview).ToList()
            : reservations;

        await WriteAuditAsync(
            actor,
            reviewQueueOnly ? "PROJECT_RESERVATION_REVIEW_QUEUE_VIEWED" : "PROJECT_RESERVATIONS_LISTED",
            "ProjectSalesReservation",
            project.Id.ToString(),
            reviewQueueOnly
                ? "Viewed the project suspension review queue."
                : "Viewed the project reservation register.",
            new { projectId, resultCount = visible.Count, reviewQueueOnly },
            metadata,
            ct,
            saveChanges: true);

        return visible.Select(item => Map(item.Reservation, item.UnitNumber, item.CustomerName)).ToList();
    }

    /// <summary>
    /// Records that an operator reviewed a hold that was queued by a suspension. This is bookkeeping
    /// only: the hold keeps its status, unit, and expiry, and the project status is untouched. It is
    /// therefore not an approval, a cancellation, or a release.
    /// </summary>
    public async Task<ProjectSalesReservationDto> ReviewAsync(
        Guid actorUserId,
        Guid projectId,
        Guid reservationId,
        ReviewProjectSalesReservationRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: true, metadata, ct);

        var reservation = await _reservationRepository.GetByProjectAsync(project.Id, reservationId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_NOT_FOUND",
                "The reservation was not found in this project.");

        if (request.ExpectedConcurrencyStamp == Guid.Empty ||
            request.ExpectedConcurrencyStamp != reservation.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "CONCURRENCY_CONFLICT",
                "The reservation changed after it was loaded. Reload it before recording the review.");
        }

        var unit = await _reservationRepository.GetPropertyUnitForProjectAsync(
            project.Id, reservation.PropertyUnitId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_UNIT_NOT_FOUND",
                "The property unit linked to this reservation was not found.");

        var customer = await _customerRepository.GetByProjectAsync(
            project.Id, reservation.ProjectCustomerId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_CUSTOMER_NOT_FOUND",
                "The customer linked to this reservation was not found.");

        var reviewRequiredAtUtc = reservation.ReviewRequiredAtUtc;
        var nowUtc = _clock.UtcNow;
        reservation.CompleteSuspensionReview(nowUtc);

        await WriteAuditAsync(
            actor,
            "PROJECT_RESERVATION_REVIEW_COMPLETED",
            "ProjectSalesReservation",
            reservation.Id.ToString(),
            "Recorded the suspension review of a project unit reservation without approving, cancelling, or releasing it.",
            new
            {
                projectId,
                reservationId = reservation.Id,
                reservationNumber = reservation.ReservationNumber,
                projectStatus = project.Status.ToString(),
                reservationStatus = reservation.Status.ToString(),
                reviewRequiredAtUtc,
                reviewCompletedAtUtc = reservation.ReviewCompletedAtUtc,
                stateChanged = false
            },
            metadata,
            ct,
            saveChanges: false);

        await _reservationRepository.SaveChangesAsync(ct);

        return Map(reservation, unit.UnitNumber, customer.Party.DisplayName);
    }

    public async Task<ProjectSalesReservationDto> GetAsync(
        Guid actorUserId,
        Guid projectId,
        Guid reservationId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);

        var reservation = await _reservationRepository.GetByProjectAsync(project.Id, reservationId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_NOT_FOUND",
                "The reservation was not found in this project.");

        var unit = await _reservationRepository.GetPropertyUnitForProjectAsync(
            project.Id, reservation.PropertyUnitId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_UNIT_NOT_FOUND",
                "The property unit linked to this reservation was not found.");

        var customer = await _customerRepository.GetByProjectAsync(
            project.Id, reservation.ProjectCustomerId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_CUSTOMER_NOT_FOUND",
                "The customer linked to this reservation was not found.");

        await WriteAuditAsync(
            actor,
            "PROJECT_RESERVATION_VIEWED",
            "ProjectSalesReservation",
            reservation.Id.ToString(),
            "Viewed a project unit reservation.",
            new { projectId, reservationId },
            metadata,
            ct,
            saveChanges: true);

        return Map(reservation, unit.UnitNumber, customer.Party.DisplayName);
    }

    public async Task<ProjectSalesReservationDto> CreateAsync(
        Guid actorUserId,
        Guid projectId,
        CreateProjectSalesReservationRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: true, metadata, ct);

        // ADR-0018 — allow-list gate: marketing and new internal reservations exist only while the
        // project is explicitly in commercialization. The denial is audited and persisted before the
        // conflict is raised so a refused attempt is always traceable. Existing reservations are
        // deliberately untouched: suspension never auto-cancels, expires, or releases them.
        if (!ProjectCommercializationPolicy.AllowsMarketingAndNewReservation(project.Status))
        {
            await WriteAuditAsync(
                actor,
                "PROJECT_RESERVATION_DENIED",
                "Project",
                project.Id.ToString(),
                "New reservation refused because the project is not in commercialization.",
                new
                {
                    reason = ProjectCommercializationPolicy.DeniedCode,
                    projectStatus = project.Status.ToString(),
                    propertyUnitId = request.PropertyUnitId,
                    projectCustomerId = request.ProjectCustomerId
                },
                metadata,
                ct,
                saveChanges: true);

            ProjectCommercializationPolicy.EnsureMarketingAndNewReservation(project.Status);
        }

        var nowUtc = _clock.UtcNow;
        var expiresAtUtc = request.ExpiresAtUtc.ToUniversalTime();
        if (expiresAtUtc <= nowUtc)
        {
            throw new DomainException(
                "RESERVATION_EXPIRY_INVALID",
                "The reservation expiry must be in the future.");
        }

        var unit = await _reservationRepository.GetPropertyUnitForProjectAsync(
            project.Id, request.PropertyUnitId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_UNIT_NOT_FOUND",
                "The selected property unit does not belong to this project.");

        if (unit.Status != PropertyUnitStatus.AvailableForSale)
        {
            throw new ConflictDomainException(
                "RESERVATION_UNIT_UNAVAILABLE",
                "Only units currently available for sale can be reserved.");
        }

        var customer = await _customerRepository.GetByProjectAsync(
            project.Id, request.ProjectCustomerId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_CUSTOMER_NOT_FOUND",
                "The selected customer does not belong to this project.");

        if (customer.Status == ProjectCustomerStatus.Archived)
        {
            throw new DomainException(
                "RESERVATION_CUSTOMER_ARCHIVED",
                "An archived customer cannot be assigned to a new reservation.");
        }

        var reservationNumber = $"RSV-{nowUtc:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
        unit.ReserveForSalesWorkflow(nowUtc);
        var reservation = ProjectSalesReservation.Create(
            project.Id,
            unit.Id,
            customer.Id,
            reservationNumber,
            nowUtc,
            expiresAtUtc,
            actor.Id,
            nowUtc);

        await _reservationRepository.AddAsync(reservation, ct);
        await WriteAuditAsync(
            actor,
            "PROJECT_RESERVATION_CREATED",
            "ProjectSalesReservation",
            reservation.Id.ToString(),
            "Created a project unit reservation.",
            new
            {
                projectId,
                reservationId = reservation.Id,
                propertyUnitId = unit.Id,
                customerId = customer.Id,
                reservationNumber
            },
            metadata,
            ct,
            saveChanges: false);

        await _reservationRepository.SaveChangesAsync(ct);

        return Map(reservation, unit.UnitNumber, customer.Party.DisplayName);
    }

    public async Task<ProjectSalesReservationDto> CancelAsync(
        Guid actorUserId,
        Guid projectId,
        Guid reservationId,
        CancelProjectSalesReservationRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: true, metadata, ct);

        var reservation = await _reservationRepository.GetByProjectAsync(project.Id, reservationId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_NOT_FOUND",
                "The reservation was not found in this project.");

        if (request.ExpectedConcurrencyStamp == Guid.Empty ||
            request.ExpectedConcurrencyStamp != reservation.ConcurrencyStamp)
        {
            throw new ConflictDomainException(
                "CONCURRENCY_CONFLICT",
                "The reservation changed after it was loaded. Reload it before cancelling.");
        }

        if (reservation.ExpiresAtUtc <= _clock.UtcNow)
        {
            throw new ConflictDomainException(
                "RESERVATION_EXPIRY_REACHED",
                "This reservation has reached its expiry time and will be closed by the expiry processor.");
        }

        var unit = await _reservationRepository.GetPropertyUnitForProjectAsync(
            project.Id, reservation.PropertyUnitId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_UNIT_NOT_FOUND",
                "The property unit linked to this reservation was not found.");

        var customer = await _customerRepository.GetByProjectAsync(
            project.Id, reservation.ProjectCustomerId, ct)
            ?? throw new NotFoundDomainException(
                "RESERVATION_CUSTOMER_NOT_FOUND",
                "The customer linked to this reservation was not found.");

        if (unit.Status != PropertyUnitStatus.Reserved)
        {
            throw new ConflictDomainException(
                "RESERVATION_UNIT_STATE_MISMATCH",
                "The property unit is not in the reserved state. The reservation cannot be cancelled automatically.");
        }

        var nowUtc = _clock.UtcNow;
        reservation.Cancel(request.Reason, actor.Id, nowUtc);
        unit.ReleaseSalesReservation(nowUtc);
        await WriteAuditAsync(
            actor,
            "PROJECT_RESERVATION_CANCELLED",
            "ProjectSalesReservation",
            reservation.Id.ToString(),
            "Cancelled a project unit reservation.",
            new
            {
                projectId,
                reservationId = reservation.Id,
                propertyUnitId = unit.Id,
                reasonProvided = !string.IsNullOrWhiteSpace(request.Reason)
            },
            metadata,
            ct,
            saveChanges: false);

        await _reservationRepository.SaveChangesAsync(ct);

        return Map(reservation, unit.UnitNumber, customer.Party.DisplayName);
    }

    private async Task<(User Actor, Project Project)> RequireProjectAccessAsync(
        Guid actorUserId,
        Guid projectId,
        bool canWrite,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");
        if (!actor.IsActive)
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");

        if (!actor.IsSystemAdministrator)
        {
            var accessMembership = await _projectRepository.GetMemberAsync(projectId, actorUserId, ct);
            if (accessMembership is null)
            {
                await WriteAuditAsync(
                    actor,
                    "ACCESS_DENIED",
                    "Project",
                    projectId.ToString(),
                    "Unauthorized project reservation access attempt.",
                    new { projectId, operation = canWrite ? "write" : "read" },
                    metadata,
                    ct,
                    saveChanges: true);
                throw new ForbiddenDomainException(
                    canWrite ? "FORBIDDEN_PROJECT_RESERVATION_WRITE" : "PROJECT_RESERVATION_ACCESS_DENIED",
                    "You do not have permission to access reservations for this project.");
            }
        }

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var membership = project.Members.FirstOrDefault(member => member.UserId == actorUserId);
        var permissions = actor.IsSystemAdministrator
            ? Array.Empty<string>()
            : await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);

        var hasProjectMembership = membership is not null;
        var canRead = actor.IsSystemAdministrator ||
            (permissions.Contains("sales.reservations.read", StringComparer.OrdinalIgnoreCase) &&
             permissions.Contains("customers.read", StringComparer.OrdinalIgnoreCase));
        var hasSalesManagement = actor.IsSystemAdministrator ||
            permissions.Contains("sales.reservations.manage", StringComparer.OrdinalIgnoreCase);
        var canManageSalesInProject = membership is not null &&
            (membership.CanManageSales || membership.RoleInProject == ProjectRole.ProjectManager);

        var allowed = (actor.IsSystemAdministrator || hasProjectMembership) && canRead &&
            (!canWrite || (hasSalesManagement &&
                (actor.IsSystemAdministrator || canManageSalesInProject)));
        if (!allowed)
        {
            await WriteAuditAsync(
                actor,
                "ACCESS_DENIED",
                "Project",
                project.Id.ToString(),
                "Unauthorized project reservation access attempt.",
                new { projectId, operation = canWrite ? "write" : "read" },
                metadata,
                ct,
                saveChanges: true);

            throw new ForbiddenDomainException(
                canWrite ? "FORBIDDEN_PROJECT_RESERVATION_WRITE" : "PROJECT_RESERVATION_ACCESS_DENIED",
                canWrite
                    ? "You do not have permission to manage reservations for this project."
                    : "You do not have permission to view reservations for this project.");
        }

        return (actor, project);
    }

    private async Task WriteAuditAsync(
        User actor,
        string eventType,
        string targetEntityType,
        string targetEntityId,
        string summary,
        object metadataObject,
        RequestMetadata requestMetadata,
        CancellationToken ct,
        bool saveChanges)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                eventType,
                eventType == "ACCESS_DENIED" ? AuditSeverity.Security : AuditSeverity.Info,
                targetEntityType,
                targetEntityId,
                summary,
                JsonSerializer.Serialize(metadataObject),
                requestMetadata.IpAddress,
                requestMetadata.UserAgent),
            ct);

        if (saveChanges)
            await _reservationRepository.SaveChangesAsync(ct);
    }

    private static ProjectSalesReservationDto Map(
        ProjectSalesReservation reservation,
        string unitNumber,
        string customerName)
        => new(
            reservation.Id,
            reservation.ProjectId,
            reservation.PropertyUnitId,
            unitNumber,
            reservation.ProjectCustomerId,
            customerName,
            reservation.ReservationNumber,
            reservation.Status.ToString(),
            reservation.ReservedAtUtc,
            reservation.ExpiresAtUtc,
            reservation.ClosedAtUtc,
            reservation.ClosedByUserId,
            reservation.CloseReason,
            reservation.CreatedByUserId,
            reservation.CreatedAtUtc,
            reservation.ConcurrencyStamp,
            reservation.ReviewRequiredAtUtc,
            reservation.ReviewCompletedAtUtc,
            reservation.IsAwaitingReview);
}

public sealed class ProjectSalesReservationExpiryProcessor
{
    private readonly IProjectSalesReservationRepository _reservationRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectSalesReservationExpiryProcessor(
        IProjectSalesReservationRepository reservationRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _reservationRepository = reservationRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<int> ProcessDueAsync(CancellationToken ct = default)
    {
        var nowUtc = _clock.UtcNow;
        var due = await _reservationRepository.ListDueForExpiryAsync(nowUtc, 100, ct);
        var expiredCount = 0;

        foreach (var reservation in due)
        {
            var unit = await _reservationRepository.GetPropertyUnitForProjectAsync(
                reservation.ProjectId, reservation.PropertyUnitId, ct);
            if (unit is null)
                continue;

            var unitStateMatches = unit.Status == PropertyUnitStatus.Reserved;
            if (unitStateMatches)
                unit.ReleaseSalesReservation(nowUtc);

            reservation.Expire(nowUtc);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    null,
                    "system",
                    unitStateMatches
                        ? "PROJECT_RESERVATION_EXPIRED"
                        : "PROJECT_RESERVATION_EXPIRED_UNIT_STATE_MISMATCH",
                    unitStateMatches ? AuditSeverity.Info : AuditSeverity.Warning,
                    "ProjectSalesReservation",
                    reservation.Id.ToString(),
                    unitStateMatches
                        ? "Automatically expired a project unit reservation and released its unit."
                        : "Automatically expired a reservation; the linked unit was not in the expected Reserved state and was left unchanged.",
                    JsonSerializer.Serialize(new
                    {
                        projectId = reservation.ProjectId,
                        reservationId = reservation.Id,
                        propertyUnitId = reservation.PropertyUnitId
                    }),
                    null,
                    "PROMO GEST reservation expiry worker"),
                ct);
            expiredCount++;
        }

        if (expiredCount > 0)
            await _reservationRepository.SaveChangesAsync(ct);

        return expiredCount;
    }
}
