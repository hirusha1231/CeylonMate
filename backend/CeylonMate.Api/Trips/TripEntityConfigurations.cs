using CeylonMate.Api.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CeylonMate.Api.Trips;

public sealed class TravelerProfileConfiguration : IEntityTypeConfiguration<TravelerProfile>
{
    public void Configure(EntityTypeBuilder<TravelerProfile> entity)
    {
        entity.ToTable("traveler_profiles");
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.UserId).IsUnique();
        entity.HasOne<User>().WithOne().HasForeignKey<TravelerProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        entity.Property(x => x.VisitorCategory).HasMaxLength(64);
        entity.Property(x => x.Preferences).HasMaxLength(2000);
    }
}

public sealed class TripRequestConfiguration : IEntityTypeConfiguration<TripRequest>
{
    public void Configure(EntityTypeBuilder<TripRequest> entity)
    {
        entity.ToTable("trip_requests");
        entity.HasKey(x => x.Id);
        entity.HasOne<TravelerProfile>().WithMany().HasForeignKey(x => x.TravelerProfileId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.TravelerId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasIndex(x => new { x.TravelerId, x.CreatedAtUtc });
        entity.HasIndex(x => new { x.Status, x.StartDate });
        entity.Property(x => x.Objective).HasMaxLength(1000).IsRequired();
        entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        entity.Property(x => x.Budget).HasPrecision(18, 2);
        entity.Property(x => x.StartingLatitude).HasPrecision(9, 6);
        entity.Property(x => x.StartingLongitude).HasPrecision(9, 6);
        entity.Property(x => x.AccessibilityNeeds).HasMaxLength(2000);
        entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        entity.ToTable(t => t.HasCheckConstraint("CK_trip_requests_budget_party", "\"Budget\" > 0 AND \"PartySize\" > 0 AND \"EndDate\" >= \"StartDate\""));
    }
}

public sealed class TripRequestStatusHistoryConfiguration : IEntityTypeConfiguration<TripRequestStatusHistory>
{
    public void Configure(EntityTypeBuilder<TripRequestStatusHistory> entity)
    {
        entity.ToTable("trip_request_status_histories");
        entity.HasKey(x => x.Id);
        entity.HasOne<TripRequest>().WithMany().HasForeignKey(x => x.TripRequestId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
        entity.Property(x => x.FromStatus).HasConversion<string>().HasMaxLength(32);
        entity.Property(x => x.ToStatus).HasConversion<string>().HasMaxLength(32);
        entity.Property(x => x.Reason).HasMaxLength(500);
        entity.HasIndex(x => new { x.TripRequestId, x.ChangedAtUtc });
    }
}

public sealed class WorkflowExecutionConfiguration : IEntityTypeConfiguration<WorkflowExecution>
{
    public void Configure(EntityTypeBuilder<WorkflowExecution> entity)
    {
        entity.ToTable("workflow_executions");
        entity.HasKey(x => x.Id);
        entity.HasOne<TripRequest>().WithMany().HasForeignKey(x => x.TripRequestId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
        entity.HasIndex(x => new { x.TripRequestId, x.CreatedAtUtc });
    }
}
