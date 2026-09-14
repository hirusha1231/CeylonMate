using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Models;

public class AttractionSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AttractionId { get; set; }

    public DateTimeOffset StartTimeUtc { get; set; }
    public DateTimeOffset EndTimeUtc { get; set; }

    public SlotStatus Status { get; set; } = SlotStatus.AVAILABLE;

    public int MaxCapacity { get; set; }
    public int BookedCapacity { get; set; }
    public decimal PriceAmount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();
}
