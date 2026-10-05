-- 1. Migrate all records from trip_requests to Bookings
INSERT INTO "Bookings" (
    "TravelerUserId",
    "BookingReference",
    "Status",
    "BookedAt",
    "VehicleCapacityStatus",
    "AgentNotes",
    "FinalPriceQuoteUsd",
    "FinalPriceQuoteLkr",
    "GuideAssignmentStatus",
    "TripDurationDays",
    "PassengerCount",
    "StartDate",
    "PickupTime",
    "TravelerNotes",
    "TripRequestId",
    "ItineraryId",
    "QuotationId",
    "TravelerId"
)
SELECT 
    tr."TravelerId"::text AS "TravelerUserId",
    'CM-TR-' || UPPER(SUBSTRING(tr."Id"::text, 1, 8)) AS "BookingReference",
    CASE 
        WHEN tr."Status" = 'ACCEPTED' THEN 'CONFIRMED'
        WHEN tr."Status" = 'CONFIRMED' THEN 'CONFIRMED'
        WHEN tr."Status" = 'PROPOSED' THEN 'APPROVED_PENDING_PAYMENT'
        WHEN tr."Status" = 'REJECTED' THEN 'CANCELLED'
        ELSE 'PENDING_CONCIERGE_REVIEW'
    END AS "Status",
    tr."CreatedAtUtc" AS "BookedAt",
    'HELD_PENDING_CONFIRMATION' AS "VehicleCapacityStatus",
    'Trip Objective: ' || tr."Objective" || ' | Budget: $' || tr."Budget"::text AS "AgentNotes",
    tr."Budget" AS "FinalPriceQuoteUsd",
    (tr."Budget" * 305) AS "FinalPriceQuoteLkr",
    'ACCEPTED_BY_GUIDE' AS "GuideAssignmentStatus",
    GREATEST(1, (tr."EndDate" - tr."StartDate")) AS "TripDurationDays",
    tr."PartySize" AS "PassengerCount",
    tr."StartDate"::text AS "StartDate",
    '08:00 AM' AS "PickupTime",
    tr."Objective" || '||Cultural Triangle & Hill Country Corridor||Executive Luxury SUV||SLTDA Certified Senior Tour Guide||' || tr."Budget"::text || '||' || (tr."Budget" * 305)::text AS "TravelerNotes",
    0 AS "TripRequestId",
    0 AS "ItineraryId",
    0 AS "QuotationId",
    0 AS "TravelerId"
FROM trip_requests tr
WHERE NOT EXISTS (
    SELECT 1 FROM "Bookings" b WHERE b."BookingReference" = ('CM-TR-' || UPPER(SUBSTRING(tr."Id"::text, 1, 8)))
);

-- 2. Drop trip_requests and dependent status history tables
DROP TABLE IF EXISTS "trip_request_status_histories" CASCADE;
DROP TABLE IF EXISTS "trip_requests" CASCADE;
