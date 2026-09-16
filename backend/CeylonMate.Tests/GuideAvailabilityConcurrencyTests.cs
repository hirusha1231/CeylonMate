using CeylonMate.Api.Data;
using CeylonMate.Api.Models;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CeylonMate.Tests;

public class GuideAvailabilityConcurrencyTests
{
    private static DbContextOptions<CeylonMateDbContext> CreateSqliteOptions(SqliteConnection connection)
    {
        return new DbContextOptionsBuilder<CeylonMateDbContext>()
            .UseSqlite(connection)
            .Options;
    }

    [Fact]
    public async Task ReserveSlot_SimultaneousRequests_ThrowsDbUpdateConcurrencyException_ForSecondCaller()
    {
        // 1. Arrange: Setup SQLite in-memory database
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = CreateSqliteOptions(connection);

        var initialRowVersion = Guid.NewGuid().ToByteArray();
        var slotId = Guid.NewGuid();
        var guideUserId = Guid.NewGuid();

        // Seed initial user & slot with MaxCapacity = 1, BookedCapacity = 0, and an initial RowVersion
        using (var seedContext = new CeylonMateDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            var guideUser = new CeylonMate.Api.Auth.User
            {
                Id = guideUserId,
                Email = "guide@example.com",
                NormalizedEmail = "GUIDE@EXAMPLE.COM",
                PasswordHash = "hash",
                Role = CeylonMate.Api.Auth.UserRole.LOCAL_GUIDE
            };
            seedContext.Users.Add(guideUser);

            var initialSlot = new GuideAvailability
            {
                Id = slotId,
                LocalGuideUserId = guideUserId,
                StartTimeUtc = DateTimeOffset.UtcNow.AddDays(1),
                EndTimeUtc = DateTimeOffset.UtcNow.AddDays(1).AddHours(8),
                SlotType = SlotType.FULL_DAY,
                Status = AvailabilityStatus.AVAILABLE,
                MaxCapacity = 1,
                BookedCapacity = 0,
                PriceAmount = 10000,
                Currency = "LKR",
                RowVersion = initialRowVersion
            };

            seedContext.GuideAvailabilities.Add(initialSlot);
            await seedContext.SaveChangesAsync();
        }

        // 2. Simulate User A and User B querying the same slot at the exact same moment with the same initial RowVersion
        using var contextA = new CeylonMateDbContext(options);
        using var contextB = new CeylonMateDbContext(options);

        var slotUserA = await contextA.GuideAvailabilities.SingleAsync(x => x.Id == slotId);
        var slotUserB = await contextB.GuideAvailabilities.SingleAsync(x => x.Id == slotId);

        slotUserA.RowVersion.Should().Equal(initialRowVersion);
        slotUserB.RowVersion.Should().Equal(initialRowVersion);

        // 3. User A books the slot: updates BookedCapacity = 1, updates RowVersion = Guid.NewGuid().ToByteArray(), and saves changes successfully
        slotUserA.BookedCapacity = 1;
        slotUserA.Status = AvailabilityStatus.BOOKED;
        slotUserA.RowVersion = Guid.NewGuid().ToByteArray();
        await contextA.SaveChangesAsync();

        // 4. User B attempts to book the same slot using their stale entity/original RowVersion
        slotUserB.BookedCapacity = 1;
        slotUserB.Status = AvailabilityStatus.BOOKED;

        // 5. Assert that User B's SaveChangesAsync() throws DbUpdateConcurrencyException
        Func<Task> actB = async () => await contextB.SaveChangesAsync();
        await actB.Should().ThrowAsync<DbUpdateConcurrencyException>();

        // 6. Verify that the database state reflects only 1 successful booking (BookedCapacity == 1), proving overbooking was successfully prevented
        using var verifyContext = new CeylonMateDbContext(options);
        var finalSlot = await verifyContext.GuideAvailabilities.SingleAsync(x => x.Id == slotId);
        finalSlot.BookedCapacity.Should().Be(1);
        finalSlot.Status.Should().Be(AvailabilityStatus.BOOKED);
    }
}
