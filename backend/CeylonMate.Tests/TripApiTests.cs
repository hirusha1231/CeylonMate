using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.Trips;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CeylonMate.Tests;

public sealed class TripApiTests : IClassFixture<AuthApiFactory>
{
    private readonly AuthApiFactory _factory;
    private readonly HttpClient _client;

    public TripApiTests(AuthApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task TravelerCanStartOnlyOwnSubmittedTripOnce()
    {
        var traveler = await RegisterTravelerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", traveler.AccessToken);
        var created = await _client.PostAsJsonAsync("/api/trips", ValidTrip());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var trip = await ReadTrip(created);
        Assert.Equal(TripStatus.DRAFT, trip.Status);
        Assert.Equal(traveler.User.Id, trip.TravelerId);

        Assert.Equal(HttpStatusCode.Conflict,
            (await _client.PostAsync($"/api/trips/{trip.Id}/start-planning", null)).StatusCode);
        using (var beforeScope = _factory.Services.CreateScope())
        {
            var beforeDb = beforeScope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
            Assert.Empty(beforeDb.Set<WorkflowExecution>().Where(x => x.TripRequestId == trip.Id));
        }

        var submitted = await _client.PostAsync($"/api/trips/{trip.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitted.StatusCode);

        var other = await RegisterTravelerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", other.AccessToken);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PostAsync($"/api/trips/{trip.Id}/start-planning", null)).StatusCode);

        var staff = await CreateStaffAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", staff);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await _client.PostAsync($"/api/trips/{trip.Id}/start-planning", null)).StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", traveler.AccessToken);
        var planning = await _client.PostAsync($"/api/trips/{trip.Id}/start-planning", null);
        Assert.Equal(HttpStatusCode.Accepted, planning.StatusCode);
        Assert.Equal(TripStatus.PLANNING, (await ReadTrip(planning)).Status);
        Assert.Equal(HttpStatusCode.Conflict,
            (await _client.PostAsync($"/api/trips/{trip.Id}/start-planning", null)).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
        var workflow = Assert.Single(db.Set<WorkflowExecution>().Where(x => x.TripRequestId == trip.Id));
        Assert.Equal(traveler.User.Id, workflow.RequestedByUserId);
        Assert.Equal("QUEUED", workflow.Status);
        Assert.Equal(3, db.Set<TripRequestStatusHistory>().Count(x => x.TripRequestId == trip.Id));
        // Assert.DoesNotContain(db.Model.GetEntityTypes(), entity =>
            //     entity.ClrType.Name is "Booking" or "Reservation");
        
        
    }

    [Fact]
    public async Task ValidationAndOwnershipAreEnforced()
    {
        var traveler = await RegisterTravelerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", traveler.AccessToken);
        var invalid = await _client.PostAsJsonAsync("/api/trips", new
        {
            objective = "Visit Sri Lanka",
            startDate = "2026-12-10",
            endDate = "2026-12-01",
            budget = 0,
            currency = "LKR",
            partySize = 0
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var created = await _client.PostAsJsonAsync("/api/trips", ValidTrip());
        var trip = await ReadTrip(created);

        var other = await RegisterTravelerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", other.AccessToken);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.GetAsync($"/api/trips/{trip.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.PutAsJsonAsync($"/api/trips/{trip.Id}", ValidTrip())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await _client.DeleteAsync($"/api/trips/{trip.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/trips")).StatusCode);
    }

    [Theory]
    [InlineData("2026-12-10", "2026-12-01", 50000, 2)]
    [InlineData("2026-12-01", "2026-12-10", 0, 2)]
    [InlineData("2026-12-01", "2026-12-10", 50000, 0)]
    public async Task InvalidTripFieldsReturnBadRequest(
        string startDate, string endDate, decimal budget, int partySize)
    {
        var traveler = await RegisterTravelerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", traveler.AccessToken);
        var response = await _client.PostAsJsonAsync("/api/trips", new
        {
            objective = "Wildlife", startDate, endDate, budget, currency = "LKR", partySize
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<AuthResponse> RegisterTravelerAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"trip-{Guid.NewGuid():N}@example.com",
            password = "StrongPassword!123",
            role = "TRAVELER"
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions()))!;
    }

    private async Task<string> CreateStaffAsync()
    {
        var email = $"agent-{Guid.NewGuid():N}@example.com";
        var password = "StrongPassword!123";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            var user = new User
            {
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                PasswordHash = string.Empty,
                Role = UserRole.TRAVEL_AGENT
            };
            user.PasswordHash = hasher.HashPassword(user, password);
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        return (await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions()))!.AccessToken;
    }

    private static object ValidTrip() => new
    {
        objective = "Wildlife and culture",
        startDate = "2026-12-01",
        endDate = "2026-12-10",
        budget = 50000,
        currency = "LKR",
        partySize = 2,
        startingLatitude = 6.927079,
        startingLongitude = 79.861244
    };

    private static async Task<TripResponse> ReadTrip(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        return new TripResponse(root.GetProperty("id").GetGuid(), root.GetProperty("travelerId").GetGuid(),
            root.GetProperty("travelerProfileId").GetGuid(), root.GetProperty("objective").GetString()!,
            DateOnly.Parse(root.GetProperty("startDate").GetString()!),
            DateOnly.Parse(root.GetProperty("endDate").GetString()!),
            root.GetProperty("budget").GetDecimal(), root.GetProperty("currency").GetString()!,
            root.GetProperty("partySize").GetInt32(), null, null, null,
            Enum.Parse<TripStatus>(root.GetProperty("status").GetString()!),
            root.GetProperty("createdAtUtc").GetDateTimeOffset(),
            root.GetProperty("updatedAtUtc").GetDateTimeOffset());
    }

    private static JsonSerializerOptions JsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        return options;
    }
}
