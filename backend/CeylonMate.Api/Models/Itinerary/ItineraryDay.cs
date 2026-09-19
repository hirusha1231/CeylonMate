namespace CeylonMate.Api.Models.Itinerary;

public class ItineraryDay
{
    public int Id { get; set; }
    public int ItineraryId { get; set; }
    public int DayNumber { get; set; }
    public DateTime Date { get; set; }
    public string Region { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public Itinerary Itinerary { get; set; } = null!;
    public ICollection<ItineraryItem> Items { get; set; } = new List<ItineraryItem>();
}