using System;

namespace CeylonMate.Api.Models;

public class TransportSeatHold
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TransportSlotId { get; set; }
    public TransportSlot? TransportSlot { get; set; }

    public Guid? TravelerId { get; set; }

    public string HoldToken { get; set; } = string.Empty;
    public int SeatCount { get; set; }
    public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddMinutes(15);
    public bool IsReleasedOrConsumed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
