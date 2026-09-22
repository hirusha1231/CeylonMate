using CeylonMate.Api.Models.Itinerary;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly CeylonMateDbContext _context;

    public BookingsController(CeylonMateDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Reservations)
            .ToListAsync();
        return Ok(bookings);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Reservations)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
        {
            return NotFound();
        }

        return Ok(booking);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Booking booking)
    {
        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Booking updatedBooking)
    {
        var existing = await _context.Bookings.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        existing.Status = updatedBooking.Status ?? existing.Status;
        existing.BookingReference = updatedBooking.BookingReference ?? existing.BookingReference;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound();
        }

        _context.Bookings.Remove(booking);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}