using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/documents")]
[Authorize]
public sealed class ProjectDocumentsController : ControllerBase
{
    private readonly ProjectDocumentService _documentService;

    public ProjectDocumentsController(ProjectDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDocumentDto>>> List(Guid projectId, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        Response.Headers.Pragma = "no-cache";
        var documents = await _documentService.ListAsync(GetActorUserId(), projectId, GetMetadata(), ct);
        return Ok(documents);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26 * 1024 * 1024)]
    public async Task<ActionResult<ProjectDocumentDto>> Upload(
        Guid projectId,
        [FromForm] UploadProjectDocumentForm form,
        CancellationToken ct)
    {
        if (form.File is null)
            return BadRequest(new { code = "FILE_CONTENT_REQUIRED", message = "A document file is required." });

        await using var stream = form.File.OpenReadStream();
        var document = await _documentService.UploadAsync(
            GetActorUserId(),
            projectId,
            stream,
            form.File.FileName,
            form.Category,
            form.Description,
            form.File.Length,
            GetMetadata(),
            ct,
            form.IsCustomerIdentitySensitive);

        return CreatedAtAction(
            nameof(Download),
            new { projectId, fileId = document.Id },
            document);
    }

    [HttpPost("{fileId:guid}/sensitivity-review")]
    public async Task<IActionResult> ReviewSensitivity(Guid projectId, Guid fileId,
        [FromBody] ReviewProjectDocumentSensitivityRequest request, CancellationToken ct)
    {
        await _documentService.ReviewSensitivityAsync(GetActorUserId(), projectId, fileId, request, GetMetadata(), ct);
        return NoContent();
    }

    [HttpGet("{fileId:guid}/download")]
    public async Task<IActionResult> Download(Guid projectId, Guid fileId, CancellationToken ct)
    {
        var download = await _documentService.GetDownloadAsync(
            GetActorUserId(), projectId, fileId, GetMetadata(), ct);

        Response.Headers.CacheControl = "no-store, no-cache";
        Response.Headers.Pragma = "no-cache";
        return File(download.Content, download.ContentType, download.FileName, enableRangeProcessing: false);
    }

    private Guid GetActorUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var userId))
            throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authenticated user identity is missing.");
        return userId;
    }

    private RequestMetadata GetMetadata()
        => new(HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());
}

public sealed class UploadProjectDocumentForm
{
    [FromForm(Name = "file")]
    public IFormFile? File { get; set; }

    [FromForm(Name = "category")]
    public string Category { get; set; } = "Other";

    [FromForm(Name = "description")]
    public string? Description { get; set; }

    // Older clients that do not supply a classification fail closed.
    [FromForm(Name = "isCustomerIdentitySensitive")]
    public bool IsCustomerIdentitySensitive { get; set; } = true;
}
