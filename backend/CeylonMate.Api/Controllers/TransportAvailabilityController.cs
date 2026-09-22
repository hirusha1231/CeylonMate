using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[Tags("Capacity")]
[ApiController]
[Route("api/transport")]
public sealed class TransportAvailabilityController(ICapacityReservationService capacityService) : ControllerBase
{
    [HttpGet("{transportOptionId:guid}/availability")]
    [AllowAnonymous]
    [ProducesResponseType<IEnumerable<TransportSlotDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TransportSlotDto>>> GetTransportAvailability(
        Guid transportOptionId,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        CancellationToken cancellationToken)
    {
        var slots = await capacityService.GetTransportAvailabilityAsync(transportOptionId, startDate, endDate, cancellationToken);
        return Ok(slots);
    }

    [HttpPost("{transportOptionId:guid}/availability")]
    [AllowAnonymous]
    [ProducesResponseType<TransportSlotDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TransportSlotDto>> AddTransportSlot(
        Guid transportOptionId,
        [FromBody] CreateTransportSlotRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EffectiveEndTime <= request.EffectiveStartTime)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        var result = await capacityService.AddTransportSlotAsync(transportOptionId, request, cancellationToken);
        return CreatedAtAction(nameof(GetTransportAvailability), new { transportOptionId }, result);
    }

    [HttpPut("slots/{slotId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<TransportSlotDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TransportSlotDto>> UpdateTransportSlot(
        Guid slotId,
        [FromBody] UpdateTransportSlotRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await capacityService.UpdateTransportSlotAsync(slotId, request, cancellationToken);
            if (result is null) return NotFound();
            return Ok(result);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Concurrency conflict detected while updating slot. Please refresh and try again." });
        }
    }

    [HttpDelete("slots/{slotId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteTransportSlot(Guid slotId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await capacityService.DeleteTransportSlotAsync(slotId, cancellationToken);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
