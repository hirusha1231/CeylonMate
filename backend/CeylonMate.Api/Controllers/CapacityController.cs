using System.Security.Claims;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.DTOs;
using CeylonMate.Api.Models;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/capacity")]
[Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
public sealed class CapacityController(
    ICapacityReservationService capacityService,
    CeylonMateDbContext db,
    ILogger<CapacityController> logger) : ControllerBase
{
    // ==========================================
    // PUBLIC / RESERVATION ENDPOINTS
    [AllowAnonymous]
    [HttpGet("fix-slots")]
    public async Task<IActionResult> FixSlots(CancellationToken cancellationToken)
    {
        var slots = await db.GuideAvailabilities.ToListAsync(cancellationToken);
        int count = 0;
        foreach(var s in slots)
        {
            if (s.EndTimeUtc.Year < 2030)
            {
                s.EndTimeUtc = s.StartTimeUtc.AddYears(10);
                count++;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { FixedCount = count });
    }

    [AllowAnonymous]
    [HttpGet("debug-availabilities")]
    public async Task<IActionResult> DebugAvailabilities(CancellationToken cancellationToken)
    {
        var slots = await db.GuideAvailabilities.AsNoTracking().ToListAsync(cancellationToken);
        return Ok(slots);
    }

    [HttpGet("guide-availabilities")]
    [HttpGet("available-guides")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableGuides(
        [FromQuery] string? date,
        [FromQuery] string? startDate,
        [FromQuery] int? durationDays,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var bookedGuideUserIds = new HashSet<Guid>();
        var bookedGuideSlotIds = new HashSet<Guid>();
        string? effectiveDate = !string.IsNullOrWhiteSpace(startDate) ? startDate : date;

        if (!string.IsNullOrWhiteSpace(effectiveDate) && DateTime.TryParse(effectiveDate, out var searchStart))
        {
            var days = (durationDays.HasValue && durationDays.Value > 0) ? durationDays.Value : 1;
            var searchEnd = searchStart.AddDays(days);

            var activeBookings = await db.Bookings
                .AsNoTracking()
                .Where(b => b.Status != "CANCELLED" && b.Status != "REJECTED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
                .Where(b => b.GuideSlotId != null)
                .ToListAsync(cancellationToken);

            foreach (var b in activeBookings)
            {
                if (!string.IsNullOrWhiteSpace(b.StartDate) && DateTime.TryParse(b.StartDate, out var bStart))
                {
                    var bDays = (b.TripDurationDays.HasValue && b.TripDurationDays.Value > 0) ? b.TripDurationDays.Value : 1;
                    var bEnd = bStart.AddDays(bDays);
                    if (bStart < searchEnd && bEnd > searchStart)
                    {
                        if (b.GuideSlotId.HasValue) bookedGuideSlotIds.Add(b.GuideSlotId.Value);
                    }
                }
            }
        }

        var slotsQuery = db.GuideAvailabilities
            .AsNoTracking()
            .Include(g => g.LocalGuideUser)
            .Include(g => g.GuideProfile)
            .Where(g => g.Status == AvailabilityStatus.AVAILABLE);

        if (!string.IsNullOrWhiteSpace(effectiveDate) && DateTime.TryParse(effectiveDate, out var qSearchStart))
        {
            var qDays = (durationDays.HasValue && durationDays.Value > 0) ? durationDays.Value : 1;
            var qSearchStartDate = new DateTimeOffset(qSearchStart.Date, TimeSpan.Zero);
            var qSearchEndDate = new DateTimeOffset(qSearchStart.Date, TimeSpan.Zero).AddDays(qDays - 1);
            
            // To ensure the slot covers the entire trip:
            // 1. It must start BEFORE the END of the first day (i.e. strictly less than qSearchStartDate + 1 day)
            // 2. It must end AFTER or exactly AT the START of the last day (i.e. >= qSearchEndDate)
            var qStartBound = qSearchStartDate.AddDays(1);
            var qEndBound = qSearchEndDate;

            slotsQuery = slotsQuery.Where(g => g.StartTimeUtc < qStartBound && g.EndTimeUtc >= qEndBound);
        }

        var slots = await slotsQuery
            .OrderBy(g => g.StartTimeUtc)
            .ToListAsync(cancellationToken);

        var unbookedSlots = slots
            .Where(s => !bookedGuideSlotIds.Contains(s.Id) && !bookedGuideUserIds.Contains(s.LocalGuideUserId))
            .ToList();

        if (unbookedSlots.Any())
        {
            var response = unbookedSlots
                .GroupBy(g => g.LocalGuideUserId)
                .Select(grp =>
                {
                    var first = grp.First();
                    var prof = first.GuideProfile;
                    var user = first.LocalGuideUser;
                    var guideName = !string.IsNullOrWhiteSpace(prof?.FullName) && !prof.FullName.Contains("@")
                        ? prof.FullName
                        : (!string.IsNullOrWhiteSpace(user?.FullName) && !user.FullName.Contains("@")
                            ? user.FullName
                            : "Certified Guide");

                    return new
                    {
                        id = first.Id,
                        guideUserId = first.LocalGuideUserId,
                        guideProfileId = (Guid?)(prof?.Id),
                        guideName,
                        fullName = guideName,
                        bio = prof?.Bio ?? "",
                        licenseNumber = prof?.LicenseNumber ?? "",
                        licenseType = "National Tourist Guide Lecturer",
                        languages = prof?.LanguagesSpoken ?? "",
                        specialties = prof?.Specialties ?? "",
                        rating = prof != null && prof.Rating > 0 ? prof.Rating : 0m,
                        reviewCount = prof != null && prof.ReviewCount > 0 ? prof.ReviewCount : 0,
                        contactPhone = user?.PhoneNumber ?? "",
                        photoUrl = prof?.PhotoUrl ?? "",
                        priceAmount = grp.Min(s => s.PriceAmount),
                        currency = string.IsNullOrWhiteSpace(first.Currency) ? "LKR" : first.Currency,
                        status = "AVAILABLE",
                        notes = first.Notes
                    };
                })
                .ToList();

            return Ok(response);
        }

        return Ok(new List<object>());
    }


    [HttpGet("available-vehicles-slots")]
    [HttpGet("available-vehicles")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableVehicles(
        [FromQuery] string? date,
        [FromQuery] string? startDate,
        [FromQuery] int? durationDays,
        [FromQuery] string? status,
        [FromQuery] int? passengerCount,
        [FromQuery] int? pax,
        CancellationToken cancellationToken)
    {
        try
        {
            // 1. Get all active vehicles from Master Fleet Catalog
            var allVehicles = await db.VehicleFleetCatalogs
                .AsNoTracking()
                .Where(v => v.IsActive)
                .OrderBy(v => v.DisplayOrder)
                .ToListAsync(cancellationToken);



            // 2. Filter by Passenger Capacity
            int reqPax = passengerCount ?? pax ?? 1;
            var suitableVehicles = allVehicles;
            if (reqPax > 1)
            {
                suitableVehicles = allVehicles.Where(v => v.MaxPassengers >= reqPax).ToList();
                // If filtering by pax yields none, fallback to all vehicles so traveler sees them
                if (!suitableVehicles.Any())
                {
                    suitableVehicles = allVehicles;
                }
            }

            // 3. Date-based booking overlap check
            string? effectiveStartDateStr = !string.IsNullOrWhiteSpace(startDate) ? startDate : date;
            if (!string.IsNullOrWhiteSpace(effectiveStartDateStr) && DateTime.TryParse(effectiveStartDateStr, out var parsedStart))
            {
                var tripStart = parsedStart.Date;
                var days = (durationDays.HasValue && durationDays.Value > 0) ? durationDays.Value : 1;
                var tripEnd = tripStart.AddDays(days);

                // Find active bookings with an explicit StartDate that overlaps with requested window
                var activeBookings = await db.Bookings
                    .AsNoTracking()
                    .Where(b => b.Status != "CANCELLED" && b.Status != "REJECTED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
                    .Where(b => b.VehicleCatalogId != null || b.VehicleSlotId != null)
                    .ToListAsync(cancellationToken);

                var bookedVehicleIds = new HashSet<Guid>();

                foreach (var b in activeBookings)
                {
                    // Only consider bookings with an explicitly assigned StartDate
                    if (!string.IsNullOrWhiteSpace(b.StartDate) && DateTime.TryParse(b.StartDate, out var bStartParsed))
                    {
                        var bStart = bStartParsed.Date;
                        var bDays = (b.TripDurationDays.HasValue && b.TripDurationDays.Value > 0) ? b.TripDurationDays.Value : 1;
                        var bEnd = bStart.AddDays(bDays);

                        // Overlap condition: bStart < tripEnd && bEnd > tripStart
                        if (bStart < tripEnd && bEnd > tripStart)
                        {
                            if (b.VehicleCatalogId.HasValue)
                            {
                                bookedVehicleIds.Add(b.VehicleCatalogId.Value);
                            }
                            if (b.VehicleSlotId.HasValue)
                            {
                                bookedVehicleIds.Add(b.VehicleSlotId.Value);
                            }
                        }
                    }
                }

                if (bookedVehicleIds.Any())
                {
                    suitableVehicles = suitableVehicles
                        .Where(v => !bookedVehicleIds.Contains(v.Id))
                        .ToList();
                }
            }

            // 4. Return available fleet models directly
            var response = suitableVehicles.Select(v => new
            {
                id = v.Id,
                vehicleCatalogId = (Guid?)v.Id,
                vehicleModel = v.VehicleModel,
                modelName = v.VehicleModel,
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

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching vehicles", error = ex.Message });
        }
    }

    [HttpGet("notifications")]
    [AllowAnonymous]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT")]
    public async Task<IActionResult> GetCapacityNotifications(CancellationToken cancellationToken)
    {
        var dbNotifs = await db.CapacityNotifications
            .AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var recentBookings = await db.Bookings
            .AsNoTracking()
            .Where(b => b.Status != "CANCELLED")
            .OrderByDescending(b => b.BookedAt)
            .Take(15)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var fleetCatalogs = await db.VehicleFleetCatalogs.AsNoTracking().ToListAsync(cancellationToken);

        var bookingNotifs = recentBookings.Select(b =>
        {
            var user = users.FirstOrDefault(u => u.Id.ToString() == b.TravelerUserId || u.Id.ToString() == b.TravelerId.ToString());
            var travelerName = user?.FullName ?? (string.IsNullOrWhiteSpace(user?.Email) ? "Traveler" : user.Email);

            VehicleFleetCatalog? fleet = null;
            if (b.VehicleCatalogId.HasValue) fleet = fleetCatalogs.FirstOrDefault(f => f.Id == b.VehicleCatalogId.Value);
            if (fleet == null && b.VehicleSlotId.HasValue) fleet = fleetCatalogs.FirstOrDefault(f => f.Id == b.VehicleSlotId.Value);
            var vehicleName = fleet?.VehicleModel ?? "Executive VIP Fleet";

            string guideName = "SLTDA Private Guide";
            if (!string.IsNullOrWhiteSpace(b.TravelerNotes))
            {
                var parts = b.TravelerNotes.Split("||");
                if (parts.Length >= 4 && !string.IsNullOrWhiteSpace(parts[3]))
                {
                    guideName = parts[3];
                }
            }

            return (object)new
            {
                id = $"bk-notif-{b.Id}",
                bookingId = b.Id,
                bookingReference = b.BookingReference,
                title = $"New Booking Allocation #{b.BookingReference}",
                message = $"{vehicleName} & Guide '{guideName}' reserved by {travelerName} for {b.StartDate ?? b.BookedAt.ToString("yyyy-MM-dd")} ({b.TripDurationDays ?? 1} Days).",
                vehicleModel = vehicleName,
                guideName = guideName,
                travelerName = travelerName,
                status = b.Status,
                vehicleCapacityStatus = b.VehicleCapacityStatus,
                guideAssignmentStatus = b.GuideAssignmentStatus,
                createdAt = b.BookedAt.ToString("o")
            };
        }).ToList();

        var combined = dbNotifs.Cast<object>().Concat(bookingNotifs).ToList();
        return Ok(combined);
    }

    [HttpGet("pending-dispatches")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT")]
    public async Task<IActionResult> GetPendingDispatches(CancellationToken cancellationToken)
    {
        var bookings = await db.Bookings
            .AsNoTracking()
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var journeys = await db.SignatureJourneys.AsNoTracking().ToListAsync(cancellationToken);
        var fleetCatalogs = await db.VehicleFleetCatalogs.AsNoTracking().ToListAsync(cancellationToken);
        var gAvails = await db.GuideAvailabilities.Include(s => s.GuideProfile).AsNoTracking().ToListAsync(cancellationToken);

        var dispatchList = bookings.Select(b => {
            var user = users.FirstOrDefault(u => u.Id.ToString() == b.TravelerId.ToString() || u.Id.GetHashCode() == b.TravelerId);
            var travelerName = !string.IsNullOrWhiteSpace(user?.FullName) ? user.FullName : "Registered Traveler";

            var journey = journeys.FirstOrDefault(j => j.Id.GetHashCode() == b.PackageId || j.Id.ToString() == b.PackageId?.ToString());
            var packageTitle = journey?.Title ?? "Bespoke Expedition";

            VehicleFleetCatalog? fleet = null;
            if (b.VehicleCatalogId.HasValue) fleet = fleetCatalogs.FirstOrDefault(f => f.Id == b.VehicleCatalogId.Value);
            if (fleet == null && b.VehicleSlotId.HasValue) fleet = fleetCatalogs.FirstOrDefault(f => f.Id == b.VehicleSlotId.Value);
            var vehicleModel = fleet?.VehicleModel ?? "Executive VIP Fleet Vehicle";

            var gSlot = b.GuideSlotId.HasValue ? gAvails.FirstOrDefault(s => s.Id == b.GuideSlotId.Value) : null;
            var guideName = gSlot?.GuideProfile?.FullName;
            if (string.IsNullOrWhiteSpace(guideName) && !string.IsNullOrWhiteSpace(b.TravelerNotes))
            {
                var parts = b.TravelerNotes.Split("||");
                if (parts.Length >= 4 && !string.IsNullOrWhiteSpace(parts[3]))
                {
                    guideName = parts[3];
                }
            }
            if (string.IsNullOrWhiteSpace(guideName)) guideName = "SLTDA Certified Guide";

            return new
            {
                id = b.Id,
                bookingReference = !string.IsNullOrWhiteSpace(b.BookingReference) ? b.BookingReference : $"CM-2026-{b.Id:D4}",
                travelerName = travelerName,
                packageTitle = packageTitle,
                startDate = b.StartDate ?? b.BookedAt.ToString("yyyy-MM-dd"),
                vehicleModel = vehicleModel,
                vehicleSlotId = b.VehicleSlotId,
                guideName = guideName,
                guideSlotId = b.GuideSlotId,
                status = b.Status,
                vehicleCapacityStatus = b.VehicleCapacityStatus,
                guideAssignmentStatus = b.GuideAssignmentStatus,
                capacityRejectionReason = b.CapacityRejectionReason,
                bookedAt = b.BookedAt
            };
        }).ToList();

        return Ok(dispatchList);
    }

    [HttpPost("bookings/{bookingId}/confirm-dispatch")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> ConfirmDispatch(
        int bookingId,
        [FromBody] ConfirmDispatchDto? dto,
        CancellationToken cancellationToken)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId, cancellationToken);
        if (booking == null)
        {
            return NotFound(new { message = "Booking request not found." });
        }

        if (dto?.VehicleSlotId.HasValue == true && dto.VehicleSlotId.Value != Guid.Empty)
        {
            booking.VehicleSlotId = dto.VehicleSlotId.Value;
        }

        if (dto?.GuideSlotId.HasValue == true && dto.GuideSlotId.Value != Guid.Empty)
        {
            booking.GuideSlotId = dto.GuideSlotId.Value;
        }

        if (booking.VehicleSlotId.HasValue)
        {
            var vSlot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == booking.VehicleSlotId.Value, cancellationToken);
            if (vSlot != null)
            {
                vSlot.Status = SlotStatus.BOOKED;
                vSlot.HeldUntilUtc = null;
            }
        }

        booking.VehicleCapacityStatus = "ACKNOWLEDGED";
        if (booking.Status == "CAPACITY_FLAGGED_REJECTED")
        {
            booking.Status = "PENDING_REVIEW";
        }

        db.CapacityNotifications.Add(new CapacityNotification
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            Title = "Fleet & Guide Dispatch Confirmed",
            Message = $"Capacity Officer confirmed VIP Fleet & Guide Dispatch for Booking #{booking.BookingReference}",
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Capacity Officer confirmed dispatch for Booking #{BookingId}", booking.Id);

        return Ok(new
        {
            message = "Capacity dispatch confirmed and inventory locked in database.",
            booking
        });
    }

    [HttpPost("bookings/{bookingId}/reject-vehicle")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> RejectVehicle(
        int bookingId,
        [FromBody] RejectVehicleRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            return BadRequest(new { message = "Rejection reason is mandatory." });
        }

        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId, cancellationToken);
        if (booking == null)
        {
            return NotFound(new { message = "Booking request not found." });
        }

        if (booking.VehicleSlotId.HasValue)
        {
            var vSlot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == booking.VehicleSlotId.Value, cancellationToken);
            if (vSlot != null)
            {
                vSlot.HeldUntilUtc = null;
                vSlot.Status = SlotStatus.AVAILABLE;
            }
        }

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdClaim, out var userId);

        booking.VehicleCapacityStatus = "REJECTED_BY_CAPACITY";
        booking.CapacityRejectionReason = request.RejectionReason.Trim();
        booking.CapacityRejectedByUserId = userId;
        booking.CapacityRejectedAtUtc = DateTime.UtcNow;
        booking.Status = "CAPACITY_FLAGGED_REJECTED";

        await db.SaveChangesAsync(cancellationToken);

        logger.LogWarning("Vehicle assignment rejected by Capacity Officer for Booking #{BookingId}: {Reason}", booking.Id, request.RejectionReason);

        return Ok(new
        {
            message = "Vehicle allocation rejected. Travel Agent has been flagged for replacement.",
            booking
        });
    }

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
    [Authorize(Roles = "CAPACITY_OFFICER,TRAVEL_AGENT,TRAVELER,ADMIN")]
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

    [HttpGet("holds")]
    [HttpGet("holds/active")]
    [AllowAnonymous]
    public async Task<IActionResult> GetActiveHolds(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var list = new List<object>();

        var gHolds = await db.GuideAvailabilities
            .Where(g => g.HeldUntilUtc.HasValue && g.HeldUntilUtc.Value > now)
            .Select(g => new
            {
                holdId = $"HOLD-GUIDE-{g.Id}",
                travelerName = "Traveler Reservation",
                resourceType = $"Guide Slot #{g.Id} ({g.SlotType})",
                expiresInSeconds = (int)(g.HeldUntilUtc!.Value - now).TotalSeconds
            })
            .ToListAsync(cancellationToken);
        list.AddRange(gHolds);

        var tHolds = await db.TransportSlots
            .Where(t => t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value > now)
            .Select(t => new
            {
                holdId = $"HOLD-[#TRP-{t.Id}]",
                travelerName = "Fleet Hold",
                resourceType = $"Transport Slot #{t.Id} ({t.VehicleType})",
                expiresInSeconds = (int)(t.HeldUntilUtc!.Value - now).TotalSeconds
            })
            .ToListAsync(cancellationToken);
        list.AddRange(tHolds);

        var aHolds = await db.AttractionSlots
            .Where(a => a.HeldUntilUtc.HasValue && a.HeldUntilUtc.Value > now)
            .Select(a => new
            {
                holdId = $"HOLD-ATT-{a.Id}",
                travelerName = "Attraction Hold",
                resourceType = $"Attraction Slot #{a.Id}",
                expiresInSeconds = (int)(a.HeldUntilUtc!.Value - now).TotalSeconds
            })
            .ToListAsync(cancellationToken);
        list.AddRange(aHolds);

        return Ok(list);
    }

    [HttpPost("holds/release-expired")]
    [AllowAnonymous]
    public async Task<IActionResult> ReleaseExpiredHolds(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expiredGuideSlots = await db.GuideAvailabilities
            .Where(g => g.HeldUntilUtc.HasValue && g.HeldUntilUtc.Value <= now)
            .ToListAsync(cancellationToken);
        foreach (var slot in expiredGuideSlots)
        {
            slot.HeldUntilUtc = null;
        }

        var expiredTransportSlots = await db.TransportSlots
            .Where(t => t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value <= now)
            .ToListAsync(cancellationToken);
        foreach (var slot in expiredTransportSlots)
        {
            if (slot.Status == SlotStatus.RESERVED)
            {
                slot.Status = SlotStatus.AVAILABLE;
            }
            slot.HeldUntilUtc = null;
        }

        var expiredAttractionSlots = await db.AttractionSlots
            .Where(a => a.HeldUntilUtc.HasValue && a.HeldUntilUtc.Value <= now)
            .ToListAsync(cancellationToken);
        foreach (var slot in expiredAttractionSlots)
        {
            slot.HeldUntilUtc = null;
        }

        await db.SaveChangesAsync(cancellationToken);

        var remainingActiveCount = await db.GuideAvailabilities.CountAsync(g => g.HeldUntilUtc.HasValue && g.HeldUntilUtc.Value > now, cancellationToken)
            + await db.TransportSlots.CountAsync(t => t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value > now, cancellationToken)
            + await db.AttractionSlots.CountAsync(a => a.HeldUntilUtc.HasValue && a.HeldUntilUtc.Value > now, cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Expired capacity holds released successfully.",
            releasedCount = expiredGuideSlots.Count + expiredTransportSlots.Count + expiredAttractionSlots.Count,
            remainingHolds = remainingActiveCount
        });
    }

    // ==========================================
    // GUIDE AVAILABILITY CRUD (PERSISTENT PG DB)
    // ==========================================

    [HttpGet("guides/slots")]
    [AllowAnonymous]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT,LOCAL_GUIDE")]
    public async Task<IActionResult> GetGuideSlots(CancellationToken cancellationToken)
    {
        var activeBookings = await db.Bookings
            .AsNoTracking()
            .Where(b => b.Status != "CANCELLED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var guideProfiles = await db.GuideProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Where(p => p.IsActive)
            .ToListAsync(cancellationToken);

        var dbAvailabilities = await db.GuideAvailabilities
            .AsNoTracking()
            .Include(g => g.LocalGuideUser)
            .Include(g => g.GuideProfile)
            .ToListAsync(cancellationToken);

        var resultList = new List<object>();
        var processedGuideUserIds = new HashSet<Guid>();

        var today = DateTime.UtcNow.Date;

        // 1. Process existing GuideAvailabilities
        foreach (var g in dbAvailabilities)
        {
            var guideUserId = g.LocalGuideUserId;
            processedGuideUserIds.Add(guideUserId);

            var profile = g.GuideProfile ?? guideProfiles.FirstOrDefault(p => p.UserId == guideUserId || p.Id == g.GuideProfileId);
            var gUser = g.LocalGuideUser ?? users.FirstOrDefault(u => u.Id == guideUserId);

            var guideName = !string.IsNullOrWhiteSpace(profile?.FullName) && !profile.FullName.Contains("@")
                ? profile.FullName
                : (!string.IsNullOrWhiteSpace(gUser?.FullName) && !gUser.FullName.Contains("@")
                    ? gUser.FullName
                    : "Certified Guide");

            var guideBookings = activeBookings.Where(b =>
                (b.GuideSlotId.HasValue && (b.GuideSlotId.Value == g.Id || b.GuideSlotId.Value == g.GuideProfileId || b.GuideSlotId.Value == guideUserId)) ||
                (!string.IsNullOrWhiteSpace(b.TravelerNotes) && b.TravelerNotes.Contains(guideName)) ||
                (!string.IsNullOrWhiteSpace(b.AgentNotes) && b.AgentNotes.Contains(guideName))
            ).ToList();

            string? bookedFrom = null;
            string? bookedUntil = null;
            int bookedDays = 0;
            string? availableAgain = null;
            bool isCurrentlyBooked = false;
            string status = g.Status.ToString();
            int bookedCapacity = g.BookedCapacity;
            string? notes = g.Notes;
            DateTime startTime = g.StartTimeUtc.UtcDateTime;
            DateTime endTime = g.EndTimeUtc.UtcDateTime;

            var currentOrUpcoming = guideBookings
                .Select(b =>
                {
                    DateTime bStart = DateTime.TryParse(b.StartDate, out var ps) ? ps.Date : b.BookedAt.Date;
                    int dur = b.TripDurationDays.GetValueOrDefault(1) > 0 ? b.TripDurationDays.GetValueOrDefault(1) : 1;
                    DateTime bEnd = bStart.AddDays(dur - 1);
                    return new { Booking = b, Start = bStart, End = bEnd, Duration = dur };
                })
                .Where(x => x.End >= today)
                .OrderBy(x => x.Start)
                .FirstOrDefault();

            if (currentOrUpcoming != null)
            {
                var b = currentOrUpcoming.Booking;
                bookedFrom = currentOrUpcoming.Start.ToString("yyyy-MM-dd");
                bookedUntil = currentOrUpcoming.End.ToString("yyyy-MM-dd");
                bookedDays = currentOrUpcoming.Duration;
                availableAgain = currentOrUpcoming.End.AddDays(1).ToString("yyyy-MM-dd");

                if (today <= currentOrUpcoming.End)
                {
                    isCurrentlyBooked = true;
                    status = (b.Status == "CONFIRMED" || b.GuideAssignmentStatus == "ACCEPTED_BY_GUIDE") ? "BOOKED" : "RESERVED";
                    bookedCapacity = 1;
                    startTime = currentOrUpcoming.Start;
                    endTime = currentOrUpcoming.End;
                    notes = $"Booked: #{b.BookingReference} ({bookedDays} Days: {currentOrUpcoming.Start:dd MMM yyyy} - {currentOrUpcoming.End:dd MMM yyyy})";
                }
            }
            else
            {
                if (status == "BOOKED" || status == "RESERVED")
                {
                    status = "AVAILABLE";
                    bookedCapacity = 0;
                }
            }

            resultList.Add(new
            {
                id = g.Id,
                localGuideUserId = g.LocalGuideUserId,
                guideName = guideName,
                licenseNumber = profile?.LicenseNumber ?? "SLTDA/CG/2026/0491",
                guideEmail = gUser?.Email ?? (profile?.User?.Email ?? ""),
                startTimeUtc = startTime,
                endTimeUtc = endTime,
                slotType = g.SlotType.ToString(),
                status = status,
                maxCapacity = g.MaxCapacity,
                bookedCapacity = bookedCapacity,
                priceAmount = g.PriceAmount > 0 ? g.PriceAmount : (profile?.DefaultDailyRateLkr > 0 ? profile.DefaultDailyRateLkr : 18000m),
                currency = g.Currency,
                notes = notes,
                rowVersion = g.RowVersion,
                bookedFrom = bookedFrom,
                bookedUntil = bookedUntil,
                bookedDays = bookedDays,
                availableAgain = availableAgain,
                isCurrentlyBooked = isCurrentlyBooked
            });
        }

        return Ok(resultList);
    }

    [HttpPost("guides/slots")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> CreateGuideSlot(
        [FromBody] CreateGuideSlotRequest request,
        CancellationToken cancellationToken)
    {
        var guideId = request.GuideId != Guid.Empty ? request.GuideId : request.LocalGuideUserId;
        if (guideId == Guid.Empty)
        {
            return BadRequest(new { message = "Please select a valid certified guide." });
        }

        var guideUser = await db.Users.FirstOrDefaultAsync(u => u.Id == guideId, cancellationToken);
        if (guideUser == null)
        {
            return BadRequest(new { message = "The selected guide does not exist in the system." });
        }

        if (!string.IsNullOrWhiteSpace(request.Notes) && System.Text.RegularExpressions.Regex.IsMatch(request.Notes, @"\d"))
        {
            return BadRequest(new { message = "Tour Excerpt / Notes must contain letters only. Numbers are not allowed." });
        }

        var slotType = Enum.TryParse<SlotType>(request.SlotType, true, out var parsedType) ? parsedType : SlotType.FULL_DAY;

        var slot = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = guideUser.Id,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            SlotType = slotType,
            Status = AvailabilityStatus.AVAILABLE,
            PriceAmount = request.PriceAmount,
            MaxCapacity = request.MaxCapacity > 0 ? request.MaxCapacity : 1,
            BookedCapacity = 0,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.GuideAvailabilities.Add(slot);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Created new guide slot {SlotId} for Guide {GuideId}", slot.Id, guideUser.Id);

        return Ok(new
        {
            id = slot.Id,
            localGuideUserId = slot.LocalGuideUserId,
            guideName = string.IsNullOrWhiteSpace(guideUser.FullName) ? guideUser.Email : guideUser.FullName,
            startTimeUtc = slot.StartTimeUtc,
            endTimeUtc = slot.EndTimeUtc,
            slotType = slot.SlotType.ToString(),
            status = slot.Status.ToString(),
            priceAmount = slot.PriceAmount,
            maxCapacity = slot.MaxCapacity,
            bookedCapacity = slot.BookedCapacity,
            currency = slot.Currency,
            notes = slot.Notes
        });
    }

    [HttpPut("guides/slots/{id}")]
    [HttpPut("/api/guides/slots/{id}")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,LOCAL_GUIDE")]
    public async Task<IActionResult> UpdateGuideSlot(
        Guid id,
        [FromBody] UpdateGuideSlotRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot == null)
        {
            var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
            if (profile != null)
            {
                var newSlot = new GuideAvailability
                {
                    Id = Guid.NewGuid(),
                    GuideProfileId = profile.Id,
                    LocalGuideUserId = profile.UserId,
                    StartTimeUtc = request.StartTimeUtc ?? DateTimeOffset.UtcNow,
                    EndTimeUtc = request.EndTimeUtc ?? DateTimeOffset.UtcNow.AddMonths(1),
                    SlotType = !string.IsNullOrWhiteSpace(request.SlotType) && Enum.TryParse<SlotType>(request.SlotType, true, out var st) ? st : SlotType.FULL_DAY,
                    Status = !string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<AvailabilityStatus>(request.Status, true, out var ast) ? ast : AvailabilityStatus.AVAILABLE,
                    PriceAmount = request.PriceAmount.HasValue && request.PriceAmount.Value > 0 ? request.PriceAmount.Value : (profile.DefaultDailyRateLkr > 0 ? profile.DefaultDailyRateLkr : 18000m),
                    Currency = !string.IsNullOrWhiteSpace(profile.Currency) ? profile.Currency : "LKR",
                    MaxCapacity = request.MaxCapacity.HasValue && request.MaxCapacity.Value > 0 ? request.MaxCapacity.Value : 1,
                    BookedCapacity = 0,
                    Notes = !string.IsNullOrWhiteSpace(request.Notes) ? request.Notes.Trim() : (profile.Specialties ?? "Full Island Certified Escort"),
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    UpdatedAtUtc = DateTimeOffset.UtcNow
                };
                db.GuideAvailabilities.Add(newSlot);
                await db.SaveChangesAsync(cancellationToken);
                return Ok(newSlot);
            }

            return NotFound(new { message = "Guide availability slot not found." });
        }

        if (slot.Status == AvailabilityStatus.BOOKED || slot.BookedCapacity > 0)
        {
            return BadRequest(new { message = "Cannot update an active booked slot. Cancel or reassign the booking first." });
        }

        if (!string.IsNullOrWhiteSpace(request.Notes) && System.Text.RegularExpressions.Regex.IsMatch(request.Notes, @"\d"))
        {
            return BadRequest(new { message = "Tour Excerpt / Notes must contain letters only. Numbers are not allowed." });
        }

        if (request.StartTimeUtc.HasValue) slot.StartTimeUtc = request.StartTimeUtc.Value;
        if (request.EndTimeUtc.HasValue) slot.EndTimeUtc = request.EndTimeUtc.Value;
        if (!string.IsNullOrWhiteSpace(request.SlotType) && Enum.TryParse<SlotType>(request.SlotType, true, out var parsedType))
        {
            slot.SlotType = parsedType;
        }
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<AvailabilityStatus>(request.Status, true, out var parsedStatus))
        {
            slot.Status = parsedStatus;
        }
        if (request.PriceAmount.HasValue && request.PriceAmount.Value > 0) slot.PriceAmount = request.PriceAmount.Value;
        if (request.MaxCapacity.HasValue && request.MaxCapacity.Value > 0) slot.MaxCapacity = request.MaxCapacity.Value;
        if (request.Notes != null) slot.Notes = request.Notes.Trim();
        slot.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Updated guide slot {SlotId}", slot.Id);

        return Ok(slot);
    }

    [HttpPatch("guides/slots/{id}/status")]
    [HttpPatch("/api/guides/slots/{id}/status")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,LOCAL_GUIDE")]
    public async Task<IActionResult> UpdateGuideSlotStatus(
        Guid id,
        [FromBody] UpdateStatusRequest? request,
        CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot == null)
        {
            var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
            if (profile != null)
            {
                var statusToSet = AvailabilityStatus.BLOCKED;
                if (!string.IsNullOrWhiteSpace(request?.Status) && Enum.TryParse<AvailabilityStatus>(request.Status, true, out var reqStatus))
                {
                    statusToSet = reqStatus;
                }

                var newSlot = new GuideAvailability
                {
                    Id = Guid.NewGuid(),
                    GuideProfileId = profile.Id,
                    LocalGuideUserId = profile.UserId,
                    StartTimeUtc = DateTimeOffset.UtcNow,
                    EndTimeUtc = DateTimeOffset.UtcNow.AddMonths(1),
                    SlotType = SlotType.FULL_DAY,
                    Status = statusToSet,
                    PriceAmount = profile.DefaultDailyRateLkr > 0 ? profile.DefaultDailyRateLkr : 18000m,
                    Currency = !string.IsNullOrWhiteSpace(profile.Currency) ? profile.Currency : "LKR",
                    MaxCapacity = 1,
                    BookedCapacity = 0,
                    Notes = profile.Specialties ?? "Full Island Certified Escort",
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    UpdatedAtUtc = DateTimeOffset.UtcNow
                };
                db.GuideAvailabilities.Add(newSlot);
                await db.SaveChangesAsync(cancellationToken);
                return Ok(new { id = newSlot.Id, status = newSlot.Status.ToString(), message = $"Guide slot status updated to {newSlot.Status}." });
            }

            var legacySlot = await db.GuideAvailabilitySlots.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
            if (legacySlot != null)
            {
                legacySlot.Status = legacySlot.Status == "BLOCKED" ? "AVAILABLE" : "BLOCKED";
                legacySlot.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return Ok(new { id = legacySlot.Id, status = legacySlot.Status, message = $"Guide slot status updated to {legacySlot.Status}." });
            }

            return NotFound(new { message = "Guide availability slot not found." });
        }

        if (slot.Status == AvailabilityStatus.BOOKED)
        {
            return BadRequest(new { message = "Cannot change the status of an active booked slot." });
        }

        var statusStr = request?.Status;
        if (string.IsNullOrWhiteSpace(statusStr))
        {
            statusStr = slot.Status == AvailabilityStatus.BLOCKED ? "AVAILABLE" : "BLOCKED";
        }

        if (Enum.TryParse<AvailabilityStatus>(statusStr, true, out var parsedStatus))
        {
            slot.Status = parsedStatus;
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Patched guide slot {SlotId} status to {Status}", slot.Id, parsedStatus);
            return Ok(new { id = slot.Id, status = slot.Status.ToString(), message = $"Guide slot status updated to {slot.Status}." });
        }

        return BadRequest(new { message = $"Invalid status value '{statusStr}' provided." });
    }

    [HttpDelete("guides/slots/{id}")]
    [HttpDelete("/api/guides/slots/{id}")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,LOCAL_GUIDE")]
    public async Task<IActionResult> DeleteGuideSlot(Guid id, CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot != null)
        {
            if (slot.Status == AvailabilityStatus.BOOKED || slot.Status == AvailabilityStatus.RESERVED || slot.BookedCapacity > 0)
            {
                return BadRequest(new { message = "Cannot delete an active booked slot. Please block it instead." });
            }

            db.GuideAvailabilities.Remove(slot);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Deleted guide slot {SlotId}", id);

            return Ok(new { message = "Guide slot deleted successfully." });
        }

        var legacySlot = await db.GuideAvailabilitySlots.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (legacySlot != null)
        {
            if (legacySlot.Status == "BOOKED" || legacySlot.Status == "HELD")
            {
                return BadRequest(new { message = $"Cannot delete a slot that is currently in {legacySlot.Status} state. Cancel the booking first." });
            }

            db.GuideAvailabilitySlots.Remove(legacySlot);
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Guide slot deleted successfully." });
        }

        var userSlots = await db.GuideAvailabilities
            .Where(g => g.LocalGuideUserId == id || g.GuideProfileId == id)
            .Where(g => g.Status != AvailabilityStatus.BOOKED && g.Status != AvailabilityStatus.RESERVED && g.BookedCapacity == 0)
            .ToListAsync(cancellationToken);

        if (userSlots.Any())
        {
            db.GuideAvailabilities.RemoveRange(userSlots);
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Guide slot removed successfully." });
        }

        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id || p.UserId == id, cancellationToken);
        if (profile != null)
        {
            var guideSlots = await db.GuideAvailabilities
                .Where(g => g.GuideProfileId == profile.Id || g.LocalGuideUserId == profile.UserId)
                .Where(g => g.Status != AvailabilityStatus.BOOKED && g.Status != AvailabilityStatus.RESERVED && g.BookedCapacity == 0)
                .ToListAsync(cancellationToken);

            if (guideSlots.Any())
            {
                db.GuideAvailabilities.RemoveRange(guideSlots);
                await db.SaveChangesAsync(cancellationToken);
            }

            return Ok(new { message = "Guide slot removed successfully." });
        }

        return Ok(new { message = "Guide slot removed or already inactive." });
    }

    // ==========================================
    // TRANSPORT SLOTS CRUD (PERSISTENT PG DB)
    // ==========================================

    [HttpGet("transport/slots")]
    [AllowAnonymous]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT")]
    public async Task<IActionResult> GetTransportSlots(CancellationToken cancellationToken)
    {
        var activeBookings = await db.Bookings
            .AsNoTracking()
            .Where(b => b.Status != "CANCELLED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);

        // Fetch all fleet catalog items
        var catalogs = await db.VehicleFleetCatalogs
            .AsNoTracking()
            .Include(v => v.TransportSlots)
            .OrderBy(v => v.DisplayOrder)
            .ToListAsync(cancellationToken);

        // Fetch standalone transport slots
        var standaloneSlots = await db.TransportSlots
            .AsNoTracking()
            .Include(t => t.VehicleCatalog)
            .Include(t => t.TransportOption)
            .Where(t => t.VehicleCatalogId == null)
            .ToListAsync(cancellationToken);

        var responseList = new List<object>();

        // 1. Process Fleet Catalogs
        foreach (var v in catalogs)
        {
            var linkedBooking = activeBookings.FirstOrDefault(b =>
                (b.VehicleCatalogId.HasValue && b.VehicleCatalogId.Value == v.Id) ||
                (b.VehicleSlotId.HasValue && (b.VehicleSlotId.Value == v.Id || v.TransportSlots.Any(ts => ts.Id == b.VehicleSlotId.Value))) ||
                (!string.IsNullOrWhiteSpace(b.TravelerNotes) && b.TravelerNotes.Contains(v.VehicleModel)) ||
                (!string.IsNullOrWhiteSpace(b.AgentNotes) && b.AgentNotes.Contains(v.VehicleModel))
            );

            string status = "AVAILABLE";
            string? charterStartDate = null;
            string? charterEndDate = null;
            int? tripDurationDays = null;
            string? bookingReference = null;
            string? travelerName = null;
            int? passengerCount = null;

            if (linkedBooking != null)
            {
                status = (linkedBooking.Status == "CONFIRMED" || linkedBooking.VehicleCapacityStatus == "CONFIRMED")
                    ? "BOOKED"
                    : "RESERVED";
                charterStartDate = linkedBooking.StartDate ?? linkedBooking.BookedAt.ToString("yyyy-MM-dd");
                tripDurationDays = linkedBooking.TripDurationDays ?? 1;

                if (DateTime.TryParse(charterStartDate, out var pStart))
                {
                    charterEndDate = pStart.AddDays(tripDurationDays.Value).ToString("yyyy-MM-dd");
                }

                bookingReference = linkedBooking.BookingReference;
                passengerCount = linkedBooking.PassengerCount ?? v.MaxPassengers;

                var travelerUser = users.FirstOrDefault(u => u.Id.ToString() == linkedBooking.TravelerUserId || u.Id.ToString() == linkedBooking.TravelerId.ToString());
                travelerName = travelerUser?.FullName ?? (string.IsNullOrWhiteSpace(travelerUser?.Email) ? "Traveler" : travelerUser.Email);
            }
            else if (!v.IsActive)
            {
                status = "BLOCKED";
            }

            var primarySlot = v.TransportSlots.FirstOrDefault();

            responseList.Add(new
            {
                id = primarySlot?.Id ?? v.Id,
                vehicleCatalogId = v.Id,
                vehicleCatalog = new
                {
                    id = v.Id,
                    vehicleModel = v.VehicleModel,
                    categoryBadge = v.CategoryBadge,
                    imageUrl = v.ImageUrl,
                    maxPassengers = v.MaxPassengers,
                    featureHighlight = v.FeatureHighlight,
                    dailyRateUsd = v.DailyRateUsd,
                    currency = v.Currency
                },
                optionTitle = v.VehicleModel,
                routeDescription = $"{v.VehicleModel} • {v.CategoryBadge}",
                vehicleType = v.TransportSlots.FirstOrDefault()?.VehicleType.ToString() ?? "VAN",
                startTimeUtc = DateTime.UtcNow,
                endTimeUtc = DateTime.UtcNow.AddDays(tripDurationDays ?? 1),
                departureTime = DateTime.UtcNow,
                arrivalTime = DateTime.UtcNow.AddDays(tripDurationDays ?? 1),
                status = status,
                maxPassengers = v.MaxPassengers,
                dailyRate = primarySlot?.DailyRate ?? v.DailyRateUsd ?? 0m,
                currency = v.Currency,
                charterStartDate = charterStartDate,
                charterEndDate = charterEndDate,
                tripDurationDays = tripDurationDays,
                bookingReference = bookingReference,
                travelerName = travelerName,
                passengerCount = passengerCount,
                heldUntilUtc = primarySlot?.HeldUntilUtc,
                rowVersion = primarySlot?.RowVersion
            });
        }

        // 2. Process Standalone Slots
        foreach (var slot in standaloneSlots)
        {
            var linkedBooking = activeBookings.FirstOrDefault(b => b.VehicleSlotId == slot.Id);
            string status = slot.Status.ToString();
            string? charterStartDate = null;
            string? charterEndDate = null;
            int? tripDurationDays = null;
            string? bookingReference = null;
            string? travelerName = null;

            if (linkedBooking != null)
            {
                status = linkedBooking.Status == "CONFIRMED" ? "BOOKED" : "RESERVED";
                charterStartDate = linkedBooking.StartDate ?? linkedBooking.BookedAt.ToString("yyyy-MM-dd");
                tripDurationDays = linkedBooking.TripDurationDays ?? 1;

                if (DateTime.TryParse(charterStartDate, out var pStart))
                {
                    charterEndDate = pStart.AddDays(tripDurationDays.Value).ToString("yyyy-MM-dd");
                }
                bookingReference = linkedBooking.BookingReference;

                var travelerUser = users.FirstOrDefault(u => u.Id.ToString() == linkedBooking.TravelerUserId || u.Id.ToString() == linkedBooking.TravelerId.ToString());
                travelerName = travelerUser?.FullName ?? travelerUser?.Email ?? "Traveler";
            }

            responseList.Add(new
            {
                id = slot.Id,
                transportOptionId = slot.TransportOptionId,
                vehicleCatalogId = (Guid?)null,
                vehicleCatalog = (object?)null,
                optionTitle = slot.TransportOption?.Title ?? $"{slot.VehicleType} Standalone Charter",
                routeDescription = slot.RouteDescription ?? $"{slot.VehicleType} Express Route",
                vehicleType = slot.VehicleType.ToString(),
                startTimeUtc = slot.StartTimeUtc,
                endTimeUtc = slot.EndTimeUtc,
                departureTime = slot.StartTimeUtc.UtcDateTime,
                arrivalTime = slot.EndTimeUtc.UtcDateTime,
                status = status,
                maxPassengers = slot.TransportOption?.PassengerCapacity ?? 4,
                dailyRate = slot.DailyRate,
                currency = slot.Currency,
                charterStartDate = charterStartDate,
                charterEndDate = charterEndDate,
                tripDurationDays = tripDurationDays,
                bookingReference = bookingReference,
                travelerName = travelerName,
                heldUntilUtc = slot.HeldUntilUtc,
                rowVersion = slot.RowVersion
            });
        }

        return Ok(responseList);
    }

    [HttpPost("transport/slots")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> CreateTransportSlot(
        [FromBody] CreateTransportSlotRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.TransportOptionId.HasValue || request.TransportOptionId.Value == Guid.Empty)
            return BadRequest(new { message = "TransportOptionId is required to create a transport slot." });
        var optionId = request.TransportOptionId.Value;
        var vehicleType = Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt) ? vt : VehicleType.VAN;

        VehicleFleetCatalog? catalogVehicle = null;
        int maxPassengers = request.MaxPassengers ?? 12;

        if (request.VehicleCatalogId.HasValue && request.VehicleCatalogId != Guid.Empty)
        {
            catalogVehicle = await db.VehicleFleetCatalogs.FindAsync(new object[] { request.VehicleCatalogId.Value }, cancellationToken);
            if (catalogVehicle != null)
            {
                maxPassengers = catalogVehicle.MaxPassengers;
            }
        }

        var transportOption = await db.TransportOptions.FirstOrDefaultAsync(x => x.Id == optionId, cancellationToken);
        if (catalogVehicle == null && transportOption != null && maxPassengers > 0)
        {
            transportOption.PassengerCapacity = maxPassengers;
        }

        var slot = new TransportSlot
        {
            Id = Guid.NewGuid(),
            TransportOptionId = optionId,
            VehicleCatalogId = catalogVehicle?.Id ?? request.VehicleCatalogId,
            RouteDescription = request.RouteDescription?.Trim() ?? string.Empty,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            VehicleType = vehicleType,
            Status = SlotStatus.AVAILABLE,
            DailyRate = request.DailyRate > 0 ? request.DailyRate : catalogVehicle?.DailyRateUsd ?? 0,
            Currency = request.DailyRate > 0 || catalogVehicle == null ? request.Currency : catalogVehicle.Currency,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.TransportSlots.Add(slot);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Created transport slot {SlotId}", slot.Id);
        return Ok(slot);
    }

    [HttpPut("transport/slots/{id}")]
    [HttpPut("/api/transport/slots/{id}")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> UpdateTransportSlot(
        Guid id,
        [FromBody] UpdateTransportSlotRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await db.TransportSlots
            .Include(t => t.TransportOption)
            .Include(t => t.VehicleCatalog)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (slot == null)
        {
            var fleetCatalog = await db.VehicleFleetCatalogs
                .Include(f => f.TransportSlots)
                .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

            if (fleetCatalog != null)
            {
                if (request.DailyRate > 0)
                {
                    fleetCatalog.DailyRateUsd = request.DailyRate;
                }
                if (request.MaxPassengers.HasValue && request.MaxPassengers.Value > 0)
                {
                    fleetCatalog.MaxPassengers = request.MaxPassengers.Value;
                }
                if (Enum.TryParse<SlotStatus>(request.Status, true, out var parsedStatus))
                {
                    fleetCatalog.IsActive = (parsedStatus == SlotStatus.AVAILABLE);
                }
                fleetCatalog.UpdatedAt = DateTime.UtcNow;

                var existingSlot = fleetCatalog.TransportSlots.FirstOrDefault();
                if (existingSlot != null)
                {
                    existingSlot.StartTimeUtc = request.StartTimeUtc != default ? request.StartTimeUtc : existingSlot.StartTimeUtc;
                    existingSlot.EndTimeUtc = request.EndTimeUtc != default ? request.EndTimeUtc : existingSlot.EndTimeUtc;
                    existingSlot.DailyRate = request.DailyRate > 0 ? request.DailyRate : existingSlot.DailyRate;
                    if (Enum.TryParse<SlotStatus>(request.Status, true, out var st)) existingSlot.Status = st;
                    existingSlot.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync(cancellationToken);
                return Ok(new { id = fleetCatalog.Id, message = "Fleet catalog and slot updated successfully." });
            }

            return NotFound(new { message = "Transport slot not found." });
        }

        slot.StartTimeUtc = request.StartTimeUtc;
        slot.EndTimeUtc = request.EndTimeUtc;
        if (Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt))
        {
            slot.VehicleType = vt;
        }
        if (Enum.TryParse<SlotStatus>(request.Status, true, out var st2))
        {
            slot.Status = st2;
        }
        slot.DailyRate = request.DailyRate;
        slot.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency;
        if (slot.VehicleCatalog == null && request.MaxPassengers is > 0 && slot.TransportOption != null)
        {
            slot.TransportOption.PassengerCapacity = request.MaxPassengers.Value;
        }
        slot.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(slot);
    }

    [HttpPatch("transport/slots/{id}/status")]
    [HttpPatch("/api/transport/slots/{id}/status")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> UpdateTransportSlotStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<SlotStatus>(request.Status, true, out var parsedStatus))
        {
            return BadRequest(new { message = "Invalid status value provided." });
        }

        var slot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (slot != null)
        {
            slot.Status = parsedStatus;
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
            if (slot.VehicleCatalogId.HasValue)
            {
                var cat = await db.VehicleFleetCatalogs.FirstOrDefaultAsync(c => c.Id == slot.VehicleCatalogId.Value, cancellationToken);
                if (cat != null)
                {
                    cat.IsActive = (parsedStatus == SlotStatus.AVAILABLE);
                    cat.UpdatedAt = DateTime.UtcNow;
                }
            }
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { id = slot.Id, status = slot.Status.ToString() });
        }

        // If not found in TransportSlots, check if id is a VehicleFleetCatalog
        var fleetCatalog = await db.VehicleFleetCatalogs
            .Include(f => f.TransportSlots)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

        if (fleetCatalog != null)
        {
            fleetCatalog.IsActive = (parsedStatus == SlotStatus.AVAILABLE);
            fleetCatalog.UpdatedAt = DateTime.UtcNow;

            foreach (var ts in fleetCatalog.TransportSlots)
            {
                ts.Status = parsedStatus;
                ts.UpdatedAtUtc = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { id = fleetCatalog.Id, status = parsedStatus.ToString() });
        }

        return NotFound(new { message = "Transport slot or vehicle fleet item not found." });
    }

    [HttpDelete("transport/slots/{id}")]
    [HttpDelete("/api/transport/slots/{id}")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> DeleteTransportSlot(Guid id, CancellationToken cancellationToken)
    {
        var slot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (slot != null)
        {
            if (slot.Status == SlotStatus.BOOKED)
            {
                return BadRequest(new { message = "Cannot delete an active booked transport slot. Please block it instead." });
            }

            db.TransportSlots.Remove(slot);
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Transport slot deleted successfully." });
        }

        var fleetCatalog = await db.VehicleFleetCatalogs.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
        if (fleetCatalog != null)
        {
            fleetCatalog.IsActive = false;
            fleetCatalog.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Vehicle fleet item deactivated successfully." });
        }

        return NotFound(new { message = "Transport slot not found." });
    }
}

public record CreateGuideSlotRequest(
    Guid GuideId,
    Guid LocalGuideUserId,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    string SlotType,
    decimal PriceAmount,
    int MaxCapacity = 1,
    string? Notes = null,
    string Currency = "LKR"
);

public record UpdateGuideSlotRequest(
    DateTimeOffset? StartTimeUtc = null,
    DateTimeOffset? EndTimeUtc = null,
    string? SlotType = null,
    decimal? PriceAmount = null,
    int? MaxCapacity = null,
    string? Notes = null,
    string? Status = null,
    string Currency = "LKR",
    byte[]? RowVersion = null
);

public record UpdateStatusRequest(string? Status = null);

public record CreateTransportSlotRequest(
    Guid? TransportOptionId,
    Guid? VehicleCatalogId,
    string? RouteDescription,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    string? VehicleType,
    int? MaxPassengers,
    decimal DailyRate,
    string Currency = "LKR"
);

public record UpdateTransportSlotRequest(
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    string VehicleType,
    int? MaxPassengers,
    decimal DailyRate,
    string Status,
    string Currency = "LKR"
);

public record RejectVehicleRequestDto(string RejectionReason);

public record ConfirmDispatchDto(Guid? VehicleSlotId, Guid? GuideSlotId, string? DispatchNotes);

