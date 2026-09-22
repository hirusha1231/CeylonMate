using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Destinations;

public record CreateDestinationRequest(
    [Required] string Name,
    [Required] string Region,
    string? Description,
    decimal Latitude,
    decimal Longitude,
    string Category = "CULTURE"
);

public record UpdateDestinationRequest(
    [Required] string Name,
    [Required] string Region,
    string? Description,
    decimal Latitude,
    decimal Longitude,
    string Category,
    DestinationStatus Status
);

public record DestinationResponse(
    Guid Id,
    string Name,
    string Region,
    string? Description,
    decimal Latitude,
    decimal Longitude,
    string Category,
    DestinationStatus Status,
    DateTimeOffset CreatedAtUtc,
    List<AttractionResponse> Attractions,
    List<AdvisoryResponse> Advisories,
    List<GuideReportResponse> GuideReports
);

public record CreateAttractionRequest(
    [Required] string Name,
    string Category,
    [Range(0, 100000)] decimal BasePrice,
    string Currency,
    string? AccessibilityNotes
);

public record AttractionResponse(
    Guid Id,
    Guid DestinationId,
    string Name,
    string Category,
    decimal BasePrice,
    string Currency,
    string? AccessibilityNotes,
    AttractionStatus Status,
    List<OpeningRuleDto> OpeningRules
);

public record OpeningRuleDto(
    Guid Id,
    DayOfWeek DayOfWeek,
    TimeOnly OpenTime,
    TimeOnly CloseTime,
    TimeOnly? LastEntryTime,
    DateOnly? ValidFrom,
    DateOnly? ValidTo
);

public record CreateAdvisoryRequest(
    string Type,
    AdvisorySeverity Severity,
    [Required] string Message,
    DateTimeOffset? EndsAtUtc
);

public record AdvisoryResponse(
    Guid Id,
    Guid DestinationId,
    string Type,
    AdvisorySeverity Severity,
    string Message,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    AdvisoryStatus Status
);

public record CreateGuideReportRequest(
    ReportType ReportType,
    [Required] string Message,
    string? PhotoUrl,
    decimal? Latitude,
    decimal? Longitude
);

public record GuideReportResponse(
    Guid Id,
    Guid DestinationId,
    Guid GuideId,
    ReportType ReportType,
    string Message,
    string? PhotoUrl,
    decimal? Latitude,
    decimal? Longitude,
    ReportStatus Status,
    DateTimeOffset ReportedAtUtc
);

public record DestinationSuitabilityResponse(
    Guid DestinationId,
    string DestinationName,
    DateOnly EvaluatedDate,
    bool IsSuitable,
    string Summary,
    List<string> PassedChecks,
    List<string> Warnings,
    List<string> BlockingReasons,
    WeatherSummaryDto? Weather
);

public record WeatherSummaryDto(
    string Condition,
    decimal TemperatureC,
    int PrecipitationProbability,
    string AdvisoryNotice
);
