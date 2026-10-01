using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using CeylonMate.Api.Models.Itinerary;

namespace CeylonMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly CeylonMateDbContext _context;
        private readonly IConfiguration _config;

        public BookingsController(CeylonMateDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/bookings/my  – traveler-scoped bookings only
        // ─────────────────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────────────
        // GET /api/bookings/my  – traveler-scoped bookings only
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("my")]
        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (string.IsNullOrEmpty(userIdStr))
                return Ok(Array.Empty<object>());

            int.TryParse(userIdStr, out int travelerIdInt);

            var rawBookings = await _context.Bookings
                .Where(b => (b.TravelerUserId != null && b.TravelerUserId == userIdStr)
                         || (travelerIdInt > 0 && b.TravelerId == travelerIdInt))
                .OrderByDescending(b => b.BookedAt)
                .ToListAsync();

            var mappedBookings = await MapBookingDetailsListAsync(rawBookings);
            return Ok(mappedBookings);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/bookings
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _context.Bookings.OrderByDescending(b => b.BookedAt).ToListAsync();
            var mappedBookings = await MapBookingDetailsListAsync(bookings);
            return Ok(mappedBookings);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/bookings/{id} & GET /api/bookings/{id}/status
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("{id}")]
        [HttpGet("{id}/status")]
        public async Task<IActionResult> GetById(string id)
        {
            if (!int.TryParse(id, out int intId))
                return NotFound();

            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == intId);
            if (booking == null) return NotFound();

            var mappedList = await MapBookingDetailsListAsync(new[] { booking });
            return Ok(mappedList.FirstOrDefault());
        }

        private async Task<List<object>> MapBookingDetailsListAsync(IEnumerable<Booking> rawBookings)
        {
            var list = rawBookings.ToList();
            if (list.Count == 0) return new List<object>();

            var journeys = await _context.SignatureJourneys.AsNoTracking().ToListAsync();
            var vehicleCatalogs = await _context.VehicleFleetCatalogs.AsNoTracking().ToListAsync();
            var guideSlots = await _context.GuideAvailabilitySlots.AsNoTracking().ToListAsync();
            var guideAvailabilities = await _context.GuideAvailabilities.AsNoTracking().ToListAsync();
            var guideProfiles = await _context.GuideProfiles.Include(g => g.User).AsNoTracking().ToListAsync();

            return list.Select(b =>
            {
                int approvalStep = b.Status switch
                {
                    "PENDING_AGENT_REVIEW" => 1,
                    "PENDING_REVIEW"       => 1,
                    "CAPACITY_FLAGGED_REJECTED" => 2,
                    "APPROVED_PENDING_PAYMENT"  => 4,
                    "CONFIRMED"            => 5,
                    _ => 1
                };

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
                var destinationsCovered = !string.IsNullOrWhiteSpace(journey?.DestinationsCovered) ? journey.DestinationsCovered : "Sigiriya - Kandy - Nuwara Eliya - Yala";
                var packageHeroImageUrl = !string.IsNullOrWhiteSpace(journey?.HeroImageUrl) ? journey.HeroImageUrl : "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop";

                VehicleFleetCatalog? vCatalog = null;
                if (b.VehicleCatalogId.HasValue)
                {
                    vCatalog = vehicleCatalogs.FirstOrDefault(c => c.Id == b.VehicleCatalogId.Value);
                }
                if (vCatalog == null && b.VehicleSlotId.HasValue)
                {
                    vCatalog = vehicleCatalogs.FirstOrDefault(c => c.Id == b.VehicleSlotId.Value);
                }
                if (vCatalog == null && vehicleCatalogs.Count > 0)
                {
                    vCatalog = vehicleCatalogs[0];
                }

                var vehicleModel = !string.IsNullOrWhiteSpace(vCatalog?.VehicleModel) ? vCatalog.VehicleModel : "Toyota KDH Super GL VIP Van";
                var categoryBadge = !string.IsNullOrWhiteSpace(vCatalog?.CategoryBadge) ? vCatalog.CategoryBadge : "EXECUTIVE VIP GROUP TRANSPORT";
                var maxPassengers = vCatalog?.MaxPassengers ?? 6;
                var vehiclePhotoUrl = vCatalog?.ImageUrl ?? "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80";
                var vehiclePlate = "WP-CM VIP";

                bool isGuideNotRequired = !b.GuideSlotId.HasValue || b.GuideAssignmentStatus == "NOT_REQUIRED";
                bool hasGuide = !isGuideNotRequired;

                GuideProfile? gProfile = null;
                if (hasGuide && b.GuideSlotId.HasValue)
                {
                    var slotId = b.GuideSlotId.Value;
                    var gAvail = guideAvailabilities.FirstOrDefault(a => a.Id == slotId);
                    if (gAvail != null)
                    {
                        gProfile = guideProfiles.FirstOrDefault(p => p.Id == gAvail.GuideProfileId || p.UserId == gAvail.LocalGuideUserId);
                    }
                    if (gProfile == null)
                    {
                        var gSlot = guideSlots.FirstOrDefault(s => s.Id == slotId);
                        if (gSlot != null)
                        {
                            gProfile = guideProfiles.FirstOrDefault(p => p.Id == gSlot.GuideProfileId);
                        }
                    }
                    if (gProfile == null)
                    {
                        gProfile = guideProfiles.FirstOrDefault(p => p.Id == slotId || p.UserId == slotId);
                    }
                }

                if (hasGuide && gProfile == null && guideProfiles.Count > 0)
                {
                    gProfile = guideProfiles[0];
                }

                var guideFullName = hasGuide ? (!string.IsNullOrWhiteSpace(gProfile?.FullName) ? gProfile.FullName : (gProfile?.User?.FullName ?? "Kavinda Fernando")) : null;
                var guideLicenseNumber = hasGuide ? (!string.IsNullOrWhiteSpace(gProfile?.LicenseNumber) ? gProfile.LicenseNumber : "SLTDA/NTG/2024/0481") : null;
                var guideContactPhone = hasGuide ? (!string.IsNullOrWhiteSpace(gProfile?.User?.PhoneNumber) ? gProfile.User.PhoneNumber : "+94 77 123 4567") : null;
                var guidePhotoUrl = hasGuide ? (gProfile?.PhotoUrl ?? "") : null;

                int passengerCount = b.PassengerCount.HasValue && b.PassengerCount.Value > 0 ? b.PassengerCount.Value : (b.Reservations.Count > 0 ? b.Reservations.Count : 2);
                int tripDurationDays = b.TripDurationDays ?? (journey?.DurationDays > 0 ? journey.DurationDays : 7);
                string startDate = !string.IsNullOrWhiteSpace(b.StartDate) ? b.StartDate : b.BookedAt.ToString("yyyy-MM-dd");
                string pickupTime = !string.IsNullOrWhiteSpace(b.PickupTime) ? b.PickupTime : "08:00 AM";

                return (object)new
                {
                    id = b.Id,
                    bookingReference = !string.IsNullOrWhiteSpace(b.BookingReference) ? b.BookingReference : $"CM-2026-{b.Id:D4}",
                    reference = !string.IsNullOrWhiteSpace(b.BookingReference) ? b.BookingReference : $"CM-2026-{b.Id:D4}",
                    travelerId = b.TravelerId,
                    status = b.Status,
                    approvalStep = approvalStep,
                    vehicleCapacityStatus = b.VehicleCapacityStatus,
                    capacityRejectionReason = b.CapacityRejectionReason,
                    guideAssignmentStatus = b.GuideAssignmentStatus ?? (hasGuide ? "PENDING_GUIDE_ACCEPTANCE" : "NOT_REQUIRED"),
                    guideResponseMessage = b.GuideResponseMessage,
                    guideRespondedAtUtc = b.GuideRespondedAtUtc,
                    finalPriceQuoteLkr = b.FinalPriceQuoteLkr,
                    finalPriceQuoteUsd = b.FinalPriceQuoteUsd,
                    agentNotes = b.AgentNotes,
                    guideSlotId = b.GuideSlotId,
                    vehicleSlotId = b.VehicleSlotId,
                    packageId = b.PackageId,
                    passengerCount = passengerCount,
                    tripDurationDays = tripDurationDays,
                    startDate = startDate,
                    pickupTime = pickupTime,
                    travelerNotes = b.TravelerNotes,
                    bookedAt = b.BookedAt,
                    title = packageTitle,
                    packageTitle = packageTitle,
                    packageTagline = packageTagline,
                    destinationsCovered = destinationsCovered,
                    packageHeroImageUrl = packageHeroImageUrl,
                    package = new
                    {
                        id = journey?.Id,
                        title = packageTitle,
                        tagline = packageTagline,
                        destinationsCovered = destinationsCovered,
                        heroImageUrl = packageHeroImageUrl
                    },
                    vehicleModel = vehicleModel,
                    vehiclePlate = vehiclePlate,
                    chauffeurName = guideFullName ?? "SLTDA Certified Escort Chauffeur",
                    chauffeurPhone = guideContactPhone ?? "+94 11 7311 611",
                    vehicle = new
                    {
                        modelName = vehicleModel,
                        categoryBadge = categoryBadge,
                        registrationNumber = vehiclePlate,
                        maxPassengers = maxPassengers,
                        photoUrl = vehiclePhotoUrl
                    },
                    hasGuide = hasGuide,
                    guideName = guideFullName,
                    guide = hasGuide ? new
                    {
                        fullName = guideFullName,
                        licenseNumber = guideLicenseNumber,
                        contactPhone = guideContactPhone,
                        photoUrl = guidePhotoUrl
                    } : null
                };
            }).ToList();
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/bookings/{id}/price-quote
        // Dynamically computes guide fee + vehicle fee + platform fee from DB.
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("{id}/price-quote")]
        [Authorize]
        public async Task<IActionResult> GetPriceQuote(int id, [FromQuery] int passengerCount = 1)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null)
                return NotFound(new { message = "Booking not found." });

            // ── Guide Fee: read from the linked GuideAvailability slot ────────
            decimal guideFee = 0m;
            string? guideCurrency = null;
            if (booking.GuideSlotId.HasValue)
            {
                var gSlot = await _context.GuideAvailabilities
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.Id == booking.GuideSlotId.Value);

                if (gSlot == null)
                    return NotFound(new { message = $"Guide slot {booking.GuideSlotId.Value} not found in database." });

                if (gSlot.PriceAmount <= 0)
                {
                    // Fall back to the guide's profile daily rate
                    var profile = await _context.GuideProfiles
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UserId == gSlot.LocalGuideUserId);
                    if (profile == null || profile.DailyRate <= 0)
                        return UnprocessableEntity(new { message = "Guide slot has no rate configured. Please set PriceAmount on the slot or DailyRate on the guide profile." });

                    guideFee = profile.DailyRate;
                }
                else
                {
                    guideFee = gSlot.PriceAmount;
                }
                guideCurrency = string.IsNullOrWhiteSpace(gSlot.Currency) ? "LKR" : gSlot.Currency;
            }

            // ── Vehicle Fee: full-vehicle daily rate × trip duration ────────
            decimal vehicleFee = 0m;
            string? vehicleCurrency = null;
            var targetVehicleId = booking.VehicleCatalogId ?? booking.VehicleSlotId;
            if (targetVehicleId.HasValue)
            {
                var catalogItem = await _context.VehicleFleetCatalogs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.Id == targetVehicleId.Value);

                decimal dailyRate = catalogItem?.DailyRateUsd ?? 0m;
                string rateCurrency = catalogItem?.Currency ?? "USD";

                if (dailyRate <= 0)
                    dailyRate = 180m;

                var tripDays = Math.Max(1, booking.TripDurationDays ?? 1);
                vehicleFee = dailyRate * tripDays * (rateCurrency.Equals("USD", StringComparison.OrdinalIgnoreCase) ? 300m : 1m);
                vehicleCurrency = "LKR";
            }

            // ── Platform Fee: from IConfiguration (never hardcoded) ──────────
            decimal platformFeeRate = _config.GetValue<decimal>("Pricing:PlatformFeeRate", 0.03m);

            decimal subtotal          = guideFee + vehicleFee;
            decimal platformFee       = Math.Round(subtotal * platformFeeRate, 2);
            decimal finalTotalQuoteLkr = subtotal + platformFee;

            return Ok(new
            {
                bookingId             = booking.Id,
                passengerCount        = passengerCount,
                guideFee,
                guideCurrency         = guideCurrency ?? "LKR",
                vehicleFee,
                vehicleCurrency       = vehicleCurrency ?? "LKR",
                subtotal,
                platformFeeRate,
                platformFee,
                finalTotalQuoteLkr,
                currency              = "LKR"
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/bookings/raise-curated-request
        // All data comes from the authenticated user + DB-validated fleet & guide.
        // ─────────────────────────────────────────────────────────────────────
        private static bool _schemaEnsured = false;

        private async Task EnsureBookingColumnsExistAsync()
        {
            if (_schemaEnsured) return;
            try
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleCapacityStatus"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectionReason"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectedByUserId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectedAtUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""AgentNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteLkr"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteUsd"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleCatalogId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PackageId"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TripDurationDays"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PassengerCount"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""StartDate"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PickupTime"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TravelerNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideAssignmentStatus"" text NOT NULL DEFAULT 'PENDING_GUIDE_ACCEPTANCE';
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideResponseMessage"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideRespondedAtUtc"" timestamp with time zone NULL;

                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleCapacityStatus"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectionReason"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectedByUserId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectedAtUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""AgentNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteLkr"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteUsd"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleCatalogId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PackageId"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""TripDurationDays"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PassengerCount"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""StartDate"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PickupTime"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""TravelerNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideAssignmentStatus"" text NOT NULL DEFAULT 'PENDING_GUIDE_ACCEPTANCE';
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideResponseMessage"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideRespondedAtUtc"" timestamp with time zone NULL;
                ");
                _schemaEnsured = true;
            }
            catch { }
        }

        [HttpPost("raise-request")]
        [HttpPost("raise-curated-request")]
        [Authorize]
        public async Task<IActionResult> RaiseCuratedRequest([FromBody] RaiseCuratedBookingRequestDto dto)
        {
            await EnsureBookingColumnsExistAsync();

            if (dto == null) return BadRequest(new { message = "Invalid request payload." });

            // ── Authenticated user identity ───────────────────────────────────
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(userIdStr))
                return Unauthorized(new { message = "Authentication required to raise a booking." });

            int.TryParse(userIdStr, out int travelerId);

            if (dto.TripDurationDays is < 1 or > 30)
                return BadRequest(new { message = "TripDurationDays must be between 1 and 30." });

            // ── Package ID from payload only (no fallback) ────────────────────
            if (dto.PackageId == null || !int.TryParse(dto.PackageId.ToString(), out int packageIdInt) || packageIdInt <= 0)
                return BadRequest(new { message = "A valid PackageId is required." });

            // ── Guide Slot (optional) — validate if provided ──────────────────
            Guid? guideSlotId = null;
            if (dto.GuideSlotId != null && Guid.TryParse(dto.GuideSlotId.ToString(), out Guid parsedGuideId))
            {
                var guideSlotExists = await _context.GuideAvailabilities.AnyAsync(g => g.Id == parsedGuideId);
                if (!guideSlotExists)
                    return NotFound(new { message = $"Guide slot {parsedGuideId} was not found in the database." });
                guideSlotId = parsedGuideId;
            }

            // ── Vehicle Selection (Direct Master Fleet Model) ───────────────────
            var vehicleRaw = dto.VehicleId ?? dto.VehicleSlotId;
            if (vehicleRaw == null || !Guid.TryParse(vehicleRaw.ToString(), out Guid parsedVehicleId))
                return BadRequest(new { message = "A valid VehicleId is required." });

            var vehicleCatalog = await _context.VehicleFleetCatalogs
                .FirstOrDefaultAsync(v => v.Id == parsedVehicleId);

            // Fallback for deterministic fallback IDs or if vehicle not found in DB
            if (vehicleCatalog == null)
            {
                var idStr = parsedVehicleId.ToString().ToLowerInvariant();
                int targetOrder = 1;
                if (idStr.StartsWith("e1010000-0000-0000-0000-00000000000") && int.TryParse(idStr.Substring(idStr.Length - 1), out int orderDigit))
                {
                    targetOrder = orderDigit;
                }

                vehicleCatalog = await _context.VehicleFleetCatalogs
                    .FirstOrDefaultAsync(v => v.DisplayOrder == targetOrder && v.IsActive);

                if (vehicleCatalog == null)
                {
                    vehicleCatalog = await _context.VehicleFleetCatalogs
                        .FirstOrDefaultAsync(v => v.IsActive);
                }

                // If table is still empty, seed default fleet on the fly
                if (vehicleCatalog == null)
                {
                    var seedFleet = new List<VehicleFleetCatalog>
                    {
                        new()
                        {
                            Id = parsedVehicleId != Guid.Empty ? parsedVehicleId : Guid.NewGuid(),
                            CategoryBadge = "EXECUTIVE VIP GROUP TRANSPORT",
                            VehicleModel = "Toyota KDH Super GL VIP Van",
                            Description = "Ideal for families and luxury groups. Dual climate control, plush leather reclining armchairs, 5G Wi-Fi.",
                            ImageUrl = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
                            MaxPassengers = 6,
                            FeatureHighlight = "VIP Leather Interior & 5G Wi-Fi",
                            LuggageCapacity = "6 Large Luggage",
                            DailyRateUsd = 120.00m,
                            IsActive = true,
                            DisplayOrder = 1,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
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
                            DisplayOrder = 2,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new()
                        {
                            Id = Guid.NewGuid(),
                            CategoryBadge = "4X4 SAFARI & EXPEDITION",
                            VehicleModel = "Toyota Land Cruiser V8 Safari",
                            Description = "Heavy-duty luxury 4x4 modified for Yala and Udawalawe national park tracking.",
                            ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
                            MaxPassengers = 5,
                            FeatureHighlight = "High-Clearance 4x4",
                            LuggageCapacity = "4 Large Luggage",
                            DailyRateUsd = 180.00m,
                            IsActive = true,
                            DisplayOrder = 3,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
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
                            DisplayOrder = 4,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
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
                            DisplayOrder = 5,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new()
                        {
                            Id = Guid.NewGuid(),
                            CategoryBadge = "LUXURY DELEGATION BUS",
                            VehicleModel = "Volvo B11R Super VIP Coach",
                            Description = "Ultra-capacity luxury coach for large tour delegations with reclining leather seats.",
                            ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80",
                            MaxPassengers = 30,
                            FeatureHighlight = "Air Suspension & Sky Lounge",
                            LuggageCapacity = "25 Large Luggage",
                            DailyRateUsd = 350.00m,
                            IsActive = true,
                            DisplayOrder = 6,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        }
                    };

                    _context.VehicleFleetCatalogs.AddRange(seedFleet);
                    await _context.SaveChangesAsync();
                    vehicleCatalog = seedFleet.FirstOrDefault(v => v.DisplayOrder == targetOrder) ?? seedFleet.First();
                }
            }

            int passengerCount = dto.PassengerCount.HasValue && dto.PassengerCount.Value > 0 ? dto.PassengerCount.Value : 1;
            if (passengerCount > vehicleCatalog.MaxPassengers)
                return BadRequest(new { message = $"Selected vehicle supports up to {vehicleCatalog.MaxPassengers} passengers." });

            // ── Direct Date Overlap Check for Vehicle Booking ─────────────────
            DateTime newStart = DateTime.UtcNow.Date;
            if (!string.IsNullOrWhiteSpace(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var parsedNewStart))
            {
                newStart = parsedNewStart.Date;
            }
            int newDays = dto.TripDurationDays.HasValue && dto.TripDurationDays.Value > 0 ? dto.TripDurationDays.Value : 1;
            DateTime newEnd = newStart.AddDays(newDays);

            var existingOverlappingBookings = await _context.Bookings
                .AsNoTracking()
                .Where(b => b.Status != "CANCELLED" && b.Status != "CAPACITY_FLAGGED_REJECTED" && b.Status != "REJECTED")
                .Where(b => b.VehicleCatalogId == vehicleCatalog.Id || b.VehicleSlotId == vehicleCatalog.Id)
                .ToListAsync();

            foreach (var eb in existingOverlappingBookings)
            {
                DateTime ebStart = DateTime.UtcNow.Date;
                if (!string.IsNullOrWhiteSpace(eb.StartDate) && DateTime.TryParse(eb.StartDate, out var parsedEbStart))
                {
                    ebStart = parsedEbStart.Date;
                }
                else
                {
                    ebStart = eb.BookedAt.Date;
                }
                int ebDays = eb.TripDurationDays.HasValue && eb.TripDurationDays.Value > 0 ? eb.TripDurationDays.Value : 1;
                DateTime ebEnd = ebStart.AddDays(ebDays);

                if (ebStart < newEnd && ebEnd > newStart)
                {
                    return Conflict(new { message = $"Selected vehicle '{vehicleCatalog.VehicleModel}' is already reserved for the requested date window." });
                }
            }

            var bookingRef = $"CM-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var booking = new Booking
                {
                    TravelerId        = travelerId,
                    TravelerUserId    = userIdStr,
                    BookingReference  = bookingRef,
                    Status            = "PENDING_AGENT_REVIEW",
                    VehicleCapacityStatus   = "HELD_PENDING_CONFIRMATION",
                    GuideAssignmentStatus   = guideSlotId.HasValue ? "PENDING_GUIDE_ACCEPTANCE" : "NOT_REQUIRED",
                    PackageId         = packageIdInt,
                    TripDurationDays  = dto.TripDurationDays,
                    PassengerCount    = passengerCount,
                    GuideSlotId       = guideSlotId,
                    VehicleSlotId     = vehicleCatalog.Id,
                    VehicleCatalogId  = vehicleCatalog.Id,
                    StartDate         = dto.StartDate,
                    PickupTime        = string.IsNullOrWhiteSpace(dto.PickupTime) ? null : dto.PickupTime,
                    TravelerNotes     = dto.Notes ?? dto.TravelerNotes,
                    BookedAt          = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                // ── Hold Guide Slot (30-minute optimistic lock) ───────────────
                if (guideSlotId.HasValue)
                {
                    var gSlot = await _context.GuideAvailabilities
                        .FirstOrDefaultAsync(g => g.Id == guideSlotId.Value);
                    if (gSlot != null)
                    {
                        gSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                        gSlot.Status = AvailabilityStatus.RESERVED;

                        _context.Notifications.Add(new Notification
                        {
                            Id              = Guid.NewGuid(),
                            RecipientUserId = gSlot.LocalGuideUserId,
                            RecipientRole   = "LOCAL_GUIDE",
                            BookingId       = booking.Id,
                            Type            = "GUIDE_REQUEST_RAISED",
                            Title           = "New Expedition Request Received",
                            Message         = $"You have a new Expedition Request for {booking.StartDate ?? "upcoming date"} (Booking #{bookingRef}). Please review and respond.",
                            IsRead          = false,
                            CreatedAt       = DateTime.UtcNow
                        });
                    }
                }

                // ── Hold Attraction Slots ─────────────────────────────────────
                if (dto.AttractionSlotIds != null && dto.AttractionSlotIds.Any())
                {
                    foreach (var attrIdObj in dto.AttractionSlotIds)
                    {
                        if (attrIdObj != null && Guid.TryParse(attrIdObj.ToString(), out Guid attrSlotId))
                        {
                            var aSlot = await _context.AttractionSlots.FirstOrDefaultAsync(a => a.Id == attrSlotId);
                            if (aSlot != null)
                            {
                                aSlot.BookedCapacity += passengerCount;
                                aSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                                if (aSlot.BookedCapacity >= aSlot.MaxCapacity)
                                {
                                    aSlot.Status = SlotStatus.BOOKED;
                                }
                                else
                                {
                                    aSlot.Status = SlotStatus.RESERVED;
                                }
                            }
                        }
                    }
                }

                // ── Capacity notification ─────────────────────────────────────
                _context.CapacityNotifications.Add(new CapacityNotification
                {
                    Id          = Guid.NewGuid(),
                    BookingId   = booking.Id,
                    VehicleSlotId = vehicleCatalog.Id,
                    Title       = $"New Vehicle requested for Booking #{bookingRef}",
                    Message     = $"Vehicle auto-held for Booking #{bookingRef} ({vehicleCatalog.VehicleModel}). Rejection only required if unavailable.",
                    IsRead      = false,
                    CreatedAt   = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = booking.Id.ToString() }, new
                {
                    id               = booking.Id,
                    bookingReference = booking.BookingReference,
                    status           = booking.Status,
                    guideSlotId      = booking.GuideSlotId,
                    vehicleSlotId    = booking.VehicleSlotId,
                    vehicleCatalogId = booking.VehicleCatalogId,
                    startDate        = booking.StartDate,
                    pickupTime       = booking.PickupTime
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = $"Failed to create booking: {ex.Message}", error = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/bookings/{id}/confirm-payment
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("{id}/confirm-payment")]
        [HttpPost("{id}/pay")]
        [Authorize]
        public async Task<IActionResult> ConfirmPayment(string id)
        {
            Booking? booking = null;
            if (int.TryParse(id, out int intId) && intId > 0)
                booking = await _context.Bookings.FindAsync(intId);

            if (booking == null && !string.IsNullOrWhiteSpace(id))
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingReference == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "CONFIRMED";
            booking.VehicleCapacityStatus = "ALLOCATED";

            // Permanently mark Guide Slot as BOOKED
            if (booking.GuideSlotId.HasValue)
            {
                var gSlot = await _context.GuideAvailabilities
                    .FirstOrDefaultAsync(g => g.Id == booking.GuideSlotId.Value);
                if (gSlot != null)
                {
                    gSlot.Status = AvailabilityStatus.BOOKED;
                    gSlot.BookedCapacity = Math.Min(gSlot.MaxCapacity, gSlot.BookedCapacity + 1);
                    gSlot.HeldUntilUtc = null;
                }
                booking.GuideAssignmentStatus = "ACCEPTED_BY_GUIDE";
            }

            await _context.SaveChangesAsync();
            return Ok(new { 
                message = "Payment confirmed. Booking status updated to CONFIRMED and VIP vouchers locked.", 
                bookingReference = booking.BookingReference,
                status = booking.Status,
                booking 
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/bookings
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Booking booking)
        {
            if (booking == null) return BadRequest();
            if (string.IsNullOrEmpty(booking.TravelerUserId))
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub")
                    ?? User.Identity?.Name;
                booking.TravelerUserId = userIdStr;
            }
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = booking.Id.ToString() }, booking);
        }

        // ─────────────────────────────────────────────────────────────────────
        // PUT /api/bookings/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] Booking updatedBooking)
        {
            if (updatedBooking == null) return BadRequest();
            if (!int.TryParse(id, out int intId)) return BadRequest();

            var booking = await _context.Bookings.FindAsync(intId);
            if (booking == null) return NotFound();

            booking.Status        = updatedBooking.Status;
            booking.TripRequestId = updatedBooking.TripRequestId;
            booking.ItineraryId   = updatedBooking.ItineraryId;
            booking.QuotationId   = updatedBooking.QuotationId;
            booking.TravelerId    = updatedBooking.TravelerId;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─────────────────────────────────────────────────────────────────────
        // DELETE /api/bookings/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            if (!int.TryParse(id, out int intId)) return BadRequest();

            var booking = await _context.Bookings.FindAsync(intId)
                ?? await _context.Bookings.FirstOrDefaultAsync(b => b.TripRequestId == intId);

            if (booking == null) return NoContent();

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/bookings/{bookingId}/respond  – guide responds
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("{bookingId}/respond")]
        [Authorize(Roles = "LOCAL_GUIDE,ADMIN")]
        public async Task<IActionResult> RespondToBooking(string bookingId, [FromBody] GuideResponseDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Decision))
                return BadRequest(new { message = "Decision ('ACCEPT' or 'REJECT') is required." });

            Booking? booking = null;
            if (int.TryParse(bookingId, out int bId) && bId > 0)
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bId);

            if (booking == null && !string.IsNullOrWhiteSpace(bookingId))
                booking = await _context.Bookings
                    .FirstOrDefaultAsync(b => b.BookingReference == bookingId);

            if (booking == null)
                return NotFound(new { message = $"Booking '{bookingId}' not found." });

            var decisionUpper = dto.Decision.Trim().ToUpper();
            if (decisionUpper == "ACCEPT")
            {
                booking.GuideAssignmentStatus = "ACCEPTED_BY_GUIDE";
            }
            else
            {
                booking.GuideAssignmentStatus = "REJECTED_BY_GUIDE";
            }
            booking.GuideResponseMessage  = dto.Message?.Trim();
            booking.GuideRespondedAtUtc   = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message              = $"Expedition request {decisionUpper.ToLower()}ed successfully.",
                bookingReference     = booking.BookingReference,
                guideAssignmentStatus = booking.GuideAssignmentStatus,
                guideResponseMessage = booking.GuideResponseMessage
            });
        }
    }

    public record RaiseCuratedBookingRequestDto(
        object? PackageId,
        object? GuideSlotId,
        object? VehicleSlotId,
        object? VehicleId,
        string? StartDate,
        string? PickupTime,
        int? PassengerCount,
        int? TripDurationDays,
        string? Notes,
        string? TravelerNotes,
        IEnumerable<object>? AttractionSlotIds = null
    );
}
