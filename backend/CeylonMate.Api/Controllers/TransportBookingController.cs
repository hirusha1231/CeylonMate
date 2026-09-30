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
    [AllowAnonymous]
    public async Task<IActionResult> HoldVehicle(Guid slotId)
    {
        var slot = await _dbContext.TransportSlots
            .FirstOrDefaultAsync(s => s.Id == slotId);

        if (slot == null)
        {
            return NotFound(new { message = "Transport slot not found." });
        }

        var now = DateTimeOffset.UtcNow;
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
}
