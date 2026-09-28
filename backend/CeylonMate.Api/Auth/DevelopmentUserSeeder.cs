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

        // Seed additional local guide accounts if missing
        var additionalGuides = new[]
        {
            new { Email = "guide2@local.ceylonmate", FullName = "Dilshan Jayawardena", LicenseNumber = "SLTDA/CG/2023/1102", LicenseType = "Chauffeur Guide Lecturer", Bio = "Licensed Chauffeur Guide specializing in high-end private group expeditions, coastal transfers, and colonial hill country railway history.", Languages = "English, French, Spanish", Specialties = "Highland Tea Trails, Colonial Architecture & Gastronomy", IsChauffeur = true, DrivingClass = "Class B & C (Luxury Minibus)", Rating = 4.9m, Reviews = 52, Rate = 20000m, Photo = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400" },
            new { Email = "guide3@local.ceylonmate", FullName = "Nirosha Bandara", LicenseNumber = "SLTDA/NTG/2022/0789", LicenseType = "National Tourist Guide Lecturer", Bio = "Eco-tourism and botany specialist guide leading botanical garden excursions, Pekoe Trail trekking, and wildlife photography tours.", Languages = "English, Japanese, Sinhala", Specialties = "Botanical Excursions, Pekoe Trail Trekking & Birding", IsChauffeur = false, DrivingClass = "N/A", Rating = 5.0m, Reviews = 38, Rate = 16500m, Photo = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" },
            new { Email = "guide4@local.ceylonmate", FullName = "Tariq Mansoor", LicenseNumber = "SLTDA/CG/2024/0931", LicenseType = "Chauffeur Guide Lecturer", Bio = "Certified wildlife tracker and marine biology escort for Yala leopard safaris, Mirissa blue whale expeditions, and coastal riviera tours.", Languages = "English, Arabic, Sinhala", Specialties = "Wild Leopard Tracking, Marine Mammal Conservation & Safaris", IsChauffeur = true, DrivingClass = "Class B (4x4 Expedition)", Rating = 4.9m, Reviews = 47, Rate = 19000m, Photo = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400" }
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
                    PhotoUrl = item.Photo,
                    Bio = item.Bio,
                    LanguagesSpoken = item.Languages,
                    Specialties = item.Specialties,
                    LicenseNumber = item.LicenseNumber,
                    LicenseType = item.LicenseType,
                    IsChauffeur = item.IsChauffeur,
                    DrivingLicenseClass = item.DrivingClass,
                    Rating = item.Rating,
                    ReviewCount = item.Reviews,
                    DefaultDailyRateLkr = item.Rate,
                    DailyRate = item.Rate,
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
                    FullName = !string.IsNullOrWhiteSpace(guideUser.FullName) ? guideUser.FullName : "Anura Wickramasinghe",
                    PhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
                    Bio = "Senior SLTDA National Tourist Guide Lecturer with 15+ years experience guiding high-profile archeological, cultural triangle, and highland tea estate expeditions.",
                    LanguagesSpoken = "English, German, Sinhala",
                    Specialties = "Cultural Heritage & Ancient Kingdoms",
                    LicenseNumber = "SLTDA/NTG/2024/0842",
                    LicenseType = "National Tourist Guide Lecturer",
                    IsChauffeur = true,
                    DrivingLicenseClass = "Class B (VIP Dual/Van)",
                    Rating = 5.0m,
                    ReviewCount = 64,
                    DefaultDailyRateLkr = 18000m,
                    DailyRate = 18000m,
                    Currency = "LKR",
                    IsActive = true
                };
                db.GuideProfiles.Add(profile);
                await db.SaveChangesAsync(cancellationToken);
            }

            if (!await db.GuideAvailabilities.AnyAsync(cancellationToken))
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
