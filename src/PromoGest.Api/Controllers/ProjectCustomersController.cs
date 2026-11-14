using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Projects;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/customers")]
[Authorize]
public sealed class ProjectCustomersController : ControllerBase
{
    private readonly ProjectCustomerService _customerService;

    public ProjectCustomersController(ProjectCustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectCustomerListItemDto>>> List(
        Guid projectId,
        CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        var customers = await _customerService.ListAsync(GetActorUserId(), projectId, GetMetadata(), ct);
        return Ok(customers);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectCustomerDto>> Create(
        Guid projectId,
        [FromBody] CreateProjectCustomerRequest request,
        CancellationToken ct)
    {
        var customer = await _customerService.CreateAsync(
            GetActorUserId(), projectId, request, GetMetadata(), ct);
        return CreatedAtAction(
            nameof(GetById),
            new { projectId, customerId = customer.Id },
            customer);
    }

    [HttpGet("{customerId:guid}")]
    public async Task<ActionResult<ProjectCustomerDto>> GetById(
        Guid projectId,
        Guid customerId,
        CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        var customer = await _customerService.GetAsync(
            GetActorUserId(), projectId, customerId, GetMetadata(), ct);
        return Ok(customer);
    }

    [HttpPut("{customerId:guid}")]
    public async Task<ActionResult<ProjectCustomerDto>> Update(
        Guid projectId,
        Guid customerId,
        [FromBody] UpdateProjectCustomerRequest request,
        CancellationToken ct)
    {
        var customer = await _customerService.UpdateAsync(
            GetActorUserId(), projectId, customerId, request, GetMetadata(), ct);
        return Ok(customer);
    }

    [HttpPost("{customerId:guid}/interactions")]
    public async Task<ActionResult<CustomerInteractionDto>> AddInteraction(
        Guid projectId,
        Guid customerId,
        [FromBody] AddCustomerInteractionRequest request,
        CancellationToken ct)
    {
        var interaction = await _customerService.AddInteractionAsync(
            GetActorUserId(), projectId, customerId, request, GetMetadata(), ct);
        return Created($"/api/projects/{projectId}/customers/{customerId}", interaction);
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