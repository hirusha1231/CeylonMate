using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Trips;

public sealed class SaveTripRequest : IValidatableObject
{
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string Objective { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Budget { get; init; }
    [Required, RegularExpression("^[A-Z]{3}$")]
    public required string Currency { get; init; }
    [Range(1, 10000)]
    public int PartySize { get; init; }
    [Range(typeof(decimal), "-90", "90")]
    public decimal? StartingLatitude { get; init; }
    [Range(typeof(decimal), "-180", "180")]
    public decimal? StartingLongitude { get; init; }
    [StringLength(2000)]
    public string? AccessibilityNeeds { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (StartDate == default || EndDate == default || EndDate < StartDate)
            yield return new ValidationResult("EndDate must be on or after a valid StartDate.",
                [nameof(StartDate), nameof(EndDate)]);
        if (StartingLatitude.HasValue != StartingLongitude.HasValue)
            yield return new ValidationResult("Both starting coordinates are required together.",
                [nameof(StartingLatitude), nameof(StartingLongitude)]);
    }
}

public sealed class SaveTravelerProfileRequest
{
    [StringLength(64)] public string? VisitorCategory { get; init; }
    [StringLength(2000)] public string? Preferences { get; init; }
}

public sealed record TravelerProfileResponse(Guid Id, Guid UserId, string? VisitorCategory,
    string? Preferences, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record TripResponse(Guid Id, Guid TravelerId, Guid TravelerProfileId, string Objective,
    DateOnly StartDate, DateOnly EndDate, decimal Budget, string Currency, int PartySize,
    decimal? StartingLatitude, decimal? StartingLongitude, string? AccessibilityNeeds,
    TripStatus Status, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
