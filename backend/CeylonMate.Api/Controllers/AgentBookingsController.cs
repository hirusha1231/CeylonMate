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
    [Route("api/agent")]
    [Authorize(Roles = "TRAVEL_AGENT,ADMIN")]
    public class AgentBookingsController : ControllerBase
    {
        private readonly CeylonMateDbContext _context;

        public AgentBookingsController(CeylonMateDbContext context)
        {
            _context = context;
        }

        // GET /api/agent/inquiries & /api/agent/curated-requests
        [HttpGet("inquiries")]
        [HttpGet("curated-requests")]
        public async Task<IActionResult> GetInquiries()
        {
            var inquiries = await _context.Bookings
                .AsNoTracking()
                .OrderByDescending(b => b.BookedAt)
                .Select(b => new
                {
                    id = b.Id,
                    bookingReference = b.BookingReference,
                    travelerId = b.TravelerId,
                    status = b.Status,
                    vehicleCapacityStatus = b.VehicleCapacityStatus,
                    capacityRejectionReason = b.CapacityRejectionReason,
                    capacityRejectedAtUtc = b.CapacityRejectedAtUtc,
                    isHighPriority = b.Status == "CAPACITY_FLAGGED_REJECTED" || b.GuideAssignmentStatus == "REJECTED_BY_GUIDE",
                    guideAssignmentStatus = b.GuideAssignmentStatus ?? "PENDING_GUIDE_ACCEPTANCE",
                    guideResponseMessage = b.GuideResponseMessage,
                    guideRespondedAtUtc = b.GuideRespondedAtUtc,
                    finalPriceQuoteLkr = b.FinalPriceQuoteLkr,
                    finalPriceQuoteUsd = b.FinalPriceQuoteUsd,
                    agentNotes = b.AgentNotes,
                    guideSlotId = b.GuideSlotId,
                    vehicleSlotId = b.VehicleSlotId,
                    packageId = b.PackageId,
                    tripDurationDays = b.TripDurationDays,
                    startDate = b.StartDate,
                    pickupTime = b.PickupTime,
                    travelerNotes = b.TravelerNotes,
                    bookedAt = b.BookedAt
                })
                .ToListAsync();

            return Ok(inquiries);
        }

        // POST /api/agent/bookings/{bookingId}/approve
        [HttpPost("bookings/{bookingId}/approve")]
        public async Task<IActionResult> ApproveBooking(
            int bookingId,
            [FromBody] ApproveBookingRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid approval payload." });

            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null)
            {
                return NotFound(new { message = "Booking inquiry not found." });
            }

            // Reassign vehicle if requested
            if (dto.ReplacementVehicleSlotId.HasValue && dto.ReplacementVehicleSlotId.Value != Guid.Empty)
            {
                booking.VehicleSlotId = dto.ReplacementVehicleSlotId.Value;
                var replacementSlot = await _context.TransportSlots.FirstOrDefaultAsync(t => t.Id == dto.ReplacementVehicleSlotId.Value);
                if (replacementSlot != null)
                {
                    replacementSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                }
            }

            // Reassign guide if requested
            if (dto.ReplacementGuideSlotId.HasValue && dto.ReplacementGuideSlotId.Value != Guid.Empty)
            {
                booking.GuideSlotId = dto.ReplacementGuideSlotId.Value;
                booking.GuideAssignmentStatus = "PENDING_GUIDE_ACCEPTANCE";
                booking.GuideResponseMessage = null;
                booking.GuideRespondedAtUtc = null;

                Guid replacementUserId = Guid.Empty;
                var gProf = await _context.GuideProfiles.AsNoTracking()
                    .FirstOrDefaultAsync(gp => gp.Id == dto.ReplacementGuideSlotId.Value || gp.UserId == dto.ReplacementGuideSlotId.Value);
                if (gProf != null)
                {
                    replacementUserId = gProf.UserId;
                }
                else
                {
                    var guideSlot = await _context.GuideAvailabilities.FirstOrDefaultAsync(g => g.Id == dto.ReplacementGuideSlotId.Value);
                    if (guideSlot != null)
                    {
                        guideSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(30);
                        replacementUserId = guideSlot.LocalGuideUserId;
                    }
                }

                _context.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    RecipientUserId = replacementUserId,
                    RecipientRole = "LOCAL_GUIDE",
                    BookingId = booking.Id,
                    Type = "GUIDE_REQUEST_RAISED",
                    Title = "Reassigned Expedition Request Received",
                    Message = $"Travel Agent reassigned Booking #{booking.BookingReference} to you. Please review and respond.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            booking.FinalPriceQuoteLkr = dto.FinalPriceQuoteLkr;
            booking.FinalPriceQuoteUsd = dto.FinalPriceQuoteUsd;
            booking.AgentNotes = dto.AgentNotes;
            booking.Status = "APPROVED_PENDING_PAYMENT";
            booking.VehicleCapacityStatus = "ACKNOWLEDGED";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Booking offer approved and dispatched to traveler.",
                booking
            });
        }

        // POST /api/agent/bookings/{bookingId}/reject
        [HttpPost("bookings/{bookingId}/reject")]
        public async Task<IActionResult> RejectBooking(
            int bookingId,
            [FromBody] RejectBookingRequestDto? dto)
        {
            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null)
            {
                return NotFound(new { message = "Booking inquiry not found." });
            }

            booking.Status = "REJECTED";
            if (!string.IsNullOrWhiteSpace(dto?.Reason))
            {
                booking.AgentNotes = dto.Reason;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Booking proposal rejected.",
                booking
            });
        }
    }

    public record ApproveBookingRequestDto(
        Guid? ReplacementVehicleSlotId,
        Guid? ReplacementGuideSlotId,
        decimal? FinalPriceQuoteLkr,
        decimal? FinalPriceQuoteUsd,
        string? AgentNotes
    );

    public record RejectBookingRequestDto(
        string? Reason
    );
}
