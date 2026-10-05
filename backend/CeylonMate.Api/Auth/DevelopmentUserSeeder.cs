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
                FullName = role == UserRole.LOCAL_GUIDE ? "Kavinda Fernando" : role.ToString(),
                PasswordHash = string.Empty,
                Role = role
            };
            user.PasswordHash = passwordHasher.HashPassword(user, seedOptions.Password);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync(cancellationToken);

        // Update any existing guide users and profiles whose FullName is empty or contains email address
        var existingGuideUsers = await db.Users.Where(u => u.Role == UserRole.LOCAL_GUIDE).ToListAsync(cancellationToken);
        foreach (var gu in existingGuideUsers)
        {
            if (string.IsNullOrWhiteSpace(gu.FullName) || gu.FullName.Contains("@"))
            {
                gu.FullName = gu.Email == "guide2@local.ceylonmate" ? "Dilshan Jayawardena" :
                              gu.Email == "guide3@local.ceylonmate" ? "Nirosha Bandara" :
                              gu.Email == "guide4@local.ceylonmate" ? "Tariq Mansoor" : "Kavinda Fernando";
                db.Users.Update(gu);
            }
        }

        var existingGuideProfiles = await db.GuideProfiles.Include(p => p.User).ToListAsync(cancellationToken);
        foreach (var gp in existingGuideProfiles)
        {
            if (string.IsNullOrWhiteSpace(gp.FullName) || gp.FullName.Contains("@"))
            {
                gp.FullName = !string.IsNullOrWhiteSpace(gp.User?.FullName) && !gp.User.FullName.Contains("@")
                    ? gp.User.FullName
                    : "Kavinda Fernando";
                db.GuideProfiles.Update(gp);
            }
        }
        await db.SaveChangesAsync(cancellationToken);

        // Seed additional local guide accounts if missing
        var additionalGuides = new[]
        {
            new { Email = "guide2@local.ceylonmate", FullName = "Dilshan Jayawardena" },
            new { Email = "guide3@local.ceylonmate", FullName = "Nirosha Bandara" },
            new { Email = "guide4@local.ceylonmate", FullName = "Tariq Mansoor" }
        };

        foreach (var item in additionalGuides)
        {
            var normEmail = item.Email.ToUpperInvariant();
            var gUser = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normEmail, cancellationToken);
            if (gUser == null)
            {
                gUser = new User
                {
                    Email = item.Email,
                    NormalizedEmail = normEmail,
                    FullName = item.FullName,
                    Role = UserRole.LOCAL_GUIDE,
                    PasswordHash = string.Empty
                };
                gUser.PasswordHash = passwordHasher.HashPassword(gUser, seedOptions.Password);
                db.Users.Add(gUser);
                await db.SaveChangesAsync(cancellationToken);
            }

            if (!await db.GuideProfiles.AnyAsync(p => p.UserId == gUser.Id, cancellationToken))
            {
                db.GuideProfiles.Add(new GuideProfile
                {
                    UserId = gUser.Id,
                    FullName = item.FullName,
                    Currency = "LKR",
                    IsActive = true
                });
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        // Seed primary GuideProfile and GuideAvailability slots if empty
        var guideUser = await db.Users.FirstOrDefaultAsync(x => x.Role == UserRole.LOCAL_GUIDE, cancellationToken);
        if (guideUser != null)
        {
            var profile = await db.GuideProfiles.FirstOrDefaultAsync(x => x.UserId == guideUser.Id, cancellationToken);
            if (profile == null)
            {
                profile = new GuideProfile
                {
                    UserId = guideUser.Id,
                    FullName = !string.IsNullOrWhiteSpace(guideUser.FullName) && !guideUser.FullName.Contains("@") ? guideUser.FullName : "Kavinda Fernando",
                    Currency = "LKR",
                    IsActive = true
                };
                db.GuideProfiles.Add(profile);
                await db.SaveChangesAsync(cancellationToken);
            }

            if (!await db.GuideAvailabilities.AnyAsync(a => a.LocalGuideUserId == guideUser.Id, cancellationToken))
            {
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
                        PriceAmount = 18000,
                        Currency = "LKR",
                        Notes = "Full Day Kandy Heritage Tour"
                    }
                );
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        // Seed availability slots for additional guides (guide2/3/4) if they don't already have one
        var additionalGuideSeeds = new[]
        {
            new { Email = "guide2@local.ceylonmate", Rate = 15000m, Note = "Sigiriya & Cultural Triangle Expert" },
            new { Email = "guide3@local.ceylonmate", Rate = 12000m, Note = "Southern Coast & Beach Safari Guide" },
            new { Email = "guide4@local.ceylonmate", Rate = 20000m, Note = "Hill Country & Tea Estate Specialist" }
        };

        foreach (var seed in additionalGuideSeeds)
        {
            var normEmail = seed.Email.ToUpperInvariant();
            var gUser = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normEmail, cancellationToken);
            if (gUser == null) continue;

            var gProfile = await db.GuideProfiles.FirstOrDefaultAsync(p => p.UserId == gUser.Id, cancellationToken);
            if (gProfile == null) continue;

            if (!await db.GuideAvailabilities.AnyAsync(a => a.LocalGuideUserId == gUser.Id, cancellationToken))
            {
                var now2 = DateTimeOffset.UtcNow;
                db.GuideAvailabilities.Add(new GuideAvailability
                {
                    LocalGuideUserId = gUser.Id,
                    GuideProfileId = gProfile.Id,
                    StartTimeUtc = now2.AddDays(1).Date.AddHours(8),
                    EndTimeUtc = now2.AddDays(1).Date.AddHours(17),
                    SlotType = SlotType.FULL_DAY,
                    Status = AvailabilityStatus.AVAILABLE,
                    MaxCapacity = 1,
                    BookedCapacity = 0,
                    PriceAmount = seed.Rate,
                    Currency = "LKR",
                    Notes = seed.Note
                });
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        // Seed & Sync 6 VehicleFleetCatalog items and their corresponding TransportSlots
        var fleetCatalogSeeds = new[]
        {
            new
            {
                CategoryBadge = "EXECUTIVE VIP GROUP TRANSPORT",
                VehicleModel = "Toyota KDH Super GL VIP Van",
                Description = "Ideal for families and luxury groups. Dual climate control, plush leather reclining armchairs, high-speed onboard 5G Wi-Fi, and spacious luggage capacity.",
                ImageUrl = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
                MaxPassengers = 6,
                FeatureHighlight = "VIP Leather Interior & 5G Wi-Fi",
                LuggageCapacity = "6 Large Luggage",
                DailyRateUsd = 120.00m,
                DisplayOrder = 1,
                VehicleType = VehicleType.VAN
            },
            new
            {
                CategoryBadge = "PRESTIGE EXECUTIVE SEDAN",
                VehicleModel = "Mercedes-Benz E-Class Sedan",
                Description = "Unmatched elegance for couples and solo executive travelers. Whisper-quiet cabin acoustics, leather seating, and smooth transit along coastal expressways.",
                ImageUrl = "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80",
                MaxPassengers = 3,
                FeatureHighlight = "Prestige Leather Comfort",
                LuggageCapacity = "3 Large Luggage",
                DailyRateUsd = 150.00m,
                DisplayOrder = 2,
                VehicleType = VehicleType.SEDAN
            },
            new
            {
                CategoryBadge = "4X4 SAFARI & EXPEDITION",
                VehicleModel = "Toyota Land Cruiser V8 Safari",
                Description = "Heavy-duty luxury 4x4 modified for Yala and Udawalawe national park tracking. High elevation seating with pop-up roof for wildlife photography.",
                ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
                MaxPassengers = 5,
                FeatureHighlight = "High-Clearance 4x4",
                LuggageCapacity = "4 Large Luggage",
                DailyRateUsd = 180.00m,
                DisplayOrder = 3,
                VehicleType = VehicleType.SUV
            },

            new
            {
                CategoryBadge = "PREMIUM LUXURY SUV",
                VehicleModel = "Range Rover Autobiography V8 SUV",
                Description = "Supreme luxury for executive VIPs. All-wheel drive terrain response, massage executive seating, and ultra-quiet ride.",
                ImageUrl = "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
                MaxPassengers = 4,
                FeatureHighlight = "Executive Lounge Seating",
                LuggageCapacity = "4 Large Luggage",
                DailyRateUsd = 220.00m,
                DisplayOrder = 5,
                VehicleType = VehicleType.SUV
            },
            new
            {
                CategoryBadge = "LUXURY DELEGATION BUS",
                VehicleModel = "Volvo B11R Super VIP Coach",
                Description = "Ultra-capacity luxury coach for large tour delegations with reclining leather seats, onboard lavatory, and climate zones.",
                ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80",
                MaxPassengers = 30,
                FeatureHighlight = "Air Suspension & Sky Lounge",
                LuggageCapacity = "25 Large Luggage",
                DailyRateUsd = 350.00m,
                DisplayOrder = 6,
                VehicleType = VehicleType.BUS
            }
        };

        var nowTime = DateTimeOffset.UtcNow;
        var defaultTransportOptionId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        foreach (var item in fleetCatalogSeeds)
        {
            var catalogItem = await db.VehicleFleetCatalogs.FirstOrDefaultAsync(x => x.VehicleModel == item.VehicleModel, cancellationToken);
            if (catalogItem == null)
            {
                catalogItem = new VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = item.CategoryBadge,
                    VehicleModel = item.VehicleModel,
                    Description = item.Description,
                    ImageUrl = item.ImageUrl,
                    MaxPassengers = item.MaxPassengers,
                    FeatureHighlight = item.FeatureHighlight,
                    LuggageCapacity = item.LuggageCapacity,
                    DailyRateUsd = item.DailyRateUsd,
                    IsActive = true,
                    DisplayOrder = item.DisplayOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.VehicleFleetCatalogs.Add(catalogItem);
                await db.SaveChangesAsync(cancellationToken);
            }
        }


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
