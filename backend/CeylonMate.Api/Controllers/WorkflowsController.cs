using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Trips;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowsController : ControllerBase
{
    private readonly CeylonMateDbContext _context;

    public WorkflowsController(CeylonMateDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var steps = await _context.WorkflowSteps.ToListAsync();
        return Ok(steps);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var step = await _context.WorkflowSteps.FirstOrDefaultAsync(w => w.Id == id);
        if (step == null)
        {
            return NotFound();
        }

        return Ok(step);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WorkflowStep step)
    {
        if (step.WorkflowId == Guid.Empty)
        {
            step.WorkflowId = Guid.NewGuid();
        }

        var executionExists = await _context.WorkflowExecutions.AnyAsync(w => w.Id == step.WorkflowId);
        if (!executionExists)
        {
            var user = await _context.Set<User>().FirstOrDefaultAsync();
            if (user == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = "traveler@ceylonmate.local",
                    NormalizedEmail = "TRAVELER@CEYLONMATE.LOCAL",
                    PasswordHash = "AQAAAAEAACcQAAAAEHASHPLACEHOLDER==",
                    Role = UserRole.TRAVELER,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                };
                _context.Add(user);
                await _context.SaveChangesAsync();
            }

            var profile = await _context.Set<TravelerProfile>().FirstOrDefaultAsync();
            if (profile == null)
            {
                profile = new TravelerProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    VisitorCategory = "Standard",
                    Preferences = "None",
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    UpdatedAtUtc = DateTimeOffset.UtcNow
                };
                _context.Add(profile);
                await _context.SaveChangesAsync();
            }

            var trip = await _context.Set<TripRequest>().FirstOrDefaultAsync();
            if (trip == null)
            {
                trip = new TripRequest
                {
                    Id = Guid.NewGuid(),
                    TravelerId = user.Id,
                    TravelerProfileId = profile.Id,
                    Objective = "CeylonMate Test Trip",
                    Currency = "USD",
                    Budget = 500m,
                    PartySize = 2,
                    StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                    Status = TripStatus.DRAFT,
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    UpdatedAtUtc = DateTimeOffset.UtcNow
                };
                _context.Add(trip);
                await _context.SaveChangesAsync();
            }

            var defaultExecution = new WorkflowExecution
            {
                Id = step.WorkflowId,
                TripRequestId = trip.Id,
                RequestedByUserId = user.Id,
                Status = "QUEUED",
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow
            };
            _context.WorkflowExecutions.Add(defaultExecution);
            await _context.SaveChangesAsync();
        }

        _context.WorkflowSteps.Add(step);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
    }
}