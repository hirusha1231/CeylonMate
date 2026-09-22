namespace CeylonMate.Api.Models.Itinerary;

public class Itinerary
{
    public int Id { get; set; }
    public int TripRequestId { get; set; }
    public int? WorkflowId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "PROPOSED";
    public int TotalDays { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ItineraryDay> Days { get; set; } = new List<ItineraryDay>();
    public Quotation? Quotation { get; set; }
}