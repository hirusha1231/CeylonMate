using System;

namespace CeylonMate.Api.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecipientUserId { get; set; }
    public string RecipientRole { get; set; } = "LOCAL_GUIDE"; // LOCAL_GUIDE, TRAVELER, TRAVEL_AGENT
    public int BookingId { get; set; }
    public string Type { get; set; } = "GUIDE_REQUEST_RAISED"; // GUIDE_REQUEST_RAISED, GUIDE_ACCEPTED, GUIDE_REJECTED
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
