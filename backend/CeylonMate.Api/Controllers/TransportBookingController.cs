using System;
using System.Linq;
using System.Threading.Tasks;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
public class TransportBookingController : ControllerBase
{
    private readonly CeylonMateDbContext _dbContext;

    public TransportBookingController(CeylonMateDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public class SeatHoldRequestDto
    {
        public int SeatsRequested { get; set; } = 1;
        public Guid? TravelerId { get; set; }
    }

    [HttpPost("api/transport/slots/{slotId}/hold")]
    [AllowAnonymous]
    public async Task<IActionResult> HoldSeats(Guid slotId, [FromBody] SeatHoldRequestDto request)
    {
        if (request.SeatsRequested <= 0)
        {
            return BadRequest(new { message = "Seats requested must be greater than zero." });
        }

        var slot = await _dbContext.TransportSlots
            .Include(s => s.VehicleCatalog)
            .FirstOrDefaultAsync(s => s.Id == slotId);

        if (slot == null)
        {
            return NotFound(new { message = "Transport slot not found." });
        }

        if (slot.Status == SlotStatus.BLOCKED)
        {
            return BadRequest(new { message = "This transport slot is currently blocked by administration." });
        }

        int availableSeats = Math.Max(0, slot.TotalSeats - slot.BookedSeats - slot.HeldSeats);
        if (availableSeats < request.SeatsRequested)
        {
            return BadRequest(new
            {
                message = $"Insufficient seats available. Requested: {request.SeatsRequested}, Available: {availableSeats}",
                availableSeats
            });
        }

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(15);
        var holdToken = Guid.NewGuid().ToString("N");

        var seatHold = new TransportSeatHold
        {
            Id = Guid.NewGuid(),
            TransportSlotId = slot.Id,
            TravelerId = request.TravelerId,
            HoldToken = holdToken,
            SeatCount = request.SeatsRequested,
            ExpiresAtUtc = expiresAtUtc,
            IsReleasedOrConsumed = false,
            CreatedAt = DateTime.UtcNow
        };

        slot.HeldSeats += request.SeatsRequested;
        slot.HeldUntilUtc = expiresAtUtc;
        slot.UpdatedAtUtc = DateTimeOffset.UtcNow;

        _dbContext.TransportSeatHolds.Add(seatHold);
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            holdToken = holdToken,
            transportSlotId = slot.Id,
            seatCount = request.SeatsRequested,
            expiresAtUtc = expiresAtUtc,
            remainingSeconds = (int)(expiresAtUtc - DateTime.UtcNow).TotalSeconds,
            message = "Seat hold confirmed for 15 minutes."
        });
    }

    [HttpPost("/api/capacity/holds/release-expired")]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> ReleaseExpiredHolds()
    {
        var now = DateTime.UtcNow;
        var expiredHolds = await _dbContext.TransportSeatHolds
            .Where(h => !h.IsReleasedOrConsumed && h.ExpiresAtUtc <= now)
            .Include(h => h.TransportSlot)
            .ToListAsync();

        foreach (var hold in expiredHolds)
        {
            hold.IsReleasedOrConsumed = true;
            if (hold.TransportSlot != null)
            {
                hold.TransportSlot.HeldSeats = Math.Max(0, hold.TransportSlot.HeldSeats - hold.SeatCount);
                if (hold.TransportSlot.HeldSeats == 0)
                {
                    hold.TransportSlot.HeldUntilUtc = null;
                }
            }
        }

        // Also check any legacy HeldUntilUtc on slots
        var legacyExpiredSlots = await _dbContext.TransportSlots
            .Where(t => t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value <= now)
            .ToListAsync();

        foreach (var slot in legacyExpiredSlots)
        {
            slot.HeldUntilUtc = null;
            slot.HeldSeats = 0;
        }

        await _dbContext.SaveChangesAsync();
        return Ok(new
        {
            success = true,
            releasedCount = expiredHolds.Count + legacyExpiredSlots.Count,
            message = "Expired holds released successfully."
        });
    }
}
