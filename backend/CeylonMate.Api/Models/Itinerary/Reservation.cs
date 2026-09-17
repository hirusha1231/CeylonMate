namespace CeylonMate.Api.Models.Itinerary;

public class Reservation
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public string ResourceType { get; set; } = string.Empty;
    public int ResourceId { get; set; }
    public int Quantity { get; set; }
    public DateTime ReservedAt { get; set; } = DateTime.UtcNow;

    public Booking Booking { get; set; } = null!;
}