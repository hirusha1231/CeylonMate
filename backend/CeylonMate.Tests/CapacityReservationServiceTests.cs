using CeylonMate.Api.Data;
using CeylonMate.Api.DTOs;
using CeylonMate.Api.Models;
using CeylonMate.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CeylonMate.Tests;

public class CapacityReservationServiceTests
{
    private static DbContextOptions<CeylonMateDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<CeylonMateDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
    }

    [Fact]
    public async Task AddGuideAvailability_ValidSlot_AddsSuccessfully()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var guideUserId = Guid.NewGuid();
        var request = new CreateGuideAvailabilityRequestDto(
            StartTimeUtc: DateTimeOffset.UtcNow.AddDays(1),
            EndTimeUtc: DateTimeOffset.UtcNow.AddDays(1).AddHours(8),
            SlotType: SlotType.FULL_DAY,
            MaxCapacity: 1,
            PriceAmount: 12000,
            Currency: "LKR",
            Notes: "Full day tour around Kandy"
        );

        var result = await service.AddGuideAvailabilityAsync(guideUserId, request);

        result.Should().NotBeNull();
        result.LocalGuideUserId.Should().Be(guideUserId);
        result.Status.Should().Be(AvailabilityStatus.AVAILABLE);
        result.PriceAmount.Should().Be(12000);
        result.Currency.Should().Be("LKR");
        result.MaxCapacity.Should().Be(1);
        result.BookedCapacity.Should().Be(0);

        var dbSlot = await db.GuideAvailabilities.SingleOrDefaultAsync(x => x.Id == result.Id);
        dbSlot.Should().NotBeNull();
    }

    [Fact]
    public async Task GetGuideAvailability_DateRangeFiltering_ReturnsOnlyMatchingSlots()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var guideUserId = Guid.NewGuid();
        var baseDate = new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero);

        // Seed 3 slots
        var slot1 = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = guideUserId,
            StartTimeUtc = baseDate,
            EndTimeUtc = baseDate.AddHours(8),
            Status = AvailabilityStatus.AVAILABLE
        };

        var slot2 = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = guideUserId,
            StartTimeUtc = baseDate.AddDays(5),
            EndTimeUtc = baseDate.AddDays(5).AddHours(8),
            Status = AvailabilityStatus.AVAILABLE
        };

        var slot3 = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = guideUserId,
            StartTimeUtc = baseDate.AddDays(10),
            EndTimeUtc = baseDate.AddDays(10).AddHours(8),
            Status = AvailabilityStatus.AVAILABLE
        };

        db.GuideAvailabilities.AddRange(slot1, slot2, slot3);
        await db.SaveChangesAsync();

        // Query date range that only covers slot2 (Oct 4 to Oct 7)
        var startDateFilter = baseDate.AddDays(3);
        var endDateFilter = baseDate.AddDays(7);

        var results = (await service.GetGuideAvailabilityAsync(guideUserId, startDateFilter, endDateFilter)).ToList();

        results.Should().HaveCount(1);
        results.Single().Id.Should().Be(slot2.Id);
    }

    [Fact]
    public async Task AddGuideAvailability_EndTimeBeforeOrEqualStartTime_ThrowsArgumentException()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var guideUserId = Guid.NewGuid();
        var startTime = DateTimeOffset.UtcNow.AddDays(1);

        // Case 1: EndTimeUtc equals StartTimeUtc
        var requestEqual = new CreateGuideAvailabilityRequestDto(
            StartTimeUtc: startTime,
            EndTimeUtc: startTime,
            SlotType: SlotType.FULL_DAY,
            MaxCapacity: 1,
            PriceAmount: 5000,
            Currency: "LKR",
            Notes: null
        );

        Func<Task> actEqual = async () => await service.AddGuideAvailabilityAsync(guideUserId, requestEqual);
        await actEqual.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*EndTimeUtc must be greater than StartTimeUtc*");

        // Case 2: EndTimeUtc is earlier than StartTimeUtc
        var requestEarlier = new CreateGuideAvailabilityRequestDto(
            StartTimeUtc: startTime,
            EndTimeUtc: startTime.AddHours(-2),
            SlotType: SlotType.FULL_DAY,
            MaxCapacity: 1,
            PriceAmount: 5000,
            Currency: "LKR",
            Notes: null
        );

        Func<Task> actEarlier = async () => await service.AddGuideAvailabilityAsync(guideUserId, requestEarlier);
        await actEarlier.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*EndTimeUtc must be greater than StartTimeUtc*");
    }

    [Fact]
    public async Task UpdateGuideAvailability_ValidSlot_UpdatesSuccessfully()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var guideUserId = Guid.NewGuid();
        var initial = await service.AddGuideAvailabilityAsync(guideUserId, new CreateGuideAvailabilityRequestDto(
            StartTimeUtc: DateTimeOffset.UtcNow.AddDays(1),
            EndTimeUtc: DateTimeOffset.UtcNow.AddDays(1).AddHours(8),
            PriceAmount: 10000
        ));

        var updateRequest = new UpdateGuideAvailabilityRequestDto(
            StartTimeUtc: DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            EndTimeUtc: DateTimeOffset.UtcNow.AddDays(1).AddHours(9),
            SlotType: SlotType.HALF_DAY_MORNING,
            Status: AvailabilityStatus.AVAILABLE,
            MaxCapacity: 2,
            PriceAmount: 18000,
            Currency: "LKR",
            Notes: "Updated notes"
        );

        var updated = await service.UpdateGuideAvailabilityAsync(initial.Id, updateRequest);

        updated.Should().NotBeNull();
        updated!.PriceAmount.Should().Be(18000);
        updated.MaxCapacity.Should().Be(2);
        updated.SlotType.Should().Be(SlotType.HALF_DAY_MORNING);
        updated.Notes.Should().Be("Updated notes");
    }

    [Fact]
    public async Task DeleteGuideAvailability_AvailableSlot_DeletesSuccessfully()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var guideUserId = Guid.NewGuid();
        var initial = await service.AddGuideAvailabilityAsync(guideUserId, new CreateGuideAvailabilityRequestDto(
            StartTimeUtc: DateTimeOffset.UtcNow.AddDays(1),
            EndTimeUtc: DateTimeOffset.UtcNow.AddDays(1).AddHours(8)
        ));

        var deleted = await service.DeleteGuideAvailabilityAsync(initial.Id);
        deleted.Should().BeTrue();

        var dbSlot = await db.GuideAvailabilities.SingleOrDefaultAsync(x => x.Id == initial.Id);
        dbSlot.Should().BeNull();
    }

    [Fact]
    public async Task DeleteGuideAvailability_SlotWithActiveHolds_ThrowsInvalidOperationException()
    {
        var options = CreateInMemoryOptions(Guid.NewGuid().ToString("N"));
        await using var db = new CeylonMateDbContext(options);
        var service = new CapacityReservationService(db);

        var slot = new GuideAvailability
        {
            Id = Guid.NewGuid(),
            LocalGuideUserId = Guid.NewGuid(),
            StartTimeUtc = DateTimeOffset.UtcNow.AddDays(1),
            EndTimeUtc = DateTimeOffset.UtcNow.AddDays(1).AddHours(8),
            Status = AvailabilityStatus.RESERVED,
            BookedCapacity = 1,
            MaxCapacity = 1
        };
        db.GuideAvailabilities.Add(slot);
        await db.SaveChangesAsync();

        Func<Task> act = async () => await service.DeleteGuideAvailabilityAsync(slot.Id);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot delete slot with active reservations or holds*");
    }
}
