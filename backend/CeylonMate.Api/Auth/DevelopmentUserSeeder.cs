using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CeylonMate.Api.Auth;

public sealed class DevelopmentUserSeeder(
    CeylonMateDbContext db,
    IPasswordHasher<User> passwordHasher,
    IOptions<SeedUsersOptions> options)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var seedOptions = options.Value;
        if (!seedOptions.Enabled) return;

        foreach (var role in Enum.GetValues<UserRole>())
        {
            var email = $"{role.ToString().ToLowerInvariant()}@local.ceylonmate";
            var normalizedEmail = email.ToUpperInvariant();
            if (await db.Users.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken)) continue;

            var user = new User
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                PasswordHash = string.Empty,
                Role = role
            };
            user.PasswordHash = passwordHasher.HashPassword(user, seedOptions.Password);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync(cancellationToken);

        // Seed GuideProfile and GuideAvailability slots if empty
        var guideUser = await db.Users.FirstOrDefaultAsync(x => x.Role == UserRole.LOCAL_GUIDE, cancellationToken);
        if (guideUser != null && !await db.GuideAvailabilities.AnyAsync(cancellationToken))
        {
            var profile = await db.GuideProfiles.FirstOrDefaultAsync(x => x.UserId == guideUser.Id, cancellationToken);
            if (profile == null)
            {
                profile = new GuideProfile
                {
                    UserId = guideUser.Id,
                    Bio = "Experienced licensed national tourist guide specializing in Kandy & Cultural Triangle tours.",
                    LanguagesSpoken = "English, German, Sinhala",
                    LicenseNumber = "SLTDA/NTG/2024/0842",
                    DailyRate = 15000
                };
                db.GuideProfiles.Add(profile);
                await db.SaveChangesAsync(cancellationToken);
            }

            var now = DateTimeOffset.UtcNow;
            db.GuideAvailabilities.AddRange(
                new GuideAvailability
                {
                    LocalGuideUserId = guideUser.Id,
                    GuideProfileId = profile.Id,
                    StartTimeUtc = now.AddDays(1).Date.AddHours(8),
                    EndTimeUtc = now.AddDays(1).Date.AddHours(17),
                    SlotType = SlotType.FULL_DAY,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = 1,
                    BookedCapacity = 0,
                    PriceAmount = 15000,
                    Currency = "LKR",
                    Notes = "Full Day Kandy Heritage Tour (Temple of the Tooth, Royal Botanical Gardens)"
                },
                new GuideAvailability
                {
                    LocalGuideUserId = guideUser.Id,
                    GuideProfileId = profile.Id,
                    StartTimeUtc = now.AddDays(2).Date.AddHours(8),
                    EndTimeUtc = now.AddDays(2).Date.AddHours(12),
                    SlotType = SlotType.HALF_DAY_MORNING,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = 1,
                    BookedCapacity = 0,
                    PriceAmount = 8500,
                    Currency = "LKR",
                    Notes = "Morning Sigiriya Fortress Guided Excursion"
                }
            );
            await db.SaveChangesAsync(cancellationToken);
        }

        // Seed TransportOption and TransportSlots if empty
        if (!await db.TransportSlots.AnyAsync(cancellationToken))
        {
            var transportOptionId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var transportOption = await db.TransportOptions.SingleOrDefaultAsync(x => x.Id == transportOptionId, cancellationToken);
            if (transportOption == null)
            {
                transportOption = new TransportOption
                {
                    Id = transportOptionId,
                    Title = "Luxury Tourist Van Fleet - CeylonMate Express",
                    VehicleType = VehicleType.VAN,
                    VehicleModel = "Toyota KDH High Roof 2023",
                    LicensePlate = "WP NC-8492",
                    PassengerCapacity = 12,
                    LuggageCapacity = 8,
                    IsActive = true
                };
                db.TransportOptions.Add(transportOption);
                await db.SaveChangesAsync(cancellationToken);
            }

            var now = DateTimeOffset.UtcNow;
            db.TransportSlots.AddRange(
                new TransportSlot
                {
                    TransportOptionId = transportOption.Id,
                    StartTimeUtc = now.AddDays(1).Date.AddHours(6),
                    EndTimeUtc = now.AddDays(1).Date.AddHours(20),
                    VehicleType = VehicleType.VAN,
                    Status = SlotStatus.AVAILABLE,
                    TotalSeats = 12,
                    AvailableSeats = 12,
                    PricePerSeat = 4500,
                    Currency = "LKR"
                },
                new TransportSlot
                {
                    TransportOptionId = transportOption.Id,
                    StartTimeUtc = now.AddDays(2).Date.AddHours(6),
                    EndTimeUtc = now.AddDays(2).Date.AddHours(20),
                    VehicleType = VehicleType.VAN,
                    Status = SlotStatus.AVAILABLE,
                    TotalSeats = 12,
                    AvailableSeats = 12,
                    PricePerSeat = 4500,
                    Currency = "LKR"
                }
            );
            await db.SaveChangesAsync(cancellationToken);
        }

        // Seed AttractionSlots if empty
        if (!await db.AttractionSlots.AnyAsync(cancellationToken))
        {
            var attractionId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var now = DateTimeOffset.UtcNow;
            db.AttractionSlots.AddRange(
                new AttractionSlot
                {
                    AttractionId = attractionId,
                    StartTimeUtc = now.AddDays(1).Date.AddHours(8),
                    EndTimeUtc = now.AddDays(1).Date.AddHours(12),
                    Status = SlotStatus.AVAILABLE,
                    MaxCapacity = 100,
                    BookedCapacity = 15,
                    PriceAmount = 3000,
                    Currency = "LKR",
                    Notes = "Morning Entry Pass - Sigiriya Rock Fortress"
                },
                new AttractionSlot
                {
                    AttractionId = attractionId,
                    StartTimeUtc = now.AddDays(1).Date.AddHours(13),
                    EndTimeUtc = now.AddDays(1).Date.AddHours(17),
                    Status = SlotStatus.AVAILABLE,
                    MaxCapacity = 100,
                    BookedCapacity = 30,
                    PriceAmount = 3000,
                    Currency = "LKR",
                    Notes = "Afternoon Entry Pass - Sigiriya Rock Fortress"
                }
            );
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
