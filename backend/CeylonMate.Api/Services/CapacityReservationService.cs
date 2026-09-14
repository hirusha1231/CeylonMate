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
    Task<IEnumerable<TransportSlotDto>> GetTransportAvailabilityAsync(Guid transportOptionId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default);
    Task<TransportSlotDto> AddTransportSlotAsync(Guid transportOptionId, CreateTransportSlotRequestDto request, CancellationToken ct = default);
    Task<IEnumerable<AttractionSlotDto>> GetAttractionAvailabilityAsync(Guid attractionId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default);
    Task<AttractionSlotDto> AddAttractionSlotAsync(Guid attractionId, CreateAttractionSlotRequestDto request, CancellationToken ct = default);
    Task ReleaseExpiredHoldsAsync(CancellationToken ct = default);
}

public sealed class CapacityReservationService(CeylonMateDbContext db) : ICapacityReservationService
{
    public async Task ReleaseExpiredHoldsAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        // Release expired Guide Holds
        var expiredGuideHolds = await db.GuideAvailabilities
            .Where(x => x.Status == AvailabilityStatus.RESERVED && x.HeldUntilUtc.HasValue && x.HeldUntilUtc.Value < now)
            .ToListAsync(ct);

        foreach (var slot in expiredGuideHolds)
        {
            slot.Status = AvailabilityStatus.AVAILABLE;
            slot.BookedCapacity = Math.Max(0, slot.BookedCapacity - 1);
            slot.HeldUntilUtc = null;
            slot.RowVersion = Guid.NewGuid().ToByteArray();
            slot.UpdatedAtUtc = now;
        }

        // Release expired Transport Holds
        var expiredTransportHolds = await db.TransportSlots
            .Where(x => x.Status == SlotStatus.RESERVED && x.HeldUntilUtc.HasValue && x.HeldUntilUtc.Value < now)
            .ToListAsync(ct);

        foreach (var slot in expiredTransportHolds)
        {
            slot.Status = SlotStatus.AVAILABLE;
            slot.AvailableSeats = slot.TotalSeats;
            slot.HeldUntilUtc = null;
            slot.RowVersion = Guid.NewGuid().ToByteArray();
            slot.UpdatedAtUtc = now;
        }

        // Release expired Attraction Holds
        var expiredAttractionHolds = await db.AttractionSlots
            .Where(x => x.Status == SlotStatus.RESERVED && x.HeldUntilUtc.HasValue && x.HeldUntilUtc.Value < now)
            .ToListAsync(ct);

        foreach (var slot in expiredAttractionHolds)
        {
            slot.Status = SlotStatus.AVAILABLE;
            slot.BookedCapacity = 0;
            slot.HeldUntilUtc = null;
            slot.RowVersion = Guid.NewGuid().ToByteArray();
            slot.UpdatedAtUtc = now;
        }

        if (expiredGuideHolds.Count > 0 || expiredTransportHolds.Count > 0 || expiredAttractionHolds.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<CapacitySearchResponseDto> SearchCapacityAsync(CapacitySearchQueryDto query, CancellationToken ct = default)
    {
        await ReleaseExpiredHoldsAsync(ct);

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
            g.RowVersion,
            g.HeldUntilUtc
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
            t.RowVersion,
            t.HeldUntilUtc
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
            a.RowVersion,
            a.HeldUntilUtc
        )).ToListAsync(ct);

        return new CapacitySearchResponseDto(availableGuides, availableTransport, availableAttractions);
    }

    public async Task<ReservationResultDto> ReserveResourcesAsync(ReservationRequestDto dto, CancellationToken ct = default)
    {
        await ReleaseExpiredHoldsAsync(ct);

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
                    if (dto.HoldDurationMinutes.HasValue && dto.HoldDurationMinutes.Value > 0)
                    {
                        guideSlot.Status = AvailabilityStatus.RESERVED;
                        guideSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(dto.HoldDurationMinutes.Value);
                    }
                    else if (guideSlot.BookedCapacity >= guideSlot.MaxCapacity)
                    {
                        guideSlot.Status = AvailabilityStatus.BOOKED;
                        guideSlot.HeldUntilUtc = null;
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
                    if (dto.HoldDurationMinutes.HasValue && dto.HoldDurationMinutes.Value > 0)
                    {
                        transportSlot.Status = SlotStatus.RESERVED;
                        transportSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(dto.HoldDurationMinutes.Value);
                    }
                    else if (transportSlot.AvailableSeats <= 0)
                    {
                        transportSlot.Status = SlotStatus.BOOKED;
                        transportSlot.HeldUntilUtc = null;
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
                    if (dto.HoldDurationMinutes.HasValue && dto.HoldDurationMinutes.Value > 0)
                    {
                        attractionSlot.Status = SlotStatus.RESERVED;
                        attractionSlot.HeldUntilUtc = DateTimeOffset.UtcNow.AddMinutes(dto.HoldDurationMinutes.Value);
                    }
                    else if (attractionSlot.BookedCapacity >= attractionSlot.MaxCapacity)
                    {
                        attractionSlot.Status = SlotStatus.BOOKED;
                        attractionSlot.HeldUntilUtc = null;
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
        await ReleaseExpiredHoldsAsync(ct);

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
                g.RowVersion,
                g.HeldUntilUtc
            ))
            .ToListAsync(ct);
    }

    public async Task<GuideAvailabilityDto> AddGuideAvailabilityAsync(Guid guideUserId, CreateGuideAvailabilityRequestDto request, CancellationToken ct = default)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            throw new ArgumentException("EndTimeUtc must be greater than StartTimeUtc.", nameof(request));
        }

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
            availability.RowVersion,
            availability.HeldUntilUtc
        );
    }

    public async Task<IEnumerable<TransportSlotDto>> GetTransportAvailabilityAsync(Guid transportOptionId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default)
    {
        await ReleaseExpiredHoldsAsync(ct);

        var query = db.TransportSlots
            .AsNoTracking()
            .Include(x => x.TransportOption)
            .Where(x => x.TransportOptionId == transportOptionId);

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
            .Select(t => new TransportSlotDto(
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
                t.RowVersion,
                t.HeldUntilUtc
            ))
            .ToListAsync(ct);
    }

    public async Task<TransportSlotDto> AddTransportSlotAsync(Guid transportOptionId, CreateTransportSlotRequestDto request, CancellationToken ct = default)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            throw new ArgumentException("EndTimeUtc must be greater than StartTimeUtc.", nameof(request));
        }

        var transportOption = await db.TransportOptions.SingleOrDefaultAsync(x => x.Id == transportOptionId, ct);

        var slot = new TransportSlot
        {
            Id = Guid.NewGuid(),
            TransportOptionId = transportOptionId,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            VehicleType = request.VehicleType,
            Status = SlotStatus.AVAILABLE,
            TotalSeats = request.TotalSeats > 0 ? request.TotalSeats : 4,
            AvailableSeats = request.TotalSeats > 0 ? request.TotalSeats : 4,
            PricePerSeat = request.PricePerSeat,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency,
            OriginDestinationId = request.OriginDestinationId,
            DestinationId = request.DestinationId,
            RowVersion = Guid.NewGuid().ToByteArray(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.TransportSlots.Add(slot);
        await db.SaveChangesAsync(ct);

        return new TransportSlotDto(
            slot.Id,
            slot.TransportOptionId,
            transportOption != null ? transportOption.Title : string.Empty,
            slot.VehicleType,
            slot.OriginDestinationId,
            slot.DestinationId,
            slot.StartTimeUtc,
            slot.EndTimeUtc,
            slot.Status,
            slot.TotalSeats,
            slot.AvailableSeats,
            slot.PricePerSeat,
            slot.Currency,
            slot.RowVersion,
            slot.HeldUntilUtc
        );
    }

    public async Task<IEnumerable<AttractionSlotDto>> GetAttractionAvailabilityAsync(Guid attractionId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken ct = default)
    {
        await ReleaseExpiredHoldsAsync(ct);

        var query = db.AttractionSlots
            .AsNoTracking()
            .Where(x => x.AttractionId == attractionId);

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
            .Select(a => new AttractionSlotDto(
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
                a.RowVersion,
                a.HeldUntilUtc
            ))
            .ToListAsync(ct);
    }

    public async Task<AttractionSlotDto> AddAttractionSlotAsync(Guid attractionId, CreateAttractionSlotRequestDto request, CancellationToken ct = default)
    {
        if (request.EndTimeUtc <= request.StartTimeUtc)
        {
            throw new ArgumentException("EndTimeUtc must be greater than StartTimeUtc.", nameof(request));
        }

        var slot = new AttractionSlot
        {
            Id = Guid.NewGuid(),
            AttractionId = attractionId,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            Status = SlotStatus.AVAILABLE,
            MaxCapacity = request.MaxCapacity > 0 ? request.MaxCapacity : 50,
            BookedCapacity = 0,
            PriceAmount = request.PriceAmount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency,
            Notes = request.Notes,
            RowVersion = Guid.NewGuid().ToByteArray(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        db.AttractionSlots.Add(slot);
        await db.SaveChangesAsync(ct);

        return new AttractionSlotDto(
            slot.Id,
            slot.AttractionId,
            slot.StartTimeUtc,
            slot.EndTimeUtc,
            slot.Status,
            slot.MaxCapacity,
            slot.BookedCapacity,
            slot.PriceAmount,
            slot.Currency,
            slot.Notes,
            slot.RowVersion,
            slot.HeldUntilUtc
        );
    }
}