using System.ComponentModel.DataAnnotations;
using CeylonMate.Api.Auth;

namespace CeylonMate.Api.Models;

public class GuideAvailability
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LocalGuideUserId { get; set; }
    public User? LocalGuideUser { get; set; }

    public Guid? GuideProfileId { get; set; }
    public GuideProfile? GuideProfile { get; set; }

    public DateTimeOffset StartTimeUtc { get; set; }
    public DateTimeOffset EndTimeUtc { get; set; }

    public SlotType SlotType { get; set; } = SlotType.FULL_DAY;
    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.AVAILABLE;

    public int MaxCapacity { get; set; } = 1;
    public int BookedCapacity { get; set; } = 0;
    public decimal PriceAmount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();
}
