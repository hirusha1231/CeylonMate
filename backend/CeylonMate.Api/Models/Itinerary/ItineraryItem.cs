namespace CeylonMate.Api.Models.Itinerary;

public class ItineraryItem
{
    public int Id { get; set; }
    public int ItineraryDayId { get; set; }
    public int? AttractionId { get; set; }
    public int? AttractionSlotId { get; set; }
    public int? TransportSlotId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string? Notes { get; set; }

    public ItineraryDay ItineraryDay { get; set; } = null!;
}