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
                    : (user?.Email?.Split('@')[0] ?? "SLTDA Certified Guide"),
                PhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
                Bio = "Senior SLTDA Chauffeur Guide (15+ years experience in Cultural Triangle & Highlands)",
                LicenseNumber = "SLTDA-CG-0491",
                LanguagesSpoken = "English, German, Sinhala",
                Specialties = "Cultural Heritage & Ancient Ruins",
                Rating = 4.9m,
                ReviewCount = 18,
                DefaultDailyRateLkr = 18000m,
                DailyRate = 18000m,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(profile);
            await db.SaveChangesAsync(cancellationToken);
        }

        var completedToursCount = await db.Bookings.CountAsync(b => b.Status == "CONFIRMED", cancellationToken);

        return Ok(new
        {
            id = profile.Id,
            userId = profile.UserId,
            fullName = !string.IsNullOrWhiteSpace(profile.FullName) ? profile.FullName : profile.User?.FullName ?? "SLTDA Certified Guide",
            email = profile.User?.Email ?? "",
            photoUrl = profile.PhotoUrl ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
            bio = profile.Bio ?? "",
            licenseNumber = profile.LicenseNumber ?? "SLTDA-CG-0491",
            languagesSpoken = profile.LanguagesSpoken ?? "English, Sinhala",
            specialties = profile.Specialties ?? "Cultural Heritage & Ancient Ruins",
            rating = profile.Rating > 0 ? profile.Rating : 4.9m,
            reviewCount = profile.ReviewCount > 0 ? profile.ReviewCount : 18,
            defaultDailyRateLkr = profile.DefaultDailyRateLkr > 0 ? profile.DefaultDailyRateLkr : 18000m,
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
                FullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : "SLTDA Certified Guide",
                PhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
                Bio = "Senior SLTDA Chauffeur Guide",
                LicenseNumber = "SLTDA-CG-0491",
                LanguagesSpoken = "English, German, Sinhala",
                Specialties = "Cultural Heritage & Ancient Ruins",
                Rating = 4.9m,
                ReviewCount = 18,
                DefaultDailyRateLkr = 18000m,
                DailyRate = 18000m,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(profile);
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName)) profile.FullName = dto.FullName.Trim();
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

        var completedToursCount = await db.Bookings.CountAsync(b => b.Status == "CONFIRMED", cancellationToken);

        logger.LogInformation("Guide {UserId} updated profile details.", userId);
        return Ok(new
        {
            id = profile.Id,
            userId = profile.UserId,
            fullName = !string.IsNullOrWhiteSpace(profile.FullName) ? profile.FullName : profile.User?.FullName ?? "SLTDA Certified Guide",
            email = profile.User?.Email ?? "",
            photoUrl = profile.PhotoUrl ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
            bio = profile.Bio ?? "",
            licenseNumber = profile.LicenseNumber ?? "SLTDA-CG-0491",
            licenseType = profile.LicenseType ?? "National Tourist Guide Lecturer",
            languagesSpoken = profile.LanguagesSpoken ?? "English, Sinhala",
            specialties = profile.Specialties ?? "Cultural Heritage & Ancient Ruins",
            isChauffeur = profile.IsChauffeur,
            drivingLicenseClass = profile.DrivingLicenseClass,
            rating = profile.Rating > 0 ? profile.Rating : 5.0m,
            reviewCount = profile.ReviewCount,
            defaultDailyRateLkr = profile.DefaultDailyRateLkr > 0 ? profile.DefaultDailyRateLkr : 18000m,
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

        var bookings = await db.Bookings
            .AsNoTracking()
            .Where(b => (guideProfileId != Guid.Empty && b.GuideSlotId.HasValue && guideSlotIds.Contains(b.GuideSlotId.Value))
                     || b.GuideAssignmentStatus == "PENDING_GUIDE_ACCEPTANCE"
                     || b.GuideAssignmentStatus == "ACCEPTED_BY_GUIDE"
                     || b.GuideAssignmentStatus == "REJECTED_BY_GUIDE")
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync(cancellationToken);

        var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var journeys = await db.SignatureJourneys.AsNoTracking().ToListAsync(cancellationToken);
        var vSlots = await db.TransportSlots.Include(s => s.VehicleCatalog).AsNoTracking().ToListAsync(cancellationToken);
        var gSlots = await db.GuideAvailabilitySlots.AsNoTracking().ToListAsync(cancellationToken);

        var tourDtos = bookings.Select(b => {
            var user = users.FirstOrDefault(u => u.Id.ToString() == b.TravelerId.ToString() || u.Id.GetHashCode() == b.TravelerId);
            var travelerName = !string.IsNullOrWhiteSpace(user?.FullName) ? user.FullName : "Registered Traveler";
            var travelerEmail = user?.Email ?? "traveler@ceylonmate.com";
            var travelerPhone = user?.PhoneNumber ?? "+94 77 123 4567";

            var journey = journeys.FirstOrDefault(j => j.Id.GetHashCode() == b.PackageId || j.Id.ToString() == b.PackageId?.ToString());
            var packageTitle = journey?.Title ?? "Bespoke Signature Expedition";
            var routeHighlights = !string.IsNullOrWhiteSpace(journey?.DestinationsCovered) ? journey.DestinationsCovered : "Colombo -> Sigiriya -> Kandy -> Nuwara Eliya -> Bentota";

            var vSlot = b.VehicleSlotId.HasValue ? vSlots.FirstOrDefault(s => s.Id == b.VehicleSlotId.Value) : null;
            var vehicleModel = vSlot?.VehicleCatalog?.VehicleModel ?? "Luxury VIP Chauffeur Escort Vehicle";
            var vehicleReg = vSlot?.VehicleCatalog?.CategoryBadge ?? "WP-CM VIP";
            var vehicleMaxPass = vSlot?.VehicleCatalog?.MaxPassengers > 0 ? vSlot.VehicleCatalog.MaxPassengers : 4;
            var vehiclePhoto = !string.IsNullOrWhiteSpace(vSlot?.VehicleCatalog?.ImageUrl) ? vSlot.VehicleCatalog.ImageUrl : "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400";

            var gSlot = b.GuideSlotId.HasValue ? gSlots.FirstOrDefault(s => s.Id == b.GuideSlotId.Value) : null;
            var dailyRate = gSlot?.DailyRateLkr > 0 ? gSlot.DailyRateLkr : (guideProfile?.DefaultDailyRateLkr > 0 ? guideProfile.DefaultDailyRateLkr : 18000m);

            return new
            {
                bookingId = b.Id,
                id = b.Id,
                bookingReference = !string.IsNullOrWhiteSpace(b.BookingReference) ? b.BookingReference : $"CM-2026-{b.Id:D4}",
                packageTitle = packageTitle,
                startDate = !string.IsNullOrWhiteSpace(b.StartDate) ? b.StartDate : b.BookedAt.ToString("yyyy-MM-dd"),
                pickupTime = !string.IsNullOrWhiteSpace(b.PickupTime) ? b.PickupTime : "06:30 AM",
                bookingStatus = b.Status,
                status = b.Status,
                guideAssignmentStatus = !string.IsNullOrWhiteSpace(b.GuideAssignmentStatus) ? b.GuideAssignmentStatus : "PENDING_GUIDE_ACCEPTANCE",
                guideResponseMessage = b.GuideResponseMessage,
                guideRespondedAtUtc = b.GuideRespondedAtUtc,
                passengerCount = 2,
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
                routeHighlights = routeHighlights,
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
                FullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : "SLTDA Certified Guide",
                PhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
                Bio = "Senior SLTDA Chauffeur Guide",
                LicenseNumber = "SLTDA-CG-0491",
                LanguagesSpoken = "English, German, Sinhala",
                Specialties = "Cultural Heritage & Ancient Ruins",
                Rating = 5.0m,
                ReviewCount = 0,
                DefaultDailyRateLkr = 18000m,
                DailyRate = 18000m,
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
        var guideName = !string.IsNullOrWhiteSpace(profile?.FullName) ? profile.FullName : "SLTDA Certified Guide";

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
