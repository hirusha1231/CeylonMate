using System.Security.Claims;
using CeylonMate.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Trips;

[ApiController]
[Route("api/trips")]
[Authorize]
public sealed class TripsController(TripService trips) : ControllerBase
{
    private const string StaffRoles = "TRAVEL_AGENT,ADMIN";
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsStaff => User.IsInRole(nameof(UserRole.TRAVEL_AGENT)) || User.IsInRole(nameof(UserRole.ADMIN));

    [HttpPost]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public async Task<ActionResult<TripResponse>> Create(SaveTripRequest request, CancellationToken ct)
    {
        var trip = await trips.CreateAsync(CurrentUserId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
    }

    [HttpGet("my")]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public Task<PagedResponse<TripResponse>> My([FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        trips.SearchAsync(CurrentUserId, null, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TripResponse>> GetById(Guid id, CancellationToken ct)
    {
        var trip = await trips.GetAsync(id, CurrentUserId, IsStaff, ct);
        return trip is null ? NotFound() : Ok(trip);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public async Task<ActionResult<TripResponse>> Update(Guid id, SaveTripRequest request, CancellationToken ct)
    {
        try
        {
            var trip = await trips.UpdateAsync(id, CurrentUserId, request, ct);
            return trip is null ? NotFound() : Ok(trip);
        }
        catch (InvalidOperationException error) { return Conflict(new ProblemDetails { Title = error.Message }); }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try { return await trips.CancelAsync(id, CurrentUserId, ct) ? NoContent() : NotFound(); }
        catch (InvalidOperationException error) { return Conflict(new ProblemDetails { Title = error.Message }); }
    }

    [HttpGet]
    [Authorize(Roles = StaffRoles)]
    public Task<PagedResponse<TripResponse>> Search([FromQuery] Guid? travelerId,
        [FromQuery] TripStatus? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        trips.SearchAsync(travelerId, status, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public async Task<ActionResult<TripResponse>> Submit(Guid id, CancellationToken ct)
    {
        try
        {
            var trip = await trips.SubmitAsync(id, CurrentUserId, ct);
            return trip is null ? NotFound() : Ok(trip);
        }
        catch (InvalidOperationException error) { return Conflict(new ProblemDetails { Title = error.Message }); }
    }

    [HttpPost("{id:guid}/start-planning")]
    [Authorize(Roles = nameof(UserRole.TRAVELER))]
    public async Task<ActionResult<TripResponse>> StartPlanning(Guid id, CancellationToken ct)
    {
        try
        {
            var trip = await trips.StartPlanningAsync(id, CurrentUserId, ct);
            return trip is null ? NotFound() : Accepted(trip);
        }
        catch (InvalidOperationException error) { return Conflict(new ProblemDetails { Title = error.Message }); }
    }
}

[ApiController]
[Route("api/traveler/profile")]
[Authorize(Roles = nameof(UserRole.TRAVELER))]
public sealed class TravelerProfilesController(TripService trips) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<TravelerProfileResponse>> Get(CancellationToken ct)
    {
        var profile = await trips.GetProfileAsync(CurrentUserId, ct);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<ActionResult<TravelerProfileResponse>> Put(
        SaveTravelerProfileRequest request, CancellationToken ct) =>
        Ok(await trips.SaveProfileAsync(CurrentUserId, request, ct));
}
