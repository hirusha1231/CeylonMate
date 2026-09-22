namespace CeylonMate.Api.Destinations;

public enum DestinationStatus { ACTIVE, INACTIVE, UNDER_MAINTENANCE }
public enum AttractionStatus { ACTIVE, CLOSED_TEMPORARILY, INACTIVE }
public enum AdvisorySeverity { LOW, MEDIUM, HIGH, CRITICAL }
public enum AdvisoryStatus { ACTIVE, RESOLVED, EXPIRED }
public enum ReportType { WEATHER, CROWD, ROAD_BLOCK, CLOSURE, SAFETY }
public enum ReportStatus { PENDING, VERIFIED, REJECTED }

public sealed class Destination
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Region { get; set; }
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string Category { get; set; } = "CULTURE";
    public DestinationStatus Status { get; set; } = DestinationStatus.ACTIVE;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Attraction> Attractions { get; set; } = new List<Attraction>();
    public ICollection<DestinationAdvisory> Advisories { get; set; } = new List<DestinationAdvisory>();
    public ICollection<LocalGuideReport> GuideReports { get; set; } = new List<LocalGuideReport>();
}

public sealed class Attraction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public required string Name { get; set; }
    public string Category { get; set; } = "SIGHTSEEING";
    public decimal BasePrice { get; set; }
    public string Currency { get; set; } = "USD";
    public string? AccessibilityNotes { get; set; }
    public AttractionStatus Status { get; set; } = AttractionStatus.ACTIVE;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public Destination? Destination { get; set; }
    public ICollection<AttractionOpeningRule> OpeningRules { get; set; } = new List<AttractionOpeningRule>();
}

public sealed class AttractionOpeningRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AttractionId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }
    public TimeOnly? LastEntryTime { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }

    public Attraction? Attraction { get; set; }
}

public sealed class DestinationAdvisory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public string Type { get; set; } = "WEATHER";
    public AdvisorySeverity Severity { get; set; } = AdvisorySeverity.MEDIUM;
    public required string Message { get; set; }
    public DateTimeOffset StartsAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EndsAtUtc { get; set; }
    public AdvisoryStatus Status { get; set; } = AdvisoryStatus.ACTIVE;

    public Destination? Destination { get; set; }
}

public sealed class LocalGuideReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public Guid GuideId { get; set; }
    public ReportType ReportType { get; set; } = ReportType.WEATHER;
    public required string Message { get; set; }
    public string? PhotoUrl { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.VERIFIED;
    public DateTimeOffset ReportedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public Destination? Destination { get; set; }
}
