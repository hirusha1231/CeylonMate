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
    // ==========================================

    [HttpGet("guide-availabilities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableGuides([FromQuery] string? date, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var slots = await db.GuideAvailabilities
            .AsNoTracking()
            .Include(g => g.LocalGuideUser)
            .Include(g => g.GuideProfile)
            .Where(g => g.Status == AvailabilityStatus.AVAILABLE)
            .OrderBy(g => g.StartTimeUtc)
            .ToListAsync(cancellationToken);

        // Group by guide user so each guide appears only ONCE regardless of how many slots they have
        var response = slots
            .GroupBy(g => g.LocalGuideUserId)
            .Select(grp =>
            {
                var first = grp.First();
                var guideName = !string.IsNullOrWhiteSpace(first.GuideProfile?.FullName) && !first.GuideProfile.FullName.Contains("@")
                    ? first.GuideProfile.FullName
                    : (!string.IsNullOrWhiteSpace(first.LocalGuideUser?.FullName) && !first.LocalGuideUser.FullName.Contains("@")
                        ? first.LocalGuideUser.FullName
                        : null);

                return new
                {
                    id = first.Id,
                    guideUserId = first.LocalGuideUserId,
                    guideName,
                    bio = first.GuideProfile != null && !string.IsNullOrWhiteSpace(first.GuideProfile.Bio) ? first.GuideProfile.Bio : null,
                    licenseNumber = first.GuideProfile != null && !string.IsNullOrWhiteSpace(first.GuideProfile.LicenseNumber) ? first.GuideProfile.LicenseNumber : null,
                    languages = first.GuideProfile != null && !string.IsNullOrWhiteSpace(first.GuideProfile.LanguagesSpoken) ? first.GuideProfile.LanguagesSpoken : null,
                    priceAmount = grp.Min(s => s.PriceAmount),
                    currency = string.IsNullOrWhiteSpace(first.Currency) ? "LKR" : first.Currency,
                    status = first.Status.ToString(),
                    notes = first.Notes
                };
            })
            .ToList();

        return Ok(response);
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

            // If no active vehicles in DB, seed fallback
            if (!allVehicles.Any())
            {
                var seedFleet = new List<VehicleFleetCatalog>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "EXECUTIVE VIP GROUP TRANSPORT",
                        VehicleModel = "Toyota KDH Super GL VIP Van",
                        Description = "Ideal for families and luxury groups. Dual climate control, plush leather reclining armchairs, 5G Wi-Fi.",
                        ImageUrl = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 6,
                        FeatureHighlight = "VIP Leather Interior & 5G Wi-Fi",
                        LuggageCapacity = "6 Large Luggage",
                        DailyRateUsd = 120.00m,
                        IsActive = true,
                        DisplayOrder = 1
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "PRESTIGE EXECUTIVE SEDAN",
                        VehicleModel = "Mercedes-Benz E-Class Sedan",
                        Description = "Unmatched elegance for couples and solo executive travelers. Whisper-quiet cabin acoustics, leather seating.",
                        ImageUrl = "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 3,
                        FeatureHighlight = "Prestige Leather Comfort",
                        LuggageCapacity = "3 Large Luggage",
                        DailyRateUsd = 150.00m,
                        IsActive = true,
                        DisplayOrder = 2
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "4X4 SAFARI & EXPEDITION",
                        VehicleModel = "Toyota Land Cruiser V8 Safari",
                        Description = "Heavy-duty luxury 4x4 modified for Yala and Udawalawe national park tracking. High elevation seating.",
                        ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 5,
                        FeatureHighlight = "High-Clearance 4x4",
                        LuggageCapacity = "4 Large Luggage",
                        DailyRateUsd = 180.00m,
                        IsActive = true,
                        DisplayOrder = 3
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "VIP COACH TRANSPORT",
                        VehicleModel = "Toyota Coaster VIP Minibus",
                        Description = "Ideal for private delegation groups. Equipped with dual AC, microphone, panoramic windows.",
                        ImageUrl = "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 14,
                        FeatureHighlight = "Panoramic VIP Coach",
                        LuggageCapacity = "12 Large Luggage",
                        DailyRateUsd = 250.00m,
                        IsActive = true,
                        DisplayOrder = 4
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "PREMIUM LUXURY SUV",
                        VehicleModel = "Range Rover Autobiography V8 SUV",
                        Description = "Supreme luxury for executive VIPs. All-wheel drive terrain response, massage executive seating.",
                        ImageUrl = "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 4,
                        FeatureHighlight = "Executive Lounge Seating",
                        LuggageCapacity = "4 Large Luggage",
                        DailyRateUsd = 220.00m,
                        IsActive = true,
                        DisplayOrder = 5
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        CategoryBadge = "LUXURY DELEGATION BUS",
                        VehicleModel = "Volvo B11R Super VIP Coach",
                        Description = "Ultra-capacity luxury coach for large tour delegations with reclining leather seats, climate zones.",
                        ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80",
                        MaxPassengers = 30,
                        FeatureHighlight = "Air Suspension & Sky Lounge",
                        LuggageCapacity = "25 Large Luggage",
                        DailyRateUsd = 350.00m,
                        IsActive = true,
                        DisplayOrder = 6
                    }
                };

                db.VehicleFleetCatalogs.AddRange(seedFleet);
                await db.SaveChangesAsync(cancellationToken);
                allVehicles = seedFleet;
            }

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
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> GetCapacityNotifications(CancellationToken cancellationToken)
    {
        var notifications = await db.CapacityNotifications
            .AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        return Ok(notifications);
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
        var vSlots = await db.TransportSlots.Include(s => s.VehicleCatalog).AsNoTracking().ToListAsync(cancellationToken);
        var gSlots = await db.GuideAvailabilitySlots.Include(s => s.GuideProfile).AsNoTracking().ToListAsync(cancellationToken);

        var dispatchList = bookings.Select(b => {
            var user = users.FirstOrDefault(u => u.Id.ToString() == b.TravelerId.ToString() || u.Id.GetHashCode() == b.TravelerId);
            var travelerName = !string.IsNullOrWhiteSpace(user?.FullName) ? user.FullName : "Registered Traveler";

            var journey = journeys.FirstOrDefault(j => j.Id.GetHashCode() == b.PackageId || j.Id.ToString() == b.PackageId?.ToString());
            var packageTitle = journey?.Title ?? "Bespoke Expedition";

            var vSlot = b.VehicleSlotId.HasValue ? vSlots.FirstOrDefault(s => s.Id == b.VehicleSlotId.Value) : null;
            var vehicleModel = vSlot?.VehicleCatalog?.VehicleModel ?? "Luxury VIP Fleet Vehicle";

            var gSlot = b.GuideSlotId.HasValue ? gSlots.FirstOrDefault(s => s.Id == b.GuideSlotId.Value) : null;
            var guideName = gSlot?.GuideProfile?.FullName ?? "SLTDA Certified Guide";

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
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT,LOCAL_GUIDE")]
    public async Task<IActionResult> GetGuideSlots(CancellationToken cancellationToken)
    {
        var slots = await db.GuideAvailabilities
            .AsNoTracking()
            .Include(g => g.LocalGuideUser)
            .Include(g => g.GuideProfile)
            .OrderBy(g => g.StartTimeUtc)
            .Select(g => new
            {
                id = g.Id,
                localGuideUserId = g.LocalGuideUserId,
                guideName = g.GuideProfile != null && !string.IsNullOrWhiteSpace(g.GuideProfile.FullName) && !g.GuideProfile.FullName.Contains("@")
                    ? g.GuideProfile.FullName
                    : (g.LocalGuideUser != null && !string.IsNullOrWhiteSpace(g.LocalGuideUser.FullName) && !g.LocalGuideUser.FullName.Contains("@")
                        ? g.LocalGuideUser.FullName
                        : "Kavinda Fernando"),
                licenseNumber = g.GuideProfile != null ? g.GuideProfile.LicenseNumber : "N/A",
                guideEmail = g.LocalGuideUser != null ? g.LocalGuideUser.Email : "",
                startTimeUtc = g.StartTimeUtc,
                endTimeUtc = g.EndTimeUtc,
                slotType = g.SlotType.ToString(),
                status = g.Status.ToString(),
                maxCapacity = g.MaxCapacity,
                bookedCapacity = g.BookedCapacity,
                priceAmount = g.PriceAmount,
                currency = g.Currency,
                notes = g.Notes,
                rowVersion = g.RowVersion
            })
            .ToListAsync(cancellationToken);

        return Ok(slots);
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
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> UpdateGuideSlot(
        Guid id,
        [FromBody] UpdateGuideSlotRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot == null)
        {
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

        slot.StartTimeUtc = request.StartTimeUtc;
        slot.EndTimeUtc = request.EndTimeUtc;
        if (Enum.TryParse<SlotType>(request.SlotType, true, out var parsedType))
        {
            slot.SlotType = parsedType;
        }
        if (Enum.TryParse<AvailabilityStatus>(request.Status, true, out var parsedStatus))
        {
            slot.Status = parsedStatus;
        }
        slot.PriceAmount = request.PriceAmount;
        slot.MaxCapacity = request.MaxCapacity;
        slot.Notes = request.Notes?.Trim();
        slot.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Updated guide slot {SlotId}", slot.Id);

        return Ok(slot);
    }

    [HttpPatch("guides/slots/{id}/status")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> UpdateGuideSlotStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot == null)
        {
            return NotFound(new { message = "Guide availability slot not found." });
        }

        if (slot.Status == AvailabilityStatus.BOOKED)
        {
            return BadRequest(new { message = "Cannot change the status of an active booked slot." });
        }

        if (Enum.TryParse<AvailabilityStatus>(request.Status, true, out var parsedStatus))
        {
            slot.Status = parsedStatus;
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Patched guide slot {SlotId} status to {Status}", slot.Id, parsedStatus);
            return Ok(new { id = slot.Id, status = slot.Status.ToString() });
        }

        return BadRequest(new { message = "Invalid status value provided." });
    }

    [HttpDelete("guides/slots/{id}")]
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
                return BadRequest(new { message = "Cannot delete an active booked slot. Please block it instead." });
            }

            db.GuideAvailabilitySlots.Remove(legacySlot);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Deleted guide slot {SlotId}", id);

            return Ok(new { message = "Guide slot deleted successfully." });
        }

        return NotFound(new { message = $"Guide availability slot with ID '{id}' was not found." });
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
                (b.VehicleSlotId.HasValue && (b.VehicleSlotId.Value == v.Id || v.TransportSlots.Any(ts => ts.Id == b.VehicleSlotId.Value)))
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
                status = linkedBooking.Status == "CONFIRMED" ? "BOOKED" : "RESERVED";
                charterStartDate = linkedBooking.StartDate ?? linkedBooking.BookedAt.ToString("yyyy-MM-dd");
                tripDurationDays = linkedBooking.TripDurationDays ?? 1;

                if (DateTime.TryParse(charterStartDate, out var pStart))
                {
                    charterEndDate = pStart.AddDays(tripDurationDays.Value).ToString("yyyy-MM-dd");
                }

                bookingReference = linkedBooking.BookingReference;
                passengerCount = v.MaxPassengers;

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
            return NotFound(new { message = "Transport slot not found." });
        }

        slot.StartTimeUtc = request.StartTimeUtc;
        slot.EndTimeUtc = request.EndTimeUtc;
        if (Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt))
        {
            slot.VehicleType = vt;
        }
        if (Enum.TryParse<SlotStatus>(request.Status, true, out var st))
        {
            slot.Status = st;
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
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> UpdateTransportSlotStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (slot == null)
        {
            return NotFound(new { message = "Transport slot not found." });
        }

        if (Enum.TryParse<SlotStatus>(request.Status, true, out var parsedStatus))
        {
            slot.Status = parsedStatus;
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { id = slot.Id, status = slot.Status.ToString() });
        }

        return BadRequest(new { message = "Invalid status value provided." });
    }

    [HttpDelete("transport/slots/{id}")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> DeleteTransportSlot(Guid id, CancellationToken cancellationToken)
    {
        var slot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (slot == null)
        {
            return NotFound(new { message = "Transport slot not found." });
        }

        if (slot.Status == SlotStatus.BOOKED)
        {
            return BadRequest(new { message = "Cannot delete an active booked transport slot. Please block it instead." });
        }

        db.TransportSlots.Remove(slot);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Transport slot deleted successfully." });
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
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    string SlotType,
    decimal PriceAmount,
    int MaxCapacity,
    string? Notes,
    string Status,
    string Currency = "LKR"
);

public record UpdateStatusRequest(string Status);

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

