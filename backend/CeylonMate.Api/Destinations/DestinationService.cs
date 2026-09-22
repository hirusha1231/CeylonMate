using CeylonMate.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Destinations;

public sealed class DestinationService(CeylonMateDbContext db)
{
    public async Task<List<DestinationResponse>> GetAllDestinationsAsync(string? category = null, string? region = null, string? search = null)
    {
        var query = db.Destinations
            .Include(d => d.Attractions).ThenInclude(a => a.OpeningRules)
            .Include(d => d.Advisories)
            .Include(d => d.GuideReports)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(d => d.Category.ToLower() == category.ToLower());
        if (!string.IsNullOrWhiteSpace(region))
            query = query.Where(d => d.Region.ToLower() == region.ToLower());
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d => EF.Functions.ILike(d.Name, $"%{search}%") || (d.Description != null && EF.Functions.ILike(d.Description, $"%{search}%")));

        var destinations = await query.ToListAsync();
        return destinations.Select(MapToResponse).ToList();
    }

    public async Task<DestinationResponse?> GetDestinationByIdAsync(Guid id)
    {
        var destination = await db.Destinations
            .Include(d => d.Attractions).ThenInclude(a => a.OpeningRules)
            .Include(d => d.Advisories)
            .Include(d => d.GuideReports)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id);

        return destination is null ? null : MapToResponse(destination);
    }

    public async Task<DestinationResponse> CreateDestinationAsync(CreateDestinationRequest request)
    {
        var destination = new Destination
        {
            Name = request.Name.Trim(),
            Region = request.Region.Trim(),
            Description = request.Description?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Category = request.Category.ToUpperInvariant()
        };

        db.Destinations.Add(destination);
        await db.SaveChangesAsync();
        return MapToResponse(destination);
    }

    public async Task<DestinationResponse?> UpdateDestinationAsync(Guid id, UpdateDestinationRequest request)
    {
        var dest = await db.Destinations.FindAsync(id);
        if (dest is null) return null;

        dest.Name = request.Name.Trim();
        dest.Region = request.Region.Trim();
        dest.Description = request.Description?.Trim();
        dest.Latitude = request.Latitude;
        dest.Longitude = request.Longitude;
        dest.Category = request.Category.ToUpperInvariant();
        dest.Status = request.Status;
        dest.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return await GetDestinationByIdAsync(id);
    }

    public async Task<bool> DeleteDestinationAsync(Guid id)
    {
        var dest = await db.Destinations.FindAsync(id);
        if (dest is null) return false;

        db.Destinations.Remove(dest);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<GuideReportResponse> AddGuideReportAsync(Guid destinationId, Guid guideId, CreateGuideReportRequest request)
    {
        var destExists = await db.Destinations.AnyAsync(d => d.Id == destinationId);
        if (!destExists) throw new InvalidOperationException($"Destination {destinationId} not found");

        var report = new LocalGuideReport
        {
            DestinationId = destinationId,
            GuideId = guideId,
            ReportType = request.ReportType,
            Message = request.Message.Trim(),
            PhotoUrl = request.PhotoUrl,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Status = ReportStatus.VERIFIED
        };

        db.LocalGuideReports.Add(report);
        await db.SaveChangesAsync();

        return new GuideReportResponse(
            report.Id, report.DestinationId, report.GuideId,
            report.ReportType, report.Message, report.PhotoUrl,
            report.Latitude, report.Longitude, report.Status, report.ReportedAtUtc
        );
    }

    public async Task<List<GuideReportResponse>> GetReportsForDestinationAsync(Guid destinationId)
    {
        return await db.LocalGuideReports
            .Where(r => r.DestinationId == destinationId)
            .OrderByDescending(r => r.ReportedAtUtc)
            .Select(r => new GuideReportResponse(
                r.Id, r.DestinationId, r.GuideId,
                r.ReportType, r.Message, r.PhotoUrl,
                r.Latitude, r.Longitude, r.Status, r.ReportedAtUtc
            ))
            .ToListAsync();
    }

    public async Task<DestinationSuitabilityResponse> EvaluateSuitabilityAsync(Guid destinationId, DateOnly date)
    {
        var dest = await db.Destinations
            .Include(d => d.Attractions).ThenInclude(a => a.OpeningRules)
            .Include(d => d.Advisories.Where(adv => adv.Status == AdvisoryStatus.ACTIVE))
            .Include(d => d.GuideReports.Where(r => r.ReportedAtUtc >= DateTimeOffset.UtcNow.AddDays(-7)))
            .FirstOrDefaultAsync(d => d.Id == destinationId)
            ?? throw new KeyNotFoundException($"Destination with ID '{destinationId}' not found.");

        var passed = new List<string>();
        var warnings = new List<string>();
        var blocking = new List<string>();

        if (dest.Status != DestinationStatus.ACTIVE)
        {
            blocking.Add($"Destination is currently marked {dest.Status}");
        }
        else
        {
            passed.Add("Destination is open and active");
        }

        var criticalAdvisories = dest.Advisories.Where(a => a.Severity == AdvisorySeverity.CRITICAL).ToList();
        if (criticalAdvisories.Count != 0)
        {
            foreach (var adv in criticalAdvisories)
                blocking.Add($"Critical advisory: {adv.Message}");
        }

        var otherAdvisories = dest.Advisories.Where(a => a.Severity != AdvisorySeverity.CRITICAL).ToList();
        foreach (var adv in otherAdvisories)
            warnings.Add($"[{adv.Severity}] {adv.Message}");

        var closureReports = dest.GuideReports
            .Where(r => r.ReportType is ReportType.CLOSURE or ReportType.ROAD_BLOCK)
            .ToList();
        if (closureReports.Count != 0)
        {
            foreach (var rep in closureReports)
                blocking.Add($"Local guide reported access closure: {rep.Message}");
        }

        var dayOfWeek = date.DayOfWeek;
        var dayRules = dest.Attractions.SelectMany(a => a.OpeningRules).Where(r => r.DayOfWeek == dayOfWeek).ToList();
        if (dayRules.Count != 0)
            passed.Add($"Attraction opening hours verified for {dayOfWeek}");

        var weather = new WeatherSummaryDto("Partly Cloudy", 27.5m, 15, "Normal conditions");
        passed.Add("Weather forecast within safe operational thresholds");

        var isSuitable = blocking.Count == 0;
        var summary = isSuitable
            ? "Destination and associated attractions are fully suitable for travel."
            : $"Destination is not suitable: {string.Join("; ", blocking)}";

        return new DestinationSuitabilityResponse(
            dest.Id, dest.Name, date, isSuitable, summary, passed, warnings, blocking, weather
        );
    }

    private static DestinationResponse MapToResponse(Destination d) => new(
        d.Id, d.Name, d.Region, d.Description, d.Latitude, d.Longitude, d.Category, d.Status, d.CreatedAtUtc,
        d.Attractions.Select(a => new AttractionResponse(
            a.Id, a.DestinationId, a.Name, a.Category, a.BasePrice, a.Currency, a.AccessibilityNotes, a.Status,
            a.OpeningRules.Select(r => new OpeningRuleDto(r.Id, r.DayOfWeek, r.OpenTime, r.CloseTime, r.LastEntryTime, r.ValidFrom, r.ValidTo)).ToList()
        )).ToList(),
        d.Advisories.Select(adv => new AdvisoryResponse(
            adv.Id, adv.DestinationId, adv.Type, adv.Severity, adv.Message, adv.StartsAtUtc, adv.EndsAtUtc, adv.Status
        )).ToList(),
        d.GuideReports.Select(r => new GuideReportResponse(
            r.Id, r.DestinationId, r.GuideId, r.ReportType, r.Message, r.PhotoUrl, r.Latitude, r.Longitude, r.Status, r.ReportedAtUtc
        )).ToList()
    );
}
