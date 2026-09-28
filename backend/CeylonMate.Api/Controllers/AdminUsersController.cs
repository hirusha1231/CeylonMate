using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
public sealed class AdminUsersController(
    CeylonMateDbContext context,
    ILogger<AdminUsersController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, CancellationToken cancellationToken)
    {
        var query = context.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
        {
            query = query.Where(u => u.Role == parsedRole);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAtUtc)
            .Select(u => new
            {
                id = u.Id,
                fullName = string.IsNullOrWhiteSpace(u.FullName) ? u.Email.Split('@', System.StringSplitOptions.None)[0] : u.FullName,
                email = u.Email,
                role = u.Role.ToString(),
                isActive = u.IsActive,
                status = u.IsActive ? "ACTIVE" : "INACTIVE",
                createdAt = u.CreatedAtUtc.ToString("yyyy-MM-dd")
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPut("{id}/toggle-status")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleStatusRequest? request = null, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Admin user status change requested for userId: {UserId}", id);
        var user = await context.Users.FindAsync([id], cancellationToken);
        if (user == null)
        {
            logger.LogWarning("Toggle status failed: User {UserId} not found in database", id);
            return NotFound(new { message = "User not found." });
        }

        if (request != null && request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }
        else
        {
            user.IsActive = !user.IsActive;
        }

        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("User {UserId} ({Email}) status successfully updated to {Status}", user.Id, user.Email, user.IsActive ? "ACTIVE" : "INACTIVE");

        return Ok(new
        {
            id = user.Id,
            userId = user.Id,
            isActive = user.IsActive,
            status = user.IsActive ? "ACTIVE" : "INACTIVE",
            message = $"User status changed to {(user.IsActive ? "ACTIVE" : "INACTIVE")}"
        });
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PatchUserStatus(Guid id, [FromBody] ToggleStatusRequest request, CancellationToken cancellationToken = default)
    {
        return await ToggleUserStatus(id, request, cancellationToken);
    }
}

public sealed record ToggleStatusRequest(bool? IsActive);
