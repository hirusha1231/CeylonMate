using System;

namespace CeylonMate.Api.Models;

public class GuideAvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid GuideProfileId { get; set; }
    public GuideProfile? GuideProfile { get; set; }

    public DateTime Date { get; set; }
    public string TimeWindow { get; set; } = "FULL_DAY";
    public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, HELD, BOOKED, BLOCKED
    public decimal DailyRateLkr { get; set; } = 18000m;
    public Guid? AssignedBookingId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
