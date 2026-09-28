using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.DTOs;

public class CreateVehicleFleetCatalogDto
{
    [Required]
    public string CategoryBadge { get; set; } = string.Empty;

    [Required]
    public string VehicleModel { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string ImageUrl { get; set; } = string.Empty;

    [Range(1, 100, ErrorMessage = "Max passengers must be at least 1.")]
    public int MaxPassengers { get; set; }

    public string? FeatureHighlight { get; set; }

    public string? LuggageCapacity { get; set; }

    [Range(0, 1000000, ErrorMessage = "Daily rate cannot be negative.")]
    public decimal? DailyRateUsd { get; set; }

    public string Currency { get; set; } = "USD";

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; } = 0;
}

public class UpdateVehicleFleetCatalogDto : CreateVehicleFleetCatalogDto
{
}
