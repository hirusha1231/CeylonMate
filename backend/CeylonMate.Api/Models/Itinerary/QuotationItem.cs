namespace CeylonMate.Api.Models.Itinerary;

public class QuotationItem
{
    public int Id { get; set; }
    public int QuotationId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }

    public Quotation Quotation { get; set; } = null!;
}