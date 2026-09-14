using CeylonMate.Api.DTOs;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/capacity")]
public sealed class CapacityController(ICapacityReservationService capacityService) : ControllerBase
{
    [HttpGet("search")]
    [AllowAnonymous]
    [ProducesResponseType<CapacitySearchResponseDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CapacitySearchResponseDto>> Search(
        [FromQuery] CapacitySearchQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await capacityService.SearchCapacityAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost("reserve")]
    [AllowAnonymous]
    [ProducesResponseType<ReservationResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ReservationResultDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReservationResultDto>> Reserve(
        [FromBody] ReservationRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.GuideSlotId is null && request.TransportSlotId is null && request.AttractionSlotId is null)
        {
            ModelState.AddModelError(nameof(request), "At least one resource slot ID must be provided to reserve.");
            return ValidationProblem(ModelState);
        }

        var result = await capacityService.ReserveResourcesAsync(request, cancellationToken);

        if (!result.Success)
        {
            return Conflict(result);
        }

        return Ok(result);
    }
}
