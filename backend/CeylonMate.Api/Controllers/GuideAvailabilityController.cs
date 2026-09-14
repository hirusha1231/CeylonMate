using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/guides")]
public sealed class GuideAvailabilityController(ICapacityReservationService capacityService) : ControllerBase
{
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
    [AllowAnonymous]
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
}