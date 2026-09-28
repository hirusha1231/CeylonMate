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
        public decimal RatePerSeatLkr { get; set; }
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetVehicleSlots()
    {
        var slots = await _dbContext.TransportSlots
            .Include(s => s.VehicleCatalog)
            .Include(s => s.TransportOption)
            .OrderBy(s => s.StartTimeUtc)
            .ToListAsync();

        var fleetCatalog = await _dbContext.VehicleFleetCatalogs
            .Where(v => v.IsActive)
            .OrderBy(v => v.DisplayOrder)
            .ToListAsync();

        var resultList = new List<object>();

        foreach (var s in slots)
        {
            var modelName = s.VehicleCatalog != null ? s.VehicleCatalog.VehicleModel : (s.TransportOption != null ? s.TransportOption.Title : $"{s.VehicleType} VIP Fleet");
            var badge = s.VehicleCatalog?.CategoryBadge ?? "VIP Transport Escort";
            var img = !string.IsNullOrWhiteSpace(s.VehicleCatalog?.ImageUrl) ? s.VehicleCatalog.ImageUrl : "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800";
            var maxPassengers = s.VehicleCatalog?.MaxPassengers ?? (s.TotalSeats > 0 ? s.TotalSeats : 7);
            var features = s.VehicleCatalog?.FeatureHighlight ?? "Reclining Leather Seats, Dual AC, Onboard WiFi";
            var dailyUsd = s.VehicleCatalog?.DailyRateUsd > 0 ? s.VehicleCatalog.DailyRateUsd : (s.PricePerSeat > 0 ? s.PricePerSeat / 300m : 140m);

            resultList.Add(new
            {
                id = s.Id,
                vehicleCatalogId = s.VehicleCatalogId,
                vehicleModel = modelName,
                categoryBadge = badge,
                imageUrl = img,
                maxPassengers = maxPassengers,
                featureHighlight = features,
                dailyRateUsd = dailyUsd,
                pricePerSeatLkr = s.PricePerSeat > 0 ? s.PricePerSeat : dailyUsd * 300m,
                currency = string.IsNullOrWhiteSpace(s.Currency) ? "LKR" : s.Currency,
                status = s.Status.ToString(),
                totalSeats = s.TotalSeats,
                availableSeats = Math.Max(0, s.TotalSeats - s.BookedSeats - s.HeldSeats)
            });
        }

        foreach (var v in fleetCatalog)
        {
            if (!slots.Any(s => s.VehicleCatalogId == v.Id))
            {
                resultList.Add(new
                {
                    id = v.Id,
                    vehicleCatalogId = v.Id,
                    vehicleModel = v.VehicleModel,
                    categoryBadge = v.CategoryBadge,
                    imageUrl = v.ImageUrl,
                    maxPassengers = v.MaxPassengers,
                    featureHighlight = v.FeatureHighlight,
                    dailyRateUsd = v.DailyRateUsd,
                    pricePerSeatLkr = v.DailyRateUsd * 300m,
                    currency = "USD",
                    status = "AVAILABLE",
                    totalSeats = v.MaxPassengers,
                    availableSeats = v.MaxPassengers
                });
            }
        }

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

        if (dto.RatePerSeatLkr < 0)
        {
            return BadRequest(new { message = "Rate per seat cannot be negative." });
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
            TotalSeats = catalogVehicle.MaxPassengers, // Auto-set from catalog capacity
            BookedSeats = 0,
            HeldSeats = 0,
            PricePerSeat = dto.RatePerSeatLkr,
            Currency = "LKR",
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
            totalSeats = slot.TotalSeats,
            bookedSeats = slot.BookedSeats,
            heldSeats = slot.HeldSeats,
            availableSeats = slot.AvailableSeats,
            ratePerSeatLkr = slot.PricePerSeat,
            pricePerSeat = slot.PricePerSeat,
            currency = slot.Currency,
            status = slot.Status.ToString()
        });
    }
}
