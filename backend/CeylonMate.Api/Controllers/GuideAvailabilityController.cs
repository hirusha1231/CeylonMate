using CeylonMate.Api.Data;
using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[Tags("Capacity")]
[ApiController]
[Route("api/guides")]
public sealed class GuideAvailabilityController(
    ICapacityReservationService capacityService,
    CeylonMateDbContext db) : ControllerBase
{
    [HttpGet("options")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetGuideOptions(CancellationToken cancellationToken)
    {
        var guides = await db.Users
            .Where(u => u.Role == Auth.UserRole.LOCAL_GUIDE)
            .Select(u => new
            {
                id = u.Id,
                name = string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName,
                email = u.Email
            })
            .ToListAsync(cancellationToken);
        return Ok(guides);
    }
    [HttpGet("{guideId:guid}/availability")]
    [AllowAnonymous]
    [ProducesResponseType<IEnumerable<GuideAvailabilityDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<GuideAvailabilityDto>>> GetGuideAvailability(
        Guid guideId,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var slots = await capacityService.GetGuideAvailabilityAsync(guideId, startDate, endDate, cancellationToken);
        return Ok(slots);
    }

    [HttpPost("{guideId:guid}/availability")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType<GuideAvailabilityDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GuideAvailabilityDto>> AddGuideAvailability(
        Guid guideId,
        [FromBody] CreateGuideAvailabilityRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        var result = await capacityService.AddGuideAvailabilityAsync(guideId, request, cancellationToken);
        return CreatedAtAction(nameof(GetGuideAvailability), new { guideId }, result);
    }

    [HttpPut("availability/{slotId:guid}")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType<GuideAvailabilityDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GuideAvailabilityDto>> UpdateGuideAvailability(
        Guid slotId,
        [FromBody] UpdateGuideAvailabilityRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await capacityService.UpdateGuideAvailabilityAsync(slotId, request, cancellationToken);
            if (result is null) return NotFound(new { message = $"Guide availability slot with ID '{slotId}' was not found." });
            return Ok(result);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "This slot was modified by another operation. Please refresh and try again." });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpDelete("availability/{slotId:guid}")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteGuideAvailability(Guid slotId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await capacityService.DeleteGuideAvailabilityAsync(slotId, cancellationToken);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}