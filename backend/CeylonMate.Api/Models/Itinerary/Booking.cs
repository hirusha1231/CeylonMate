namespace CeylonMate.Api.Models.Itinerary;

public class Booking
{
    public int Id { get; set; }
    public int TripRequestId { get; set; }
    public int ItineraryId { get; set; }
    public int QuotationId { get; set; }
    public int TravelerId { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public string Status { get; set; } = "CONFIRMED";
    public DateTime BookedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}