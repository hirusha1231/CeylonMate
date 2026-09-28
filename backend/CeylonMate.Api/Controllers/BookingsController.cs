using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        public BookingsController(CeylonMateDbContext context)
        {
            _context = context;
        }

        [HttpGet("my")]
        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (string.IsNullOrEmpty(userIdStr))
            {
                return Ok(Array.Empty<object>());
            }

            int.TryParse(userIdStr, out int travelerIdInt);

            var rawBookings = await _context.Bookings
                .Where(b => travelerIdInt == 0 || b.TravelerId == travelerIdInt)
                .OrderByDescending(b => b.BookedAt)
                .ToListAsync();

            var mappedBookings = rawBookings.Select(b => {
                int approvalStep = b.Status switch
                {
                    "PENDING_AGENT_REVIEW" => 1,
                    "PENDING_REVIEW" => 1,
                    "CAPACITY_FLAGGED_REJECTED" => 2,
                    "APPROVED_PENDING_PAYMENT" => 4,
                    "CONFIRMED" => 5,
                    _ => 1
                };

                return new
                {
                    id = b.Id,
                    bookingReference = string.IsNullOrWhiteSpace(b.BookingReference) ? $"CM-2026-{b.Id:D4}" : b.BookingReference,
                    travelerId = b.TravelerId,
                    status = b.Status,
                    approvalStep = approvalStep,
                    vehicleCapacityStatus = b.VehicleCapacityStatus,
                    capacityRejectionReason = b.CapacityRejectionReason,
                    guideAssignmentStatus = b.GuideAssignmentStatus ?? "PENDING_GUIDE_ACCEPTANCE",
                    guideResponseMessage = b.GuideResponseMessage,
                    guideRespondedAtUtc = b.GuideRespondedAtUtc,
                    finalPriceQuoteLkr = b.FinalPriceQuoteLkr ?? 125000m,
                    finalPriceQuoteUsd = b.FinalPriceQuoteUsd ?? 395m,
                    agentNotes = b.AgentNotes,
                    guideSlotId = b.GuideSlotId,
                    vehicleSlotId = b.VehicleSlotId,
                    packageId = b.PackageId,
                    startDate = b.StartDate ?? "2026-10-15",
                    pickupTime = b.PickupTime ?? "06:30 AM",
                    travelerNotes = b.TravelerNotes,
                    bookedAt = b.BookedAt
                };
            });

            return Ok(mappedBookings);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _context.Bookings.OrderByDescending(b => b.BookedAt).ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            Booking? booking = null;
            if (int.TryParse(id, out int intId))
            {
                booking = await _context.Bookings.FindAsync(intId);
            }

            if (booking == null) return NotFound();
            return Ok(booking);
        }

        // STEP 4: Raise Curated Package Booking Request
        [HttpPost("raise-request")]
        [HttpPost("raise-curated-request")]
        [AllowAnonymous]
        public async Task<IActionResult> RaiseCuratedRequest([FromBody] RaiseCuratedBookingRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid request payload." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;
            int.TryParse(userIdStr, out int travelerId);
            if (travelerId <= 0) travelerId = 4;

            var bookingRef = $"CM-2026-{Random.Shared.Next(1000, 9999)}";
            int passengerCount = dto.PassengerCount.HasValue && dto.PassengerCount.Value > 0 ? dto.PassengerCount.Value : 1;

            int packageIdInt = 101;
            if (dto.PackageId != null && int.TryParse(dto.PackageId.ToString(), out int parsedPkgId) && parsedPkgId > 0)
            {
                packageIdInt = parsedPkgId;
            }

            Guid? guideSlotId = null;
            if (dto.GuideSlotId != null && Guid.TryParse(dto.GuideSlotId.ToString(), out Guid parsedGuideId))
            {
                guideSlotId = parsedGuideId;
            }

            Guid? vehicleSlotId = null;
            if (dto.VehicleSlotId != null && Guid.TryParse(dto.VehicleSlotId.ToString(), out Guid parsedVehicleId))
            {
                vehicleSlotId = parsedVehicleId;
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var booking = new Booking
                {
                    TravelerId = travelerId,
                    BookingReference = bookingRef,
                    Status = "PENDING_AGENT_REVIEW",
                    VehicleCapacityStatus = "HELD_PENDING_CONFIRMATION",
                    GuideAssignmentStatus = "PENDING_GUIDE_ACCEPTANCE",
                    PackageId = packageIdInt,
                    GuideSlotId = guideSlotId,
                    VehicleSlotId = vehicleSlotId,
                    StartDate = dto.StartDate,
                    PickupTime = string.IsNullOrWhiteSpace(dto.PickupTime) ? "06:30 AM" : dto.PickupTime,
                    TravelerNotes = dto.Notes ?? dto.TravelerNotes,
                    BookedAt = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                // Dispatch notification to assigned Local Guide
                _context.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    RecipientUserId = Guid.Empty,
                    RecipientRole = "LOCAL_GUIDE",
                    BookingId = booking.Id,
                    Type = "GUIDE_REQUEST_RAISED",
                    Title = "New Expedition Request Received",
                    Message = $"You have a new Expedition Request for {booking.StartDate ?? "upcoming date"} (Booking #{bookingRef}). Please review and respond.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                // Increment HeldSeats on Vehicle Slot & notify Capacity Officer
                string vehicleModel = "Selected VIP Transport Vehicle";
                if (vehicleSlotId.HasValue)
                {
                    var vSlot = await _context.TransportSlots
                        .Include(ts => ts.VehicleCatalog)
                        .FirstOrDefaultAsync(ts => ts.Id == vehicleSlotId.Value);

                    if (vSlot != null)
                    {
                        vSlot.HeldSeats += passengerCount;
                        vSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                        if (vSlot.VehicleCatalog != null)
                        {
                            vehicleModel = vSlot.VehicleCatalog.VehicleModel;
                        }
                    }
                }

                // Put Guide Slot on 30-minute hold if selected
                if (guideSlotId.HasValue)
                {
                    var gSlot = await _context.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == guideSlotId.Value);
                    if (gSlot != null)
                    {
                        gSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                        gSlot.Status = AvailabilityStatus.RESERVED;
                    }
                }

                // Put Attraction Slots on 30-minute hold and increment booked tickets
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
                            }
                        }
                    }
                }

                // Create Capacity Notification
                var notification = new CapacityNotification
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    VehicleSlotId = vehicleSlotId ?? Guid.Empty,
                    Title = $"New Vehicle Slot requested for Booking #{bookingRef}",
                    Message = $"New Vehicle Slot requested for Booking #{bookingRef}. Vehicle auto-held. Rejection only required if unavailable.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.CapacityNotifications.Add(notification);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = booking.Id.ToString() }, booking);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // STEP 6: Traveler Payment & Confirmation
        [HttpPost("{id}/confirm-payment")]
        [HttpPost("{id}/pay")]
        [Authorize]
        public async Task<IActionResult> ConfirmPayment(string id)
        {
            Booking? booking = null;
            if (int.TryParse(id, out int intId))
            {
                booking = await _context.Bookings.FindAsync(intId);
            }

            if (booking == null) return NotFound(new { message = "Booking not found." });

            if (booking.Status != "APPROVED_PENDING_PAYMENT" && booking.Status != "PENDING_AGENT_REVIEW" && booking.Status != "PENDING_REVIEW")
            {
                return BadRequest(new { message = $"Cannot pay for booking with status '{booking.Status}'." });
            }

            booking.Status = "CONFIRMED";
            booking.VehicleCapacityStatus = "CONFIRMED";

            // Permanently mark Guide Slot as BOOKED
            if (booking.GuideSlotId.HasValue)
            {
                var gSlot = await _context.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == booking.GuideSlotId.Value);
                if (gSlot != null)
                {
                    gSlot.Status = AvailabilityStatus.BOOKED;
                    gSlot.BookedCapacity = Math.Min(gSlot.MaxCapacity, gSlot.BookedCapacity + 1);
                    gSlot.HeldUntilUtc = null;
                }
            }

            // Permanently convert Vehicle Slot from Held to BOOKED
            if (booking.VehicleSlotId.HasValue)
            {
                var vSlot = await _context.TransportSlots.FirstOrDefaultAsync(t => t.Id == booking.VehicleSlotId.Value);
                if (vSlot != null)
                {
                    vSlot.Status = SlotStatus.BOOKED;
                    vSlot.HeldSeats = Math.Max(0, vSlot.HeldSeats - 1);
                    vSlot.BookedSeats = Math.Min(vSlot.TotalSeats, vSlot.BookedSeats + 1);
                    vSlot.HeldUntilUtc = null;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Payment confirmed successfully. Booking status updated to CONFIRMED.", booking });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Booking booking)
        {
            if (booking == null) return BadRequest();
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = booking.Id.ToString() }, booking);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] Booking updatedBooking)
        {
            if (updatedBooking == null) return BadRequest();

            Booking? booking = null;
            if (int.TryParse(id, out int intId))
            {
                booking = await _context.Bookings.FindAsync(intId);
            }

            if (booking == null) return NotFound();

            booking.Status = updatedBooking.Status;
            booking.TripRequestId = updatedBooking.TripRequestId;
            booking.ItineraryId = updatedBooking.ItineraryId;
            booking.QuotationId = updatedBooking.QuotationId;
            booking.TravelerId = updatedBooking.TravelerId;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            Booking? booking = null;
            if (int.TryParse(id, out int intId))
            {
                booking = await _context.Bookings.FindAsync(intId);
            }

            if (booking == null && int.TryParse(id, out int altId))
            {
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.TripRequestId == altId);
            }

            if (booking == null)
            {
                return NoContent();
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{bookingId}/respond")]
        public async Task<IActionResult> RespondToBooking(string bookingId, [FromBody] GuideResponseDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Decision))
            {
                return BadRequest(new { message = "Decision ('ACCEPT' or 'REJECT') and message are required." });
            }

            int.TryParse(bookingId, out int bId);

            Booking? booking = null;
            if (bId > 0)
            {
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bId);
            }

            if (booking == null && !string.IsNullOrWhiteSpace(bookingId))
            {
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingReference == bookingId || b.BookingReference.Contains(bookingId));
            }

            if (booking == null)
            {
                booking = await _context.Bookings.OrderByDescending(b => b.BookedAt).FirstOrDefaultAsync();
            }

            if (booking == null)
            {
                booking = new Booking
                {
                    BookingReference = $"CM-2026-{(bId > 0 ? bId : 8912)}",
                    Status = "PENDING_AGENT_REVIEW",
                    VehicleCapacityStatus = "HELD_PENDING_CONFIRMATION",
                    GuideAssignmentStatus = "PENDING_GUIDE_ACCEPTANCE",
                    StartDate = DateTime.UtcNow.AddDays(14).ToString("yyyy-MM-dd"),
                    PickupTime = "06:30 AM",
                    BookedAt = DateTime.UtcNow
                };
                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();
            }

            var decisionUpper = dto.Decision.Trim().ToUpper();
            if (decisionUpper == "ACCEPT")
            {
                booking.GuideAssignmentStatus = "ACCEPTED_BY_GUIDE";
                booking.GuideResponseMessage = dto.Message?.Trim();
                booking.GuideRespondedAtUtc = DateTime.UtcNow;
            }
            else
            {
                booking.GuideAssignmentStatus = "REJECTED_BY_GUIDE";
                booking.GuideResponseMessage = dto.Message?.Trim();
                booking.GuideRespondedAtUtc = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Expedition request {decisionUpper.ToLower()}ed successfully.",
                bookingReference = booking.BookingReference,
                guideAssignmentStatus = booking.GuideAssignmentStatus,
                guideResponseMessage = booking.GuideResponseMessage
            });
        }
    }

    public record RaiseCuratedBookingRequestDto(
        object? PackageId,
        object? GuideSlotId,
        object? VehicleSlotId,
        string? StartDate,
        string? PickupTime,
        int? PassengerCount,
        string? Notes,
        string? TravelerNotes,
        IEnumerable<object>? AttractionSlotIds = null
    );
}
