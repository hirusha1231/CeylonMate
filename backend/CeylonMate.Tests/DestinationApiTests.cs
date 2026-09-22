using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Destinations;
using Xunit;

namespace CeylonMate.Tests;

public sealed class DestinationApiTests : IClassFixture<AuthApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly HttpClient _client;

    public DestinationApiTests(AuthApiFactory factory) => _client = factory.CreateClient();

    private async Task<string> GetTokenAsync(string role)
    {
        var email = $"{role.ToLowerInvariant()}-{Guid.NewGuid():N}@example.com";
        var res = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Password12345!",
            role
        });
        var auth = await res.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        return auth!.AccessToken;
    }

    [Fact]
    public async Task AnonymousCanListDestinationsAndGetSuitability()
    {
        var agentToken = await GetTokenAsync("TRAVEL_AGENT");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", agentToken);

        var createReq = new CreateDestinationRequest(
            Name: $"Sigiriya Rock {Guid.NewGuid():N}",
            Region: "Central",
            Description: "Ancient palace fortress",
            Latitude: 7.9570m,
            Longitude: 80.7603m,
            Category: "HERITAGE"
        );

        var createRes = await _client.PostAsJsonAsync("/api/destinations", createReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<DestinationResponse>(JsonOptions);
        Assert.NotNull(created);

        // Anonymous query
        _client.DefaultRequestHeaders.Authorization = null;
        var listRes = await _client.GetAsync("/api/destinations");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);

        var suitabilityRes = await _client.GetAsync($"/api/destinations/{created.Id}/suitability?date=2026-11-01");
        Assert.Equal(HttpStatusCode.OK, suitabilityRes.StatusCode);
        var suitability = await suitabilityRes.Content.ReadFromJsonAsync<DestinationSuitabilityResponse>(JsonOptions);
        Assert.NotNull(suitability);
        Assert.True(suitability.IsSuitable);
    }

    [Fact]
    public async Task GuideCanSubmitReportAndAffectSuitability()
    {
        var agentToken = await GetTokenAsync("TRAVEL_AGENT");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", agentToken);

        var createRes = await _client.PostAsJsonAsync("/api/destinations", new CreateDestinationRequest(
            Name: $"Ella Gap {Guid.NewGuid():N}",
            Region: "Hill Country",
            Description: "Mountain pass",
            Latitude: 6.8667m,
            Longitude: 81.0466m,
            Category: "NATURE"
        ));
        var dest = await createRes.Content.ReadFromJsonAsync<DestinationResponse>(JsonOptions);

        var guideToken = await GetTokenAsync("LOCAL_GUIDE");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);

        var reportRes = await _client.PostAsJsonAsync($"/api/destinations/{dest!.Id}/reports", new CreateGuideReportRequest(
            ReportType: ReportType.CLOSURE,
            Message: "Mudslide blocked the primary trail",
            PhotoUrl: "https://photos.example.com/mudslide.jpg",
            Latitude: 6.8667m,
            Longitude: 81.0466m
        ));
        Assert.Equal(HttpStatusCode.OK, reportRes.StatusCode);

        // Suitability should now flag blocking reasons due to CLOSURE report
        _client.DefaultRequestHeaders.Authorization = null;
        var suitabilityRes = await _client.GetAsync($"/api/destinations/{dest.Id}/suitability");
        Assert.Equal(HttpStatusCode.OK, suitabilityRes.StatusCode);
        var suitability = await suitabilityRes.Content.ReadFromJsonAsync<DestinationSuitabilityResponse>(JsonOptions);
        Assert.NotNull(suitability);
        Assert.False(suitability.IsSuitable);
        Assert.NotEmpty(suitability.BlockingReasons);
    }
}
