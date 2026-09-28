using System;
using System.Collections.Generic;

namespace CeylonMate.Api.Models.Itinerary;

public class Booking
{
    public int Id { get; set; }
    public int TripRequestId { get; set; }
    public int ItineraryId { get; set; }
    public int QuotationId { get; set; }
    public int TravelerId { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING_REVIEW"; // PENDING_REVIEW, CAPACITY_FLAGGED_REJECTED, APPROVED_PENDING_PAYMENT, CONFIRMED, CANCELLED
    public DateTime BookedAt { get; set; } = DateTime.UtcNow;

    // Capacity & Approval Fields
    public string VehicleCapacityStatus { get; set; } = "HELD_PENDING_CONFIRMATION"; // HELD_PENDING_CONFIRMATION, ACKNOWLEDGED, REJECTED_BY_CAPACITY
    public string? CapacityRejectionReason { get; set; }
    public Guid? CapacityRejectedByUserId { get; set; }
    public DateTime? CapacityRejectedAtUtc { get; set; }
    public string? AgentNotes { get; set; }
    public decimal? FinalPriceQuoteLkr { get; set; }
    public decimal? FinalPriceQuoteUsd { get; set; }

    // Guide Assignment & Messaging Fields
    public string GuideAssignmentStatus { get; set; } = "PENDING_GUIDE_ACCEPTANCE"; // PENDING_GUIDE_ACCEPTANCE, ACCEPTED_BY_GUIDE, REJECTED_BY_GUIDE
    public string? GuideResponseMessage { get; set; }
    public DateTime? GuideRespondedAtUtc { get; set; }

    // Multi-Step Selection References
    public Guid? GuideSlotId { get; set; }
    public Guid? VehicleSlotId { get; set; }
    public int? PackageId { get; set; }
    public string? StartDate { get; set; }
    public string? PickupTime { get; set; }
    public string? TravelerNotes { get; set; }

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}