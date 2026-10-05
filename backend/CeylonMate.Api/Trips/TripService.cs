using CeylonMate.Api.Data;
using CeylonMate.Api.Models.Itinerary;
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
        var bookingRef = $"CM-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";
        var sDateStr = input.StartDate != default ? input.StartDate.ToString("yyyy-MM-dd") : DateTime.UtcNow.ToString("yyyy-MM-dd");
        var duration = input.EndDate >= input.StartDate && input.StartDate != default ? Math.Max(1, input.EndDate.DayNumber - input.StartDate.DayNumber) : 5;

        var booking = new Booking
        {
            TravelerUserId = userId.ToString(),
            BookingReference = bookingRef,
            Status = "PENDING_CONCIERGE_REVIEW",
            VehicleCapacityStatus = "HELD_PENDING_CONFIRMATION",
            GuideAssignmentStatus = "NOT_REQUIRED",
            TripDurationDays = duration,
            PassengerCount = input.PartySize > 0 ? input.PartySize : 2,
            StartDate = sDateStr,
            PickupTime = "08:00 AM",
            TravelerNotes = $"{input.Objective}||Curated Sri Lanka Corridor||Executive Luxury Fleet||Self-Guided||{input.Budget}||{(input.Budget * 300m)}||{input.Objective}",
            AgentNotes = $"Trip Objective: {input.Objective} | Budget: ${input.Budget} USD",
            FinalPriceQuoteUsd = input.Budget,
            FinalPriceQuoteLkr = input.Budget * 300m,
            BookedAt = DateTime.UtcNow
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync(ct);

        return new TripResponse(
            Guid.NewGuid(),
            userId,
            Guid.Empty,
            input.Objective,
            input.StartDate,
            input.EndDate,
            input.Budget,
            input.Currency,
            input.PartySize,
            input.StartingLatitude,
            input.StartingLongitude,
            input.AccessibilityNeeds,
            TripStatus.SUBMITTED,
            DateTime.SpecifyKind(booking.BookedAt, DateTimeKind.Utc),
            DateTime.SpecifyKind(booking.BookedAt, DateTimeKind.Utc)
        );
    }

    public async Task<TripResponse?> GetAsync(Guid id, Guid userId, bool staff, CancellationToken ct)
    {
        var idStr = id.ToString();
        var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(x => x.TravelerUserId == idStr || x.Id.ToString() == idStr, ct);
        if (booking is null) return null;
        var sDate = DateOnly.TryParse(booking.StartDate, out var s) ? s : DateOnly.FromDateTime(booking.BookedAt);
        var eDate = sDate.AddDays(booking.TripDurationDays ?? 5);
        var objective = !string.IsNullOrWhiteSpace(booking.TravelerNotes) && booking.TravelerNotes.Contains("||")
            ? booking.TravelerNotes.Split("||")[0].Trim()
            : (!string.IsNullOrWhiteSpace(booking.TravelerNotes) ? booking.TravelerNotes : "Bespoke Journey");
        return new TripResponse(
            id,
            userId,
            Guid.Empty,
            objective,
            sDate,
            eDate,
            booking.FinalPriceQuoteUsd ?? 500m,
            "USD",
            booking.PassengerCount ?? 2,
            null,
            null,
            null,
            TripStatus.SUBMITTED,
            DateTime.SpecifyKind(booking.BookedAt, DateTimeKind.Utc),
            DateTime.SpecifyKind(booking.BookedAt, DateTimeKind.Utc)
        );
    }

    public async Task<PagedResponse<TripResponse>> SearchAsync(Guid? travelerId, TripStatus? status,
        int page, int pageSize, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking().AsQueryable();
        if (travelerId.HasValue)
        {
            var tidStr = travelerId.Value.ToString();
            query = query.Where(x => x.TravelerUserId == tidStr);
        }
        var count = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.BookedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var mapped = rows.Select(b =>
        {
            var sDate = DateOnly.TryParse(b.StartDate, out var s) ? s : DateOnly.FromDateTime(b.BookedAt);
            var eDate = sDate.AddDays(b.TripDurationDays ?? 5);
            var objective = !string.IsNullOrWhiteSpace(b.TravelerNotes) && b.TravelerNotes.Contains("||")
                ? b.TravelerNotes.Split("||")[0].Trim()
                : (!string.IsNullOrWhiteSpace(b.TravelerNotes) ? b.TravelerNotes : "Bespoke Sri Lanka Expedition");
            var tStatus = b.Status switch
            {
                "CONFIRMED" => TripStatus.BOOKED,
                "APPROVED_PENDING_PAYMENT" => TripStatus.PROPOSED,
                "CANCELLED" => TripStatus.CANCELLED,
                _ => TripStatus.SUBMITTED
            };
            var travelerGuid = Guid.TryParse(b.TravelerUserId, out var g) ? g : Guid.Empty;
            return new TripResponse(
                Guid.NewGuid(),
                travelerGuid,
                Guid.Empty,
                objective,
                sDate,
                eDate,
                b.FinalPriceQuoteUsd ?? 500m,
                "USD",
                b.PassengerCount ?? 2,
                null,
                null,
                null,
                tStatus,
                DateTime.SpecifyKind(b.BookedAt, DateTimeKind.Utc),
                DateTime.SpecifyKind(b.BookedAt, DateTimeKind.Utc)
            );
        }).ToList();

        return new PagedResponse<TripResponse>(mapped, page, pageSize, count);
    }

    public async Task<TripResponse?> UpdateAsync(Guid id, Guid userId, SaveTripRequest input, CancellationToken ct)
    {
        var idStr = id.ToString();
        var booking = await db.Bookings.FirstOrDefaultAsync(x => x.TravelerUserId == idStr || x.Id.ToString() == idStr, ct);
        if (booking is null) return null;
        booking.StartDate = input.StartDate.ToString("yyyy-MM-dd");
        booking.PassengerCount = input.PartySize;
        booking.FinalPriceQuoteUsd = input.Budget;
        booking.FinalPriceQuoteLkr = input.Budget * 300m;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, userId, true, ct);
    }

    public async Task<bool> CancelAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var idStr = id.ToString();
        var booking = await db.Bookings.FirstOrDefaultAsync(x => x.TravelerUserId == idStr || x.Id.ToString() == idStr, ct);
        if (booking is null) return false;
        booking.Status = "CANCELLED";
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<TripResponse?> SubmitAsync(Guid id, Guid userId, CancellationToken ct)
    {
        return await GetAsync(id, userId, true, ct);
    }

    public async Task<TripResponse?> StartPlanningAsync(Guid id, Guid travelerUserId, CancellationToken ct)
    {
        return await GetAsync(id, travelerUserId, true, ct);
    }

    private static TravelerProfileResponse Map(TravelerProfile x) => new(x.Id, x.UserId,
        x.VisitorCategory, x.Preferences, x.CreatedAtUtc, x.UpdatedAtUtc);
}
