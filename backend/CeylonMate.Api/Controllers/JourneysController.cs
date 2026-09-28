using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/journeys")]
public class JourneysController : ControllerBase
{
    private readonly CeylonMateDbContext _db;

    public JourneysController(CeylonMateDbContext db)
    {
        _db = db;
    }

    [HttpGet("signature")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublishedSignatureJourneys(CancellationToken cancellationToken)
    {
        var journeys = await _db.SignatureJourneys
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(journeys);
    }

    [HttpGet("signature/{idOrSlug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSignatureJourneyByIdOrSlug(string idOrSlug, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(idOrSlug, out var guidId))
        {
            var journeyById = await _db.SignatureJourneys
                .FirstOrDefaultAsync(x => x.Id == guidId && x.IsPublished, cancellationToken);
            if (journeyById != null) return Ok(journeyById);
        }

        var journeyBySlug = await _db.SignatureJourneys
            .FirstOrDefaultAsync(x => x.Slug == idOrSlug && x.IsPublished, cancellationToken);

        if (journeyBySlug == null)
        {
            return NotFound(new { message = "Signature journey not found." });
        }

        return Ok(journeyBySlug);
    }
}
