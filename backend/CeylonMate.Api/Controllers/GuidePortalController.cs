using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CeylonMate.Api.Data;
using CeylonMate.Api.Destinations;
using CeylonMate.Api.Models;
using CeylonMate.Api.Models.Itinerary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/guide")]
[Authorize(Roles = "LOCAL_GUIDE,ADMIN")]
public class GuidePortalController(CeylonMateDbContext db, ILogger<GuidePortalController> logger) : ControllerBase
{
    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(claim, out var userId)) return userId;
        return Guid.Empty;
    }

    [HttpGet("me/profile")]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var profile = await db.GuideProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            profile = new GuideProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) 
                    ? user.FullName 
                    : (user?.Email ?? ""),
                PhotoUrl = null,
                Bio = null,
                LicenseNumber = null,
                LanguagesSpoken = null,
                Specialties = null,
                Rating = 0m,
                ReviewCount = 0,
                DefaultDailyRateLkr = 0m,
                DailyRate = 0m,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(profile);
            await db.SaveChangesAsync(cancellationToken);
        }

        var completedToursCount = await db.Bookings.CountAsync(
            b => (b.GuideSlotId == profile.Id || b.GuideSlotId == profile.UserId) && b.Status == "CONFIRMED",
            cancellationToken);

        return Ok(new
        {
            id = profile.Id,
            userId = profile.UserId,
            fullName = !string.IsNullOrWhiteSpace(profile.FullName) ? profile.FullName : (profile.User?.FullName ?? profile.User?.Email ?? ""),
            email = profile.User?.Email ?? "",
            photoUrl = profile.PhotoUrl ?? "",
            bio = profile.Bio ?? "",
            licenseNumber = profile.LicenseNumber ?? "",
            languagesSpoken = profile.LanguagesSpoken ?? "",
            specialties = profile.Specialties ?? "",
            rating = profile.Rating,
            reviewCount = profile.ReviewCount,
            defaultDailyRateLkr = profile.DefaultDailyRateLkr,
            currency = string.IsNullOrWhiteSpace(profile.Currency) ? "LKR" : profile.Currency,
            isActive = profile.IsActive,
            completedToursCount
        });
    }

    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateGuideProfileDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var profile = await db.GuideProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            profile = new GuideProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : (user?.Email ?? ""),
                PhotoUrl = null,
                Bio = null,
                LicenseNumber = null,
                LanguagesSpoken = null,
                Specialties = null,
                Rating = 0m,
                ReviewCount = 0,
                DefaultDailyRateLkr = 0m,
                DailyRate = 0m,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(profile);
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            var trimmedName = dto.FullName.Trim();
            profile.FullName = trimmedName;
            if (profile.User != null)
            {
                profile.User.FullName = trimmedName;
            }
        }
        if (dto.Bio != null) profile.Bio = dto.Bio.Trim();
        if (dto.LanguagesSpoken != null) profile.LanguagesSpoken = dto.LanguagesSpoken.Trim();
        if (dto.Specialties != null) profile.Specialties = dto.Specialties.Trim();
        if (dto.LicenseNumber != null) profile.LicenseNumber = dto.LicenseNumber.Trim();
        if (dto.LicenseType != null) profile.LicenseType = dto.LicenseType.Trim();
        if (dto.IsChauffeur.HasValue) profile.IsChauffeur = dto.IsChauffeur.Value;
        if (dto.DrivingLicenseClass != null) profile.DrivingLicenseClass = dto.DrivingLicenseClass.Trim();
        if (!string.IsNullOrWhiteSpace(dto.PhotoUrl)) profile.PhotoUrl = dto.PhotoUrl.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Currency)) profile.Currency = dto.Currency.Trim();
        if (dto.DefaultDailyRateLkr.HasValue && dto.DefaultDailyRateLkr.Value > 0)
        {
            profile.DefaultDailyRateLkr = dto.DefaultDailyRateLkr.Value;
            profile.DailyRate = dto.DefaultDailyRateLkr.Value;
        }

        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var completedToursCount = await db.Bookings.CountAsync(
            b => (b.GuideSlotId == profile.Id || b.GuideSlotId == profile.UserId) && b.Status == "CONFIRMED",
            cancellationToken);

        logger.LogInformation("Guide {UserId} updated profile details.", userId);
        return Ok(new
        {
            id = profile.Id,
            userId = profile.UserId,
            fullName = !string.IsNullOrWhiteSpace(profile.FullName) ? profile.FullName : (profile.User?.FullName ?? profile.User?.Email ?? ""),
            email = profile.User?.Email ?? "",
            photoUrl = profile.PhotoUrl ?? "",
            bio = profile.Bio ?? "",
            licenseNumber = profile.LicenseNumber ?? "",
            licenseType = profile.LicenseType ?? "",
            languagesSpoken = profile.LanguagesSpoken ?? "",
            specialties = profile.Specialties ?? "",
            isChauffeur = profile.IsChauffeur,
            drivingLicenseClass = profile.DrivingLicenseClass,
            rating = profile.Rating,
            reviewCount = profile.ReviewCount,
            defaultDailyRateLkr = profile.DefaultDailyRateLkr,
            currency = string.IsNullOrWhiteSpace(profile.Currency) ? "LKR" : profile.Currency,
            isActive = profile.IsActive,
            completedToursCount
        });
    }

    [HttpGet("assigned-tours")]
    [HttpGet("my-requests")]
    [HttpGet("me/tours")]
    public async Task<IActionResult> GetAssignedTours(CancellationToken cancellationToken)
    {
        var currentUserId = GetUserId();
        var guideProfile = await db.GuideProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.UserId == currentUserId, cancellationToken);

        Guid guideProfileId = guideProfile?.Id ?? Guid.Empty;

        var guideSlotIds = guideProfileId != Guid.Empty
            ? await db.GuideAvailabilitySlots
                .AsNoTracking()
                .Where(s => s.GuideProfileId == guideProfileId)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken)
            : new List<Guid>();

        var guideAvailabilityIds = (guideProfileId != Guid.Empty || currentUserId != Guid.Empty)
            ? await db.GuideAvailabilities
                .AsNoTracking()
                .Where(g => g.LocalGuideUserId == currentUserId || (guideProfileId != Guid.Empty && g.GuideProfileId == guideProfileId))
                .Select(g => g.Id)
                .ToListAsync(cancellationToken)
            : new List<Guid>();

        var bookings = await db.Bookings
            .AsNoTracking()
            .Where(b => b.GuideSlotId.HasValue && (
                b.GuideSlotId.Value == guideProfileId ||
                b.GuideSlotId.Value == currentUserId ||
                guideSlotIds.Contains(b.GuideSlotId.Value) ||
                guideAvailabilityIds.Contains(b.GuideSlotId.Value)
            ))
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var journeys = await db.SignatureJourneys.AsNoTracking().ToListAsync(cancellationToken);
        var vSlots = await db.TransportSlots.Include(s => s.VehicleCatalog).AsNoTracking().ToListAsync(cancellationToken);
        var gSlots = await db.GuideAvailabilitySlots.AsNoTracking().ToListAsync(cancellationToken);

        var tourDtos = bookings.Select(b => {
            var user = users.FirstOrDefault(u =>
                (!string.IsNullOrWhiteSpace(b.TravelerUserId) && u.Id.ToString().Equals(b.TravelerUserId, StringComparison.OrdinalIgnoreCase)) ||
                u.Id.ToString() == b.TravelerId.ToString() ||
                u.Id.GetHashCode() == b.TravelerId
            );

            var travelerName = !string.IsNullOrWhiteSpace(user?.FullName) ? user.FullName : (!string.IsNullOrWhiteSpace(user?.Email) ? user.Email : "Registered Traveler");
            var travelerEmail = !string.IsNullOrWhiteSpace(user?.Email) ? user.Email : (b.TravelerUserId != null ? $"{b.TravelerUserId}@ceylonmate.com" : "traveler@ceylonmate.com");
            var travelerPhone = !string.IsNullOrWhiteSpace(user?.PhoneNumber) ? user.PhoneNumber : "+94 77 123 4567";

            SignatureJourney? journey = null;
            if (b.PackageId.HasValue)
            {
                journey = journeys.FirstOrDefault(j => j.Id.ToString().Equals(b.PackageId.Value.ToString(), StringComparison.OrdinalIgnoreCase) || j.Id.GetHashCode() == b.PackageId.Value);
                if (journey == null)
                {
                    int pId = b.PackageId.Value;
                    int idx = pId >= 101 ? pId - 101 : pId - 1;
                    if (idx >= 0 && idx < journeys.Count)
                    {
                        journey = journeys[idx];
                    }
                }
            }
            if (journey == null && journeys.Count > 0)
            {
                journey = journeys[0];
            }

            var packageTitle = !string.IsNullOrWhiteSpace(journey?.Title) ? journey.Title : "Curated Signature Expedition";
            var packageTagline = !string.IsNullOrWhiteSpace(journey?.Tagline) ? journey.Tagline : "Bespoke Luxury Sri Lankan Expedition";
            var packageDescription = !string.IsNullOrWhiteSpace(journey?.Description) ? journey.Description : "Handcrafted luxury itinerary with private chauffeur transport and handpicked heritage accommodations.";
            var packageHeroImageUrl = !string.IsNullOrWhiteSpace(journey?.HeroImageUrl) ? journey.HeroImageUrl : "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop";
            var durationDays = journey?.DurationDays > 0 ? journey.DurationDays : (b.TripDurationDays ?? 7);
            var durationNights = journey?.DurationNights > 0 ? journey.DurationNights : Math.Max(1, durationDays - 1);
            var destinationsCovered = !string.IsNullOrWhiteSpace(journey?.DestinationsCovered) ? journey.DestinationsCovered : "Colombo - Kandy - Nuwara Eliya - Yala";
            var highlights = (journey?.Highlights != null && journey.Highlights.Count > 0) ? journey.Highlights : new List<string>
            {
                "Private 4x4 Wildlife & Nature Safaris",
                "VIP Access to Cultural Relic Monuments",
                "Highland Tea Tasting Masterclass with Senior Ceylon Planter",
                "Dedicated Private Chauffeur & Escort Service"
            };

            var vSlot = b.VehicleSlotId.HasValue ? vSlots.FirstOrDefault(s => s.Id == b.VehicleSlotId.Value) : null;
            var vehicleModel = vSlot?.VehicleCatalog?.VehicleModel;
            if (string.IsNullOrWhiteSpace(vehicleModel) && b.VehicleCatalogId.HasValue)
            {
                var cat = db.VehicleFleetCatalogs.AsNoTracking().FirstOrDefault(c => c.Id == b.VehicleCatalogId.Value);
                if (cat != null) vehicleModel = cat.VehicleModel;
            }
            if (string.IsNullOrWhiteSpace(vehicleModel)) vehicleModel = "Executive VIP Fleet Escort";

            var vehicleReg = vSlot?.VehicleCatalog?.CategoryBadge ?? "EXECUTIVE VIP FLEET";
            var vehicleMaxPass = vSlot?.VehicleCatalog?.MaxPassengers ?? 6;
            var vehiclePhoto = vSlot?.VehicleCatalog?.ImageUrl ?? "";

            var gSlot = b.GuideSlotId.HasValue ? gSlots.FirstOrDefault(s => s.Id == b.GuideSlotId.Value) : null;
            var dailyRate = gSlot?.DailyRateLkr ?? (guideProfile?.DefaultDailyRateLkr ?? 18000m);

            int passengerCount = b.PassengerCount.HasValue && b.PassengerCount.Value > 0
                ? b.PassengerCount.Value
                : (b.Reservations.Count > 0 ? b.Reservations.Count : 2);

            return new
            {
                bookingId = b.Id,
                id = b.Id,
                bookingReference = !string.IsNullOrWhiteSpace(b.BookingReference) ? b.BookingReference : $"CM-2026-{b.Id:D4}",
                packageTitle = packageTitle,
                packageTagline = packageTagline,
                packageDescription = packageDescription,
                packageHeroImageUrl = packageHeroImageUrl,
                durationDays = durationDays,
                durationNights = durationNights,
                destinationsCovered = destinationsCovered,
                highlights = highlights,
                startDate = !string.IsNullOrWhiteSpace(b.StartDate) ? b.StartDate : b.BookedAt.ToString("yyyy-MM-dd"),
                pickupTime = !string.IsNullOrWhiteSpace(b.PickupTime) ? b.PickupTime : "07:00 AM",
                bookingStatus = b.Status,
                status = b.Status,
                guideAssignmentStatus = b.GuideAssignmentStatus ?? "PENDING_GUIDE_ACCEPTANCE",
                guideResponseMessage = b.GuideResponseMessage,
                guideRespondedAtUtc = b.GuideRespondedAtUtc,
                passengerCount = passengerCount,
                specialNotes = b.TravelerNotes,
                travelerNotes = b.TravelerNotes,
                travelerName = travelerName,
                travelerEmail = travelerEmail,
                travelerPhone = travelerPhone,
                traveler = new
                {
                    fullName = travelerName,
                    email = travelerEmail,
                    phoneNumber = travelerPhone
                },
                assignedVehicle = vehicleModel,
                routeHighlights = destinationsCovered,
                vehicle = new
                {
                    model = vehicleModel,
                    registrationNumber = vehicleReg,
                    maxPassengers = vehicleMaxPass,
                    photoUrl = vehiclePhoto
                },
                dailyRateLkr = dailyRate
            };
        }).ToList();

        return Ok(tourDtos);
    }

    [HttpPost("field-reports")]
    public async Task<IActionResult> CreateFieldReport([FromBody] CreateFieldReportDto dto, CancellationToken cancellationToken)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Location))
        {
            return BadRequest(new { message = "Location is required for field reports." });
        }

        var userId = GetUserId();
        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            profile = new GuideProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId != Guid.Empty ? userId : Guid.NewGuid(),
                FullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : (user?.Email ?? ""),
                PhotoUrl = null,
                Bio = null,
                LicenseNumber = null,
                LanguagesSpoken = null,
                Specialties = null,
                Rating = 0m,
                ReviewCount = 0,
                DefaultDailyRateLkr = 0m,
                DailyRate = 0m,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(profile);
            await db.SaveChangesAsync(cancellationToken);
        }

        var report = new GuideFieldReport
        {
            Id = Guid.NewGuid(),
            GuideProfileId = profile.Id,
            BookingId = dto.BookingId,
            Location = dto.Location.Trim(),
            WeatherStatus = string.IsNullOrWhiteSpace(dto.WeatherStatus) ? "CLEAR" : dto.WeatherStatus.ToUpper(),
            CrowdLevel = string.IsNullOrWhiteSpace(dto.CrowdLevel) ? "MODERATE" : dto.CrowdLevel.ToUpper(),
            ConditionNote = dto.ConditionNote?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        db.GuideFieldReports.Add(report);

        var firstDest = await db.Destinations.FirstOrDefaultAsync(cancellationToken);
        if (firstDest != null)
        {
            var destAdvisory = new DestinationAdvisory
            {
                Id = Guid.NewGuid(),
                DestinationId = firstDest.Id,
                Type = "WEATHER",
                Message = $"Guide Report ({report.Location}): Weather is {report.WeatherStatus}, Crowd is {report.CrowdLevel}. Note: {report.ConditionNote}",
                Severity = report.WeatherStatus == "HEAVY_RAIN" ? AdvisorySeverity.HIGH : AdvisorySeverity.LOW,
                Status = AdvisoryStatus.ACTIVE,
                StartsAtUtc = DateTimeOffset.UtcNow
            };
            db.DestinationAdvisories.Add(destAdvisory);
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("New Guide Field Report submitted for location {Location}", report.Location);

        return Ok(new
        {
            message = "Field condition report submitted and broadcasted to Travel Agent Intelligence Desk.",
            report
        });
    }

    [HttpGet("field-reports")]
    public async Task<IActionResult> GetFieldReports(CancellationToken cancellationToken)
    {
        var reports = await db.GuideFieldReports
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);

        return Ok(reports);
    }

    [HttpDelete("field-reports/{reportId}")]
    public async Task<IActionResult> DeleteFieldReport(string reportId, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(reportId, out var gId))
        {
            var report = await db.GuideFieldReports.FirstOrDefaultAsync(r => r.Id == gId, cancellationToken);
            if (report != null)
            {
                db.GuideFieldReports.Remove(report);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        logger.LogInformation("Deleted guide field report {ReportId}", reportId);
        return Ok(new { message = "Field condition report deleted successfully." });
    }

    [HttpPost("bookings/{bookingId}/respond")]
    public async Task<IActionResult> RespondToBooking(string bookingId, [FromBody] GuideResponseDto dto, CancellationToken cancellationToken)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Decision))
        {
            return BadRequest(new { message = "Decision ('ACCEPT' or 'REJECT') and message are required." });
        }

        int.TryParse(bookingId, out int bId);

        Booking? booking = null;
        if (bId > 0)
        {
            booking = await db.Bookings
                .FirstOrDefaultAsync(b => b.Id == bId, cancellationToken);
        }

        if (booking == null && !string.IsNullOrWhiteSpace(bookingId))
        {
            booking = await db.Bookings
                .FirstOrDefaultAsync(b => b.BookingReference == bookingId || b.BookingReference.Contains(bookingId), cancellationToken);
        }

        if (booking == null)
        {
            return NotFound(new { message = "Booking not found or not assigned to you." });
        }

        var userId = GetUserId();
        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        var guideName = !string.IsNullOrWhiteSpace(profile?.FullName) ? profile.FullName : (profile?.User?.FullName ?? profile?.User?.Email ?? "");

        var decisionUpper = dto.Decision.Trim().ToUpper();
        if (decisionUpper == "ACCEPT")
        {
            booking.GuideAssignmentStatus = "ACCEPTED_BY_GUIDE";
            booking.GuideResponseMessage = dto.Message?.Trim();
            booking.GuideRespondedAtUtc = DateTime.UtcNow;

            db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientUserId = Guid.Empty,
                RecipientRole = "TRAVELER",
                BookingId = booking.Id,
                Type = "GUIDE_ACCEPTED",
                Title = "Guide Confirmed Expedition",
                Message = $"Guide {guideName} accepted your tour request: \"{dto.Message}\"",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientUserId = Guid.Empty,
                RecipientRole = "TRAVEL_AGENT",
                BookingId = booking.Id,
                Type = "GUIDE_ACCEPTED",
                Title = "Guide Accepted Tour Request",
                Message = $"Guide {guideName} accepted Booking #{booking.BookingReference}. Ready for final quote.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (decisionUpper == "REJECT")
        {
            booking.GuideAssignmentStatus = "REJECTED_BY_GUIDE";
            booking.GuideResponseMessage = dto.Message?.Trim();
            booking.GuideRespondedAtUtc = DateTime.UtcNow;
            booking.Status = "CAPACITY_FLAGGED_REJECTED"; // Handed off to Travel Agent

            if (booking.GuideSlotId.HasValue)
            {
                var slot = await db.GuideAvailabilitySlots.FirstOrDefaultAsync(s => s.Id == booking.GuideSlotId.Value, cancellationToken);
                if (slot != null)
                {
                    slot.Status = "AVAILABLE";
                }
            }

            db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientUserId = Guid.Empty,
                RecipientRole = "TRAVELER",
                BookingId = booking.Id,
                Type = "GUIDE_REJECTED",
                Title = "Guide Schedule Update",
                Message = $"Guide {guideName} is unavailable: \"{dto.Message}\". Our travel concierge is finding a replacement.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientUserId = Guid.Empty,
                RecipientRole = "TRAVEL_AGENT",
                BookingId = booking.Id,
                Type = "GUIDE_REJECTED",
                Title = "Urgent: Guide Declined Booking",
                Message = $"Guide {guideName} declined Booking #{booking.BookingReference} (Reason: {dto.Message}). Please assign alternative guide.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            return BadRequest(new { message = "Decision must be ACCEPT or REJECT." });
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Guide {GuideName} responded to Booking #{BookingRef} with Decision {Decision}", guideName, booking.BookingReference, decisionUpper);

        return Ok(new
        {
            success = true,
            guideAssignmentStatus = booking.GuideAssignmentStatus,
            message = $"Booking {decisionUpper.ToLower()}ed successfully.",
            bookingReference = booking.BookingReference
        });
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetGuideNotifications(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var notifications = await db.Notifications
            .AsNoTracking()
            .Where(n => n.RecipientRole == "LOCAL_GUIDE" || n.RecipientUserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        return Ok(notifications);
    }
}

public record UpdateGuideProfileDto(
    string? FullName,
    string? Bio,
    string? LanguagesSpoken,
    string? Specialties,
    string? LicenseNumber,
    string? LicenseType,
    bool? IsChauffeur,
    string? DrivingLicenseClass,
    string? PhotoUrl,
    decimal? DefaultDailyRateLkr,
    string? Currency
);

public record CreateFieldReportDto(
    int? BookingId,
    string Location,
    string WeatherStatus,
    string CrowdLevel,
    string ConditionNote
);

public record GuideResponseDto(
    string Decision,
    string Message
);
