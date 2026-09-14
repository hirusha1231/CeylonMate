using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Models;

public class TransportSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TransportOptionId { get; set; }
    public TransportOption? TransportOption { get; set; }

    public Guid? OriginDestinationId { get; set; }
    public Guid? DestinationId { get; set; }

    public DateTimeOffset StartTimeUtc { get; set; }
    public DateTimeOffset EndTimeUtc { get; set; }

    public VehicleType VehicleType { get; set; } = VehicleType.SEDAN;
    public SlotStatus Status { get; set; } = SlotStatus.AVAILABLE;

    public int TotalSeats { get; set; }
    public int AvailableSeats { get; set; }
    public decimal PricePerSeat { get; set; }
    public string Currency { get; set; } = "LKR";

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();
}
