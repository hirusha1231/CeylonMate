using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Destinations;

[ApiController]
[Route("api/destinations")]
public sealed class DestinationsController(DestinationService destinationService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<DestinationResponse>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? region,
        [FromQuery] string? search)
    {
        var result = await destinationService.GetAllDestinationsAsync(category, region, search);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<DestinationResponse>> GetById(Guid id)
    {
        var result = await destinationService.GetDestinationByIdAsync(id);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,TRAVEL_AGENT,CAPACITY_OFFICER")]
    public async Task<ActionResult<DestinationResponse>> Create([FromBody] CreateDestinationRequest request)
    {
        var result = await destinationService.CreateDestinationAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ADMIN,TRAVEL_AGENT,CAPACITY_OFFICER")]
    public async Task<ActionResult<DestinationResponse>> Update(Guid id, [FromBody] UpdateDestinationRequest request)
    {
        var result = await destinationService.UpdateDestinationAsync(id, request);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await destinationService.DeleteDestinationAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/reports")]
    [Authorize(Roles = "LOCAL_GUIDE,ADMIN")]
    public async Task<ActionResult<GuideReportResponse>> CreateReport(Guid id, [FromBody] CreateGuideReportRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var guideId))
            return Unauthorized();

        try
        {
            var report = await destinationService.AddGuideReportAsync(id, guideId, request);
            return Ok(report);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/reports")]
    [AllowAnonymous]
    public async Task<ActionResult<List<GuideReportResponse>>> GetReports(Guid id)
    {
        var reports = await destinationService.GetReportsForDestinationAsync(id);
        return Ok(reports);
    }

    [HttpGet("{id:guid}/suitability")]
    [AllowAnonymous]
    public async Task<ActionResult<DestinationSuitabilityResponse>> GetSuitability(
        Guid id,
        [FromQuery] string? date)
    {
        var targetDate = DateOnly.TryParse(date, out var parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.UtcNow);

        try
        {
            var suitability = await destinationService.EvaluateSuitabilityAsync(id, targetDate);
            return Ok(suitability);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = $"Destination {id} not found." });
        }
    }
}
