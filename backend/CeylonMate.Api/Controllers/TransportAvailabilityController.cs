using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

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
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            ModelState.AddModelError(nameof(request.EndTimeUtc), "EndTimeUtc must be after StartTimeUtc.");
            return ValidationProblem(ModelState);
        }

        var result = await capacityService.AddTransportSlotAsync(transportOptionId, request, cancellationToken);
        return CreatedAtAction(nameof(GetTransportAvailability), new { transportOptionId }, result);
    }
}
