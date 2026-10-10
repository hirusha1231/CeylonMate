using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/capacity/guides")]
[Route("api/guides")]
public class CapacityGuidesController(CeylonMateDbContext db, ILogger<CapacityGuidesController> logger) : ControllerBase
{
    // ==========================================
    // 3. READ (All / Filtered Guides)
    // ==========================================
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetGuides(
        [FromQuery] string? date,
        [FromQuery] string? status,
        [FromQuery] string? language,
        CancellationToken cancellationToken)
    {
        var query = db.GuideProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Availabilities)
            .Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(language) && !string.Equals(language.Trim(), "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var langLower = language.Trim().ToLower();
            query = query.Where(p => p.LanguagesSpoken != null && p.LanguagesSpoken.ToLower().Contains(langLower));
        }

        var profiles = await query.ToListAsync(cancellationToken);

        var list = profiles.Select(p =>
        {
            var activeSlots = p.Availabilities.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status))
            {
                activeSlots = activeSlots.Where(s => string.Equals(s.Status.ToString(), status, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var parsedDate))
            {
                activeSlots = activeSlots.Where(s => s.StartTimeUtc.Date <= parsedDate.Date && s.EndTimeUtc.Date >= parsedDate.Date);
            }

            var matchingSlot = activeSlots.FirstOrDefault();
            var fName = !string.IsNullOrWhiteSpace(p.FullName) ? p.FullName : p.User?.FullName ?? "SLTDA Certified Guide";
            var pUrl = !string.IsNullOrWhiteSpace(p.PhotoUrl) ? p.PhotoUrl : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400";
            var lType = !string.IsNullOrWhiteSpace(p.LicenseType) ? p.LicenseType : "National Tourist Guide Lecturer";
            var langs = !string.IsNullOrWhiteSpace(p.LanguagesSpoken) ? p.LanguagesSpoken : "English, German, Sinhala";
            var dlClass = p.DrivingLicenseClass ?? (p.IsChauffeur ? "Class B (VIP Van)" : "N/A");

            return new
            {
                id = p.Id,
                userId = p.UserId,
                fullName = fName,
                name = fName,
                email = p.User?.Email ?? "",
                photoUrl = pUrl,
                imageUrl = pUrl,
                avatarUrl = pUrl,
                bio = p.Bio ?? "Certified SLTDA Tourist Chauffeur Escort",
                licenseNumber = p.LicenseNumber ?? $"SLTDA/CG/2026/{(Math.Abs(p.Id.GetHashCode()) % 9000) + 1000:D4}",
                licenseType = lType,
                guideType = lType,
                languagesSpoken = langs,
                languages = langs,
                specialties = p.Specialties ?? "Cultural Heritage & Ancient Kingdoms",
                isChauffeur = p.IsChauffeur,
                drivingLicenseClass = dlClass,
                chauffeurLicenseClass = dlClass,
                rating = p.Rating > 0 ? p.Rating : 5.0m,
                reviewCount = p.ReviewCount > 0 ? p.ReviewCount : 12,
                defaultDailyRateLkr = p.DefaultDailyRateLkr > 0 ? p.DefaultDailyRateLkr : 18000m,
                dailyRate = p.DailyRate > 0 ? p.DailyRate : p.DefaultDailyRateLkr,
                currency = string.IsNullOrWhiteSpace(p.Currency) ? "LKR" : p.Currency,
                isActive = p.IsActive,
                availableSlot = matchingSlot != null ? new
                {
                    slotId = matchingSlot.Id,
                    date = matchingSlot.StartTimeUtc.ToString("yyyy-MM-dd"),
                    status = matchingSlot.Status.ToString(),
                    priceAmount = matchingSlot.PriceAmount
                } : null,
                totalSlotsCount = p.Availabilities.Count
            };
        }).ToList();

        return Ok(list);
    }

    // Single Guide Detail
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGuideById(Guid id, CancellationToken cancellationToken)
    {
        var profile = await db.GuideProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Availabilities)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive, cancellationToken);

        if (profile == null)
            return NotFound(new { message = $"Guide profile with ID {id} was not found." });

        var pUrl = !string.IsNullOrWhiteSpace(profile.PhotoUrl) ? profile.PhotoUrl : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400";

        return Ok(new
        {
            id = profile.Id,
            userId = profile.UserId,
            fullName = !string.IsNullOrWhiteSpace(profile.FullName) ? profile.FullName : profile.User?.FullName ?? "SLTDA Certified Guide",
            email = profile.User?.Email ?? "",
            photoUrl = pUrl,
            imageUrl = pUrl,
            bio = profile.Bio ?? "",
            licenseNumber = profile.LicenseNumber ?? "SLTDA/CG/2026/0491",
            licenseType = profile.LicenseType ?? "National Tourist Guide Lecturer",
            languagesSpoken = profile.LanguagesSpoken ?? "English, Sinhala",
            specialties = profile.Specialties ?? "Cultural Heritage & Ancient Kingdoms",
            isChauffeur = profile.IsChauffeur,
            drivingLicenseClass = profile.DrivingLicenseClass,
            rating = profile.Rating > 0 ? profile.Rating : 5.0m,
            reviewCount = profile.ReviewCount > 0 ? profile.ReviewCount : 12,
            defaultDailyRateLkr = profile.DefaultDailyRateLkr,
            currency = profile.Currency,
            isActive = profile.IsActive,
            slots = profile.Availabilities.Select(s => new
            {
                slotId = s.Id,
                date = s.StartTimeUtc.ToString("yyyy-MM-dd"),
                status = s.Status.ToString(),
                priceAmount = s.PriceAmount
            }).ToList()
        });
    }

    // ==========================================
    // 1. CREATE (Guide Profile)
    // ==========================================
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    [HttpPost]
    public async Task<IActionResult> CreateGuide([FromBody] CreateGuideProfileRequest request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty)
            return BadRequest(new { message = "UserId is required to link a local guide profile." });

        var existing = await db.GuideProfiles.FirstOrDefaultAsync(p => p.UserId == request.UserId, cancellationToken);
        if (existing != null)
        {
            if (!existing.IsActive)
            {
                existing.IsActive = true;
                if (!string.IsNullOrWhiteSpace(request.FullName)) existing.FullName = request.FullName;
                await db.SaveChangesAsync(cancellationToken);
                return Ok(existing);
            }
            return BadRequest(new { message = "A guide profile for this user already exists." });
        }

        var profile = new GuideProfile
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            FullName = request.FullName?.Trim() ?? "SLTDA Certified Local Guide",
            PhotoUrl = !string.IsNullOrWhiteSpace(request.PhotoUrl) ? request.PhotoUrl.Trim() : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
            Bio = request.Bio?.Trim() ?? "Experienced Ceylon Chauffeur Guide",
            LicenseNumber = request.LicenseNumber?.Trim() ?? "SLTDA/CG/2026/0001",
            LicenseType = request.LicenseType?.Trim() ?? "National Tourist Guide Lecturer",
            LanguagesSpoken = request.LanguagesSpoken?.Trim() ?? "English, Sinhala",
            Specialties = request.Specialties?.Trim() ?? "Cultural Heritage & Ancient Kingdoms",
            IsChauffeur = request.IsChauffeur,
            DrivingLicenseClass = request.DrivingLicenseClass?.Trim(),
            DefaultDailyRateLkr = request.DefaultDailyRateLkr > 0 ? request.DefaultDailyRateLkr : 18000m,
            DailyRate = request.DefaultDailyRateLkr > 0 ? request.DefaultDailyRateLkr : 18000m,
            Currency = "LKR",
            Rating = 5.0m,
            ReviewCount = 0,
            IsActive = true,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.GuideProfiles.Add(profile);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Capacity Desk created new guide profile ID {ProfileId} for User {UserId}", profile.Id, profile.UserId);
        return CreatedAtAction(nameof(GetGuideById), new { id = profile.Id }, profile);
    }

    // ==========================================
    // 2. CREATE (Availability Slot)
    // ==========================================
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    [HttpPost("{id:guid}/slots")]
    public async Task<IActionResult> CreateAvailabilitySlot(Guid id, [FromBody] CreateSlotRequest request, CancellationToken cancellationToken)
    {
        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id && p.IsActive, cancellationToken);
        if (profile == null)
            return NotFound(new { message = $"Guide profile with ID {id} was not found." });

        var slotDate = request.Date != default ? request.Date.Date : DateTime.UtcNow.Date.AddDays(1);

        var slot = new GuideAvailabilitySlot
        {
            Id = Guid.NewGuid(),
            GuideProfileId = profile.Id,
            Date = DateTime.SpecifyKind(slotDate, DateTimeKind.Utc),
            TimeWindow = !string.IsNullOrWhiteSpace(request.TimeWindow) ? request.TimeWindow : "FULL_DAY",
            Status = !string.IsNullOrWhiteSpace(request.Status) ? request.Status.ToUpper() : "AVAILABLE",
            DailyRateLkr = request.DailyRateLkr > 0 ? request.DailyRateLkr : profile.DefaultDailyRateLkr,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.GuideAvailabilitySlots.Add(slot);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Created availability slot {SlotId} for Guide Profile {GuideId} on {Date}", slot.Id, profile.Id, slot.Date);
        return Ok(slot);
    }

    // ==========================================
    // 4. UPDATE (Guide Profile & Rates)
    // ==========================================
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateGuideProfile(Guid id, [FromBody] UpdateGuideProfileRequest request, CancellationToken cancellationToken)
    {
        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (profile == null)
            return NotFound(new { message = $"Guide profile with ID {id} was not found." });

        if (!string.IsNullOrWhiteSpace(request.FullName)) profile.FullName = request.FullName.Trim();
        if (request.Bio != null) profile.Bio = request.Bio.Trim();
        if (request.PhotoUrl != null) profile.PhotoUrl = request.PhotoUrl.Trim();
        if (request.LicenseNumber != null) profile.LicenseNumber = request.LicenseNumber.Trim();
        if (request.LicenseType != null) profile.LicenseType = request.LicenseType.Trim();
        if (request.LanguagesSpoken != null) profile.LanguagesSpoken = request.LanguagesSpoken.Trim();
        if (request.Specialties != null) profile.Specialties = request.Specialties.Trim();
        if (request.IsChauffeur.HasValue) profile.IsChauffeur = request.IsChauffeur.Value;
        if (request.DrivingLicenseClass != null) profile.DrivingLicenseClass = request.DrivingLicenseClass.Trim();
        if (request.DefaultDailyRateLkr.HasValue && request.DefaultDailyRateLkr.Value > 0)
        {
            profile.DefaultDailyRateLkr = request.DefaultDailyRateLkr.Value;
            profile.DailyRate = request.DefaultDailyRateLkr.Value;
        }

        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(profile);
    }

    // ==========================================
    // 5. UPDATE / PATCH (Slot Status Block/Unblock)
    // ==========================================
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER,LOCAL_GUIDE")]
    [HttpPatch("slots/{slotId:guid}/toggle-block")]
    public async Task<IActionResult> ToggleSlotBlock(Guid slotId, CancellationToken cancellationToken)
    {
        var gAvail = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == slotId, cancellationToken);
        if (gAvail != null)
        {
            if (gAvail.Status == AvailabilityStatus.BOOKED || gAvail.Status == AvailabilityStatus.RESERVED)
            {
                return BadRequest(new { message = "Cannot toggle status of a booked/reserved slot." });
            }

            gAvail.Status = gAvail.Status == AvailabilityStatus.BLOCKED ? AvailabilityStatus.AVAILABLE : AvailabilityStatus.BLOCKED;
            gAvail.UpdatedAtUtc = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { slotId = gAvail.Id, status = gAvail.Status.ToString(), message = $"Slot status updated to {gAvail.Status}." });
        }

        var slot = await db.GuideAvailabilitySlots.FirstOrDefaultAsync(s => s.Id == slotId, cancellationToken);
        if (slot != null)
        {
            if (slot.Status == "BOOKED" || slot.Status == "HELD")
            {
                return BadRequest(new { message = $"Cannot toggle status of a slot that is currently {slot.Status}." });
            }

            slot.Status = slot.Status == "BLOCKED" ? "AVAILABLE" : "BLOCKED";
            slot.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { slotId = slot.Id, status = slot.Status, message = $"Slot status updated to {slot.Status}." });
        }

        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == slotId, cancellationToken);
        if (profile != null)
        {
            var newSlot = new GuideAvailability
            {
                Id = Guid.NewGuid(),
                GuideProfileId = profile.Id,
                LocalGuideUserId = profile.UserId,
                StartTimeUtc = DateTimeOffset.UtcNow,
                EndTimeUtc = DateTimeOffset.UtcNow.AddMonths(1),
                SlotType = SlotType.FULL_DAY,
                Status = AvailabilityStatus.BLOCKED,
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
            return Ok(new { slotId = newSlot.Id, status = newSlot.Status.ToString(), message = $"Slot status updated to {newSlot.Status}." });
        }

        return NotFound(new { message = $"Slot with ID {slotId} was not found." });
    }

    // ==========================================
    // 6. DELETE (Slot)
    // ==========================================
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER,LOCAL_GUIDE")]
    [HttpDelete("slots/{slotId:guid}")]
    public async Task<IActionResult> DeleteSlot(Guid slotId, CancellationToken cancellationToken)
    {
        var gAvail = await db.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == slotId, cancellationToken);
        if (gAvail != null)
        {
            if (gAvail.Status == AvailabilityStatus.BOOKED || gAvail.Status == AvailabilityStatus.RESERVED || gAvail.BookedCapacity > 0)
            {
                return BadRequest(new { message = "Cannot delete an active booked slot. Please block it instead." });
            }

            db.GuideAvailabilities.Remove(gAvail);
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Availability slot successfully deleted." });
        }

        var slot = await db.GuideAvailabilitySlots.FirstOrDefaultAsync(s => s.Id == slotId, cancellationToken);
        if (slot != null)
        {
            if (slot.Status == "BOOKED" || slot.Status == "HELD")
            {
                return BadRequest(new { message = $"Cannot delete a slot that is currently in {slot.Status} state. Cancel the booking first." });
            }

            db.GuideAvailabilitySlots.Remove(slot);
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Availability slot successfully deleted." });
        }

        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == slotId, cancellationToken);
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

            return Ok(new { message = "Availability slot successfully deleted." });
        }

        return Ok(new { message = "Availability slot deleted or already inactive." });
    }

    // ==========================================
    // 7. DELETE / SOFT DELETE (Guide Profile)
    // ==========================================
    [Authorize(Roles = "ADMIN")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDeleteGuide(Guid id, CancellationToken cancellationToken)
    {
        var profile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (profile == null)
            return NotFound(new { message = $"Guide profile with ID {id} was not found." });

        profile.IsActive = false;
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Guide Profile {Id} soft-deleted by Admin.", id);

        return Ok(new { message = "Guide profile deactivated successfully (soft-deleted to preserve journey logs)." });
    }
}

public record CreateGuideProfileRequest(
    Guid UserId,
    string? FullName,
    string? PhotoUrl,
    string? Bio,
    string? LicenseNumber,
    string? LicenseType,
    string? LanguagesSpoken,
    string? Specialties,
    bool IsChauffeur,
    string? DrivingLicenseClass,
    decimal DefaultDailyRateLkr
);

public record CreateSlotRequest(
    DateTime Date,
    string? TimeWindow,
    string? Status,
    decimal DailyRateLkr
);

public record UpdateGuideProfileRequest(
    string? FullName,
    string? Bio,
    string? PhotoUrl,
    string? LicenseNumber,
    string? LicenseType,
    string? LanguagesSpoken,
    string? Specialties,
    bool? IsChauffeur,
    string? DrivingLicenseClass,
    decimal? DefaultDailyRateLkr
);
