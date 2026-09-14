using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.DTOs;
using CeylonMate.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Services;

public interface ICapacityReservationService
{
    Task<CapacitySearchResponseDto> SearchCapacityAsync(CapacitySearchQueryDto query, CancellationToken ct = default);
    Task<ReservationResultDto> ReserveResourcesAsync(ReservationRequestDto dto, CancellationToken ct = default);
    Task<IEnumerable<GuideAvailabilityDto>> GetGuideAvailabilityAsync(Guid guideUserId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default);
    Task<GuideAvailabilityDto> AddGuideAvailabilityAsync(Guid guideUserId, CreateGuideAvailabilityRequestDto request, CancellationToken ct = default);
}

public sealed class CapacityReservationService(CeylonMateDbContext db) : ICapacityReservationService
{
    public async Task<CapacitySearchResponseDto> SearchCapacityAsync(CapacitySearchQueryDto query, CancellationToken ct = default)
    {
        var targetDate = query.Date?.UtcDateTime.Date;

        // Search Guides
        var guideQuery = db.GuideAvailabilities
            .AsNoTracking()
            .Include(x => x.GuideProfile)
            .Where(x => x.Status == AvailabilityStatus.AVAILABLE && x.BookedCapacity < x.MaxCapacity);

        if (targetDate.HasValue)
        {
            guideQuery = guideQuery.Where(x => x.StartTimeUtc.Date <= targetDate.Value && x.EndTimeUtc.Date >= targetDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Language))
        {
            var lang = query.Language.Trim().ToLower();
            guideQuery = guideQuery.Where(x => x.GuideProfile != null &&
                x.GuideProfile.LanguagesSpoken != null &&
                x.GuideProfile.LanguagesSpoken.ToLower().Contains(lang));
        }

        var availableGuides = await guideQuery.Select(g => new GuideAvailabilityDto(
            g.Id,
            g.LocalGuideUserId,
            g.GuideProfileId,
            g.StartTimeUtc,
            g.EndTimeUtc,
            g.SlotType,
            g.Status,
            g.MaxCapacity,
            g.BookedCapacity,
            g.PriceAmount,
            g.Currency,
            g.Notes,
            g.RowVersion
        )).ToListAsync(ct);

        // Search Transport
        var transportQuery = db.TransportSlots
            .AsNoTracking()
            .Include(x => x.TransportOption)
            .Where(x => x.Status == SlotStatus.AVAILABLE && x.AvailableSeats >= query.PartySize);

        if (targetDate.HasValue)
        {
            transportQuery = transportQuery.Where(x => x.StartTimeUtc.Date <= targetDate.Value && x.EndTimeUtc.Date >= targetDate.Value);
        }

        if (query.VehicleType.HasValue)
        {
            transportQuery = transportQuery.Where(x => x.VehicleType == query.VehicleType.Value);
        }

        var availableTransport = await transportQuery.Select(t => new TransportSlotDto(
            t.Id,
            t.TransportOptionId,
            t.TransportOption != null ? t.TransportOption.Title : string.Empty,
            t.VehicleType,
            t.OriginDestinationId,
            t.DestinationId,
            t.StartTimeUtc,
            t.EndTimeUtc,
            t.Status,
            t.TotalSeats,
            t.AvailableSeats,
            t.PricePerSeat,
            t.Currency,
            t.RowVersion
        )).ToListAsync(ct);

        // Search Attraction Slots
        var attractionQuery = db.AttractionSlots
            .AsNoTracking()
            .Where(x => x.Status == SlotStatus.AVAILABLE && (x.MaxCapacity - x.BookedCapacity) >= query.PartySize);

        if (targetDate.HasValue)
        {
            attractionQuery = attractionQuery.Where(x => x.StartTimeUtc.Date <= targetDate.Value && x.EndTimeUtc.Date >= targetDate.Value);
        }

        if (query.AttractionId.HasValue)
        {
            attractionQuery = attractionQuery.Where(x => x.AttractionId == query.AttractionId.Value);
        }

        var availableAttractions = await attractionQuery.Select(a => new AttractionSlotDto(
            a.Id,
            a.AttractionId,
            a.StartTimeUtc,
            a.EndTimeUtc,
            a.Status,
            a.MaxCapacity,
            a.BookedCapacity,
            a.PriceAmount,
            a.Currency,
            a.Notes,
            a.RowVersion
        )).ToListAsync(ct);

        return new CapacitySearchResponseDto(availableGuides, availableTransport, availableAttractions);
    }

    public async Task<ReservationResultDto> ReserveResourcesAsync(ReservationRequestDto dto, CancellationToken ct = default)
    {
        var partySize = dto.PartySize > 0 ? dto.PartySize : 1;
        var strategy = db.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                // 1. Lock/Validate Guide Slot
                if (dto.GuideSlotId.HasValue)
                {
                    var guideSlot = await db.GuideAvailabilities
                        .SingleOrDefaultAsync(x => x.Id == dto.GuideSlotId.Value, ct);

                    if (guideSlot is null)
                        return ReservationResultDto.Failure("Guide slot not found.", "GUIDE");

                    if (guideSlot.Status != AvailabilityStatus.AVAILABLE || guideSlot.BookedCapacity >= guideSlot.MaxCapacity)
                        return ReservationResultDto.Failure("Guide slot is no longer available or fully booked.", "GUIDE");

                    if (dto.GuideSlotRowVersion is not null && dto.GuideSlotRowVersion.Length > 0)
                    {
                        db.Entry(guideSlot).Property(x => x.RowVersion).OriginalValue = dto.GuideSlotRowVersion;
                    }

                    guideSlot.BookedCapacity += 1;
                    if (guideSlot.BookedCapacity >= guideSlot.MaxCapacity)
                    {
                        guideSlot.Status = AvailabilityStatus.BOOKED;
                    }
                    guideSlot.RowVersion = Guid.NewGuid().ToByteArray();
                    guideSlot.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }

                // 2. Lock/Validate Transport Slot
                if (dto.TransportSlotId.HasValue)
                {
                    var transportSlot = await db.TransportSlots
                        .SingleOrDefaultAsync(x => x.Id == dto.TransportSlotId.Value, ct);

                    if (transportSlot is null)
                        return ReservationResultDto.Failure("Transport slot not found.", "TRANSPORT");

                    if (transportSlot.Status != SlotStatus.AVAILABLE || transportSlot.AvailableSeats < partySize)
                        return ReservationResultDto.Failure("Transport slot does not have sufficient available seats.", "TRANSPORT");

                    if (dto.TransportSlotRowVersion is not null && dto.TransportSlotRowVersion.Length > 0)
                    {
                        db.Entry(transportSlot).Property(x => x.RowVersion).OriginalValue = dto.TransportSlotRowVersion;
                    }

                    transportSlot.AvailableSeats -= partySize;
                    if (transportSlot.AvailableSeats <= 0)
                    {
                        transportSlot.Status = SlotStatus.BOOKED;
                    }
                    transportSlot.RowVersion = Guid.NewGuid().ToByteArray();
                    transportSlot.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }

                // 3. Lock/Validate Attraction Slot
                if (dto.AttractionSlotId.HasValue)
                {
                    var attractionSlot = await db.AttractionSlots
                        .SingleOrDefaultAsync(x => x.Id == dto.AttractionSlotId.Value, ct);

                    if (attractionSlot is null)
                        return ReservationResultDto.Failure("Attraction slot not found.", "ATTRACTION");

                    if (attractionSlot.Status != SlotStatus.AVAILABLE || (attractionSlot.BookedCapacity + partySize) > attractionSlot.MaxCapacity)
                        return ReservationResultDto.Failure("Attraction slot capacity exceeded.", "ATTRACTION");

                    if (dto.AttractionSlotRowVersion is not null && dto.AttractionSlotRowVersion.Length > 0)
                    {
                        db.Entry(attractionSlot).Property(x => x.RowVersion).OriginalValue = dto.AttractionSlotRowVersion;
                    }

                    attractionSlot.BookedCapacity += partySize;
                    if (attractionSlot.BookedCapacity >= attractionSlot.MaxCapacity)
                    {
                        attractionSlot.Status = SlotStatus.BOOKED;
                    }
                    attractionSlot.RowVersion = Guid.NewGuid().ToByteArray();
                    attractionSlot.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                return ReservationResultDto.Ok(
                    "Resources successfully reserved.",
                    dto.GuideSlotId,
                    dto.TransportSlotId,
                    dto.AttractionSlotId);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return ReservationResultDto.Failure("Concurrency conflict detected while attempting to reserve resources. Double-booking prevented.", "CONCURRENCY_CONFLICT");
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }

    public async Task<IEnumerable<GuideAvailabilityDto>> GetGuideAvailabilityAsync(Guid guideUserId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default)
    {
        var query = db.GuideAvailabilities
            .AsNoTracking()
            .Where(x => x.LocalGuideUserId == guideUserId);

        if (startDate.HasValue)
        {
            query = query.Where(x => x.StartTimeUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(x => x.EndTimeUtc <= endDate.Value);
        }

        return await query
            .OrderBy(x => x.StartTimeUtc)
            .Select(g => new GuideAvailabilityDto(
                g.Id,
                g.LocalGuideUserId,
                g.GuideProfileId,
                g.StartTimeUtc,
                g.EndTimeUtc,
                g.SlotType,
                g.Status,
                g.MaxCapacity,
                g.BookedCapacity,
                g.PriceAmount,
                g.Currency,
                g.Notes,
                g.RowVersion
            ))
            .ToListAsync(ct);
    }

    public async Task<GuideAvailabilityDto> AddGuideAvailabilityAsync(Guid guideUserId, CreateGuideAvailabilityRequestDto request, CancellationToken ct = default)
    {
        // Ensure User record exists to satisfy foreign key FK_guide_availabilities_users_LocalGuideUserId
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == guideUserId, ct);
        if (user is null)
        {
            user = new User
            {
                Id = guideUserId,
                Email = $"guide.{guideUserId.ToString()[..8]}@local.ceylonmate",
                NormalizedEmail = $"GUIDE.{guideUserId.ToString()[..8]}@LOCAL.CEYLONMATE",
                PasswordHash = "hashed_demo_password",
                Role = UserRole.LOCAL_GUIDE,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);
        }

        var profile = await db.GuideProfiles.SingleOrDefaultAsync(x => x.UserId == user.Id, ct);

        var availability = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = user.Id,
            GuideProfileId = profile?.Id,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            SlotType = request.SlotType,
            Status = AvailabilityStatus.AVAILABLE,
            MaxCapacity = request.MaxCapacity > 0 ? request.MaxCapacity : 1,
            BookedCapacity = 0,
            PriceAmount = request.PriceAmount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency,
            Notes = request.Notes,
            RowVersion = Guid.NewGuid().ToByteArray(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.GuideAvailabilities.Add(availability);
        await db.SaveChangesAsync(ct);

        return new GuideAvailabilityDto(
            availability.Id,
            availability.LocalGuideUserId,
            availability.GuideProfileId,
            availability.StartTimeUtc,
            availability.EndTimeUtc,
            availability.SlotType,
            availability.Status,
            availability.MaxCapacity,
            availability.BookedCapacity,
            availability.PriceAmount,
            availability.Currency,
            availability.Notes,
            availability.RowVersion
        );
    }
}