using System.ComponentModel.DataAnnotations;
using CeylonMate.Api.Auth;

namespace CeylonMate.Api.Models;

public class GuideProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string? Bio { get; set; }
    public string? LanguagesSpoken { get; set; }
    public string? LicenseNumber { get; set; }
    public decimal DailyRate { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[] RowVersion { get; set; } = Guid.NewGuid().ToByteArray();

    public ICollection<GuideAvailability> Availabilities { get; set; } = new List<GuideAvailability>();
}
