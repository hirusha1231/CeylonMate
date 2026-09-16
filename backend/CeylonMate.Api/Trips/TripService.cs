using CeylonMate.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Trips;

public sealed class TripService(CeylonMateDbContext db)
{
    public async Task<TravelerProfileResponse> SaveProfileAsync(Guid userId,
        SaveTravelerProfileRequest input, CancellationToken ct)
    {
        var profile = await db.Set<TravelerProfile>().SingleOrDefaultAsync(x => x.UserId == userId, ct);
        if (profile is null)
        {
            profile = new TravelerProfile { UserId = userId };
            db.Set<TravelerProfile>().Add(profile);
        }
        profile.VisitorCategory = input.VisitorCategory?.Trim();
        profile.Preferences = input.Preferences?.Trim();
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(profile);
    }

    public async Task<TravelerProfileResponse?> GetProfileAsync(Guid userId, CancellationToken ct)
    {
        var profile = await db.Set<TravelerProfile>().AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId, ct);
        return profile is null ? null : Map(profile);
    }

    public async Task<TripResponse> CreateAsync(Guid userId, SaveTripRequest input, CancellationToken ct)
    {
        var profile = await db.Set<TravelerProfile>().SingleOrDefaultAsync(x => x.UserId == userId, ct);
        if (profile is null)
        {
            profile = new TravelerProfile { UserId = userId };
            db.Set<TravelerProfile>().Add(profile);
        }
        var trip = new TripRequest
        {
            TravelerId = userId,
            TravelerProfileId = profile.Id,
            Objective = input.Objective.Trim(),
            Currency = input.Currency,
            StartDate = input.StartDate,
            EndDate = input.EndDate,
            Budget = input.Budget,
            PartySize = input.PartySize,
            StartingLatitude = input.StartingLatitude,
            StartingLongitude = input.StartingLongitude,
            AccessibilityNeeds = input.AccessibilityNeeds?.Trim()
        };
        db.Set<TripRequest>().Add(trip);
        db.Set<TripRequestStatusHistory>().Add(new TripRequestStatusHistory
        {
            TripRequestId = trip.Id,
            ToStatus = TripStatus.DRAFT,
            ChangedByUserId = userId
        });
        await db.SaveChangesAsync(ct);
        return Map(trip);
    }

    public async Task<TripResponse?> GetAsync(Guid id, Guid userId, bool staff, CancellationToken ct)
    {
        var query = db.Set<TripRequest>().AsNoTracking().Where(x => x.Id == id);
        if (!staff) query = query.Where(x => x.TravelerId == userId);
        var trip = await query.SingleOrDefaultAsync(ct);
        return trip is null ? null : Map(trip);
    }

    public async Task<PagedResponse<TripResponse>> SearchAsync(Guid? travelerId, TripStatus? status,
        int page, int pageSize, CancellationToken ct)
    {
        var query = db.Set<TripRequest>().AsNoTracking().AsQueryable();
        if (travelerId.HasValue) query = query.Where(x => x.TravelerId == travelerId.Value);
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var count = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAtUtc).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResponse<TripResponse>(rows.Select(Map).ToList(), page, pageSize, count);
    }

    public async Task<TripResponse?> UpdateAsync(Guid id, Guid userId, SaveTripRequest input, CancellationToken ct)
    {
        var trip = await db.Set<TripRequest>().SingleOrDefaultAsync(x => x.Id == id && x.TravelerId == userId, ct);
        if (trip is null) return null;
        if (trip.Status != TripStatus.DRAFT && trip.Status != TripStatus.REVISION_REQUIRED)
            throw new InvalidOperationException("Only draft or revision-required trips can be edited.");
        trip.Objective = input.Objective.Trim();
        trip.StartDate = input.StartDate;
        trip.EndDate = input.EndDate;
        trip.Budget = input.Budget;
        trip.Currency = input.Currency;
        trip.PartySize = input.PartySize;
        trip.StartingLatitude = input.StartingLatitude;
        trip.StartingLongitude = input.StartingLongitude;
        trip.AccessibilityNeeds = input.AccessibilityNeeds?.Trim();
        trip.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(trip);
    }

    public async Task<bool> CancelAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var trip = await db.Set<TripRequest>().SingleOrDefaultAsync(x => x.Id == id && x.TravelerId == userId, ct);
        if (trip is null) return false;
        if (trip.Status is not (TripStatus.DRAFT or TripStatus.SUBMITTED or TripStatus.REVISION_REQUIRED))
            throw new InvalidOperationException("This trip cannot be cancelled by the traveler.");
        Transition(trip, TripStatus.CANCELLED, userId);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<TripResponse?> SubmitAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var trip = await db.Set<TripRequest>().SingleOrDefaultAsync(x => x.Id == id && x.TravelerId == userId, ct);
        if (trip is null) return null;
        if (trip.Status is not (TripStatus.DRAFT or TripStatus.REVISION_REQUIRED))
            throw new InvalidOperationException("Only draft or revision-required trips can be submitted.");
        Transition(trip, TripStatus.SUBMITTED, userId);
        await db.SaveChangesAsync(ct);
        return Map(trip);
    }

    public async Task<TripResponse?> StartPlanningAsync(Guid id, Guid staffUserId, CancellationToken ct)
    {
        var trip = await db.Set<TripRequest>().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (trip is null) return null;
        if (trip.Status != TripStatus.SUBMITTED)
            throw new InvalidOperationException("Planning can start only from SUBMITTED.");
        Transition(trip, TripStatus.PLANNING, staffUserId);
        db.Set<WorkflowExecution>().Add(new WorkflowExecution
        {
            TripRequestId = trip.Id,
            RequestedByUserId = staffUserId
        });
        await db.SaveChangesAsync(ct);
        return Map(trip);
    }

    private void Transition(TripRequest trip, TripStatus next, Guid actor)
    {
        db.Set<TripRequestStatusHistory>().Add(new TripRequestStatusHistory
        {
            TripRequestId = trip.Id,
            FromStatus = trip.Status,
            ToStatus = next,
            ChangedByUserId = actor
        });
        trip.Status = next;
        trip.UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    private static TripResponse Map(TripRequest x) => new(x.Id, x.TravelerId, x.TravelerProfileId,
        x.Objective, x.StartDate, x.EndDate, x.Budget, x.Currency, x.PartySize,
        x.StartingLatitude, x.StartingLongitude, x.AccessibilityNeeds, x.Status,
        x.CreatedAtUtc, x.UpdatedAtUtc);

    private static TravelerProfileResponse Map(TravelerProfile x) => new(x.Id, x.UserId,
        x.VisitorCategory, x.Preferences, x.CreatedAtUtc, x.UpdatedAtUtc);
}
