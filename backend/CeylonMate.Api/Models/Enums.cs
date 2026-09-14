namespace CeylonMate.Api.Models;

public enum SlotType
{
    FULL_DAY,
    HALF_DAY_MORNING,
    HALF_DAY_AFTERNOON,
    EVENING,
    HOURLY,
    CUSTOM
}

public enum AvailabilityStatus
{
    AVAILABLE,
    RESERVED,
    BOOKED,
    BLOCKED,
    CANCELLED
}

public enum VehicleType
{
    SEDAN,
    SUV,
    VAN,
    MINIBUS,
    BUS,
    TUK_TUK,
    LUXURY_CAR
}

public enum SlotStatus
{
    AVAILABLE,
    RESERVED,
    BOOKED,
    BLOCKED,
    CANCELLED
}
