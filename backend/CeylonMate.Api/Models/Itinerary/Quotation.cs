namespace CeylonMate.Api.Models.Itinerary;

public class Quotation
{
    public int Id { get; set; }
    public int ItineraryId { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Itinerary? Itinerary { get; set; }
    public ICollection<QuotationItem> Items { get; set; } = new List<QuotationItem>();
}