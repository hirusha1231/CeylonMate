using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Models;

public class TransportSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TransportOptionId { get; set; }
    public TransportOption? TransportOption { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public Guid? VehicleCatalogId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public VehicleFleetCatalog? VehicleCatalog { get; set; }

    public string? RouteDescription { get; set; }

    public Guid? OriginDestinationId { get; set; }
    public Guid? DestinationId { get; set; }

    public DateTimeOffset StartTimeUtc { get; set; }
    public DateTimeOffset EndTimeUtc { get; set; }

    public DateTime DepartureTime => StartTimeUtc.UtcDateTime;
    public DateTime ArrivalTime => EndTimeUtc.UtcDateTime;

    public VehicleType VehicleType { get; set; } = VehicleType.SEDAN;
    public SlotStatus Status { get; set; } = SlotStatus.AVAILABLE;

    public decimal DailyRate { get; set; }
    public string? Currency { get; set; } = "LKR";

    public DateTimeOffset? HeldUntilUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();
}
