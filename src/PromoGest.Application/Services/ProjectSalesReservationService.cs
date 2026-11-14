using System.Text.Json;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Common;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

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
    {
        var (actor, project) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);

        var reservations = await _reservationRepository.ListByProjectAsync(project.Id, ct);
        await WriteAuditAsync(
            actor,
            "PROJECT_RESERVATIONS_LISTED",
            "ProjectSalesReservation",
            project.Id.ToString(),
            "Viewed the project reservation register.",
            new { projectId, resultCount = reservations.Count },
            metadata,
            ct,
            saveChanges: true);

        return reservations.Select(item => Map(item.Reservation, item.UnitNumber, item.CustomerName)).ToList();
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

        return Map(reservation, unit.UnitNumber, customer.DisplayName);
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

        return Map(reservation, unit.UnitNumber, customer.DisplayName);
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

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var membership = project.Members.FirstOrDefault(member => member.UserId == actorUserId);
        var permissions = actor.IsSystemAdministrator
            ? Array.Empty<string>()
            : await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);

        var hasProjectScope = actor.IsSystemAdministrator ||
            membership is not null ||
            permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase);
        var canRead = actor.IsSystemAdministrator ||
            permissions.Contains("sales.reservations.read", StringComparer.OrdinalIgnoreCase);
        var hasSalesManagement = actor.IsSystemAdministrator ||
            permissions.Contains("sales.reservations.manage", StringComparer.OrdinalIgnoreCase);
        var canManageSalesInProject = actor.IsSystemAdministrator ||
            permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase) ||
            membership?.CanManageSales == true ||
            membership?.RoleInProject == ProjectRole.ProjectManager;

        var allowed = hasProjectScope && canRead &&
            (!canWrite || (hasSalesManagement && canManageSalesInProject));
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
            reservation.ConcurrencyStamp);
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
