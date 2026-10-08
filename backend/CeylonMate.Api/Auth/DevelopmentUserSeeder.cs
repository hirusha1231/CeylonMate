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
                FullName = role.ToString(),
                PasswordHash = string.Empty,
                Role = role
            };
            user.PasswordHash = passwordHasher.HashPassword(user, seedOptions.Password);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync(cancellationToken);

        // Fix any guide users whose FullName is empty or still contains an email address
        var existingGuideUsers = await db.Users.Where(u => u.Role == UserRole.LOCAL_GUIDE).ToListAsync(cancellationToken);
        foreach (var gu in existingGuideUsers)
        {
            if (string.IsNullOrWhiteSpace(gu.FullName) || gu.FullName.Contains("@"))
            {
                // Derive a human-readable name from the email prefix (e.g. "john.doe" → "John Doe")
                var prefix = gu.Email.Split('@')[0].Replace('.', ' ').Replace('_', ' ');
                gu.FullName = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(prefix);
                db.Users.Update(gu);
            }
        }

        // Sync guide profile names from user records
        var existingGuideProfiles = await db.GuideProfiles.Include(p => p.User).ToListAsync(cancellationToken);
        foreach (var gp in existingGuideProfiles)
        {
            if (string.IsNullOrWhiteSpace(gp.FullName) || gp.FullName.Contains("@"))
            {
                gp.FullName = !string.IsNullOrWhiteSpace(gp.User?.FullName) && !gp.User.FullName.Contains("@")
                    ? gp.User.FullName
                    : "Certified Guide";
                db.GuideProfiles.Update(gp);
            }
        }
        await db.SaveChangesAsync(cancellationToken);

        // Guide accounts and availability are created via registration + Guide Availability Management.
        // No hardcoded guide accounts or availability slots are seeded here.

        // Ensure every LOCAL_GUIDE user has a GuideProfile row (safety net)
        foreach (var gu in existingGuideUsers)
        {
            if (!await db.GuideProfiles.AnyAsync(p => p.UserId == gu.Id, cancellationToken))
            {
                db.GuideProfiles.Add(new GuideProfile
                {
                    UserId = gu.Id,
                    FullName = gu.FullName ?? "Certified Guide",
                    Currency = "LKR",
                    IsActive = true
                });
            }
        }
        await db.SaveChangesAsync(cancellationToken);




        // Seed AttractionSlots if empty
        if (!await db.AttractionSlots.AnyAsync(cancellationToken))
        {
            var destinationId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var destination = await db.Destinations.SingleOrDefaultAsync(x => x.Id == destinationId, cancellationToken);
            if (destination == null)
            {
                destination = new CeylonMate.Api.Destinations.Destination
                {
                    Id = destinationId,
                    Name = "Sigiriya",
                    Region = "Cultural Triangle",
                    Category = "HERITAGE",
                    Latitude = 7.9570m,
                    Longitude = 80.7603m,
                    Status = CeylonMate.Api.Destinations.DestinationStatus.ACTIVE
                };
                db.Destinations.Add(destination);
                await db.SaveChangesAsync(cancellationToken);
            }

            var attractionId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var attraction = await db.Attractions.SingleOrDefaultAsync(x => x.Id == attractionId, cancellationToken);
            if (attraction == null)
            {
                attraction = new CeylonMate.Api.Destinations.Attraction
                {
                    Id = attractionId,
                    DestinationId = destination.Id,
                    Name = "Sigiriya Rock Fortress",
                    Category = "MONUMENT",
                    BasePrice = 3000,
                    Currency = "LKR",
                    Status = CeylonMate.Api.Destinations.AttractionStatus.ACTIVE
                };
                db.Attractions.Add(attraction);
                await db.SaveChangesAsync(cancellationToken);
            }

            var now = DateTimeOffset.UtcNow;
            db.AttractionSlots.AddRange(
                new AttractionSlot
                {
                    AttractionId = attraction.Id,
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
                    AttractionId = attraction.Id,
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
