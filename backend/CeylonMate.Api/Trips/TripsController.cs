using System.Security.Claims;
using System.Text.Json.Serialization;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Trips;

[ApiController]
[Route("api/trips")]
[Authorize]
public sealed class TripsController(TripService trips, IConfiguration? configuration = null) : ControllerBase
{
    private const string StaffRoles = "TRAVEL_AGENT,ADMIN";
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsStaff => User.IsInRole(nameof(UserRole.TRAVEL_AGENT)) || User.IsInRole(nameof(UserRole.ADMIN));

    private string GetAgentBaseUrl()
    {
        var url = configuration?["AgenticService:BaseUrl"]
            ?? Environment.GetEnvironmentVariable("AGENTIC_SERVICE_BASE_URL")
            ?? "http://localhost:8000";
        return url.TrimEnd('/');
    }

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
        [FromServices] CeylonMateDbContext db,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct) => OrchestratePlan(request, db, httpClientFactory, ct);

    [HttpPost("curated-multiagent-evaluate")]
    [AllowAnonymous]
    public async Task<IActionResult> CuratedMultiAgentEvaluate(
        [FromBody] CuratedMultiAgentEvaluateRequestDto request,
        [FromServices] CeylonMateDbContext db,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var tripId = Guid.NewGuid();
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(60);

        var tripDays = Math.Max(1, request.TripDays ?? 1);
        var pax = Math.Max(1, request.PassengerCount ?? 2);
        var startDate = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7));
        var endDate = startDate.AddDays(tripDays);
        var effectiveBudget = 3500m;
        var effectiveCurrency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim();

        var combinedPrompt = !string.IsNullOrWhiteSpace(request.Prompt)
            ? request.Prompt.Trim()
            : (!string.IsNullOrWhiteSpace(request.PackageTitle) || !string.IsNullOrWhiteSpace(request.DestinationsCovered)
                ? $"{request.PackageTitle ?? "Royal Signature Sri Lanka Expedition"}. Exploring {request.DestinationsCovered ?? "Sri Lanka"}. {request.PackageTheme ?? "Luxury private journey"}. Duration: {tripDays} days, Pax: {pax}."
                : "Bespoke Sri Lanka Luxury Expedition");

        try
        {
            // -----------------------------------------------------------------
            // STEP 1 (Agent 1): Objective Interpretation & NLP Profiling
            // -----------------------------------------------------------------
            var payload1 = new
            {
                tripRequestId = tripId,
                storedTripRequest = new
                {
                    tripRequestId = tripId,
                    objective = combinedPrompt,
                    startDate = startDate.ToString("yyyy-MM-dd"),
                    endDate = endDate.ToString("yyyy-MM-dd"),
                    budget = effectiveBudget,
                    currency = effectiveCurrency,
                    partySize = pax,
                    interests = request.Highlights != null && request.Highlights.Count > 0
                        ? request.Highlights
                        : new List<string>(),
                    accessibilityNeeds = (string?)null
                }
            };

            var content1 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload1), System.Text.Encoding.UTF8, "application/json");
            var resp1 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/objective-interpretation/interpret", content1, ct);
            var json1 = await resp1.Content.ReadAsStringAsync(ct);

            var extractedThemes = new List<string>();
            var extractedInterests = new List<string>();
            var extractedDestinations = new List<string>();

            using (var doc1 = System.Text.Json.JsonDocument.Parse(json1))
            {
                var r1 = doc1.RootElement;
                if (r1.TryGetProperty("regionsOrThemes", out var thEl) && thEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var it in thEl.EnumerateArray())
                    {
                        if (it.GetString() is string s) extractedThemes.Add(s);
                    }
                }
                if (r1.TryGetProperty("interests", out var inEl) && inEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var it in inEl.EnumerateArray())
                    {
                        if (it.GetString() is string s) extractedInterests.Add(s);
                    }
                }
                if (r1.TryGetProperty("recommendedDestinations", out var rdEl) && rdEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var it in rdEl.EnumerateArray())
                    {
                        if (it.TryGetProperty("name", out var nEl) && nEl.GetString() is string s && !string.IsNullOrWhiteSpace(s))
                        {
                            extractedDestinations.Add(s.Trim());
                        }
                    }
                }
                if (extractedDestinations.Count == 0 && r1.TryGetProperty("destinations", out var dEl) && dEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var it in dEl.EnumerateArray())
                    {
                        if (it.TryGetProperty("name", out var nEl) && nEl.GetString() is string s && !string.IsNullOrWhiteSpace(s))
                        {
                            extractedDestinations.Add(s.Trim());
                        }
                    }
                }
            }

            // -----------------------------------------------------------------
            // STEP 2 (Agent 2): Destination Suitability, Weather & Road Advisories
            // -----------------------------------------------------------------
            var agent2Themes = new List<string>(extractedThemes);
            foreach (var d in extractedDestinations)
            {
                if (!agent2Themes.Contains(d)) agent2Themes.Add(d);
            }

            var payload2 = new
            {
                tripRequestId = tripId.ToString(),
                regionsOrThemes = agent2Themes.Count > 0 ? agent2Themes : new List<string> { "Culture", "Central Highlands", "Southern Coast" },
                interests = extractedInterests.Count > 0 ? extractedInterests : (request.Highlights ?? new List<string> { "Culture", "Scenic" }),
                startDate = startDate.ToString("yyyy-MM-dd"),
                endDate = endDate.ToString("yyyy-MM-dd"),
                accessibilityConstraints = new List<string>()
            };

            var content2 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload2), System.Text.Encoding.UTF8, "application/json");
            var resp2 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/destination-suitability/evaluate", content2, ct);
            var json2 = await resp2.Content.ReadAsStringAsync(ct);

            // -----------------------------------------------------------------
            // STEP 3 (Agent 3): GIS Elevation Physics Matrix & Dynamic Fleet/Guide Search
            // -----------------------------------------------------------------
            var circuitRoute = !string.IsNullOrWhiteSpace(request.DestinationsCovered)
                ? request.DestinationsCovered
                : (extractedDestinations.Count > 0
                    ? $"Colombo -> {string.Join(" -> ", extractedDestinations)}"
                    : "Colombo -> Kandy -> Nuwara Eliya -> Yala -> Galle");

            var payload3 = new
            {
                traveler_id = tripId.ToString(),
                circuit_route = circuitRoute,
                pax_count = pax,
                items = new[]
                {
                    new { item_id = "res-guide-primary", resource_type = "GUIDE", date = startDate.ToString("yyyy-MM-dd"), time_slot = (string?)null, party_size = pax, lat = (double?)6.9271, lng = (double?)79.8612 },
                    new { item_id = "res-transport-primary", resource_type = "TRANSPORT", date = startDate.ToString("yyyy-MM-dd"), time_slot = (string?)null, party_size = pax, lat = (double?)6.9271, lng = (double?)79.8612 }
                }
            };

            var content3 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload3), System.Text.Encoding.UTF8, "application/json");
            var resp3 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/feasibility/check", content3, ct);
            var json3 = await resp3.Content.ReadAsStringAsync(ct);

            // Query dynamic unbooked vehicles from DB
            var allDbVehicles = await db.VehicleFleetCatalogs
                .AsNoTracking()
                .Where(v => v.IsActive)
                .OrderBy(v => v.DisplayOrder)
                .ToListAsync(ct);

            var tripStartDt = startDate.ToDateTime(TimeOnly.MinValue);
            var tripEndDt = tripStartDt.AddDays(tripDays);

            var activeBookings = await db.Bookings
                .AsNoTracking()
                .Where(b => b.Status != "CANCELLED" && b.Status != "REJECTED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
                .Where(b => b.VehicleCatalogId != null || b.VehicleSlotId != null)
                .ToListAsync(ct);

            var bookedVehicleIds = new HashSet<Guid>();
            foreach (var b in activeBookings)
            {
                if (!string.IsNullOrWhiteSpace(b.StartDate) && DateTime.TryParse(b.StartDate, out var bStart))
                {
                    var bDays = (b.TripDurationDays.HasValue && b.TripDurationDays.Value > 0) ? b.TripDurationDays.Value : 1;
                    var bEnd = bStart.AddDays(bDays);
                    if (bStart < tripEndDt && bEnd > tripStartDt)
                    {
                        if (b.VehicleCatalogId.HasValue) bookedVehicleIds.Add(b.VehicleCatalogId.Value);
                        if (b.VehicleSlotId.HasValue) bookedVehicleIds.Add(b.VehicleSlotId.Value);
                    }
                }
            }

            var availableVehicles = allDbVehicles
                .Where(v => !bookedVehicleIds.Contains(v.Id))
                .Select(v => new
                {
                    id = v.Id,
                    vehicleCatalogId = (Guid?)v.Id,
                    vehicleModel = v.VehicleModel,
                    categoryBadge = v.CategoryBadge,
                    imageUrl = v.ImageUrl,
                    maxPassengers = v.MaxPassengers,
                    featureHighlight = v.FeatureHighlight,
                    luggageCapacity = v.LuggageCapacity,
                    dailyRateUsd = v.DailyRateUsd ?? 0,
                    dailyRate = v.DailyRateUsd ?? 0,
                    currency = string.IsNullOrWhiteSpace(v.Currency) ? "USD" : v.Currency,
                    isAvailable = true,
                    status = "AVAILABLE"
                })
                .ToList();

            // Check booked guides during trip window
            var bookedGuideSlotIds = new HashSet<Guid>();
            foreach (var b in activeBookings)
            {
                if (!string.IsNullOrWhiteSpace(b.StartDate) && DateTime.TryParse(b.StartDate, out var bStart))
                {
                    var bDays = (b.TripDurationDays.HasValue && b.TripDurationDays.Value > 0) ? b.TripDurationDays.Value : 1;
                    var bEnd = bStart.AddDays(bDays);
                    if (bStart < tripEndDt && bEnd > tripStartDt)
                    {
                        if (b.GuideSlotId.HasValue) bookedGuideSlotIds.Add(b.GuideSlotId.Value);
                    }
                }
            }

            var defaultPortraits = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "saman", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400" },
                { "dilshan", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400" },
                { "nirosha", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" },
                { "anura", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400" },
                { "kasun", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400" }
            };

            var fallbackList = new[]
            {
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
            };

            string ResolveGuidePhoto(string? explicitPhoto, string guideName, int idx)
            {
                if (!string.IsNullOrWhiteSpace(explicitPhoto) && explicitPhoto.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    return explicitPhoto;
                }
                foreach (var kv in defaultPortraits)
                {
                    if (guideName.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                        return kv.Value;
                }
                return fallbackList[Math.Abs(idx) % fallbackList.Length];
            }

            // Query dynamic certified guides and slots from DB
            var allProfiles = await db.GuideProfiles
                .AsNoTracking()
                .Include(p => p.User)
                .Where(p => p.IsActive)
                .ToListAsync(ct);

            var guideSlots = await db.GuideAvailabilities
                .AsNoTracking()
                .Include(g => g.LocalGuideUser)
                .Include(g => g.GuideProfile)
                .ToListAsync(ct);

            var bookedGuideUserIds = guideSlots
                .Where(s => bookedGuideSlotIds.Contains(s.Id))
                .Select(s => s.LocalGuideUserId)
                .ToHashSet();

            var availableGuides = new List<dynamic>();
            var processedUserIds = new HashSet<Guid>();
            int guideIdx = 0;

            foreach (var prof in allProfiles)
            {
                if (bookedGuideUserIds.Contains(prof.UserId)) continue;
                processedUserIds.Add(prof.UserId);

                var gName = !string.IsNullOrWhiteSpace(prof.FullName) && !prof.FullName.Contains("@")
                    ? prof.FullName
                    : (!string.IsNullOrWhiteSpace(prof.User?.FullName) && !prof.User.FullName.Contains("@")
                        ? prof.User.FullName
                        : "SLTDA Certified Guide");

                var pPhoto = ResolveGuidePhoto(prof.PhotoUrl, gName, guideIdx++);
                var rate = prof.DailyRate > 0 ? prof.DailyRate : (prof.DefaultDailyRateLkr > 0 ? prof.DefaultDailyRateLkr : 15000m);
                var curr = string.IsNullOrWhiteSpace(prof.Currency) ? "LKR" : prof.Currency;

                var gSlot = guideSlots.FirstOrDefault(s => s.LocalGuideUserId == prof.UserId || s.GuideProfileId == prof.Id);
                var slotId = gSlot?.Id ?? prof.Id;

                availableGuides.Add(new
                {
                    id = slotId,
                    guideUserId = prof.UserId,
                    guideName = gName,
                    bio = !string.IsNullOrWhiteSpace(prof.Bio) ? prof.Bio : "SLTDA Licensed Tourist Guide Lecturer & Cultural Ambassador with extensive islandwide field experience.",
                    licenseNumber = !string.IsNullOrWhiteSpace(prof.LicenseNumber) ? prof.LicenseNumber : $"SLTDA/CG/2026/{(Math.Abs(prof.Id.GetHashCode()) % 9000) + 1000:D4}",
                    languages = !string.IsNullOrWhiteSpace(prof.LanguagesSpoken) ? prof.LanguagesSpoken : "English, Sinhala",
                    priceAmount = rate,
                    currency = curr,
                    imageUrl = pPhoto,
                    photoUrl = pPhoto,
                    rating = prof.Rating > 0 ? prof.Rating : 5.0m,
                    reviewCount = prof.ReviewCount > 0 ? prof.ReviewCount : 12,
                    status = "AVAILABLE"
                });
            }

            foreach (var grp in guideSlots.GroupBy(g => g.LocalGuideUserId))
            {
                if (processedUserIds.Contains(grp.Key)) continue;
                if (bookedGuideUserIds.Contains(grp.Key)) continue;

                var first = grp.First();
                if (bookedGuideSlotIds.Contains(first.Id)) continue;
                processedUserIds.Add(grp.Key);

                var gName = !string.IsNullOrWhiteSpace(first.GuideProfile?.FullName) && !first.GuideProfile.FullName.Contains("@")
                    ? first.GuideProfile.FullName
                    : (!string.IsNullOrWhiteSpace(first.LocalGuideUser?.FullName) && !first.LocalGuideUser.FullName.Contains("@")
                        ? first.LocalGuideUser.FullName
                        : "Certified Local Escort");

                var pPhoto = ResolveGuidePhoto(first.GuideProfile?.PhotoUrl, gName, guideIdx++);
                var rate = grp.Min(s => s.PriceAmount);
                if (rate <= 0) rate = 15000m;

                availableGuides.Add(new
                {
                    id = first.Id,
                    guideUserId = first.LocalGuideUserId,
                    guideName = gName,
                    bio = !string.IsNullOrWhiteSpace(first.GuideProfile?.Bio) ? first.GuideProfile.Bio : "Certified Local Escort specializing in personalized heritage and safari expeditions.",
                    licenseNumber = !string.IsNullOrWhiteSpace(first.GuideProfile?.LicenseNumber) ? first.GuideProfile.LicenseNumber : "SLTDA/CG/2026/0491",
                    languages = !string.IsNullOrWhiteSpace(first.GuideProfile?.LanguagesSpoken) ? first.GuideProfile.LanguagesSpoken : "English, Sinhala",
                    priceAmount = rate,
                    currency = string.IsNullOrWhiteSpace(first.Currency) ? "LKR" : first.Currency,
                    imageUrl = pPhoto,
                    photoUrl = pPhoto,
                    rating = 5.0m,
                    reviewCount = 10,
                    status = "AVAILABLE"
                });
            }

            // -----------------------------------------------------------------
            // STEP 4 (Agent 4): Itinerary Validation & Dynamic Price Calculator
            // -----------------------------------------------------------------
            decimal vehicleDailyRate = 120m;
            if (request.SelectedVehicleId.HasValue)
            {
                var selV = availableVehicles.FirstOrDefault(v => v.id == request.SelectedVehicleId.Value);
                if (selV != null) vehicleDailyRate = selV.dailyRateUsd;
            }
            else if (availableVehicles.Count > 0)
            {
                vehicleDailyRate = availableVehicles[0].dailyRateUsd;
            }

            decimal guideDailyRateUsd = 0m;
            if (request.SelectedGuideId.HasValue)
            {
                var selG = availableGuides.FirstOrDefault(g => g.id == request.SelectedGuideId.Value);
                if (selG != null)
                {
                    guideDailyRateUsd = selG.currency == "USD" ? selG.priceAmount : Math.Round(selG.priceAmount / 300m, 2);
                }
            }
            else if (availableGuides.Count > 0)
            {
                var fG = availableGuides[0];
                guideDailyRateUsd = fG.currency == "USD" ? fG.priceAmount : Math.Round(fG.priceAmount / 300m, 2);
            }

            var vehicleTotal = vehicleDailyRate * tripDays;
            var guideTotal = guideDailyRateUsd * tripDays;
            var dynamicSubtotal = vehicleTotal + guideTotal;
            var platformFee = Math.Round(dynamicSubtotal * 0.03m, 2); // 3% Platform Fee
            var dynamicVat = Math.Round(dynamicSubtotal * 0.05m, 2);   // 5% VAT
            var totalCalculatedQuote = dynamicSubtotal + platformFee + dynamicVat;

            // Generate Day Plans for validation
            var dayPlans = new List<object>();
            for (int d = 1; d <= tripDays; d++)
            {
                dayPlans.Add(new
                {
                    day_number = d,
                    title = $"Day {d}: Signature Expedition Route & Private VIP Escort",
                    destination_id = d,
                    attraction_ids = new[] { 100 + d },
                    estimated_cost = Convert.ToDouble(dynamicSubtotal / tripDays)
                });
            }

            var payload4 = new
            {
                trip_request_id = Math.Abs(tripId.GetHashCode()),
                budget_limit = Convert.ToDouble(totalCalculatedQuote * 1.5m),
                party_size = pax,
                days = dayPlans
            };

            var content4 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload4), System.Text.Encoding.UTF8, "application/json");
            var resp4 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/itinerary-validation/validate", content4, ct);
            var json4 = await resp4.Content.ReadAsStringAsync(ct);

            // -----------------------------------------------------------------
            // CONSOLIDATE REAL MULTI-AGENT TELEMETRY RESPONSE
            // -----------------------------------------------------------------
            var node1 = System.Text.Json.Nodes.JsonNode.Parse(json1);
            var node2 = System.Text.Json.Nodes.JsonNode.Parse(json2);
            var node3 = System.Text.Json.Nodes.JsonNode.Parse(json3);
            var node4 = System.Text.Json.Nodes.JsonNode.Parse(json4);

            var consolidated = new System.Text.Json.Nodes.JsonObject
            {
                ["tripId"] = tripId.ToString(),
                ["status"] = "EVALUATION_SUCCESS",
                ["evaluatedAt"] = DateTime.UtcNow.ToString("o"),
                ["agent1_Objective"] = node1,
                ["agent2_Suitability"] = node2,
                ["agent3_Feasibility"] = node3,
                ["agent4_Validation"] = node4,
                ["availableVehicles"] = System.Text.Json.JsonSerializer.SerializeToNode(availableVehicles),
                ["availableGuides"] = System.Text.Json.JsonSerializer.SerializeToNode(availableGuides),
                ["dynamicPricing"] = new System.Text.Json.Nodes.JsonObject
                {
                    ["tripDays"] = tripDays,
                    ["passengerCount"] = pax,
                    ["currency"] = "USD",
                    ["vehicleDailyRate"] = vehicleDailyRate,
                    ["vehicleTotal"] = vehicleTotal,
                    ["guideDailyRate"] = guideDailyRateUsd,
                    ["guideTotal"] = guideTotal,
                    ["subtotal"] = dynamicSubtotal,
                    ["platformFeeRate"] = "3%",
                    ["platformFee"] = platformFee,
                    ["vatRate"] = "5%",
                    ["vat"] = dynamicVat,
                    ["totalQuote"] = totalCalculatedQuote
                }
            };

            return Content(consolidated.ToJsonString(), "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = $"Python AI Multi-Agent pipeline error on {GetAgentBaseUrl()}.",
                error = ex.Message
            });
        }
    }

    [HttpPost("agent2-destination-suitability-inspect")]
    [AllowAnonymous]
    public async Task<IActionResult> Agent2DestinationSuitabilityInspect(
        [FromBody] Agent2InspectDestinationDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var payload = new
            {
                destination = string.IsNullOrWhiteSpace(request?.Destination) ? "Mirissa" : request.Destination.Trim()
            };

            var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            var resp = await client.PostAsync($"{GetAgentBaseUrl()}/agent/destination-suitability/inspect", content, ct);
            var json = await resp.Content.ReadAsStringAsync(ct);

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = $"Failed to communicate with Agent 2 Python service on {GetAgentBaseUrl()}.",
                error = ex.Message
            });
        }
    }

    [HttpPost("agent3-route-logistics")]
    [AllowAnonymous]
    public async Task<IActionResult> Agent3RouteLogistics(
        [FromBody] Agent3RouteLogisticsDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var payload = new
            {
                origin = string.IsNullOrWhiteSpace(request?.Origin) ? "Colombo Airport" : request.Origin.Trim(),
                destination = string.IsNullOrWhiteSpace(request?.Destination) ? "Mirissa" : request.Destination.Trim(),
                passengers = (request != null && request.Passengers.HasValue && request.Passengers.Value > 0) ? request.Passengers.Value : 2,
                startDate = request?.StartDate,
                durationDays = request?.DurationDays
            };

            var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            var resp = await client.PostAsync($"{GetAgentBaseUrl()}/agent/feasibility/route-logistics", content, ct);
            var json = await resp.Content.ReadAsStringAsync(ct);

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = $"Failed to communicate with Agent 3 Python service on {GetAgentBaseUrl()}.",
                error = ex.Message
            });
        }
    }

    [HttpPost("agent4-concierge-pricing")]
    [AllowAnonymous]
    public async Task<IActionResult> Agent4ConciergePricing(
        [FromBody] Agent4ConciergePricingRequestDto request,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(request), System.Text.Encoding.UTF8, "application/json");
            var resp = await client.PostAsync($"{GetAgentBaseUrl()}/agent/concierge-pricing/synthesize", content, ct);
            var json = await resp.Content.ReadAsStringAsync(ct);

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = $"Failed to communicate with Agent 4 Python service on {GetAgentBaseUrl()}.",
                error = ex.Message
            });
        }
    }

    [HttpPost("orchestrate-plan")]
    [AllowAnonymous]
    public async Task<IActionResult> OrchestratePlan(
        [FromBody] InterpretObjectiveRequestDto request,
        [FromServices] CeylonMateDbContext db,
        [FromServices] IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var tripId = Guid.NewGuid();
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(60);

        var pax = request.PartySize.HasValue && request.PartySize.Value > 0 ? request.PartySize.Value : 2;
        var start = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7));
        var end = request.EndDate ?? start.AddDays(4);
        var tripDays = Math.Max(1, (end.DayNumber - start.DayNumber) + 1);
        var budget = request.Budget.HasValue && request.Budget.Value > 0 ? request.Budget.Value : 3500m;
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim();

        var prompt = !string.IsNullOrWhiteSpace(request.Prompt)
            ? request.Prompt.Trim()
            : "Bespoke Sri Lanka Luxury Expedition";

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
                    objective = prompt,
                    startDate = start.ToString("yyyy-MM-dd"),
                    endDate = end.ToString("yyyy-MM-dd"),
                    budget = budget,
                    currency = currency,
                    partySize = pax,
                    interests = request.SelectedInterests ?? new List<string>(),
                    accessibilityNeeds = string.IsNullOrWhiteSpace(request.AccessibilityNeeds) ? null : request.AccessibilityNeeds.Trim()
                }
            };

            var content1 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload1), System.Text.Encoding.UTF8, "application/json");
            var resp1 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/objective-interpretation/interpret", content1, ct);
            var json1 = await resp1.Content.ReadAsStringAsync(ct);

            var extractedThemes = new List<string>();
            var extractedInterests = new List<string>();
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
                if (root1.TryGetProperty("interests", out var inEl) && inEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var item in inEl.EnumerateArray())
                    {
                        if (item.GetString() is string s) extractedInterests.Add(s);
                    }
                }
            }

            // -------------------------------------------------------------
            // STEP 2 (Agent 2): Destination Suitability
            // -------------------------------------------------------------
            var payload2 = new
            {
                tripRequestId = tripId.ToString(),
                regionsOrThemes = extractedThemes.Count > 0 ? extractedThemes : (request.SelectedInterests ?? new List<string> { "Culture", "Highlands" }),
                interests = extractedInterests.Count > 0 ? extractedInterests : (request.SelectedInterests ?? new List<string>()),
                startDate = start.ToString("yyyy-MM-dd"),
                endDate = end.ToString("yyyy-MM-dd"),
                accessibilityConstraints = new List<string>()
            };
            var content2 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload2), System.Text.Encoding.UTF8, "application/json");
            var resp2 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/destination-suitability/evaluate", content2, ct);
            var json2 = await resp2.Content.ReadAsStringAsync(ct);

            // -------------------------------------------------------------
            // STEP 3 (Agent 3): Resource Feasibility & Live DB Inventory
            // -------------------------------------------------------------
            var payload3 = new
            {
                traveler_id = tripId.ToString(),
                circuit_route = "Colombo -> Kandy -> Nuwara Eliya -> Yala -> Galle",
                pax_count = pax,
                items = new[]
                {
                    new { item_id = "res-guide-1", resource_type = "GUIDE", date = start.ToString("yyyy-MM-dd"), time_slot = (string?)null, party_size = pax, lat = (double?)6.9271, lng = (double?)79.8612 },
                    new { item_id = "res-transport-1", resource_type = "TRANSPORT", date = start.ToString("yyyy-MM-dd"), time_slot = (string?)null, party_size = pax, lat = (double?)6.9271, lng = (double?)79.8612 }
                }
            };
            var content3 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload3), System.Text.Encoding.UTF8, "application/json");
            var resp3 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/feasibility/check", content3, ct);
            var json3 = await resp3.Content.ReadAsStringAsync(ct);

            // Live DB queries for available vehicles & guides
            var allDbVehicles = await db.VehicleFleetCatalogs
                .AsNoTracking()
                .Where(v => v.IsActive)
                .OrderBy(v => v.DisplayOrder)
                .ToListAsync(ct);

            var availableVehicles = allDbVehicles.Select(v => new
            {
                id = v.Id,
                vehicleCatalogId = (Guid?)v.Id,
                vehicleModel = v.VehicleModel,
                categoryBadge = v.CategoryBadge,
                imageUrl = v.ImageUrl,
                maxPassengers = v.MaxPassengers,
                featureHighlight = v.FeatureHighlight,
                luggageCapacity = v.LuggageCapacity,
                dailyRateUsd = v.DailyRateUsd ?? 0,
                dailyRate = v.DailyRateUsd ?? 0,
                currency = string.IsNullOrWhiteSpace(v.Currency) ? "USD" : v.Currency,
                isAvailable = true,
                status = "AVAILABLE"
            }).ToList();

            var guideSlots = await db.GuideAvailabilities
                .AsNoTracking()
                .Include(g => g.LocalGuideUser)
                .Include(g => g.GuideProfile)
                .Where(g => g.Status == AvailabilityStatus.AVAILABLE)
                .OrderBy(g => g.StartTimeUtc)
                .ToListAsync(ct);

            var availableGuides = guideSlots
                .GroupBy(g => g.LocalGuideUserId)
                .Select(grp =>
                {
                    var first = grp.First();
                    var guideName = !string.IsNullOrWhiteSpace(first.GuideProfile?.FullName) && !first.GuideProfile.FullName.Contains("@")
                        ? first.GuideProfile.FullName
                        : (!string.IsNullOrWhiteSpace(first.LocalGuideUser?.FullName) && !first.LocalGuideUser.FullName.Contains("@")
                            ? first.LocalGuideUser.FullName
                            : "Certified Local Guide");

                    return new
                    {
                        id = first.Id,
                        guideUserId = first.LocalGuideUserId,
                        guideName,
                        bio = first.GuideProfile?.Bio ?? "",
                        licenseNumber = first.GuideProfile?.LicenseNumber ?? "",
                        languages = first.GuideProfile?.LanguagesSpoken ?? "",
                        priceAmount = grp.Min(s => s.PriceAmount),
                        currency = string.IsNullOrWhiteSpace(first.Currency) ? "LKR" : first.Currency,
                        status = first.Status.ToString()
                    };
                }).ToList();

            // -------------------------------------------------------------
            // STEP 4 (Agent 4): Itinerary Validation
            // -------------------------------------------------------------
            var targetBudget = Convert.ToDouble(budget);
            var payload4 = new
            {
                trip_request_id = 9901,
                budget_limit = targetBudget,
                party_size = pax,
                days = new[]
                {
                    new { day_number = 1, title = "VIP Reception & Scenic Highway Transfer", destination_id = 1, attraction_ids = new[] { 101 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 2, title = "Ascension to Tea Estates & Planter High Tea", destination_id = 2, attraction_ids = new[] { 102 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 3, title = "Dawn Wildlife Safari & Leopard Tracking", destination_id = 3, attraction_ids = new[] { 103 }, estimated_cost = targetBudget * 0.25 },
                    new { day_number = 4, title = "Southern Riviera & Heritage Dutch Fort Ramparts", destination_id = 4, attraction_ids = new[] { 104 }, estimated_cost = targetBudget * 0.25 }
                }
            };
            var content4 = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload4), System.Text.Encoding.UTF8, "application/json");
            var resp4 = await client.PostAsync($"{GetAgentBaseUrl()}/agent/itinerary-validation/validate", content4, ct);
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
            node1["availableVehicles"] = System.Text.Json.JsonSerializer.SerializeToNode(availableVehicles);
            node1["availableGuides"] = System.Text.Json.JsonSerializer.SerializeToNode(availableGuides);

            var defaultVehicleRate = availableVehicles.Count > 0 ? availableVehicles[0].dailyRateUsd : 120m;
            var vTotal = defaultVehicleRate * tripDays;
            var fee = Math.Round(vTotal * 0.03m, 2);
            var vat = Math.Round(vTotal * 0.05m, 2);

            node1["dynamicPricing"] = new System.Text.Json.Nodes.JsonObject
            {
                ["tripDays"] = tripDays,
                ["passengerCount"] = pax,
                ["currency"] = "USD",
                ["vehicleDailyRate"] = defaultVehicleRate,
                ["vehicleTotal"] = vTotal,
                ["guideDailyRate"] = 0m,
                ["guideTotal"] = 0m,
                ["subtotal"] = vTotal,
                ["platformFeeRate"] = "3%",
                ["platformFee"] = fee,
                ["vatRate"] = "5%",
                ["vat"] = vat,
                ["totalQuote"] = vTotal + fee + vat
            };

            return Content(node1.ToJsonString(), "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                message = $"Python AI Microservice pipeline error on {GetAgentBaseUrl()}.",
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
            var response = await client.PostAsync($"{GetAgentBaseUrl()}/agent/destination-suitability/evaluate", content, ct);

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
            var response = await client.PostAsync($"{GetAgentBaseUrl()}/agent/feasibility/check", content, ct);

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
            var response = await client.PostAsync($"{GetAgentBaseUrl()}/agent/itinerary-validation/validate", content, ct);

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

public record CuratedMultiAgentEvaluateRequestDto(
    string? PackageId,
    string? PackageTitle,
    string? PackageTheme,
    string? DestinationsCovered,
    List<string>? Highlights,
    string? Prompt,
    DateOnly? StartDate,
    int? TripDays,
    string? PickupTime,
    int? PassengerCount,
    string? TravelerNotes,
    Guid? SelectedVehicleId,
    Guid? SelectedGuideId,
    string? Currency
);

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

public record Agent3RouteLogisticsDto(
    string? Origin,
    string? Destination,
    int? Passengers,
    string? StartDate = null,
    int? DurationDays = null
);

public record Agent2InspectDestinationDto(
    string? Destination
);

public record Agent4SelectedRouteDto(
    string? Name,
    double? DistanceKm,
    string? Via
);

public record Agent4SelectedVehicleDto(
    string? Model,
    string? VehicleType,
    double? DailyRateLkr
);

public record Agent4SelectedGuideDto(
    string? Name,
    string? Role,
    double? DailyRateLkr
);

public record Agent4ConciergePricingRequestDto(
    double? TargetBudget,
    int? DurationDays,
    int? TripDurationDays,
    Agent4SelectedRouteDto? SelectedRoute,
    Agent4SelectedVehicleDto? SelectedVehicle,
    Agent4SelectedGuideDto? SelectedGuide
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
