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
            .ToListAsync(cancellationToken);

        var response = slots.Select(g => new
        {
            id = g.Id,
            guideUserId = g.LocalGuideUserId,
            guideName = g.LocalGuideUser != null
                ? (string.IsNullOrWhiteSpace(g.LocalGuideUser.FullName) ? g.LocalGuideUser.Email : g.LocalGuideUser.FullName)
                : "Certified Chauffeur Guide",
            bio = g.GuideProfile?.Bio ?? "Certified SLTDA Licensed Chauffeur Guide with extensive knowledge of Sri Lankan cultural sites.",
            licenseNumber = g.GuideProfile?.LicenseNumber ?? "SLTDA-CG-0491",
            languages = g.GuideProfile?.LanguagesSpoken ?? "English, Sinhala, Tamil",
            priceAmount = g.PriceAmount > 0 ? g.PriceAmount : 15000,
            currency = string.IsNullOrWhiteSpace(g.Currency) ? "LKR" : g.Currency,
            status = g.Status.ToString(),
            notes = g.Notes ?? "Certified VIP Tour Escort"
        }).ToList();

        return Ok(response);
    }

    [HttpGet("available-vehicles-slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableVehicles([FromQuery] string? date, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var slots = await db.TransportSlots
            .AsNoTracking()
            .Include(t => t.VehicleCatalog)
            .Where(t => t.Status == SlotStatus.AVAILABLE || (t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value > DateTimeOffset.UtcNow))
            .ToListAsync(cancellationToken);

        var response = slots.Select(t => new
        {
            id = t.Id,
            vehicleCatalogId = t.VehicleCatalogId,
            vehicleModel = t.VehicleCatalog != null ? t.VehicleCatalog.VehicleModel : $"{t.VehicleType} VIP Escort",
            categoryBadge = t.VehicleCatalog?.CategoryBadge ?? "Luxury Fleet",
            imageUrl = t.VehicleCatalog?.ImageUrl ?? "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
            maxPassengers = t.VehicleCatalog?.MaxPassengers ?? t.TotalSeats,
            featureHighlight = t.VehicleCatalog?.FeatureHighlight ?? "Leather Interior, Air-Conditioned, High-Speed WiFi",
            dailyRateUsd = t.VehicleCatalog?.DailyRateUsd ?? (t.PricePerSeat > 0 ? t.PricePerSeat / 300m : 120m),
            pricePerSeatLkr = t.PricePerSeat,
            currency = string.IsNullOrWhiteSpace(t.Currency) ? "LKR" : t.Currency,
            status = t.Status.ToString()
        }).ToList();

        return Ok(response);
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
                vSlot.HeldSeats = Math.Max(0, vSlot.HeldSeats - 1);
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
            .OrderBy(g => g.StartTimeUtc)
            .Select(g => new
            {
                id = g.Id,
                localGuideUserId = g.LocalGuideUserId,
                guideName = g.LocalGuideUser != null
                    ? (string.IsNullOrWhiteSpace(g.LocalGuideUser.FullName) ? g.LocalGuideUser.Email : g.LocalGuideUser.FullName)
                    : "Certified Guide",
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
            Notes = request.Notes,
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
        slot.Notes = request.Notes;
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
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> DeleteGuideSlot(Guid id, CancellationToken cancellationToken)
    {
        var slot = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (slot == null)
        {
            return NotFound(new { message = "Guide availability slot not found." });
        }

        if (slot.Status == AvailabilityStatus.BOOKED)
        {
            return BadRequest(new { message = "Cannot delete an active booked slot. Please block it instead." });
        }

        db.GuideAvailabilities.Remove(slot);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted guide slot {SlotId}", id);

        return Ok(new { message = "Guide slot deleted successfully." });
    }

    // ==========================================
    // TRANSPORT SLOTS CRUD (PERSISTENT PG DB)
    // ==========================================

    [HttpGet("transport/slots")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN,TRAVEL_AGENT")]
    public async Task<IActionResult> GetTransportSlots(CancellationToken cancellationToken)
    {
        var slots = await db.TransportSlots
            .AsNoTracking()
            .Include(t => t.VehicleCatalog)
            .Include(t => t.TransportOption)
            .OrderBy(t => t.StartTimeUtc)
            .Select(t => new
            {
                id = t.Id,
                transportOptionId = t.TransportOptionId,
                vehicleCatalogId = t.VehicleCatalogId,
                vehicleCatalog = t.VehicleCatalog != null ? new
                {
                    id = t.VehicleCatalog.Id,
                    vehicleModel = t.VehicleCatalog.VehicleModel,
                    categoryBadge = t.VehicleCatalog.CategoryBadge,
                    imageUrl = t.VehicleCatalog.ImageUrl,
                    maxPassengers = t.VehicleCatalog.MaxPassengers,
                    featureHighlight = t.VehicleCatalog.FeatureHighlight,
                    dailyRateUsd = t.VehicleCatalog.DailyRateUsd,
                    currency = t.VehicleCatalog.Currency
                } : null,
                optionTitle = t.VehicleCatalog != null ? t.VehicleCatalog.VehicleModel : (t.TransportOption != null ? t.TransportOption.Title : $"{t.VehicleType} Express Route"),
                routeDescription = !string.IsNullOrWhiteSpace(t.RouteDescription) ? t.RouteDescription : (t.VehicleCatalog != null ? $"{t.VehicleCatalog.VehicleModel} Route" : $"{t.VehicleType} Express Route"),
                vehicleType = t.VehicleType.ToString(),
                startTimeUtc = t.StartTimeUtc,
                endTimeUtc = t.EndTimeUtc,
                departureTime = t.StartTimeUtc.UtcDateTime,
                arrivalTime = t.EndTimeUtc.UtcDateTime,
                status = t.Status.ToString(),
                totalSeats = t.TotalSeats,
                bookedSeats = t.BookedSeats,
                heldSeats = t.HeldSeats,
                availableSeats = Math.Max(0, t.TotalSeats - t.BookedSeats - t.HeldSeats),
                pricePerSeat = t.PricePerSeat,
                ratePerSeatLkr = t.PricePerSeat,
                currency = t.Currency,
                rowVersion = t.RowVersion
            })
            .ToListAsync(cancellationToken);

        return Ok(slots);
    }

    [HttpPost("transport/slots")]
    [Authorize(Roles = "CAPACITY_OFFICER,ADMIN")]
    public async Task<IActionResult> CreateTransportSlot(
        [FromBody] CreateTransportSlotRequest request,
        CancellationToken cancellationToken)
    {
        var optionId = request.TransportOptionId ?? Guid.Parse("00000000-0000-0000-0000-000000000001");
        var vehicleType = Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt) ? vt : VehicleType.VAN;

        VehicleFleetCatalog? catalogVehicle = null;
        int totalSeats = request.TotalSeats ?? 12;

        if (request.VehicleCatalogId.HasValue && request.VehicleCatalogId != Guid.Empty)
        {
            catalogVehicle = await db.VehicleFleetCatalogs.FindAsync(new object[] { request.VehicleCatalogId.Value }, cancellationToken);
            if (catalogVehicle != null)
            {
                totalSeats = catalogVehicle.MaxPassengers;
            }
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
            TotalSeats = totalSeats,
            BookedSeats = 0,
            HeldSeats = 0,
            PricePerSeat = request.PricePerSeat,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency,
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
        var slot = await db.TransportSlots.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
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
        slot.TotalSeats = request.TotalSeats;
        slot.AvailableSeats = request.AvailableSeats;
        slot.PricePerSeat = request.PricePerSeat;
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
    int? TotalSeats,
    decimal PricePerSeat,
    string Currency = "LKR"
);

public record UpdateTransportSlotRequest(
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    string VehicleType,
    int TotalSeats,
    int AvailableSeats,
    decimal PricePerSeat,
    string Status,
    string Currency = "LKR"
);

public record RejectVehicleRequestDto(string RejectionReason);
