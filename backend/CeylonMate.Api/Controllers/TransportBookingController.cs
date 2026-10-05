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

    [HttpPost("api/transport/slots/{slotId}/hold")]
    [HttpPost("api/capacity/transport/slots/{slotId}/hold")]
    [AllowAnonymous]
    public async Task<IActionResult> HoldVehicle(Guid slotId)
    {
        var slot = await _dbContext.TransportSlots
            .FirstOrDefaultAsync(s => s.Id == slotId);

        var now = DateTimeOffset.UtcNow;

        if (slot == null)
        {
            var fleet = await _dbContext.VehicleFleetCatalogs
                .Include(f => f.TransportSlots)
                .FirstOrDefaultAsync(f => f.Id == slotId);

            if (fleet != null)
            {
                slot = fleet.TransportSlots.FirstOrDefault();
                if (slot == null)
                {
                    var opt = await _dbContext.TransportOptions.FirstOrDefaultAsync();
                    slot = new TransportSlot
                    {
                        Id = Guid.NewGuid(),
                        VehicleCatalogId = fleet.Id,
                        TransportOptionId = opt?.Id ?? Guid.Parse("00000000-0000-0000-0000-000000000001"),
                        StartTimeUtc = now,
                        EndTimeUtc = now.AddDays(7),
                        VehicleType = VehicleType.VAN,
                        DailyRate = fleet.DailyRateUsd ?? 100m,
                        Currency = fleet.Currency,
                        Status = SlotStatus.AVAILABLE,
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now
                    };
                    _dbContext.TransportSlots.Add(slot);
                    await _dbContext.SaveChangesAsync();
                }
            }
            else
            {
                return NotFound(new { message = "Transport slot not found." });
            }
        }

        if (slot.Status == SlotStatus.RESERVED && slot.HeldUntilUtc <= now)
        {
            slot.Status = SlotStatus.AVAILABLE;
            slot.HeldUntilUtc = null;
        }

        if (slot.Status != SlotStatus.AVAILABLE)
        {
            return BadRequest(new { message = "This vehicle is not available for a temporary hold." });
        }

        var expiresAtUtc = now.AddMinutes(15);
        slot.Status = SlotStatus.RESERVED;
        slot.HeldUntilUtc = expiresAtUtc;
        slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            transportSlotId = slot.Id,
            expiresAtUtc = expiresAtUtc,
            remainingSeconds = (int)(expiresAtUtc - DateTime.UtcNow).TotalSeconds,
            message = "Vehicle held for 15 minutes."
        });
    }

    [HttpPost("api/transport/slots/{slotId}/release-hold")]
    [HttpPost("api/capacity/transport/slots/{slotId}/release-hold")]
    [HttpPost("api/transport/slots/{slotId}/unhold")]
    [HttpPost("api/capacity/transport/slots/{slotId}/unhold")]
    [HttpDelete("api/transport/slots/{slotId}/hold")]
    [HttpDelete("api/capacity/transport/slots/{slotId}/hold")]
    [AllowAnonymous]
    public async Task<IActionResult> ReleaseHoldVehicle(Guid slotId)
    {
        var slot = await _dbContext.TransportSlots
            .FirstOrDefaultAsync(s => s.Id == slotId);

        var fleet = await _dbContext.VehicleFleetCatalogs
            .Include(f => f.TransportSlots)
            .FirstOrDefaultAsync(f => f.Id == slotId || (slot != null && f.Id == slot.VehicleCatalogId));

        if (slot != null)
        {
            if (slot.Status == SlotStatus.BOOKED)
            {
                return BadRequest(new { message = "Cannot release hold on a fully booked vehicle. Please cancel the booking instead." });
            }

            slot.Status = SlotStatus.AVAILABLE;
            slot.HeldUntilUtc = null;
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }

        if (fleet != null)
        {
            fleet.IsActive = true;
            fleet.UpdatedAt = DateTime.UtcNow;

            foreach (var ts in fleet.TransportSlots)
            {
                if (ts.Status != SlotStatus.BOOKED)
                {
                    ts.Status = SlotStatus.AVAILABLE;
                    ts.HeldUntilUtc = null;
                    ts.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }
            }
        }

        var slotIdToMatch = slot?.Id;
        var catalogIdToMatch = fleet?.Id;
        var modelToMatch = fleet?.VehicleModel;

        var pendingBookings = await _dbContext.Bookings
            .Where(b => b.Status != "CONFIRMED" && b.VehicleCapacityStatus != "CONFIRMED")
            .Where(b => (slotIdToMatch.HasValue && b.VehicleSlotId == slotIdToMatch.Value) ||
                        (catalogIdToMatch.HasValue && (b.VehicleCatalogId == catalogIdToMatch.Value || b.VehicleSlotId == catalogIdToMatch.Value)) ||
                        (!string.IsNullOrWhiteSpace(modelToMatch) && ((b.TravelerNotes != null && b.TravelerNotes.Contains(modelToMatch)) || (b.AgentNotes != null && b.AgentNotes.Contains(modelToMatch)))))
            .ToListAsync();

        foreach (var b in pendingBookings)
        {
            b.VehicleSlotId = null;
            b.VehicleCatalogId = null;
            b.VehicleCapacityStatus = "AVAILABLE";
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            transportSlotId = slot?.Id ?? fleet?.Id ?? slotId,
            message = "Vehicle hold removed successfully. Vehicle is now available."
        });
    }
}
