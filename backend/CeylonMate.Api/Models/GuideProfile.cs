using System.ComponentModel.DataAnnotations;
using CeylonMate.Api.Auth;

namespace CeylonMate.Api.Models;

public class GuideProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string? FullName { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Bio { get; set; }
    public string? LanguagesSpoken { get; set; }
    public string? Specialties { get; set; }
    public string? LicenseNumber { get; set; }
    public string? LicenseType { get; set; } = "National Tourist Guide Lecturer";
    public bool IsChauffeur { get; set; } = false;
    public string? DrivingLicenseClass { get; set; }
    public decimal Rating { get; set; } = 5.0m;
    public int ReviewCount { get; set; } = 0;
    public decimal DefaultDailyRateLkr { get; set; } = 18000m;
    public decimal DailyRate { get; set; } = 18000m;
    public string Currency { get; set; } = "LKR";
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();

    public ICollection<GuideAvailability> Availabilities { get; set; } = new List<GuideAvailability>();
    public ICollection<GuideAvailabilitySlot> AvailabilitySlots { get; set; } = new List<GuideAvailabilitySlot>();
}
