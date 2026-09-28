using System.Security.Claims;
using System.Text.Json.Serialization;
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

    [HttpPost("interpret-objective")]
    [AllowAnonymous]
    public Task<IActionResult> InterpretObjective(
        [FromBody] InterpretObjectiveRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct) => OrchestratePlan(request, httpClientFactory, ct);

    [HttpPost("orchestrate-plan")]
    [AllowAnonymous]
    public async Task<IActionResult> OrchestratePlan(
        [FromBody] InterpretObjectiveRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var tripId = Guid.NewGuid();
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(15);

        try
        {
            // -------------------------------------------------------------
            // STEP 1 (Agent 1): Objective Interpretation
            // -------------------------------------------------------------
            var payload1 = new
            {
                tripRequestId = tripId,
                storedTripRequest = new
                {
                    tripRequestId = tripId,
                    objective = request.Prompt,
                    startDate = request.StartDate?.ToString("yyyy-MM-dd"),
                    endDate = request.EndDate?.ToString("yyyy-MM-dd"),
                    budget = request.Budget > 0 ? request.Budget : null,
                    currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim(),
                    partySize = request.PartySize.HasValue && request.PartySize.Value > 0 ? request.PartySize.Value : 2,
                    interests = request.SelectedInterests ?? new List<string>(),
                    accessibilityNeeds = string.IsNullOrWhiteSpace(request.AccessibilityNeeds) ? null : request.AccessibilityNeeds.Trim()
                }
            };

            var content1 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload1), System.Text.Encoding.UTF8, "application/json");
            var resp1 = await client.PostAsync("http://localhost:8000/agent/objective-interpretation/interpret", content1, ct);
            var json1 = await resp1.Content.ReadAsStringAsync(ct);

            var extractedThemes = new List<string>();
            using (var doc1 = System.Text.Json.JsonDocument.Parse(json1))
            {
                var root1 = doc1.RootElement;
                if (root1.TryGetProperty("regionsOrThemes", out var rEl) && rEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var item in rEl.EnumerateArray())
                    {
                        if (item.GetString() is string s) extractedThemes.Add(s);
                    }
                }
            }

            // -------------------------------------------------------------
            // STEP 2 (Agent 2): Destination Suitability
            // -------------------------------------------------------------
            var payload2 = new
            {
                tripRequestId = tripId.ToString(),
                regionsOrThemes = extractedThemes.Count > 0 ? extractedThemes : (request.SelectedInterests ?? new List<string>()),
                interests = request.SelectedInterests ?? new List<string>(),
                startDate = request.StartDate?.ToString("yyyy-MM-dd"),
                endDate = request.EndDate?.ToString("yyyy-MM-dd"),
                accessibilityConstraints = new List<string>()
            };
            var content2 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload2), System.Text.Encoding.UTF8, "application/json");
            var resp2 = await client.PostAsync("http://localhost:8000/agent/destination-suitability/evaluate", content2, ct);
            var json2 = await resp2.Content.ReadAsStringAsync(ct);

            // -------------------------------------------------------------
            // STEP 3 (Agent 3): Resource Feasibility
            // -------------------------------------------------------------
            var payload3 = new
            {
                traveler_id = tripId.ToString(),
                items = new[]
                {
                    new { item_id = "res-guide-1", resource_type = "GUIDE", date = request.StartDate?.ToString("yyyy-MM-dd") ?? "2026-11-10", time_slot = (string?)null, party_size = request.PartySize ?? 2, lat = (double?)6.9271, lng = (double?)79.8612 },
                    new { item_id = "res-transport-1", resource_type = "TRANSPORT", date = request.StartDate?.ToString("yyyy-MM-dd") ?? "2026-11-10", time_slot = (string?)null, party_size = request.PartySize ?? 2, lat = (double?)6.9271, lng = (double?)79.8612 }
                }
            };
            var content3 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload3), System.Text.Encoding.UTF8, "application/json");
            var resp3 = await client.PostAsync("http://localhost:8000/agent/feasibility/check", content3, ct);
            var json3 = await resp3.Content.ReadAsStringAsync(ct);

            // -------------------------------------------------------------
            // STEP 4 (Agent 4): Itinerary Validation
            // -------------------------------------------------------------
            var targetBudget = Convert.ToDouble(request.Budget ?? 3500m);
            var payload4 = new
            {
                trip_request_id = 9901,
                budget_limit = targetBudget,
                party_size = request.PartySize ?? 2,
                days = new[]
                {
                    new { day_number = 1, title = "VIP Reception & Scenic Highway Transfer", destination_id = 1, attraction_ids = new[] { 101 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 2, title = "Ascension to Tea Estates & Planter High Tea", destination_id = 2, attraction_ids = new[] { 102 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 3, title = "Dawn Wildlife Safari & Leopard Tracking", destination_id = 3, attraction_ids = new[] { 103 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 4, title = "Southern Riviera & Heritage Dutch Fort Ramparts", destination_id = 4, attraction_ids = new[] { 104 }, estimated_cost = targetBudget * 0.25 }
                }
            };
            var content4 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload4), System.Text.Encoding.UTF8, "application/json");
            var resp4 = await client.PostAsync("http://localhost:8000/agent/itinerary-validation/validate", content4, ct);
            var json4 = await resp4.Content.ReadAsStringAsync(ct);

            // -------------------------------------------------------------
            // CONSOLIDATE ALL 4 AGENT OUTPUTS
            // -------------------------------------------------------------
            var node1 = System.Text.Json.Nodes.JsonNode.Parse(json1)?.AsObject() ?? new System.Text.Json.Nodes.JsonObject();
            var node2 = System.Text.Json.Nodes.JsonNode.Parse(json2);
            var node3 = System.Text.Json.Nodes.JsonNode.Parse(json3);
            var node4 = System.Text.Json.Nodes.JsonNode.Parse(json4);

            node1["destinationSuitability"] = node2;
            node1["feasibility"] = node3;
            node1["validation"] = node4;

            if (node2 is System.Text.Json.Nodes.JsonObject obj2 && obj2.ContainsKey("selectedCandidates"))
            {
                var selCand = obj2["selectedCandidates"];
                if (selCand != null)
                {
                    node1["recommendedDestinations"] = selCand.DeepClone();
                }
            }

            return Content(node1.ToJsonString(), "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = "Python AI Microservice pipeline error on http://localhost:8000.",
                error = ex.Message
            });
        }
    }

    [HttpPost("evaluate-destinations")]
    [AllowAnonymous]
    public async Task<IActionResult> EvaluateDestinations(
        [FromBody] EvaluateDestinationsRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);

        var payload = new
        {
            tripRequestId = request.TripRequestId ?? Guid.NewGuid().ToString(),
            regionsOrThemes = request.RegionsOrThemes ?? new List<string>(),
            interests = request.Interests ?? new List<string>(),
            startDate = request.StartDate?.ToString("yyyy-MM-dd"),
            endDate = request.EndDate?.ToString("yyyy-MM-dd"),
            accessibilityConstraints = request.AccessibilityConstraints ?? new List<string>()
        };

        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync("http://localhost:8000/agent/destination-suitability/evaluate", content, ct);

            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync(ct);
                return Content(responseJson, "application/json");
            }

            var errText = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, errText);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { message = "Python AI Microservice unavailable.", error = ex.Message });
        }
    }

    [HttpPost("check-feasibility")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckFeasibility(
        [FromBody] CheckFeasibilityRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);

        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(request);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync("http://localhost:8000/agent/feasibility/check", content, ct);

            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync(ct);
                return Content(responseJson, "application/json");
            }

            var errText = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, errText);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { message = "Python AI Microservice unavailable.", error = ex.Message });
        }
    }

    [HttpPost("validate-itinerary")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateItinerary(
        [FromBody] ValidateItineraryRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);

        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(request);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync("http://localhost:8000/agent/itinerary-validation/validate", content, ct);

            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync(ct);
                return Content(responseJson, "application/json");
            }

            var errText = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, errText);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { message = "Python AI Microservice unavailable.", error = ex.Message });
        }
    }
}

public record InterpretObjectiveRequestDto(
    string Prompt,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? Budget,
    string? Currency,
    int? PartySize,
    List<string>? SelectedInterests,
    string? AccessibilityNeeds
);

public record EvaluateDestinationsRequestDto(
    string? TripRequestId,
    List<string>? RegionsOrThemes,
    List<string>? Interests,
    DateOnly? StartDate,
    DateOnly? EndDate,
    List<string>? AccessibilityConstraints
);

public record CheckFeasibilityItemDto(
    [property: JsonPropertyName("item_id")] string item_id,
    [property: JsonPropertyName("resource_type")] string resource_type,
    [property: JsonPropertyName("date")] string date,
    [property: JsonPropertyName("time_slot")] string? time_slot,
    [property: JsonPropertyName("party_size")] int party_size,
    [property: JsonPropertyName("lat")] double? lat,
    [property: JsonPropertyName("lng")] double? lng
);

public record CheckFeasibilityRequestDto(
    [property: JsonPropertyName("traveler_id")] string? traveler_id,
    [property: JsonPropertyName("items")] List<CheckFeasibilityItemDto>? items,
    [property: JsonPropertyName("circuit_route")] string? circuit_route = null,
    [property: JsonPropertyName("pax_count")] int? pax_count = null
);

public record ValidateItineraryDayDto(
    int day_number,
    string title,
    int destination_id,
    List<int>? attraction_ids,
    double estimated_cost
);

public record ValidateItineraryRequestDto(
    int trip_request_id,
    double budget_limit,
    int party_size,
    List<ValidateItineraryDayDto> days
);

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
