using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/reservations")]
[Authorize]
public sealed class ProjectSalesReservationsController : ControllerBase
{
    private readonly ProjectSalesReservationService _reservationService;

    public ProjectSalesReservationsController(ProjectSalesReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectSalesReservationDto>>> List(
        Guid projectId,
        CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        var reservations = await _reservationService.ListAsync(
            GetActorUserId(), projectId, GetMetadata(), ct);
        return Ok(reservations);
    }

    [HttpGet("{reservationId:guid}")]
    public async Task<ActionResult<ProjectSalesReservationDto>> Get(
        Guid projectId,
        Guid reservationId,
        CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        var reservation = await _reservationService.GetAsync(
            GetActorUserId(), projectId, reservationId, GetMetadata(), ct);
        return Ok(reservation);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectSalesReservationDto>> Create(
        Guid projectId,
        [FromBody] CreateProjectSalesReservationRequest request,
        CancellationToken ct)
    {
        var reservation = await _reservationService.CreateAsync(
            GetActorUserId(), projectId, request, GetMetadata(), ct);
        return CreatedAtAction(
            nameof(Get),
            new { projectId, reservationId = reservation.Id },
            reservation);
    }

    [HttpPost("{reservationId:guid}/cancel")]
    public async Task<ActionResult<ProjectSalesReservationDto>> Cancel(
        Guid projectId,
        Guid reservationId,
        [FromBody] CancelProjectSalesReservationRequest request,
        CancellationToken ct)
    {
        var reservation = await _reservationService.CancelAsync(
            GetActorUserId(), projectId, reservationId, request, GetMetadata(), ct);
        return Ok(reservation);
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
