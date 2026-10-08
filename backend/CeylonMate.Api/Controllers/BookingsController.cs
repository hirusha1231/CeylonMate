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
using CeylonMate.Api.Trips;
using CeylonMate.Api.Auth;

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
        [HttpGet("my")]
        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("id")
                ?? User.Identity?.Name;

            if (string.IsNullOrEmpty(userIdStr))
                return Ok(Array.Empty<object>());

            int.TryParse(userIdStr, out int travelerIdInt);
            Guid.TryParse(userIdStr, out Guid userGuid);
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

            var allBookings = await _context.Bookings
                .OrderByDescending(b => b.BookedAt)
                .ToListAsync();

            var rawBookings = allBookings.Where(b =>
                (!string.IsNullOrEmpty(b.TravelerUserId) && (
                    string.Equals(b.TravelerUserId, userIdStr, StringComparison.OrdinalIgnoreCase) ||
                    (userGuid != Guid.Empty && Guid.TryParse(b.TravelerUserId, out var bGuid) && bGuid == userGuid) ||
                    (!string.IsNullOrEmpty(userEmail) && string.Equals(b.TravelerUserId, userEmail, StringComparison.OrdinalIgnoreCase))
                )) ||
                (travelerIdInt > 0 && b.TravelerId == travelerIdInt)
            ).ToList();

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
            var guideSlots = new List<GuideAvailabilitySlot>();
            var guideAvailabilities = await _context.GuideAvailabilities.AsNoTracking().ToListAsync();
            var guideProfiles = await _context.GuideProfiles.Include(g => g.User).AsNoTracking().ToListAsync();

            return list.Select(b =>
            {
                int approvalStep = b.Status switch
                {
                    "PENDING_AGENT_REVIEW" => 1,
                    "PENDING_CONCIERGE_REVIEW" => 1,
                    "PENDING_REVIEW"       => 1,
                    "CAPACITY_FLAGGED_REJECTED" => 2,
                    "APPROVED_PENDING_PAYMENT"  => 4,
                    "CONFIRMED"            => 5,
                    _ => 1
                };

                // 1. Extract bespoke fields if encoded in TravelerNotes
                string? customTitle = null;
                string? customDestinations = null;
                string? customVehicleModel = null;
                string? customGuideName = null;
                string? customPriceUsdStr = null;
                string? customPriceLkrStr = null;
                string? customTagline = null;
                string? customHeroImageUrl = null;

                if (!string.IsNullOrWhiteSpace(b.TravelerNotes))
                {
                    if (b.TravelerNotes.Contains("||"))
                    {
                        var parts = b.TravelerNotes.Split("||");
                        if (parts.Length > 0 && !string.IsNullOrWhiteSpace(parts[0])) customTitle = parts[0].Trim();
                        if (parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1])) customDestinations = parts[1].Trim();
                        if (parts.Length > 2 && !string.IsNullOrWhiteSpace(parts[2])) customVehicleModel = parts[2].Trim();
                        if (parts.Length > 3 && !string.IsNullOrWhiteSpace(parts[3])) customGuideName = parts[3].Trim();
                        if (parts.Length > 4 && !string.IsNullOrWhiteSpace(parts[4])) customPriceUsdStr = parts[4].Trim();
                        if (parts.Length > 5 && !string.IsNullOrWhiteSpace(parts[5])) customPriceLkrStr = parts[5].Trim();
                        if (parts.Length > 6 && !string.IsNullOrWhiteSpace(parts[6])) customTagline = parts[6].Trim();
                        if (parts.Length > 7 && !string.IsNullOrWhiteSpace(parts[7])) customHeroImageUrl = parts[7].Trim();
                    }
                    else if (b.TravelerNotes.Length < 80)
                    {
                        customTitle = b.TravelerNotes.Trim();
                    }
                }

                if (string.IsNullOrWhiteSpace(customVehicleModel) && !string.IsNullOrWhiteSpace(b.AgentNotes))
                {
                    var vMatch = System.Text.RegularExpressions.Regex.Match(b.AgentNotes, @"Vehicle:\s*([^.]+)\.");
                    if (vMatch.Success) customVehicleModel = vMatch.Groups[1].Value.Trim();
                }
                if (string.IsNullOrWhiteSpace(customGuideName) && !string.IsNullOrWhiteSpace(b.AgentNotes))
                {
                    var gMatch = System.Text.RegularExpressions.Regex.Match(b.AgentNotes, @"Guide:\s*([^.]+)\.");
                    if (gMatch.Success && !string.IsNullOrWhiteSpace(gMatch.Groups[1].Value))
                    {
                        customGuideName = gMatch.Groups[1].Value.Trim();
                    }
                }

                bool isBespoke = !b.PackageId.HasValue ||
                                 (b.BookingReference != null && (b.BookingReference.StartsWith("CM-BESPOKE") || b.BookingReference.Contains("BESPOKE"))) ||
                                 b.Status == "PENDING_CONCIERGE_REVIEW" ||
                                 (!string.IsNullOrWhiteSpace(b.TravelerNotes) && b.TravelerNotes.Contains("BESPOKE_JOURNEY"));

                bool isCurated = !isBespoke && b.PackageId.HasValue;

                SignatureJourney? journey = null;

                if (isCurated && b.PackageId.HasValue)
                {
                    journey = journeys.FirstOrDefault(j => Math.Abs(j.Id.GetHashCode()) == b.PackageId.Value || j.Id.ToString().Equals(b.PackageId.Value.ToString(), StringComparison.OrdinalIgnoreCase));
                    if (journey == null)
                    {
                        int pId = b.PackageId.Value;
                        int idx = pId >= 101 ? pId - 101 : pId - 1;
                        if (idx >= 0 && idx < journeys.Count)
                        {
                            journey = journeys[idx];
                        }
                    }
                    if (journey == null && !string.IsNullOrWhiteSpace(customTitle))
                    {
                        journey = journeys.FirstOrDefault(j => string.Equals(j.Title, customTitle, StringComparison.OrdinalIgnoreCase) || string.Equals(j.Slug, customTitle, StringComparison.OrdinalIgnoreCase));
                    }
                }

                var packageTitle = customTitle 
                    ?? (!string.IsNullOrWhiteSpace(journey?.Title) ? journey.Title : (isBespoke ? "Bespoke Sri Lanka Luxury Expedition" : "Curated Signature Expedition"));
                var packageTagline = customTagline 
                    ?? (!string.IsNullOrWhiteSpace(journey?.Tagline) ? journey.Tagline : (isBespoke ? "Custom Tailored Sri Lankan Odyssey" : "Curated Luxury Sri Lankan Expedition"));
                var destinationsCovered = customDestinations 
                    ?? (!string.IsNullOrWhiteSpace(journey?.DestinationsCovered) ? journey.DestinationsCovered : (isBespoke ? "Colombo - Cultural Corridor - Southern Coast" : "Sigiriya - Kandy - Nuwara Eliya - Yala"));
                var packageHeroImageUrl = !string.IsNullOrWhiteSpace(customHeroImageUrl)
                    ? customHeroImageUrl
                    : (!string.IsNullOrWhiteSpace(journey?.HeroImageUrl) ? journey.HeroImageUrl : "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop");

                VehicleFleetCatalog? vCatalog = null;
                if (b.VehicleCatalogId.HasValue)
                {
                    vCatalog = vehicleCatalogs.FirstOrDefault(c => c.Id == b.VehicleCatalogId.Value);
                }
                if (vCatalog == null && b.VehicleSlotId.HasValue)
                {
                    vCatalog = vehicleCatalogs.FirstOrDefault(c => c.Id == b.VehicleSlotId.Value);
                }
                if (vCatalog == null && !string.IsNullOrWhiteSpace(customVehicleModel))
                {
                    vCatalog = vehicleCatalogs.FirstOrDefault(c =>
                        string.Equals(c.VehicleModel, customVehicleModel, StringComparison.OrdinalIgnoreCase) ||
                        c.VehicleModel.Contains(customVehicleModel, StringComparison.OrdinalIgnoreCase) ||
                        customVehicleModel.Contains(c.VehicleModel, StringComparison.OrdinalIgnoreCase));
                }
                var vehicleModel = !string.IsNullOrWhiteSpace(customVehicleModel)
                    ? customVehicleModel
                    : (!string.IsNullOrWhiteSpace(vCatalog?.VehicleModel) ? vCatalog.VehicleModel : "Unassigned Vehicle");
                var categoryBadge = !string.IsNullOrWhiteSpace(vCatalog?.CategoryBadge) ? vCatalog.CategoryBadge : "STANDARD";
                var maxPassengers = vCatalog?.MaxPassengers ?? 4;
                var vehicleLuggage = vCatalog?.LuggageCapacity ?? "N/A";
                var vehicleFeature = vCatalog?.FeatureHighlight ?? "Air-conditioned private transport";
                var vehiclePhotoUrl = !string.IsNullOrWhiteSpace(vCatalog?.ImageUrl) ? vCatalog.ImageUrl : "";
                var vehiclePlate = "WP-CM VIP";

                bool isGuideNotRequired = (!string.IsNullOrWhiteSpace(customGuideName) && customGuideName.Contains("Self-Guided", StringComparison.OrdinalIgnoreCase))
                    || b.GuideAssignmentStatus == "NOT_REQUIRED";
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

                if (hasGuide && gProfile == null && !string.IsNullOrWhiteSpace(customGuideName))
                {
                    gProfile = guideProfiles.FirstOrDefault(p =>
                        (!string.IsNullOrEmpty(p.FullName) && (string.Equals(p.FullName, customGuideName, StringComparison.OrdinalIgnoreCase) || p.FullName.Contains(customGuideName, StringComparison.OrdinalIgnoreCase) || customGuideName.Contains(p.FullName, StringComparison.OrdinalIgnoreCase))) ||
                        (p.User != null && !string.IsNullOrEmpty(p.User.FullName) && (string.Equals(p.User.FullName, customGuideName, StringComparison.OrdinalIgnoreCase) || p.User.FullName.Contains(customGuideName, StringComparison.OrdinalIgnoreCase) || customGuideName.Contains(p.User.FullName, StringComparison.OrdinalIgnoreCase)))
                    );
                }

                var guideFullName = (hasGuide && gProfile != null) 
                    ? (!string.IsNullOrWhiteSpace(gProfile.FullName) ? gProfile.FullName : (gProfile.User?.FullName ?? "SLTDA Certified Guide Lecturer"))
                    : (!string.IsNullOrWhiteSpace(customGuideName) ? customGuideName : "Unassigned Private Guide");
                var guideLicenseNumber = hasGuide ? (gProfile?.LicenseNumber ?? "SLTDA/CG/2026/01") : null;
                var guideLicenseType = hasGuide ? (gProfile?.LicenseType ?? "National Tourist Guide Lecturer") : null;
                var guideLanguages = hasGuide ? (gProfile?.LanguagesSpoken ?? "English, Sinhala") : null;
                var guideSpecialties = hasGuide ? (gProfile?.Specialties ?? "Cultural Heritage & Wildlife Safaris") : null;
                var guideBio = hasGuide ? (gProfile?.Bio ?? "SLTDA accredited professional tour escort.") : null;
                var guideRating = hasGuide ? (gProfile?.Rating > 0 ? gProfile.Rating : 5.0m) : 5.0m;
                var guideReviewCount = hasGuide ? (gProfile?.ReviewCount > 0 ? gProfile.ReviewCount : 12) : 12;
                var guideContactPhone = hasGuide ? (gProfile?.User?.PhoneNumber ?? "+94 77 123 4567") : null;
                var guidePhotoUrl = hasGuide ? (!string.IsNullOrWhiteSpace(gProfile?.PhotoUrl) ? gProfile.PhotoUrl : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400") : null;

                decimal? priceUsd = b.FinalPriceQuoteUsd;
                decimal? priceLkr = b.FinalPriceQuoteLkr;

                if ((priceUsd == null || priceUsd == 0) && !string.IsNullOrWhiteSpace(customPriceUsdStr) && decimal.TryParse(customPriceUsdStr, out var parsedCustomUsd) && parsedCustomUsd > 0)
                {
                    priceUsd = parsedCustomUsd;
                    priceLkr = parsedCustomUsd * 300m;
                }

                if ((priceUsd == null || priceUsd == 0) && journey != null && journey.StartingPriceUsd > 0)
                {
                    priceUsd = journey.StartingPriceUsd;
                    priceLkr = journey.StartingPriceLkr;
                }

                if ((priceUsd == null || priceUsd == 0) && !string.IsNullOrWhiteSpace(b.AgentNotes))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(b.AgentNotes, @"\$([0-9]+(\.[0-9]+)?)");
                    if (match.Success && decimal.TryParse(match.Groups[1].Value, out var parsedUsd) && parsedUsd > 0)
                    {
                        priceUsd = parsedUsd;
                        priceLkr = parsedUsd * 300m;
                    }
                }

                int passengerCount = b.PassengerCount.HasValue && b.PassengerCount.Value > 0 ? b.PassengerCount.Value : (b.Reservations.Count > 0 ? b.Reservations.Count : 2);
                int tripDurationDays = b.TripDurationDays ?? (journey?.DurationDays > 0 ? journey.DurationDays : 5);
                string startDate = !string.IsNullOrWhiteSpace(b.StartDate) ? b.StartDate : b.BookedAt.ToString("yyyy-MM-dd");
                string pickupTime = !string.IsNullOrWhiteSpace(b.PickupTime) ? b.PickupTime : "08:00 AM";

                // Component rates
                decimal vehicleDailyRateUsd = (vCatalog != null && vCatalog.DailyRateUsd.HasValue && vCatalog.DailyRateUsd.Value > 0) ? vCatalog.DailyRateUsd.Value : 120m;
                decimal guideDailyRateUsd = hasGuide ? (gProfile?.DailyRate > 0 ? (gProfile.DailyRate > 1000 ? Math.Round(gProfile.DailyRate / 300m, 2) : gProfile.DailyRate) : 50m) : 0m;
                decimal calculatedVehicleTotal = vehicleDailyRateUsd * tripDurationDays;
                decimal calculatedGuideTotal = guideDailyRateUsd * tripDurationDays;
                decimal calculatedSubtotal = calculatedVehicleTotal + calculatedGuideTotal;
                decimal calculatedVat = Math.Round(calculatedSubtotal * 0.05m, 2);
                decimal calculatedGrandTotal = calculatedSubtotal + calculatedVat;

                if ((priceUsd == null || priceUsd == 0) && priceLkr.HasValue && priceLkr.Value > 0)
                {
                    priceUsd = Math.Round(priceLkr.Value / 300m, 2);
                }
                else if ((priceLkr == null || priceLkr == 0) && priceUsd.HasValue && priceUsd.Value > 0)
                {
                    priceLkr = priceUsd.Value * 300m;
                }

                if (priceUsd == null || priceUsd == 0)
                {
                    priceUsd = calculatedGrandTotal;
                    priceLkr = priceUsd * 300m;
                }

                var resolvedFinalPriceUsd = priceUsd > 0 ? priceUsd : calculatedGrandTotal;
                var resolvedFinalPriceLkr = priceLkr ?? (resolvedFinalPriceUsd > 0 ? resolvedFinalPriceUsd * 300m : calculatedGrandTotal * 300m);

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
                    finalPriceQuoteLkr = resolvedFinalPriceLkr,
                    finalPriceLkr = resolvedFinalPriceLkr,
                    totalAmountLkr = resolvedFinalPriceLkr,
                    finalPriceQuoteUsd = resolvedFinalPriceUsd,
                    finalPriceUsd = resolvedFinalPriceUsd,
                    totalAmountUsd = resolvedFinalPriceUsd,
                    totalUsd = resolvedFinalPriceUsd ?? 0,
                    vehicleDailyRateUsd = vehicleDailyRateUsd,
                    guideDailyRateUsd = guideDailyRateUsd,
                    vehicleTotalUsd = calculatedVehicleTotal,
                    guideTotalUsd = calculatedGuideTotal,
                    subtotalUsd = calculatedSubtotal,
                    vatUsd = calculatedVat,
                    agentNotes = b.AgentNotes,
                    guideSlotId = b.GuideSlotId,
                    vehicleSlotId = b.VehicleSlotId,
                    packageId = isCurated ? b.PackageId : null,
                    isCuratedPackage = isCurated,
                    isBespokeJourney = isBespoke,
                    bookingType = isCurated ? "CURATED_PACKAGE" : "BESPOKE_JOURNEY",
                    bookingSource = isCurated ? "CURATED_COLLECTIONS" : "DESIGN_YOUR_JOURNEY",
                    passengerCount = passengerCount,
                    durationDays = tripDurationDays,
                    tripDurationDays = tripDurationDays,
                    startDate = startDate,
                    pickupTime = pickupTime,
                    travelerNotes = b.TravelerNotes,
                    bookedAt = b.BookedAt,
                    title = packageTitle,
                    customTitle = customTitle ?? packageTitle,
                    packageTitle = packageTitle,
                    packageTagline = packageTagline,
                    destinations = destinationsCovered,
                    destinationsCovered = destinationsCovered,
                    packageHeroImageUrl = packageHeroImageUrl,
                    package = isCurated && journey != null ? new
                    {
                        id = journey?.Id,
                        title = packageTitle,
                        tagline = packageTagline,
                        destinationsCovered = destinationsCovered,
                        heroImageUrl = packageHeroImageUrl
                    } : null,
                    vehicleModel = vehicleModel,
                    selectedVehicle = vehicleModel,
                    vehiclePlate = vehiclePlate,
                    chauffeurName = guideFullName,
                    chauffeurPhone = guideContactPhone,
                    vehicle = new
                    {
                        modelName = vehicleModel,
                        categoryBadge = categoryBadge,
                        registrationNumber = vehiclePlate,
                        maxPassengers = maxPassengers,
                        luggageCapacity = vehicleLuggage,
                        featureHighlight = vehicleFeature,
                        dailyRateUsd = vehicleDailyRateUsd,
                        photoUrl = vehiclePhotoUrl
                    },
                    hasGuide = hasGuide,
                    selectedGuide = guideFullName,
                    guideName = guideFullName,
                    guide = hasGuide ? new
                    {
                        fullName = guideFullName,
                        licenseNumber = guideLicenseNumber,
                        licenseType = guideLicenseType,
                        languages = guideLanguages,
                        specialties = guideSpecialties,
                        bio = guideBio,
                        rating = guideRating,
                        reviewCount = guideReviewCount,
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
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TravelerUserId"" text NULL;
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

                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""TravelerUserId"" text NULL;
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

            // ── Package ID resolution (accepts GUID, Slug, Title, or numeric ID) ────
            int packageIdInt = 101;
            SignatureJourney? targetJourney = null;
            if (dto.PackageId != null)
            {
                var pStr = dto.PackageId.ToString()?.Trim() ?? "";
                if (Guid.TryParse(pStr, out Guid pGuid))
                {
                    targetJourney = await _context.SignatureJourneys.FirstOrDefaultAsync(j => j.Id == pGuid);
                }
                if (targetJourney == null && !string.IsNullOrWhiteSpace(pStr))
                {
                    targetJourney = await _context.SignatureJourneys.FirstOrDefaultAsync(j => j.Slug == pStr || j.Title == pStr);
                }
                if (targetJourney == null && int.TryParse(pStr, out int pInt) && pInt > 0)
                {
                    var allJourneys = await _context.SignatureJourneys.ToListAsync();
                    int idx = pInt >= 101 ? pInt - 101 : pInt - 1;
                    if (idx >= 0 && idx < allJourneys.Count)
                    {
                        targetJourney = allJourneys[idx];
                    }
                    packageIdInt = pInt;
                }
                if (targetJourney != null)
                {
                    packageIdInt = Math.Abs(targetJourney.Id.GetHashCode());
                }
            }

            if (targetJourney == null && !string.IsNullOrWhiteSpace(dto.PackageTitle))
            {
                targetJourney = await _context.SignatureJourneys.FirstOrDefaultAsync(j => j.Title == dto.PackageTitle || j.Slug == dto.PackageTitle);
            }

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

            if (vehicleCatalog == null)
            {
                return BadRequest(new { message = "The requested vehicle catalog entry was not found in the transport inventory. Please select an available vehicle added by the Capacity Officer." });
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

            // ── Direct Date Overlap Check for Guide Booking ───────────────────
            if (guideSlotId.HasValue)
            {
                var existingGuideBookings = await _context.Bookings
                    .AsNoTracking()
                    .Where(b => b.Status != "CANCELLED" && b.Status != "CAPACITY_FLAGGED_REJECTED" && b.Status != "REJECTED")
                    .Where(b => b.GuideSlotId == guideSlotId.Value)
                    .ToListAsync();

                foreach (var eb in existingGuideBookings)
                {
                    DateTime ebStart = DateTime.TryParse(eb.StartDate, out var parsedEbStart) ? parsedEbStart.Date : eb.BookedAt.Date;
                    int ebDays = eb.TripDurationDays.GetValueOrDefault(1) > 0 ? eb.TripDurationDays.GetValueOrDefault(1) : 1;
                    DateTime ebEnd = ebStart.AddDays(ebDays - 1);

                    if (newStart <= ebEnd && newEnd.AddDays(-1) >= ebStart)
                    {
                        var availAgain = ebEnd.AddDays(1);
                        return Conflict(new { message = $"Selected guide is already booked from {ebStart:dd MMM yyyy} until {ebEnd:dd MMM yyyy} ({ebDays} Days). They will become available again on {availAgain:dd MMM yyyy}." });
                    }
                }
            }

            var bookingRef = $"CM-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";

            var pkgTitle = dto.PackageTitle ?? dto.Title ?? targetJourney?.Title ?? "Curated Signature Expedition";
            var pkgDestinations = dto.DestinationsCovered ?? dto.Destinations ?? targetJourney?.DestinationsCovered ?? "Colombo - Cultural Corridor - Southern Coast";
            var pkgVehicleModel = dto.VehicleModel ?? vehicleCatalog.VehicleModel;
            var pkgGuideName = dto.SelectedGuide ?? dto.GuideName ?? (guideSlotId.HasValue ? "Private Tour Guide Escort" : "Self-Guided Chauffeur Only");
            var pkgTagline = dto.PackageTagline ?? targetJourney?.Tagline ?? "Curated Luxury Sri Lankan Expedition";
            var pkgHeroImage = dto.PackageHeroImageUrl ?? targetJourney?.HeroImageUrl ?? "";

            string combinedNotes = $"{pkgTitle} || {pkgDestinations} || {pkgVehicleModel} || {pkgGuideName} || {dto.TotalCalculatedQuote ?? dto.FinalPriceQuoteUsd ?? 0} || {(dto.TotalCalculatedQuote ?? dto.FinalPriceQuoteUsd ?? 0) * 300} || {pkgTagline} || {pkgHeroImage}";

            if (!string.IsNullOrWhiteSpace(dto.Notes) || !string.IsNullOrWhiteSpace(dto.TravelerNotes))
            {
                var rawN = (dto.Notes ?? dto.TravelerNotes)?.Trim();
                if (!string.IsNullOrWhiteSpace(rawN) && rawN.Contains("||"))
                {
                    combinedNotes = rawN;
                }
                else if (!string.IsNullOrWhiteSpace(rawN))
                {
                    combinedNotes += $" || {rawN}";
                }
            }

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
                    TravelerNotes     = combinedNotes,
                    FinalPriceQuoteUsd = dto.FinalPriceQuoteUsd.HasValue ? (decimal)dto.FinalPriceQuoteUsd.Value : (dto.TotalCalculatedQuote.HasValue ? (decimal)dto.TotalCalculatedQuote.Value : (decimal?)null),
                    FinalPriceQuoteLkr = dto.FinalPriceQuoteLkr.HasValue ? (decimal)dto.FinalPriceQuoteLkr.Value : (dto.TotalCalculatedQuote.HasValue ? (decimal)dto.TotalCalculatedQuote.Value * 300m : (decimal?)null),
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
                        DateTimeOffset bookingStart = gSlot.StartTimeUtc;
                        if (!string.IsNullOrWhiteSpace(booking.StartDate) && DateTime.TryParse(booking.StartDate, out var bStart))
                        {
                            bookingStart = new DateTimeOffset(bStart, TimeSpan.Zero);
                        }
                        int bDays = (booking.TripDurationDays.HasValue && booking.TripDurationDays.Value > 0) ? booking.TripDurationDays.Value : 1;
                        DateTimeOffset bookingEnd = bookingStart.AddDays(bDays);

                        SplitGuideSlot(gSlot, bookingStart, bookingEnd, AvailabilityStatus.RESERVED);
                        gSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);

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
        // POST /api/bookings/{id}/request-guide
        // POST /api/bookings/{id}/assign-guide
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("{id}/request-guide")]
        [HttpPost("{id}/assign-guide")]
        [Authorize]
        public async Task<IActionResult> RequestGuideApproval(string id, [FromBody] AssignGuideRequestDto dto)
        {
            Booking? booking = null;
            if (int.TryParse(id, out int intId) && intId > 0)
                booking = await _context.Bookings.FindAsync(intId);

            if (booking == null && !string.IsNullOrWhiteSpace(id))
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingReference == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            if (dto.IsSelfGuided == true)
            {
                booking.GuideSlotId = null;
                booking.GuideAssignmentStatus = "NOT_REQUIRED";
                booking.GuideResponseMessage = null;
                booking.GuideRespondedAtUtc = null;
            }
            else if (dto.GuideSlotId.HasValue && dto.GuideSlotId.Value != Guid.Empty)
            {
                booking.GuideSlotId = dto.GuideSlotId.Value;
                booking.GuideAssignmentStatus = "PENDING_GUIDE_ACCEPTANCE";
                booking.GuideResponseMessage = null;
                booking.GuideRespondedAtUtc = null;

                Guid targetGuideUserId = Guid.Empty;
                var newGuideName = dto.GuideName;

                var gProfile = await _context.GuideProfiles.FirstOrDefaultAsync(p => p.Id == dto.GuideSlotId.Value || p.UserId == dto.GuideSlotId.Value);
                if (gProfile != null)
                {
                    targetGuideUserId = gProfile.UserId;
                    if (string.IsNullOrWhiteSpace(newGuideName)) newGuideName = gProfile.FullName;
                }
                else
                {
                    var gSlot = await _context.GuideAvailabilities
                        .Include(g => g.GuideProfile)
                        .Include(g => g.LocalGuideUser)
                        .FirstOrDefaultAsync(g => g.Id == dto.GuideSlotId.Value);
                    
                    if (gSlot != null)
                    {
                        targetGuideUserId = gSlot.LocalGuideUserId;
                        
                        DateTimeOffset bookingStart = gSlot.StartTimeUtc;
                        if (!string.IsNullOrWhiteSpace(booking.StartDate) && DateTime.TryParse(booking.StartDate, out var bStart))
                        {
                            bookingStart = new DateTimeOffset(bStart, TimeSpan.Zero);
                        }
                        int bDays = (booking.TripDurationDays.HasValue && booking.TripDurationDays.Value > 0) ? booking.TripDurationDays.Value : 1;
                        DateTimeOffset bookingEnd = bookingStart.AddDays(bDays);

                        SplitGuideSlot(gSlot, bookingStart, bookingEnd, AvailabilityStatus.RESERVED);
                        gSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                        if (string.IsNullOrWhiteSpace(newGuideName))
                            newGuideName = gSlot.GuideProfile?.FullName ?? gSlot.LocalGuideUser?.FullName;
                    }
                }

                if (!string.IsNullOrWhiteSpace(newGuideName) && !string.IsNullOrWhiteSpace(booking.TravelerNotes) && booking.TravelerNotes.Contains("||"))
                {
                    var parts = booking.TravelerNotes.Split("||").Select(p => p.Trim()).ToArray();
                    if (parts.Length >= 4)
                    {
                        parts[3] = newGuideName;
                        booking.TravelerNotes = string.Join(" || ", parts);
                    }
                }

                if (targetGuideUserId != Guid.Empty)
                {
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        RecipientUserId = targetGuideUserId,
                        RecipientRole = "LOCAL_GUIDE",
                        BookingId = booking.Id,
                        Type = "GUIDE_REQUEST_RAISED",
                        Title = "New Tour Expedition Request",
                        Message = $"Booking #{booking.BookingReference} on {booking.StartDate ?? "your calendar"} has requested you as dedicated private guide. Please review and respond in your Guide Portal.",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Guide request dispatched to certified guide for approval.",
                bookingReference = booking.BookingReference,
                guideAssignmentStatus = booking.GuideAssignmentStatus,
                guideSlotId = booking.GuideSlotId
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

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/bookings/submit-bespoke-review & POST /api/bookings/submit-bespoke
        // Submits bespoke multi-agent journey directly for Concierge review
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("submit-bespoke-review")]
        [HttpPost("submit-bespoke")]
        [Authorize]
        public async Task<IActionResult> SubmitBespokeReview([FromBody] SubmitBespokeJourneyRequestDto dto)
        {
            await EnsureBookingColumnsExistAsync();
            if (dto == null) return BadRequest(new { message = "Invalid bespoke journey payload." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(userIdStr))
                return Unauthorized(new { message = "Authentication required to submit for concierge review." });

            int.TryParse(userIdStr, out int travelerId);

            // Safe JSON extraction helpers
            var selectedVehicleName = ExtractJsonString(dto.SelectedVehicle, "vehicleModel", "model", "vehicleType", "categoryBadge")
                ?? dto.SelectedVehicleCategory
                ?? "Executive Fleet Transport";

            var vehicleGuid = ExtractJsonGuid(dto.VehicleId) ?? ExtractJsonGuid(dto.SelectedVehicle, "id");
            VehicleFleetCatalog? vehicleCatalog = null;
            if (vehicleGuid.HasValue && vehicleGuid.Value != Guid.Empty)
            {
                vehicleCatalog = await _context.VehicleFleetCatalogs.FirstOrDefaultAsync(v => v.Id == vehicleGuid.Value);
            }
            if (vehicleCatalog == null && !string.IsNullOrWhiteSpace(selectedVehicleName))
            {
                vehicleCatalog = await _context.VehicleFleetCatalogs.FirstOrDefaultAsync(v => v.VehicleModel == selectedVehicleName);
            }
            if (vehicleCatalog != null && (string.IsNullOrWhiteSpace(selectedVehicleName) || selectedVehicleName == "Executive Fleet Transport"))
            {
                selectedVehicleName = vehicleCatalog.VehicleModel;
            }

            // Find or associate guide slot
            Guid? guideSlotId = ExtractJsonGuid(dto.GuideSlotId) ?? ExtractJsonGuid(dto.SelectedGuide, "id");
            if (guideSlotId.HasValue)
            {
                var gSlotExists = await _context.GuideAvailabilities.AnyAsync(g => g.Id == guideSlotId.Value);
                if (!gSlotExists) guideSlotId = null;
            }

            var tripTitle = !string.IsNullOrWhiteSpace(dto.CustomTitle) ? dto.CustomTitle : (!string.IsNullOrWhiteSpace(dto.Title) ? dto.Title : "Bespoke Sri Lanka Luxury Expedition");
            var destsCovered = !string.IsNullOrWhiteSpace(dto.Destinations) ? dto.Destinations : (!string.IsNullOrWhiteSpace(dto.DestinationsCovered) ? dto.DestinationsCovered : "Colombo, Galle, Mirissa");
            var durationDays = dto.DurationDays.HasValue && dto.DurationDays.Value > 0 ? dto.DurationDays.Value : (dto.TripDurationDays.HasValue && dto.TripDurationDays.Value > 0 ? dto.TripDurationDays.Value : 8);
            var pax = dto.PassengerCount.HasValue && dto.PassengerCount.Value > 0 ? dto.PassengerCount.Value : 2;

            var highlightsList = dto.SelectedInterests != null && dto.SelectedInterests.Any()
                ? dto.SelectedInterests
                : new List<string> { "Private Chauffeur", "Terrain-Aware Routing", "Concierge Support" };

            var pricingTotalUsd = ExtractJsonDouble(dto.PricingBreakdown, "totalTripCostUsd");
            var pricingTotalLkr = ExtractJsonDouble(dto.PricingBreakdown, "totalTripCostLkr");

            var finalPriceUsd = (dto.FinalPriceUsd > 0 ? (decimal?)dto.FinalPriceUsd.Value : (decimal?)null)
                             ?? (dto.TotalAmountUsd > 0 ? (decimal?)dto.TotalAmountUsd.Value : (decimal?)null)
                             ?? (pricingTotalUsd > 0 ? (decimal?)pricingTotalUsd.Value : (decimal?)null)
                             ?? (dto.FinalPriceQuoteUsd > 0 ? (decimal?)dto.FinalPriceQuoteUsd.Value : (decimal?)null)
                             ?? (dto.TotalTripCostUsd > 0 ? (decimal?)dto.TotalTripCostUsd.Value : (decimal?)null)
                             ?? (dto.TotalCalculatedQuote > 0 ? (decimal?)dto.TotalCalculatedQuote.Value : (decimal?)null);

            var finalPriceLkr = (dto.FinalPriceLkr > 0 ? (decimal?)dto.FinalPriceLkr.Value : (decimal?)null)
                             ?? (dto.TotalAmountLkr > 0 ? (decimal?)dto.TotalAmountLkr.Value : (decimal?)null)
                             ?? (pricingTotalLkr > 0 ? (decimal?)pricingTotalLkr.Value : (decimal?)null)
                             ?? (dto.FinalPriceQuoteLkr > 0 ? (decimal?)dto.FinalPriceQuoteLkr.Value : (decimal?)null)
                             ?? (dto.TotalTripCostLkr > 0 ? (decimal?)dto.TotalTripCostLkr.Value : (decimal?)null);

            if (finalPriceUsd.HasValue && !finalPriceLkr.HasValue)
            {
                finalPriceLkr = finalPriceUsd.Value * 300m;
            }
            else if (finalPriceLkr.HasValue && !finalPriceUsd.HasValue)
            {
                finalPriceUsd = Math.Round(finalPriceLkr.Value / 300m, 2);
            }

            // Remove any legacy auto-created bespoke signature journeys from DB so they never leak into Curated Signature Collections
            var oldBespokeJourneys = await _context.SignatureJourneys
                .Where(j => j.Slug.StartsWith("bespoke-"))
                .ToListAsync();
            if (oldBespokeJourneys.Count > 0)
            {
                _context.SignatureJourneys.RemoveRange(oldBespokeJourneys);
                await _context.SaveChangesAsync();
            }

            var bookingRef = $"CM-BESPOKE-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";

            var selectedGuideName = ExtractJsonString(dto.SelectedGuide, "guideName", "name") ?? dto.GuideName ?? "";
            bool isGuideRequested = !string.IsNullOrWhiteSpace(selectedGuideName) && !selectedGuideName.Contains("Self-Guided", StringComparison.OrdinalIgnoreCase);

            // ── Overlapping Guide Booking Prevention ─────────────────────────
            if (isGuideRequested)
            {
                DateTime reqStart = DateTime.TryParse(dto.StartDate, out var parsedReqStart) ? parsedReqStart.Date : DateTime.UtcNow.Date;
                int reqDays = durationDays > 0 ? durationDays : 1;
                DateTime reqEnd = reqStart.AddDays(reqDays - 1);

                // Find matching guide profile to check availability accurately
                var targetGuideProfile = await _context.GuideProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g =>
                        (guideSlotId.HasValue && g.Id == guideSlotId.Value) ||
                        (!string.IsNullOrWhiteSpace(selectedGuideName) && g.FullName != null && g.FullName.ToLower() == selectedGuideName.Trim().ToLower())
                    );

                if (targetGuideProfile != null)
                {
                    var existingGuideBookings = await _context.Bookings
                        .AsNoTracking()
                        .Where(b => b.Status != "CANCELLED" && b.Status != "CAPACITY_FLAGGED_REJECTED" && b.Status != "REJECTED")
                        .Where(b =>
                            (b.GuideSlotId == targetGuideProfile.Id) ||
                            (!string.IsNullOrWhiteSpace(b.TravelerNotes) && b.TravelerNotes.Contains(targetGuideProfile.FullName!)) ||
                            (!string.IsNullOrWhiteSpace(b.AgentNotes) && b.AgentNotes.Contains(targetGuideProfile.FullName!))
                        )
                        .ToListAsync();

                    foreach (var eb in existingGuideBookings)
                    {
                        DateTime ebStart = DateTime.TryParse(eb.StartDate, out var parsedEbStart) ? parsedEbStart.Date : eb.BookedAt.Date;
                        int ebDays = eb.TripDurationDays.GetValueOrDefault(1) > 0 ? eb.TripDurationDays.GetValueOrDefault(1) : 1;
                        DateTime ebEnd = ebStart.AddDays(ebDays - 1);

                        if (reqStart <= ebEnd && reqEnd >= ebStart)
                        {
                            var availAgain = ebEnd.AddDays(1);
                            return BadRequest(new { message = $"Selected guide ({targetGuideProfile.FullName}) is already booked from {ebStart:dd MMM yyyy} until {ebEnd:dd MMM yyyy} ({ebDays} Days). They will become available again on {availAgain:dd MMM yyyy}." });
                        }
                    }
                }
            }

            var routeName = ExtractJsonString(dto.SelectedRoute, "name") ?? "Selected Corridor";
            var routeDist = ExtractJsonDouble(dto.SelectedRoute, "distanceKm") ?? 120;
            var auditStatus = ExtractJsonString(dto.BudgetAudit, "status") ?? "WITHIN_BUDGET";
            var auditVariance = ExtractJsonDouble(dto.BudgetAudit, "varianceLkr") ?? 0;
            var auditTip = ExtractJsonString(dto.BudgetAudit, "conciergeOptimizationTip") ?? "Standard review";
            var auditBadge = ExtractJsonString(dto.SynthesisSignOff, "auditBadge") ?? "CONCIERGE CERTIFIED";

            var agentNotes = $"[Agent 4 AI Concierge Quoted] Vehicle: {selectedVehicleName}. Guide: {(isGuideRequested ? selectedGuideName : "Self-Guided")}. Price: ${finalPriceUsd ?? 0:N2} (LKR {finalPriceLkr ?? 0:N0}). " +
                             $"Route: {routeName} ({routeDist} km). " +
                             $"Status: {auditStatus}. Variance: LKR {auditVariance:N0}. " +
                             $"Tip: {auditTip}. Badge: {auditBadge}.";

            var booking = new Booking
            {
                TravelerId = travelerId,
                TravelerUserId = userIdStr,
                BookingReference = bookingRef,
                Status = !string.IsNullOrWhiteSpace(dto.Status) ? dto.Status : "PENDING_CONCIERGE_REVIEW",
                VehicleCapacityStatus = "HELD_PENDING_CONFIRMATION",
                GuideAssignmentStatus = isGuideRequested
                    ? "PENDING_GUIDE_ACCEPTANCE"
                    : "NOT_REQUIRED",
                PackageId = null, // Bespoke journeys have NO Curated Package ID to keep them strictly separate
                TripDurationDays = durationDays,
                PassengerCount = pax,
                GuideSlotId = guideSlotId,
                VehicleSlotId = vehicleCatalog?.Id,
                VehicleCatalogId = vehicleCatalog?.Id,
                StartDate = dto.StartDate,
                PickupTime = !string.IsNullOrWhiteSpace(dto.PickupTime) ? dto.PickupTime : "08:00 AM",
                TravelerNotes = $"{tripTitle}||{destsCovered}||{selectedVehicleName}||{(isGuideRequested ? selectedGuideName : "")}||{finalPriceUsd?.ToString() ?? "0"}||{finalPriceLkr?.ToString() ?? "0"}||{dto.DreamPrompt ?? tripTitle}||BESPOKE_JOURNEY",
                AgentNotes = agentNotes,
                FinalPriceQuoteLkr = finalPriceLkr,
                FinalPriceQuoteUsd = finalPriceUsd,
                BookedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            // Booking record saved successfully as primary record

            // Notification for Concierge / Travel Agent desk
            try
            {
                var agentUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.TRAVEL_AGENT || u.Role == UserRole.ADMIN);
                var recipientId = agentUser?.Id ?? (Guid.TryParse(userIdStr, out var uGuid) ? uGuid : Guid.NewGuid());
                _context.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    RecipientUserId = recipientId,
                    RecipientRole = "TRAVEL_AGENT",
                    BookingId = booking.Id,
                    Type = "BESPOKE_JOURNEY_SUBMITTED",
                    Title = "New Bespoke Journey Proposal",
                    Message = $"Traveler submitted bespoke journey '{tripTitle}' (Ref: {bookingRef}) for Concierge Review. Total Quoted: ${finalPriceUsd ?? 0:N2} USD.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception notifEx)
            {
                Console.WriteLine($"[Notification Notice]: {notifEx.Message}");
            }

            var mappedList = await MapBookingDetailsListAsync(new[] { booking });
            return Ok(mappedList.FirstOrDefault() ?? (object)new
            {
                success = true,
                message = "Your journey has been submitted! Our concierge team is reviewing logistics and will confirm within 2 hours.",
                bookingReference = booking.BookingReference,
                bookingId = booking.Id,
                status = booking.Status,
                finalPriceQuoteUsd = booking.FinalPriceQuoteUsd,
                finalPriceQuoteLkr = booking.FinalPriceQuoteLkr
            });
        }

        private static string? ExtractJsonString(object? obj, params string[] propertyNames)
        {
            if (obj == null) return null;
            if (obj is string str) return str;
            if (obj is System.Text.Json.JsonElement elem)
            {
                if (elem.ValueKind == System.Text.Json.JsonValueKind.String)
                    return elem.GetString();
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    foreach (var prop in propertyNames)
                    {
                        if (elem.TryGetProperty(prop, out var val) && val.ValueKind == System.Text.Json.JsonValueKind.String)
                            return val.GetString();
                        string pascal = char.ToUpperInvariant(prop[0]) + prop[1..];
                        if (elem.TryGetProperty(pascal, out var valP) && valP.ValueKind == System.Text.Json.JsonValueKind.String)
                            return valP.GetString();
                    }
                }
            }
            var s = obj.ToString();
            return string.IsNullOrWhiteSpace(s) ? null : s;
        }

        private static Guid? ExtractJsonGuid(object? obj, params string[] propertyNames)
        {
            if (obj == null) return null;
            if (obj is Guid g && g != Guid.Empty) return g;
            if (obj is string s && Guid.TryParse(s, out var parsedGuid) && parsedGuid != Guid.Empty) return parsedGuid;
            if (obj is System.Text.Json.JsonElement elem)
            {
                if (elem.ValueKind == System.Text.Json.JsonValueKind.String && Guid.TryParse(elem.GetString(), out var eg) && eg != Guid.Empty)
                    return eg;
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    foreach (var prop in propertyNames)
                    {
                        if (elem.TryGetProperty(prop, out var val) && Guid.TryParse(val.GetString(), out var propGuid) && propGuid != Guid.Empty)
                            return propGuid;
                        string pascal = char.ToUpperInvariant(prop[0]) + prop[1..];
                        if (elem.TryGetProperty(pascal, out var valP) && Guid.TryParse(valP.GetString(), out var propGuidP) && propGuidP != Guid.Empty)
                            return propGuidP;
                    }
                }
            }
            return null;
        }

        private static double? ExtractJsonDouble(object? obj, params string[] propertyNames)
        {
            if (obj == null) return null;
            if (obj is double d) return d;
            if (obj is int i) return (double)i;
            if (obj is decimal m) return (double)m;
            if (obj is System.Text.Json.JsonElement elem)
            {
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Number && elem.TryGetDouble(out var num))
                    return num;
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    foreach (var prop in propertyNames)
                    {
                        if (elem.TryGetProperty(prop, out var val) && val.ValueKind == System.Text.Json.JsonValueKind.Number && val.TryGetDouble(out var pNum))
                            return pNum;
                        string pascal = char.ToUpperInvariant(prop[0]) + prop[1..];
                        if (elem.TryGetProperty(pascal, out var valP) && valP.ValueKind == System.Text.Json.JsonValueKind.Number && valP.TryGetDouble(out var pNumP))
                            return pNumP;
                    }
                }
            }
            return null;
        }

        public record RaiseCuratedBookingRequestDto(
            object? PackageId = null,
            object? GuideSlotId = null,
            object? VehicleSlotId = null,
            object? VehicleId = null,
            string? StartDate = null,
            string? PickupTime = null,
            int? PassengerCount = null,
            int? TripDurationDays = null,
            int? DurationDays = null,
            string? Notes = null,
            string? TravelerNotes = null,
            IEnumerable<object>? AttractionSlotIds = null,
            double? TotalCalculatedQuote = null,
            double? FinalPriceQuoteUsd = null,
            double? FinalPriceQuoteLkr = null,
            string? Title = null,
            string? CustomTitle = null,
            string? PackageTitle = null,
            string? PackageTagline = null,
            string? PackageHeroImageUrl = null,
            string? PackageSlug = null,
            string? VehicleModel = null,
            string? Destinations = null,
            string? DestinationsCovered = null,
            string? Status = null,
            string? SelectedGuide = null,
            string? GuideName = null
        );

        public record BespokeSelectedRouteDto(
            string? Name = null,
            double? DistanceKm = null,
            string? Via = null,
            string? TransitType = null
        );

        public record BespokeSelectedVehicleDto(
            object? Id = null,
            string? Model = null,
            string? VehicleModel = null,
            string? VehicleType = null,
            string? CategoryBadge = null,
            double? DailyRateLkr = null
        );

        public record BespokeSelectedGuideDto(
            object? Id = null,
            string? Name = null,
            string? GuideName = null,
            string? Role = null,
            string? LicenseNumber = null,
            string? ContactPhone = null,
            double? DailyRateLkr = null
        );

        public record BespokePricingBreakdownDto(
            double? FuelAndTransitLkr = null,
            double? VehicleCharterLkr = null,
            double? VehicleDayRateLkr = null,
            double? TollFeesLkr = null,
            double? GuideFeeLkr = null,
            double? PlatformFeeLkr = null,
            double? TaxesAndPlatformLkr = null,
            double? TotalTripCostLkr = null,
            double? TotalTripCostUsd = null
        );

        public record BespokeBudgetAuditDto(
            double? TargetBudgetLkr = null,
            double? VarianceLkr = null,
            string? Status = null,
            string? VerdictSummary = null,
            string? ConciergeOptimizationTip = null
        );

        public record BespokeSynthesisSignOffDto(
            bool? IsFeasible = null,
            bool? DriverSafetyHoursCompliant = null,
            string? AuditBadge = null
        );

        public record SubmitBespokeJourneyRequestDto(
            string? Title = null,
            string? CustomTitle = null,
            string? DreamPrompt = null,
            string? StartDate = null,
            string? EndDate = null,
            string? PickupTime = null,
            int? TripDurationDays = null,
            int? DurationDays = null,
            int? PassengerCount = null,
            List<string>? SelectedInterests = null,
            string? DestinationsCovered = null,
            string? Destinations = null,
            object? SelectedRoute = null,
            object? SelectedVehicle = null,
            object? SelectedGuide = null,
            string? SelectedVehicleCategory = null,
            string? Status = null,
            object? Agent1Output = null,
            object? Agent2Suitability = null,
            object? Agent3Logistics = null,
            object? PricingBreakdown = null,
            object? BudgetAudit = null,
            object? SynthesisSignOff = null,
            object? VehicleId = null,
            object? GuideSlotId = null,
            string? GuideName = null,
            double? FinalPriceQuoteUsd = null,
            double? FinalPriceQuoteLkr = null,
            double? FinalPriceUsd = null,
            double? FinalPriceLkr = null,
            double? TotalTripCostUsd = null,
            double? TotalTripCostLkr = null,
            double? TotalAmountUsd = null,
            double? TotalAmountLkr = null,
            double? TotalCalculatedQuote = null
        );

        private void SplitGuideSlot(GuideAvailability gSlot, DateTimeOffset bookingStart, DateTimeOffset bookingEnd, AvailabilityStatus newStatus)
        {
            var originalStart = gSlot.StartTimeUtc;
            var originalEnd = gSlot.EndTimeUtc;

            gSlot.StartTimeUtc = bookingStart;
            gSlot.EndTimeUtc = bookingEnd;
            gSlot.Status = newStatus;

            if (originalStart < bookingStart)
            {
                var beforeSlot = new GuideAvailability
                {
                    LocalGuideUserId = gSlot.LocalGuideUserId,
                    GuideProfileId = gSlot.GuideProfileId,
                    StartTimeUtc = originalStart,
                    EndTimeUtc = bookingStart.AddDays(-1) > originalStart ? bookingStart.AddDays(-1) : originalStart,
                    SlotType = gSlot.SlotType,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = gSlot.MaxCapacity,
                    PriceAmount = gSlot.PriceAmount,
                    Currency = gSlot.Currency
                };
                if (beforeSlot.EndTimeUtc >= beforeSlot.StartTimeUtc) 
                {
                    _context.GuideAvailabilities.Add(beforeSlot);
                }
            }

            DateTimeOffset afterStart = bookingEnd.AddDays(1);
            if (originalEnd >= afterStart)
            {
                var afterSlot = new GuideAvailability
                {
                    LocalGuideUserId = gSlot.LocalGuideUserId,
                    GuideProfileId = gSlot.GuideProfileId,
                    StartTimeUtc = afterStart,
                    EndTimeUtc = originalEnd,
                    SlotType = gSlot.SlotType,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = gSlot.MaxCapacity,
                    PriceAmount = gSlot.PriceAmount,
                    Currency = gSlot.Currency
                };
                _context.GuideAvailabilities.Add(afterSlot);
            }
            else
            {
                var afterSlot = new GuideAvailability
                {
                    LocalGuideUserId = gSlot.LocalGuideUserId,
                    GuideProfileId = gSlot.GuideProfileId,
                    StartTimeUtc = afterStart,
                    EndTimeUtc = afterStart.AddYears(1),
                    SlotType = gSlot.SlotType,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = gSlot.MaxCapacity,
                    PriceAmount = gSlot.PriceAmount,
                    Currency = gSlot.Currency
                };
                _context.GuideAvailabilities.Add(afterSlot);
            }
        }

        public record AssignGuideRequestDto(
            Guid? GuideSlotId = null,
            Guid? GuideProfileId = null,
            string? GuideName = null,
            bool? IsSelfGuided = null
        );
    }
}
