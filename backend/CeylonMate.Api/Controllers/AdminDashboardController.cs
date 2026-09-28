using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using CeylonMate.Api.Models.Itinerary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminDashboardController(CeylonMateDbContext db) : ControllerBase
{
    [HttpGet("metrics")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDashboardMetrics(CancellationToken cancellationToken)
    {
        // 1. Real Users breakdown from DbContext
        var totalUsers = await db.Users.CountAsync(cancellationToken);
        var travelersCount = await db.Users.CountAsync(u => u.Role == UserRole.TRAVELER, cancellationToken);
        var guidesCount = await db.Users.CountAsync(u => u.Role == UserRole.LOCAL_GUIDE, cancellationToken);
        var staffCount = await db.Users.CountAsync(u => u.Role == UserRole.ADMIN || u.Role == UserRole.TRAVEL_AGENT || u.Role == UserRole.CAPACITY_OFFICER, cancellationToken);

        // 2. Real Vehicles / Fleet breakdown from DbContext
        var totalVehicles = await db.TransportOptions.CountAsync(cancellationToken);
        var vansCount = await db.TransportOptions.CountAsync(v => v.VehicleType == VehicleType.VAN, cancellationToken);
        var sedansCount = await db.TransportOptions.CountAsync(v => v.VehicleType == VehicleType.SEDAN, cancellationToken);
        var coachesCount = await db.TransportOptions.CountAsync(v => v.VehicleType == VehicleType.MINIBUS || v.VehicleType == VehicleType.BUS, cancellationToken);

        // 3. Real Bookings & Concurrency Holds from DbContext
        var totalBookingsCount = await db.Bookings.CountAsync(cancellationToken);
        var confirmedBookings = await db.Bookings.CountAsync(b => b.Status == "CONFIRMED", cancellationToken);
        
        var guideHolds = await db.GuideAvailabilities.CountAsync(g => g.HeldUntilUtc.HasValue && g.HeldUntilUtc.Value > DateTimeOffset.UtcNow, cancellationToken);
        var transportHolds = await db.TransportSlots.CountAsync(t => t.HeldUntilUtc.HasValue && t.HeldUntilUtc.Value > DateTimeOffset.UtcNow, cancellationToken);
        var attractionHolds = await db.AttractionSlots.CountAsync(a => a.HeldUntilUtc.HasValue && a.HeldUntilUtc.Value > DateTimeOffset.UtcNow, cancellationToken);
        var activeHolds = guideHolds + transportHolds + attractionHolds;

        var advisoriesCount = await db.DestinationAdvisories.CountAsync(cancellationToken);

        return Ok(new
        {
            totalRegisteredUsers = totalUsers,
            activeTravelers = travelersCount,
            certifiedGuides = guidesCount,
            internalStaff = staffCount,
            totalBookings = totalBookingsCount,
            confirmedBookings = confirmedBookings,
            activeHoldsCount = activeHolds,
            publishedAdvisoriesCount = advisoriesCount,
            users = new
            {
                total = totalUsers,
                travelers = travelersCount,
                guides = guidesCount,
                staff = staffCount,
                active = totalUsers
            },
            vehicles = new
            {
                total = totalVehicles,
                vans = vansCount,
                sedans = sedansCount,
                coaches = coachesCount
            },
            bookings = new
            {
                total = totalBookingsCount,
                confirmed = confirmedBookings,
                holds = activeHolds
            }
        });
    }

    [HttpGet("audit-logs")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAuditLogs(CancellationToken cancellationToken)
    {
        var logs = await db.ApprovalDecisions
            .OrderByDescending(x => x.DecidedAt)
            .Take(50)
            .Select(x => new
            {
                id = x.Id.ToString(),
                timestamp = x.DecidedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                actionType = x.Decision == "APPROVED" ? "BOOKING_APPROVED" : "REVISION_REQUESTED",
                actorEmail = "admin@ceylonmate.com",
                entityReference = $"CM-WF-{x.WorkflowId}",
                details = x.Note ?? "Processed concierge approval decision."
            })
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }
}

public sealed record UserUpdatePayload(string? Role, bool? IsActive);
