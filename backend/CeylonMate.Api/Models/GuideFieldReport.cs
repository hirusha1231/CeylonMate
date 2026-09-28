using System;

namespace CeylonMate.Api.Models;

public class GuideFieldReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid GuideProfileId { get; set; }
    public GuideProfile? GuideProfile { get; set; }

    public int? BookingId { get; set; }
    public string Location { get; set; } = string.Empty;
    public string WeatherStatus { get; set; } = "CLEAR"; // CLEAR, MILD_RAIN, HEAVY_RAIN, MIST
    public string CrowdLevel { get; set; } = "MODERATE"; // LOW, MODERATE, VERY_HIGH
    public string ConditionNote { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
