using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Application.Services;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Exceptions;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private readonly UserManagementService _userService;

    public UsersController(UserManagementService userService)
    {
        _userService = userService;
    }

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<RoleDto>>> ListRoles(CancellationToken ct)
    {
        var roles = await _userService.ListRolesAsync(GetActorUserId(), GetMetadata(), ct);
        return Ok(roles);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> ListUsers(CancellationToken ct)
    {
        var users = await _userService.ListUsersAsync(GetActorUserId(), GetMetadata(), ct);
        return Ok(users);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateEmployee([FromBody] CreateEmployeeRequest request, CancellationToken ct)
    {
        var created = await _userService.CreateEmployeeAsync(GetActorUserId(), request, GetMetadata(), ct);
        return Created($"/api/users/{created.Id}", created);
    }

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<UserDto>> UpdateEmployee(Guid userId, [FromBody] UpdateEmployeeRequest request, CancellationToken ct)
    {
        var updated = await _userService.UpdateEmployeeAsync(GetActorUserId(), userId, request, GetMetadata(), ct);
        return Ok(updated);
    }

    [HttpPatch("{userId:guid}/status")]
    public async Task<ActionResult<UserDto>> SetStatus(Guid userId, [FromBody] SetUserStatusRequest request, CancellationToken ct)
    {
        var updated = await _userService.SetUserActiveStatusAsync(GetActorUserId(), userId, request.IsActive, GetMetadata(), ct);
        return Ok(updated);
    }

    [HttpPost("{userId:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid userId, [FromBody] ResetUserPasswordRequest request, CancellationToken ct)
    {
        await _userService.ResetEmployeePasswordAsync(GetActorUserId(), userId, request.NewPassword, GetMetadata(), ct);
        return NoContent();
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
