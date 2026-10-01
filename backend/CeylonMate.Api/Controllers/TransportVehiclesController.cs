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
[Route("api/capacity/vehicles")]
public class TransportVehiclesController : ControllerBase
{
    private readonly CeylonMateDbContext _dbContext;

    public TransportVehiclesController(CeylonMateDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public class CreateVehicleSlotDto
    {
        public Guid VehicleCatalogId { get; set; }
        public string RouteDescription { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime ArrivalTime { get; set; }
        public decimal DailyRate { get; set; }
        public string Currency { get; set; } = "LKR";
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetVehicleSlots()
    {
        var fleetCatalog = await _dbContext.VehicleFleetCatalogs
            .Where(v => v.IsActive)
            .OrderBy(v => v.DisplayOrder)
            .ToListAsync();

        var resultList = fleetCatalog.Select(v => new
        {
            id = v.Id,
            vehicleCatalogId = v.Id,
            vehicleModel = v.VehicleModel,
            categoryBadge = v.CategoryBadge,
            imageUrl = v.ImageUrl,
            maxPassengers = v.MaxPassengers,
            featureHighlight = v.FeatureHighlight,
            dailyRate = v.DailyRateUsd,
            currency = v.Currency ?? "USD",
            status = "AVAILABLE",
            heldUntilUtc = (DateTimeOffset?)null
        }).ToList();

        return Ok(resultList);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,CAPACITY_OFFICER")]
    public async Task<IActionResult> AddVehicleSlot([FromBody] CreateVehicleSlotDto dto)
    {
        if (dto.VehicleCatalogId == Guid.Empty)
        {
            return BadRequest(new { message = "Vehicle catalog selection is required." });
        }

        var catalogVehicle = await _dbContext.VehicleFleetCatalogs.FindAsync(dto.VehicleCatalogId);
        if (catalogVehicle == null || !catalogVehicle.IsActive)
            return BadRequest(new { message = "Selected vehicle model not found in fleet catalog or inactive." });

        if (dto.DailyRate < 0)
        {
            return BadRequest(new { message = "Daily vehicle rate cannot be negative." });
        }

        var departureUtc = DateTime.SpecifyKind(dto.DepartureTime, DateTimeKind.Utc);
        var arrivalUtc = DateTime.SpecifyKind(dto.ArrivalTime, DateTimeKind.Utc);

        if (arrivalUtc <= departureUtc)
        {
            return BadRequest(new { message = "Arrival time must be after departure time." });
        }

        var slot = new TransportSlot
        {
            Id = Guid.NewGuid(),
            TransportOptionId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            VehicleCatalogId = catalogVehicle.Id,
            RouteDescription = dto.RouteDescription.Trim(),
            StartTimeUtc = departureUtc,
            EndTimeUtc = arrivalUtc,
            DailyRate = dto.DailyRate > 0 ? dto.DailyRate : catalogVehicle.DailyRateUsd ?? 0m,
            Currency = dto.DailyRate > 0 ? dto.Currency : catalogVehicle.Currency,
            Status = SlotStatus.AVAILABLE,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        _dbContext.TransportSlots.Add(slot);
        await _dbContext.SaveChangesAsync();

        // Reload with VehicleCatalog navigation for response
        await _dbContext.Entry(slot).Reference(s => s.VehicleCatalog).LoadAsync();

        return Ok(new
        {
            id = slot.Id,
            vehicleCatalogId = slot.VehicleCatalogId,
            vehicleCatalog = slot.VehicleCatalog != null ? new
            {
                id = slot.VehicleCatalog.Id,
                vehicleModel = slot.VehicleCatalog.VehicleModel,
                categoryBadge = slot.VehicleCatalog.CategoryBadge,
                imageUrl = slot.VehicleCatalog.ImageUrl,
                maxPassengers = slot.VehicleCatalog.MaxPassengers
            } : null,
            routeDescription = slot.RouteDescription,
            departureTime = slot.StartTimeUtc.UtcDateTime,
            arrivalTime = slot.EndTimeUtc.UtcDateTime,
            startTimeUtc = slot.StartTimeUtc,
            endTimeUtc = slot.EndTimeUtc,
            maxPassengers = catalogVehicle.MaxPassengers,
            dailyRate = slot.DailyRate,
            currency = slot.Currency,
            status = slot.Status.ToString()
        });
    }
}
