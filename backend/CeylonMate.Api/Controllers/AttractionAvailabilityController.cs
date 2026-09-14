using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

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
    [AllowAnonymous]
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
}
