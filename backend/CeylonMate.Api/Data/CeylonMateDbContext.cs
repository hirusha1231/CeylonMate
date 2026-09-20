using CeylonMate.Api.Auth;
using CeylonMate.Api.Trips;
using CeylonMate.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Data;

public sealed class CeylonMateDbContext(DbContextOptions<CeylonMateDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<GuideProfile> GuideProfiles => Set<GuideProfile>();
    public DbSet<GuideAvailability> GuideAvailabilities => Set<GuideAvailability>();
    public DbSet<TransportOption> TransportOptions => Set<TransportOption>();
    public DbSet<TransportSlot> TransportSlots => Set<TransportSlot>();
    public DbSet<AttractionSlot> AttractionSlots => Set<AttractionSlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new TravelerProfileConfiguration());
        modelBuilder.ApplyConfiguration(new TripRequestConfiguration());
        modelBuilder.ApplyConfiguration(new TripRequestStatusHistoryConfiguration());
        modelBuilder.ApplyConfiguration(new WorkflowExecutionConfiguration());
        base.OnModelCreating(modelBuilder);

        var user = modelBuilder.Entity<User>();
        user.ToTable("users");
        user.HasKey(x => x.Id);
        user.HasIndex(x => x.NormalizedEmail).IsUnique();
        user.Property(x => x.Email).HasMaxLength(254).IsRequired();
        user.Property(x => x.NormalizedEmail).HasMaxLength(254).IsRequired();
        user.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        user.Property(x => x.Role).HasConversion<string>().HasMaxLength(32).IsRequired();

        // GuideProfile Configuration
        var guideProfile = modelBuilder.Entity<GuideProfile>();
        guideProfile.ToTable("guide_profiles");
        guideProfile.HasKey(x => x.Id);
        guideProfile.HasIndex(x => x.UserId).IsUnique();
        guideProfile.Property(x => x.Bio).HasMaxLength(1000);
        guideProfile.Property(x => x.LanguagesSpoken).HasMaxLength(256);
        guideProfile.Property(x => x.LicenseNumber).HasMaxLength(64);
        guideProfile.Property(x => x.DailyRate).HasPrecision(18, 2);
        guideProfile.Property(x => x.RowVersion).IsConcurrencyToken().ValueGeneratedNever();
        guideProfile.HasOne(x => x.User)
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

        // GuideAvailability Configuration
        var guideAvailability = modelBuilder.Entity<GuideAvailability>();
        guideAvailability.ToTable("guide_availabilities");
        guideAvailability.HasKey(x => x.Id);
        guideAvailability.HasIndex(x => new { x.LocalGuideUserId, x.StartTimeUtc, x.EndTimeUtc });
        guideAvailability.Property(x => x.SlotType).HasConversion<string>().HasMaxLength(32).IsRequired();
        guideAvailability.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        guideAvailability.Property(x => x.PriceAmount).HasPrecision(18, 2);
        guideAvailability.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        guideAvailability.Property(x => x.Notes).HasMaxLength(500);
        guideAvailability.Property(x => x.RowVersion).IsConcurrencyToken().ValueGeneratedNever();
        guideAvailability.HasOne(x => x.LocalGuideUser)
                         .WithMany()
                         .HasForeignKey(x => x.LocalGuideUserId)
                         .OnDelete(DeleteBehavior.Restrict);
        guideAvailability.HasOne(x => x.GuideProfile)
                         .WithMany(x => x.Availabilities)
                         .HasForeignKey(x => x.GuideProfileId)
                         .OnDelete(DeleteBehavior.Restrict);

        // TransportOption Configuration
        var transportOption = modelBuilder.Entity<TransportOption>();
        transportOption.ToTable("transport_options");
        transportOption.HasKey(x => x.Id);
        transportOption.Property(x => x.Title).HasMaxLength(200).IsRequired();
        transportOption.Property(x => x.VehicleType).HasConversion<string>().HasMaxLength(32).IsRequired();
        transportOption.Property(x => x.VehicleModel).HasMaxLength(100);
        transportOption.Property(x => x.LicensePlate).HasMaxLength(32);
        transportOption.Property(x => x.RowVersion).IsConcurrencyToken().ValueGeneratedNever();
        transportOption.HasOne(x => x.ProviderUser)
                       .WithMany()
                       .HasForeignKey(x => x.ProviderUserId)
                       .OnDelete(DeleteBehavior.Restrict);

        // TransportSlot Configuration
        var transportSlot = modelBuilder.Entity<TransportSlot>();
        transportSlot.ToTable("transport_slots");
        transportSlot.HasKey(x => x.Id);
        transportSlot.HasIndex(x => new { x.TransportOptionId, x.StartTimeUtc, x.EndTimeUtc });
        transportSlot.Property(x => x.VehicleType).HasConversion<string>().HasMaxLength(32).IsRequired();
        transportSlot.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        transportSlot.Property(x => x.PricePerSeat).HasPrecision(18, 2);
        transportSlot.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        transportSlot.Property(x => x.RowVersion).IsConcurrencyToken().ValueGeneratedNever();
        transportSlot.HasOne(x => x.TransportOption)
                     .WithMany(x => x.TransportSlots)
                     .HasForeignKey(x => x.TransportOptionId)
                     .OnDelete(DeleteBehavior.Restrict);

        // AttractionSlot Configuration
        var attractionSlot = modelBuilder.Entity<AttractionSlot>();
        attractionSlot.ToTable("attraction_slots");
        attractionSlot.HasKey(x => x.Id);
        attractionSlot.HasIndex(x => new { x.AttractionId, x.StartTimeUtc, x.EndTimeUtc });
        attractionSlot.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        attractionSlot.Property(x => x.PriceAmount).HasPrecision(18, 2);
        attractionSlot.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        attractionSlot.Property(x => x.Notes).HasMaxLength(500);
        attractionSlot.Property(x => x.RowVersion).IsConcurrencyToken().ValueGeneratedNever();
    }
}