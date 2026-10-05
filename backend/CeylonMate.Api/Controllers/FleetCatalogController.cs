using System;
using System.Linq;
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
[Route("api/fleet/catalog")]
public class FleetCatalogController : ControllerBase
{
    private readonly CeylonMateDbContext _db;

    public FleetCatalogController(CeylonMateDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicFleetCatalog(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] int? durationDays,
        [FromQuery] int? passengers,
        CancellationToken cancellationToken)
    {
        var query = _db.VehicleFleetCatalogs
            .Where(x => x.IsActive);

        if (passengers.HasValue && passengers.Value > 0)
        {
            query = query.Where(x => x.MaxPassengers >= passengers.Value);
        }

        var fleet = await query
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        // Date availability filtering against active bookings
        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart))
        {
            var startDt = parsedStart.Date;
            int days = (durationDays.HasValue && durationDays.Value > 0) ? durationDays.Value : 1;
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd))
            {
                days = Math.Max(1, (int)(parsedEnd.Date - startDt).TotalDays);
            }
            var endDt = startDt.AddDays(days);

            var activeBookings = await _db.Bookings
                .AsNoTracking()
                .Where(b => b.Status != "CANCELLED" && b.Status != "REJECTED" && b.Status != "CAPACITY_FLAGGED_REJECTED")
                .ToListAsync(cancellationToken);

            var bookedVehicleIds = new HashSet<Guid>();
            var bookedVehicleNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var b in activeBookings)
            {
                if (!string.IsNullOrWhiteSpace(b.StartDate) && DateTime.TryParse(b.StartDate, out var bStart))
                {
                    int bDays = b.TripDurationDays.GetValueOrDefault(1) > 0 ? b.TripDurationDays.GetValueOrDefault(1) : 1;
                    var bEnd = bStart.Date.AddDays(bDays);
                    if (startDt < bEnd && endDt > bStart.Date)
                    {
                        if (b.VehicleCatalogId.HasValue) bookedVehicleIds.Add(b.VehicleCatalogId.Value);
                        if (b.VehicleSlotId.HasValue) bookedVehicleIds.Add(b.VehicleSlotId.Value);

                        if (!string.IsNullOrWhiteSpace(b.TravelerNotes))
                        {
                            var parts = b.TravelerNotes.Split("||");
                            if (parts.Length >= 3 && !string.IsNullOrWhiteSpace(parts[2]))
                            {
                                bookedVehicleNames.Add(parts[2].Trim());
                            }
                        }
                    }
                }
            }

            fleet = fleet
                .Where(v => !bookedVehicleIds.Contains(v.Id) && !bookedVehicleNames.Contains(v.VehicleModel))
                .ToList();
        }

        return Ok(fleet);
    }

    [HttpGet("admin-all")]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> GetAllFleetCatalogForAdmin(CancellationToken cancellationToken)
    {
        var fleet = await _db.VehicleFleetCatalogs
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(fleet);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> CreateFleetModel([FromBody] CreateVehicleFleetCatalogDto dto, CancellationToken cancellationToken)
    {
        if (dto.MaxPassengers < 1)
        {
            return BadRequest(new { message = "MaxPassengers must be at least 1." });
        }

        if (dto.DailyRateUsd.HasValue && dto.DailyRateUsd.Value < 0)
        {
            return BadRequest(new { message = "DailyRateUsd cannot be a negative value." });
        }

        var fleetItem = new VehicleFleetCatalog
        {
            Id = Guid.NewGuid(),
            CategoryBadge = dto.CategoryBadge.Trim(),
            VehicleModel = dto.VehicleModel.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            ImageUrl = dto.ImageUrl.Trim(),
            MaxPassengers = Math.Max(1, dto.MaxPassengers),
            FeatureHighlight = dto.FeatureHighlight?.Trim() ?? string.Empty,
            LuggageCapacity = dto.LuggageCapacity?.Trim() ?? string.Empty,
            DailyRateUsd = dto.DailyRateUsd.HasValue ? Math.Max(0, dto.DailyRateUsd.Value) : null,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency.Trim().ToUpper(),
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.VehicleFleetCatalogs.Add(fleetItem);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetPublicFleetCatalog), new { id = fleetItem.Id }, fleetItem);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> UpdateFleetModel(Guid id, [FromBody] UpdateVehicleFleetCatalogDto dto, CancellationToken cancellationToken)
    {
        if (dto.MaxPassengers < 1)
        {
            return BadRequest(new { message = "MaxPassengers must be at least 1." });
        }

        if (dto.DailyRateUsd.HasValue && dto.DailyRateUsd.Value < 0)
        {
            return BadRequest(new { message = "DailyRateUsd cannot be a negative value." });
        }

        var fleetItem = await _db.VehicleFleetCatalogs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (fleetItem == null)
        {
            return NotFound(new { message = $"Fleet vehicle model with ID '{id}' was not found." });
        }

        fleetItem.CategoryBadge = dto.CategoryBadge.Trim();
        fleetItem.VehicleModel = dto.VehicleModel.Trim();
        fleetItem.Description = dto.Description?.Trim() ?? string.Empty;
        fleetItem.ImageUrl = dto.ImageUrl.Trim();
        fleetItem.MaxPassengers = Math.Max(1, dto.MaxPassengers);
        fleetItem.FeatureHighlight = dto.FeatureHighlight?.Trim() ?? string.Empty;
        fleetItem.LuggageCapacity = dto.LuggageCapacity?.Trim() ?? string.Empty;
        fleetItem.DailyRateUsd = dto.DailyRateUsd.HasValue ? Math.Max(0, dto.DailyRateUsd.Value) : null;
        fleetItem.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency.Trim().ToUpper();
        fleetItem.IsActive = dto.IsActive;
        fleetItem.DisplayOrder = dto.DisplayOrder;
        fleetItem.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(fleetItem);
    }

    [HttpPatch("{id:guid}/toggle-status")]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> ToggleActiveStatus(Guid id, CancellationToken cancellationToken)
    {
        var fleetItem = await _db.VehicleFleetCatalogs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (fleetItem == null)
        {
            return NotFound(new { message = $"Fleet vehicle model with ID '{id}' was not found." });
        }

        fleetItem.IsActive = !fleetItem.IsActive;
        fleetItem.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { id = fleetItem.Id, isActive = fleetItem.IsActive, message = $"Fleet model status is now {(fleetItem.IsActive ? "active & published" : "inactive")}." });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> DeleteFleetModel(Guid id, CancellationToken cancellationToken)
    {
        var fleetItem = await _db.VehicleFleetCatalogs.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (fleetItem == null)
        {
            return NotFound(new { message = $"Fleet vehicle model with ID '{id}' was not found." });
        }

        _db.VehicleFleetCatalogs.Remove(fleetItem);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Fleet vehicle model deleted successfully." });
    }
}
