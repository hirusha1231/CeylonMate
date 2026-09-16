namespace CeylonMate.Api.Trips;

public sealed class TripRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TravelerProfileId { get; set; }
    public Guid TravelerId { get; set; }
    public required string Objective { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Budget { get; set; }
    public required string Currency { get; set; }
    public int PartySize { get; set; }
    public decimal? StartingLatitude { get; set; }
    public decimal? StartingLongitude { get; set; }
    public string? AccessibilityNeeds { get; set; }
    public TripStatus Status { get; set; } = TripStatus.DRAFT;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class TripRequestStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripRequestId { get; set; }
    public TripStatus? FromStatus { get; set; }
    public TripStatus ToStatus { get; set; }
    public DateTimeOffset ChangedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? ChangedByUserId { get; set; }
    public string? Reason { get; set; }
}
