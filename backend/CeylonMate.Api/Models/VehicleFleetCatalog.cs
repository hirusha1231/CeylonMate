using System;

namespace CeylonMate.Api.Models;

public class VehicleFleetCatalog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CategoryBadge { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int MaxPassengers { get; set; }
    public string FeatureHighlight { get; set; } = string.Empty;
    public string LuggageCapacity { get; set; } = string.Empty;
    public decimal? DailyRateUsd { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<TransportSlot> TransportSlots { get; set; } = new List<TransportSlot>();
}
