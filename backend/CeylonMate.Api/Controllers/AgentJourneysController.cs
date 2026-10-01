using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CeylonMate.Api.Data;
using CeylonMate.Api.DTOs;
using CeylonMate.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/agent/signature-journeys")]
[Authorize(Roles = "TRAVEL_AGENT,ADMIN")]
public class AgentJourneysController : ControllerBase
{
    private readonly CeylonMateDbContext _db;

    public AgentJourneysController(CeylonMateDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSignatureJourneys(CancellationToken cancellationToken)
    {
        var journeys = await _db.SignatureJourneys
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(journeys);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSignatureJourney([FromBody] CreateSignatureJourneyDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var slug = GenerateSlug(dto.Title);

        var journey = new SignatureJourney
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Slug = slug,
            Tagline = dto.Tagline?.Trim() ?? string.Empty,
            Description = dto.Description?.Trim() ?? string.Empty,
            HeroImageUrl = dto.HeroImageUrl.Trim(),
            GalleryImages = dto.GalleryImages ?? new List<string>(),
            DurationDays = dto.DurationDays ?? 0,
            DurationNights = dto.DurationNights ?? 0,
            StartingPriceUsd = dto.StartingPriceUsd,
            StartingPriceLkr = dto.StartingPriceLkr,
            DestinationsCovered = dto.DestinationsCovered?.Trim() ?? string.Empty,
            Highlights = dto.Highlights ?? new List<string>(),
            IsPublished = dto.IsPublished,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.SignatureJourneys.Add(journey);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetAllSignatureJourneys), new { id = journey.Id }, journey);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSignatureJourney(Guid id, [FromBody] UpdateSignatureJourneyDto dto, CancellationToken cancellationToken)
    {
        var journey = await _db.SignatureJourneys.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (journey == null)
        {
            return NotFound(new { message = $"Signature journey with ID '{id}' was not found." });
        }

        journey.Title = dto.Title.Trim();
        journey.Slug = GenerateSlug(dto.Title);
        journey.Tagline = dto.Tagline?.Trim() ?? string.Empty;
        journey.Description = dto.Description?.Trim() ?? string.Empty;
        journey.HeroImageUrl = dto.HeroImageUrl.Trim();
        journey.GalleryImages = dto.GalleryImages ?? new List<string>();
        journey.DurationDays = dto.DurationDays ?? journey.DurationDays;
        journey.DurationNights = dto.DurationNights ?? journey.DurationNights;
        journey.StartingPriceUsd = dto.StartingPriceUsd;
        journey.StartingPriceLkr = dto.StartingPriceLkr;
        journey.DestinationsCovered = dto.DestinationsCovered?.Trim() ?? string.Empty;
        journey.Highlights = dto.Highlights ?? new List<string>();
        journey.IsPublished = dto.IsPublished;
        journey.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(journey);
    }

    [HttpPatch("{id:guid}/publish")]
    public async Task<IActionResult> TogglePublishStatus(Guid id, CancellationToken cancellationToken)
    {
        var journey = await _db.SignatureJourneys.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (journey == null)
        {
            return NotFound(new { message = $"Signature journey with ID '{id}' was not found." });
        }

        journey.IsPublished = !journey.IsPublished;
        journey.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { id = journey.Id, isPublished = journey.IsPublished, message = $"Journey is now {(journey.IsPublished ? "published" : "draft")}." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSignatureJourney(Guid id, CancellationToken cancellationToken)
    {
        var journey = await _db.SignatureJourneys.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (journey == null)
        {
            return NotFound(new { message = $"Signature journey with ID '{id}' was not found." });
        }

        _db.SignatureJourneys.Remove(journey);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Signature journey deleted successfully." });
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant().Trim();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}
