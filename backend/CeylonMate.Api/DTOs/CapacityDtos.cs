using CeylonMate.Api.Models;

namespace CeylonMate.Api.DTOs;

public record CapacitySearchQueryDto(
    DateTimeOffset? Date,
    int PartySize = 1,
    string? Language = null,
    VehicleType? VehicleType = null,
    Guid? AttractionId = null
);

public record GuideAvailabilityDto(
    Guid Id,
    Guid LocalGuideUserId,
    Guid? GuideProfileId,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    SlotType SlotType,
    AvailabilityStatus Status,
    int MaxCapacity,
    int BookedCapacity,
    decimal PriceAmount,
    string Currency,
    string? Notes,
    byte[] RowVersion,
    DateTimeOffset? HeldUntilUtc = null
);

public record TransportSlotDto(
    Guid Id,
    Guid TransportOptionId,
    string OptionTitle,
    VehicleType VehicleType,
    Guid? OriginDestinationId,
    Guid? DestinationId,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    SlotStatus Status,
    int TotalSeats,
    int AvailableSeats,
    decimal PricePerSeat,
    string Currency,
    byte[] RowVersion,
    DateTimeOffset? HeldUntilUtc = null
);

public record AttractionSlotDto(
    Guid Id,
    Guid AttractionId,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    SlotStatus Status,
    int MaxCapacity,
    int BookedCapacity,
    decimal PriceAmount,
    string Currency,
    string? Notes,
    byte[] RowVersion,
    DateTimeOffset? HeldUntilUtc = null
);

public record CapacitySearchResponseDto(
    IReadOnlyList<GuideAvailabilityDto> AvailableGuides,
    IReadOnlyList<TransportSlotDto> AvailableTransport,
    IReadOnlyList<AttractionSlotDto> AvailableAttractions
);

public record ReservationRequestDto(
    Guid? GuideSlotId = null,
    Guid? TransportSlotId = null,
    Guid? AttractionSlotId = null,
    string? BookingReferenceId = null,
    int PartySize = 1,
    byte[]? GuideSlotRowVersion = null,
    byte[]? TransportSlotRowVersion = null,
    byte[]? AttractionSlotRowVersion = null,
    int? HoldDurationMinutes = null
);

public record ReservationResultDto(
    bool Success,
    string Message,
    string? ConflictResourceType = null,
    Guid? ReservedGuideSlotId = null,
    Guid? ReservedTransportSlotId = null,
    Guid? ReservedAttractionSlotId = null
)
{
    public static ReservationResultDto Ok(
        string message,
        Guid? guideSlotId = null,
        Guid? transportSlotId = null,
        Guid? attractionSlotId = null) =>
        new(true, message, null, guideSlotId, transportSlotId, attractionSlotId);

    public static ReservationResultDto Failure(string message, string conflictResourceType) =>
        new(false, message, conflictResourceType, null, null, null);
}

public record CreateGuideAvailabilityRequestDto(
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    SlotType SlotType = SlotType.FULL_DAY,
    int MaxCapacity = 1,
    decimal PriceAmount = 0,
    string Currency = "LKR",
    string? Notes = null
);

public record CreateTransportSlotRequestDto(
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    VehicleType VehicleType = VehicleType.SEDAN,
    int TotalSeats = 4,
    decimal PricePerSeat = 0,
    string Currency = "LKR",
    Guid? OriginDestinationId = null,
    Guid? DestinationId = null
);

public record CreateAttractionSlotRequestDto(
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    int MaxCapacity = 50,
    decimal PriceAmount = 0,
    string Currency = "LKR",
    string? Notes = null
);
