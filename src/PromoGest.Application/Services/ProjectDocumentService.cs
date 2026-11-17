using System.Security.Cryptography;
using System.Text.Json;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed record ProjectDocumentDownload(
    Stream Content,
    string FileName,
    string ContentType);

public sealed class ProjectDocumentService
{
    public const long MaxDocumentBytes = 25L * 1024 * 1024;

    private static readonly IReadOnlyDictionary<string, string> AllowedTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = "application/pdf",
            [".png"] = "image/png",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".webp"] = "image/webp",
            [".doc"] = "application/msword",
            [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            [".xls"] = "application/vnd.ms-excel",
            [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            [".txt"] = "text/plain",
            [".csv"] = "text/csv"
        };

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.Ordinal)
    {
        "Legal", "LandAndTitle", "Permits", "Plans", "Engineering",
        "Commercial", "Financial", "Correspondence", "Other"
    };

    private readonly IProjectDocumentRepository _documentRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly IProjectFileStorage _fileStorage;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ProjectDocumentService(
        IProjectDocumentRepository documentRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        IProjectFileStorage fileStorage,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _documentRepository = documentRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _fileStorage = fileStorage;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProjectDocumentDto>> ListAsync(
        Guid actorUserId,
        Guid projectId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, membership, permissions) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);
        var files = await _documentRepository.ListProjectDocumentsAsync(projectId, ct);

        // A filtered Financial document is still a sensitive-read denial and must be audited.
        if (files.Any(item => string.Equals(item.File.Category, "Financial", StringComparison.Ordinal)) &&
            !CanAccessCategory(actor.IsSystemAdministrator, membership, forUpload: false, "Financial"))
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "Project",
                    project.Id.ToString(),
                    $"Unauthorized project financial-document list attempt by '{actor.Username}' on project '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId = project.Id, category = "Financial", operation = "list" }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);
        }
        var canReadCustomerIdentity = CanReadCustomerIdentityDocuments(actor, permissions);
        var identityDocIds = canReadCustomerIdentity
            ? (IReadOnlySet<Guid>)new HashSet<Guid>()
            : await _documentRepository.ListCustomerIdentityDocumentIdsAsync(projectId, ct);

        return files
            .Where(item =>
                CanAccessCategory(actor.IsSystemAdministrator, membership, forUpload: false, item.File.Category) &&
                (canReadCustomerIdentity || !identityDocIds.Contains(item.File.Id)))
            .Select(item => Map(item.File, item.UploadedByFullName))
            .ToList();
    }

    public async Task<ProjectDocumentDto> UploadAsync(
        Guid actorUserId,
        Guid projectId,
        Stream content,
        string originalFileName,
        string category,
        string? description,
        long declaredSize,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, membership, _) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: true, metadata, ct);

        var normalizedCategory = (category ?? string.Empty).Trim();
        if (!AllowedCategories.Contains(normalizedCategory))
            throw new DomainException("FILE_CATEGORY_INVALID", "Select a valid document category.");

        if (!CanAccessCategory(actor.IsSystemAdministrator, membership, forUpload: true, normalizedCategory))
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "Project",
                    project.Id.ToString(),
                    $"Unauthorized project-document category upload ('{normalizedCategory}') by '{actor.Username}' on project '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId = project.Id, category = normalizedCategory, operation = "write" }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException(
                "FORBIDDEN_PROJECT_DOCUMENT_WRITE",
                "You do not have permission to upload documents in this category.");
        }

        if (description is not null && description.Trim().Length > 500)
            throw new DomainException("FILE_DESCRIPTION_TOO_LONG", "Document description must not exceed 500 characters.");

        var safeOriginalFileName = Path.GetFileName((originalFileName ?? string.Empty).Trim().Replace('\\', '/')) ?? string.Empty;
        safeOriginalFileName = new string(safeOriginalFileName.Where(character => !char.IsControl(character)).ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(safeOriginalFileName))
            throw new DomainException("FILE_NAME_REQUIRED", "Original file name is required.");
        if (safeOriginalFileName.Length > 255)
            throw new DomainException("FILE_NAME_TOO_LONG", "Original file name must not exceed 255 characters.");

        var extension = Path.GetExtension(safeOriginalFileName);
        if (!AllowedTypes.TryGetValue(extension, out var detectedContentType))
            throw new DomainException("FILE_TYPE_NOT_ALLOWED", "This file type is not supported. Upload PDF, images, Office documents, TXT, or CSV.");

        if (declaredSize <= 0)
            throw new DomainException("FILE_SIZE_INVALID", "Empty documents cannot be uploaded.");
        if (declaredSize > MaxDocumentBytes)
            throw new DomainException("FILE_SIZE_LIMIT_EXCEEDED", $"Document size cannot exceed {MaxDocumentBytes / (1024 * 1024)} MB.");

        var storedFile = await _fileStorage.SaveAsync(
            content,
            safeOriginalFileName,
            detectedContentType,
            normalizedCategory,
            description,
            StoredFileScope.Project,
            project.Id,
            actor.Id,
            MaxDocumentBytes,
            ct);

        try
        {
            var nowUtc = _clock.UtcNow;
            await _documentRepository.AddAsync(storedFile, ct);
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    nowUtc,
                    actor.Id,
                    actor.Username,
                    "PROJECT_DOCUMENT_UPLOADED",
                    AuditSeverity.Info,
                    "StoredFile",
                    storedFile.Id.ToString(),
                    $"Uploaded project document '{storedFile.OriginalFileName}' to '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId = project.Id, category = storedFile.Category, sizeBytes = storedFile.SizeBytes }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);
        }
        catch
        {
            _fileStorage.Delete(storedFile);
            throw;
        }

        return Map(storedFile, actor.FullName);
    }

    public async Task<ProjectDocumentDownload> GetDownloadAsync(
        Guid actorUserId,
        Guid projectId,
        Guid fileId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var (actor, project, membership, permissions) = await RequireProjectAccessAsync(
            actorUserId, projectId, canWrite: false, metadata, ct);
        var file = await _documentRepository.GetProjectDocumentAsync(project.Id, fileId, ct)
            ?? throw new NotFoundDomainException("PROJECT_DOCUMENT_NOT_FOUND", "Project document was not found.");

        var categoryAllowed = CanAccessCategory(actor.IsSystemAdministrator, membership, forUpload: false, file.Category);
        var isBlockedIdentityDocument = !CanReadCustomerIdentityDocuments(actor, permissions) &&
            await _documentRepository.IsCustomerIdentityDocumentAsync(project.Id, file.Id, ct);

        if (!categoryAllowed || isBlockedIdentityDocument)
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "StoredFile",
                    file.Id.ToString(),
                    $"Unauthorized project-document download attempt by '{actor.Username}' for '{file.OriginalFileName}' (category '{file.Category}') on project '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId = project.Id, fileId = file.Id, category = file.Category, identityPii = isBlockedIdentityDocument }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException(
                "PROJECT_DOCUMENT_ACCESS_DENIED",
                "You do not have permission to access this project document.");
        }

        var fullPath = _fileStorage.ResolveSafeFullPath(file);
        FileStream contentStream;
        try
        {
            contentStream = new FileStream(
                fullPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                81920,
                useAsync: true);
        }
        catch (Exception exception) when (exception is FileNotFoundException or DirectoryNotFoundException)
        {
            await RecordIntegrityFailureAsync(
                actor, project, file, metadata,
                "The stored document content is missing from the local storage root.",
                ct);
            throw new NotFoundDomainException(
                "PROJECT_DOCUMENT_CONTENT_MISSING",
                "The stored document content is not available on the local server.");
        }

        try
        {
            if (contentStream.Length != file.SizeBytes)
            {
                await RecordIntegrityFailureAsync(actor, project, file, metadata, "Document size does not match its stored metadata.", ct);
                throw new ConflictDomainException("PROJECT_DOCUMENT_INTEGRITY_FAILED", "The document failed its integrity check and cannot be downloaded.");
            }

            var actualHash = await SHA256.HashDataAsync(contentStream, ct);
            var expectedHash = Convert.FromHexString(file.Sha256Checksum);
            if (!CryptographicOperations.FixedTimeEquals(actualHash, expectedHash))
            {
                await RecordIntegrityFailureAsync(actor, project, file, metadata, "Document SHA-256 checksum does not match its stored metadata.", ct);
                throw new ConflictDomainException("PROJECT_DOCUMENT_INTEGRITY_FAILED", "The document failed its integrity check and cannot be downloaded.");
            }

            // Return the same open handle that was verified, avoiding a path re-open race.
            contentStream.Position = 0;
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "PROJECT_DOCUMENT_DOWNLOADED",
                    AuditSeverity.Info,
                    "StoredFile",
                    file.Id.ToString(),
                    $"Downloaded project document '{file.OriginalFileName}' from '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId = project.Id, sizeBytes = file.SizeBytes }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);

            return new ProjectDocumentDownload(contentStream, file.OriginalFileName, file.ContentType);
        }
        catch
        {
            await contentStream.DisposeAsync();
            throw;
        }
    }

    private async Task<(User Actor, Project Project, ProjectMember? Membership, IReadOnlyList<string> Permissions)> RequireProjectAccessAsync(
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
                await _auditWriter.WriteAsync(
                    AuditLog.Record(
                        _clock.UtcNow,
                        actor.Id,
                        actor.Username,
                        "ACCESS_DENIED",
                        AuditSeverity.Security,
                        "Project",
                        projectId.ToString(),
                        $"Unauthorized project-document {(canWrite ? "upload" : "read")} attempt by '{actor.Username}'.",
                        JsonSerializer.Serialize(new { projectId, operation = canWrite ? "write" : "read" }),
                        metadata.IpAddress,
                        metadata.UserAgent),
                    ct);
                await _documentRepository.SaveChangesAsync(ct);
                throw new ForbiddenDomainException(
                    canWrite ? "FORBIDDEN_PROJECT_DOCUMENT_WRITE" : "PROJECT_DOCUMENT_ACCESS_DENIED",
                    "You do not have permission to access documents for this project.");
            }
        }

        var project = await _projectRepository.GetByIdWithMembersAsync(projectId, ct)
            ?? throw new NotFoundDomainException("PROJECT_NOT_FOUND", "Project not found.");

        var membership = project.Members.FirstOrDefault(member => member.UserId == actorUserId);
        var permissions = actor.IsSystemAdministrator
            ? Array.Empty<string>()
            : await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);

        var hasProjectMembership = membership is not null;
        var hasReadPermission = actor.IsSystemAdministrator ||
            permissions.Contains("files.read", StringComparer.OrdinalIgnoreCase);
        var hasWritePermission = actor.IsSystemAdministrator ||
            permissions.Contains("files.write", StringComparer.OrdinalIgnoreCase);
        var canAccess = (actor.IsSystemAdministrator || hasProjectMembership) && hasReadPermission &&
            (!canWrite || (hasWritePermission &&
                (actor.IsSystemAdministrator || membership?.CanManageDocuments == true)));

        if (!canAccess)
        {
            await _auditWriter.WriteAsync(
                AuditLog.Record(
                    _clock.UtcNow,
                    actor.Id,
                    actor.Username,
                    "ACCESS_DENIED",
                    AuditSeverity.Security,
                    "Project",
                    project.Id.ToString(),
                    $"Unauthorized project-document {(canWrite ? "upload" : "read")} attempt by '{actor.Username}' on project '{project.Code}'.",
                    JsonSerializer.Serialize(new { projectId, operation = canWrite ? "write" : "read" }),
                    metadata.IpAddress,
                    metadata.UserAgent),
                ct);
            await _documentRepository.SaveChangesAsync(ct);
            throw new ForbiddenDomainException(
                canWrite ? "FORBIDDEN_PROJECT_DOCUMENT_WRITE" : "PROJECT_DOCUMENT_ACCESS_DENIED",
                canWrite
                    ? "You do not have permission to upload documents to this project."
                    : "You do not have permission to view documents for this project.");
        }

        return (actor, project, membership, permissions);
    }

    private static bool CanReadCustomerIdentityDocuments(User actor, IReadOnlyList<string> permissions)
        => actor.IsSystemAdministrator ||
           permissions.Contains("customers.read", StringComparer.OrdinalIgnoreCase);

    private static bool CanAccessCategory(
        bool isSystemAdministrator,
        ProjectMember? membership,
        bool forUpload,
        string category)
    {
        if (isSystemAdministrator)
            return true;

        if (membership is null)
            return false;

        // Financial reads require the explicit capability, including for ProjectManagers.
        // Upload behavior remains unchanged.
        if (!forUpload && string.Equals(category, "Financial", StringComparison.Ordinal))
            return membership.CanViewFinancials;

        if (membership.RoleInProject == ProjectRole.ProjectManager)
            return true;

        return category switch
        {
            "Financial" => membership.CanViewFinancials,
            "Commercial" => membership.CanManageSales,
            "Engineering" or "Plans" => forUpload
                ? membership.CanManageConstruction
                : membership.CanManageConstruction || membership.CanManageDocuments,
            "Legal" or "LandAndTitle" => membership.CanManageDocuments,
            _ => true
        };
    }

    private async Task RecordIntegrityFailureAsync(
        User actor,
        Project project,
        StoredFile file,
        RequestMetadata metadata,
        string reason,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                "PROJECT_DOCUMENT_INTEGRITY_FAILED",
                AuditSeverity.Security,
                "StoredFile",
                file.Id.ToString(),
                reason,
                JsonSerializer.Serialize(new { projectId = project.Id, fileId = file.Id }),
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _documentRepository.SaveChangesAsync(ct);
    }

    private static ProjectDocumentDto Map(StoredFile file, string uploadedByFullName)
        => new(
            file.Id,
            file.OriginalFileName,
            file.Category,
            file.Description,
            file.ContentType,
            file.SizeBytes,
            file.Sha256Checksum,
            file.UploadedByUserId,
            uploadedByFullName,
            file.CreatedAtUtc);
}
