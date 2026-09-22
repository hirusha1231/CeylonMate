using CeylonMate.Api.Models.Itinerary;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuotationsController : ControllerBase
{
    private readonly CeylonMateDbContext _context;

    public QuotationsController(CeylonMateDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var quotations = await _context.Quotations
            .Include(q => q.Items)
            .ToListAsync();
        return Ok(quotations);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quotation == null)
        {
            return NotFound();
        }

        return Ok(quotation);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Quotation quotation)
    {
        _context.Quotations.Add(quotation);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = quotation.Id }, quotation);
    }
}