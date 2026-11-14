using System.Text.Json;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class ProjectCustomerService
{
    private readonly IProjectCustomerRepository _customerRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly IProjectDocumentRepository _documentRepository;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectCustomerService(
        IProjectCustomerRepository customerRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        IProjectDocumentRepository documentRepository,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _customerRepository = customerRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _documentRepository = documentRepository;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProjectCustomerListItemDto>> ListAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, permissions) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);
        var canReadDocuments = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);

        var customers = await _customerRepository.ListByProjectAsync(project.Id, ct);
        await RecordAuditAsync(
            actor,
            "PROJECT_CUSTOMERS_LISTED",
            "ProjectCustomer",
            project.Id.ToString(),
            "Viewed the project customer register.",
            new { projectId, resultCount = customers.Count },
            metadata,
            ct);

        return customers.Select(customer => MapListItem(customer, canReadDocuments)).ToList();
    }

    public async Task<ProjectCustomerDto> GetAsync(
        Guid actorUserId,
        Guid projectId,
        Guid customerId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, permissions) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);
        var canReadDocuments = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);

        var customer = await _customerRepository.GetByProjectAsync(project.Id, customerId, ct)
            ?? throw new NotFoundDomainException("CUSTOMER_NOT_FOUND", "Customer record was not found in this project.");

        await RecordAuditAsync(
            actor,
            "PROJECT_CUSTOMER_VIEWED",
            "ProjectCustomer",
            customer.Id.ToString(),
            "Viewed a project customer record.",
            new { projectId, customerId },
            metadata,
            ct);

        return MapDetails(customer, canReadDocuments);
    }

    public async Task<ProjectCustomerDto> CreateAsync(
        Guid actorUserId,
        Guid projectId,
        CreateProjectCustomerRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, permissions) = await RequireWriteAccessAsync(
            actorUserId, projectId, metadata, ct);

        var customerType = ParseEnum<CustomerType>(request.CustomerType, "CUSTOMER_TYPE_INVALID");
        var source = ParseEnum<CustomerSource>(request.Source, "CUSTOMER_SOURCE_INVALID");
        await ValidateIdentityDocumentAsync(
            project.Id, request.IdentityDocumentStoredFileId, actor, permissions, ct);

        var customer = ProjectCustomer.Create(
            project.Id,
            customerType,
            request.DisplayName,
            request.ContactPerson,
            request.Phone,
            request.Email,
            request.Address,
            request.PreferredLanguage,
            source,
            request.IdentityDocumentStoredFileId,
            actor.Id,
            _clock.UtcNow);

        if (await _customerRepository.ExistsDuplicateAsync(
            project.Id, customer.NormalizedDisplayName, customer.NormalizedPhone, ct: ct))
        {
            throw new ConflictDomainException(
                "CUSTOMER_DUPLICATE",
                "A customer with the same normalized name and phone number already exists in this project.");
        }

        await _customerRepository.AddCustomerAsync(customer, ct);
        await RecordAuditAsync(
            actor,
            "PROJECT_CUSTOMER_CREATED",
            "ProjectCustomer",
            customer.Id.ToString(),
            "Created a customer record in a project.",
            new
            {
                projectId,
                customerId = customer.Id,
                customerType = customer.CustomerType.ToString(),
                source = customer.Source.ToString(),
                identityDocumentLinked = customer.IdentityDocumentStoredFileId.HasValue
            },
            metadata,
            ct,
            saveChanges: false);

        await _customerRepository.SaveChangesAsync(ct);
        var saved = await _customerRepository.GetByProjectAsync(project.Id, customer.Id, ct)
            ?? throw new InvalidOperationException("The newly created customer could not be reloaded.");
        var canReadDocuments = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);
        return MapDetails(saved, canReadDocuments);
    }

    public async Task<ProjectCustomerDto> UpdateAsync(
        Guid actorUserId,
        Guid projectId,
        Guid customerId,
        UpdateProjectCustomerRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, permissions) = await RequireWriteAccessAsync(
            actorUserId, projectId, metadata, ct);

        var customer = await _customerRepository.GetByProjectAsync(project.Id, customerId, ct)
            ?? throw new NotFoundDomainException("CUSTOMER_NOT_FOUND", "Customer record was not found in this project.");

        if (request.ConcurrencyStamp == Guid.Empty || request.ConcurrencyStamp != customer.ConcurrencyStamp)
            throw new ConflictDomainException(
                "CONCURRENCY_CONFLICT",
                "The customer record changed after it was loaded. Reload it before saving.");

        var customerType = ParseEnum<CustomerType>(request.CustomerType, "CUSTOMER_TYPE_INVALID");
        var source = ParseEnum<CustomerSource>(request.Source, "CUSTOMER_SOURCE_INVALID");
        var status = ParseEnum<ProjectCustomerStatus>(request.Status, "CUSTOMER_STATUS_INVALID");
        var requestedIdentityDocumentId = request.IdentityDocumentStoredFileId;
        var canManageIdentityDocument = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);
        if (!canManageIdentityDocument)
        {
            // A customer manager without file-read permission may edit contact data,
            // but cannot inspect, replace, or accidentally unlink the existing document.
            if (requestedIdentityDocumentId.HasValue &&
                requestedIdentityDocumentId != customer.IdentityDocumentStoredFileId)
            {
                throw new ForbiddenDomainException(
                    "CUSTOMER_IDENTITY_DOCUMENT_ACCESS_DENIED",
                    "You need project document read permission to change the linked identity document.");
            }

            requestedIdentityDocumentId = customer.IdentityDocumentStoredFileId;
        }

        await ValidateIdentityDocumentAsync(
            project.Id, requestedIdentityDocumentId, actor, permissions, ct);

        var normalizedName = ProjectCustomer.Create(
            project.Id,
            customerType,
            request.DisplayName,
            request.ContactPerson,
            request.Phone,
            request.Email,
            request.Address,
            request.PreferredLanguage,
            source,
            requestedIdentityDocumentId,
            actor.Id,
            _clock.UtcNow);

        if (await _customerRepository.ExistsDuplicateAsync(
            project.Id,
            normalizedName.NormalizedDisplayName,
            normalizedName.NormalizedPhone,
            customer.Id,
            ct))
        {
            throw new ConflictDomainException(
                "CUSTOMER_DUPLICATE",
                "A different customer with the same normalized name and phone number already exists in this project.");
        }

        customer.UpdateDetails(
            customerType,
            request.DisplayName,
            request.ContactPerson,
            request.Phone,
            request.Email,
            request.Address,
            request.PreferredLanguage,
            source,
            status,
            requestedIdentityDocumentId,
            _clock.UtcNow);

        await RecordAuditAsync(
            actor,
            "PROJECT_CUSTOMER_UPDATED",
            "ProjectCustomer",
            customer.Id.ToString(),
            "Updated a project customer record.",
            new
            {
                projectId,
                customerId,
                status = customer.Status.ToString(),
                identityDocumentLinked = customer.IdentityDocumentStoredFileId.HasValue
            },
            metadata,
            ct,
            saveChanges: false);

        await _customerRepository.SaveChangesAsync(ct);
        var saved = await _customerRepository.GetByProjectAsync(project.Id, customer.Id, ct)
            ?? throw new InvalidOperationException("The updated customer could not be reloaded.");
        var canReadDocuments = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);
        return MapDetails(saved, canReadDocuments);
    }

    public async Task<CustomerInteractionDto> AddInteractionAsync(
        Guid actorUserId,
        Guid projectId,
        Guid customerId,
        AddCustomerInteractionRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, _) = await RequireWriteAccessAsync(
            actorUserId, projectId, metadata, ct);

        var customer = await _customerRepository.GetByProjectAsync(project.Id, customerId, ct)
            ?? throw new NotFoundDomainException("CUSTOMER_NOT_FOUND", "Customer record was not found in this project.");

        var type = ParseEnum<CustomerInteractionType>(request.Type, "CUSTOMER_INTERACTION_TYPE_INVALID");
        var nowUtc = _clock.UtcNow;
        var interaction = CustomerInteraction.Create(
            customer.Id,
            type,
            request.Subject,
            request.Summary,
            request.OccurredAtUtc ?? nowUtc,
            request.NextFollowUpAtUtc,
            actor.Id,
            nowUtc);

        await _customerRepository.AddInteractionAsync(interaction, ct);
        await RecordAuditAsync(
            actor,
            "PROJECT_CUSTOMER_INTERACTION_ADDED",
            "CustomerInteraction",
            interaction.Id.ToString(),
            "Recorded a customer communication or follow-up.",
            new
            {
                projectId,
                customerId,
                interactionId = interaction.Id,
                interactionType = interaction.Type.ToString(),
                hasFollowUp = interaction.NextFollowUpAtUtc.HasValue
            },
            metadata,
            ct,
            saveChanges: false);

        await _customerRepository.SaveChangesAsync(ct);
        return new CustomerInteractionDto(
            interaction.Id,
            interaction.Type.ToString(),
            interaction.Subject,
            interaction.Summary,
            interaction.OccurredAtUtc,
            interaction.NextFollowUpAtUtc,
            actor.FullName);
    }

    private async Task<(User Actor, Project Project, IReadOnlyList<string> Permissions)> RequireWriteAccessAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        var (actor, project, permissions) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: true, metadata, ct);
        return (actor, project, permissions);
    }

    private async Task<(User Actor, Project Project, IReadOnlyList<string> Permissions)> RequireProjectAccessAsync(
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

        var hasGlobalProjectScope = permissions.Contains("projects.manage", StringComparer.OrdinalIgnoreCase);
        var hasProjectScope = actor.IsSystemAdministrator || membership is not null || hasGlobalProjectScope;
        var hasReadPermission = actor.IsSystemAdministrator ||
            permissions.Contains("customers.read", StringComparer.OrdinalIgnoreCase);
        var hasManagePermission = actor.IsSystemAdministrator ||
            permissions.Contains("customers.manage", StringComparer.OrdinalIgnoreCase);
        var isProjectSalesManager = membership?.CanManageSales == true ||
            membership?.RoleInProject == ProjectRole.ProjectManager;

        var allowed = hasProjectScope && hasReadPermission &&
            (!canWrite || (hasManagePermission &&
                (actor.IsSystemAdministrator || hasGlobalProjectScope || isProjectSalesManager)));

        if (!allowed)
        {
            await RecordAuditAsync(
                actor,
                "ACCESS_DENIED",
                "Project",
                project.Id.ToString(),
                $"Unauthorized project-customer {(canWrite ? "write" : "read")} attempt.",
                new { projectId, operation = canWrite ? "write" : "read" },
                metadata,
                ct);
            throw new ForbiddenDomainException(
                canWrite ? "FORBIDDEN_PROJECT_CUSTOMER_WRITE" : "PROJECT_CUSTOMER_ACCESS_DENIED",
                canWrite
                    ? "You do not have permission to manage customers for this project."
                    : "You do not have permission to view customers for this project.");
        }

        return (actor, project, permissions);
    }

    private async Task ValidateIdentityDocumentAsync(
        Guid projectId,
        Guid? documentId,
        User actor,
        IReadOnlyList<string> permissions,
        CancellationToken ct)
    {
        if (!documentId.HasValue)
            return;

        var hasFileRead = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);
        if (!hasFileRead)
            throw new ForbiddenDomainException(
                "CUSTOMER_IDENTITY_DOCUMENT_ACCESS_DENIED",
                "You need project document read permission to link an identity document.");

        var document = await _documentRepository.GetProjectDocumentAsync(projectId, documentId.Value, ct);
        if (document is null)
            throw new NotFoundDomainException(
                "CUSTOMER_IDENTITY_DOCUMENT_NOT_FOUND",
                "The selected identity document does not belong to this project or no longer exists.");
    }

    private async Task RecordAuditAsync(
        User actor,
        string eventType,
        string targetEntityType,
        string? targetEntityId,
        string summary,
        object metadataObject,
        RequestMetadata requestMetadata,
        CancellationToken ct,
        bool saveChanges = true)
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
            await _customerRepository.SaveChangesAsync(ct);
    }

    private static T ParseEnum<T>(string? value, string errorCode) where T : struct, Enum
    {
        if (!Enum.TryParse<T>(value, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
            throw new DomainException(errorCode, "A valid value must be selected.");
        return parsed;
    }

    private static ProjectCustomerListItemDto MapListItem(ProjectCustomer customer, bool canReadDocuments)
        => new(
            customer.Id,
            customer.CustomerType.ToString(),
            customer.DisplayName,
            customer.ContactPerson,
            customer.Phone,
            customer.Email,
            customer.Status.ToString(),
            customer.Source.ToString(),
            customer.UpdatedAtUtc,
            customer.Interactions.Count,
            canReadDocuments && customer.IdentityDocumentStoredFileId.HasValue,
            customer.ConcurrencyStamp);

    private static ProjectCustomerDto MapDetails(ProjectCustomer customer, bool canReadDocuments)
        => new(
            customer.Id,
            customer.ProjectId,
            customer.CustomerType.ToString(),
            customer.DisplayName,
            customer.ContactPerson,
            customer.Phone,
            customer.Email,
            customer.Address,
            customer.PreferredLanguage,
            customer.Source.ToString(),
            customer.Status.ToString(),
            !canReadDocuments || customer.IdentityDocumentFile is null
                ? null
                : new CustomerIdentityDocumentDto(
                    customer.IdentityDocumentFile.Id,
                    customer.IdentityDocumentFile.OriginalFileName,
                    customer.IdentityDocumentFile.Category,
                    customer.IdentityDocumentFile.SizeBytes),
            customer.Interactions
                .OrderByDescending(interaction => interaction.OccurredAtUtc)
                .Select(interaction => new CustomerInteractionDto(
                    interaction.Id,
                    interaction.Type.ToString(),
                    interaction.Subject,
                    interaction.Summary,
                    interaction.OccurredAtUtc,
                    interaction.NextFollowUpAtUtc,
                    interaction.CreatedByUser?.FullName ?? string.Empty))
                .ToList(),
            customer.CreatedAtUtc,
            customer.UpdatedAtUtc,
            customer.ConcurrencyStamp);
}