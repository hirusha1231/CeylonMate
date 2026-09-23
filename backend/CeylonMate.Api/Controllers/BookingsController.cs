using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CeylonMate.Api.Data;
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

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _context.Bookings.ToListAsync();
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

            // If a trip request or quotation integer was passed instead:
            if (booking == null && int.TryParse(id, out int altId))
            {
                booking = await _context.Bookings.FirstOrDefaultAsync(b => b.TripRequestId == altId);
            }

            if (booking == null)
            {
                // Return 204 or 404 cleanly so client doesn't encounter 405 Method Not Allowed
                return NoContent();
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
