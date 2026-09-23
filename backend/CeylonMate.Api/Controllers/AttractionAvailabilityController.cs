using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[Tags("Capacity")]
[ApiController]
[Route("api/attractions")]
public sealed class AttractionAvailabilityController(ICapacityReservationService capacityService) : ControllerBase
{
    [HttpGet("{attractionId:guid}/availability")]
    [AllowAnonymous]
    [ProducesResponseType<IEnumerable<AttractionSlotDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AttractionSlotDto>>> GetAttractionAvailability(
        Guid attractionId,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var slots = await capacityService.GetAttractionAvailabilityAsync(attractionId, startDate, endDate, cancellationToken);
        return Ok(slots);
    }

    [HttpPost("{attractionId:guid}/availability")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType<AttractionSlotDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AttractionSlotDto>> AddAttractionSlot(
        Guid attractionId,
        [FromBody] CreateAttractionSlotRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        var result = await capacityService.AddAttractionSlotAsync(attractionId, request, cancellationToken);
        return CreatedAtAction(nameof(GetAttractionAvailability), new { attractionId }, result);
    }

    [HttpPut("slots/{slotId:guid}")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType<AttractionSlotDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AttractionSlotDto>> UpdateAttractionSlot(
        Guid slotId,
        [FromBody] UpdateAttractionSlotRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await capacityService.UpdateAttractionSlotAsync(slotId, request, cancellationToken);
            if (result is null) return NotFound();
            return Ok(result);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Concurrency conflict detected while updating slot. Please refresh and try again." });
        }
    }

    [HttpDelete("slots/{slotId:guid}")]
    [Authorize(Roles = "CAPACITY_OFFICER,LOCAL_GUIDE,ADMIN")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteAttractionSlot(Guid slotId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await capacityService.DeleteAttractionSlotAsync(slotId, cancellationToken);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
