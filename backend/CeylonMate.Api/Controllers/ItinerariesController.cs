using CeylonMate.Api.Models.Itinerary;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItinerariesController : ControllerBase
{
    private readonly CeylonMateDbContext _context;

    public ItinerariesController(CeylonMateDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var itineraries = await _context.Itineraries
            .Include(i => i.Days)
            .ThenInclude(d => d.Items)
            .ToListAsync();
        return Ok(itineraries);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var itinerary = await _context.Itineraries
            .Include(i => i.Days)
            .ThenInclude(d => d.Items)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (itinerary == null)
        {
            return NotFound();
        }

        return Ok(itinerary);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Itinerary itinerary)
    {
        _context.Itineraries.Add(itinerary);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = itinerary.Id }, itinerary);
    }
}