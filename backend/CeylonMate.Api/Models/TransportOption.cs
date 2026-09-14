using System.ComponentModel.DataAnnotations;
using CeylonMate.Api.Auth;

namespace CeylonMate.Api.Models;

public class TransportOption
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? ProviderUserId { get; set; }
    public User? ProviderUser { get; set; }

    public string Title { get; set; } = string.Empty;
    public VehicleType VehicleType { get; set; } = VehicleType.SEDAN;
    public string? VehicleModel { get; set; }
    public string? LicensePlate { get; set; }
    public int PassengerCapacity { get; set; }
    public int LuggageCapacity { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = [];

    public ICollection<TransportSlot> TransportSlots { get; set; } = new List<TransportSlot>();
}
