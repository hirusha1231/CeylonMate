using System.Threading;
using System.Threading.Tasks;
using CeylonMate.Api.Services;
using Xunit;

namespace CeylonMate.Tests;

public class RoutingAdapterTests
{
    private readonly RoutingAdapter _adapter = new();

    [Fact]
    public async Task GetRouteEstimateAsync_ValidCoordinates_ReturnsCalculatedDistanceAndDuration()
    {
        // Colombo to Kandy approximate coordinates
        double colomboLat = 6.9271, colomboLng = 79.8612;
        double kandyLat = 7.2906, kandyLng = 80.6337;

        var result = await _adapter.GetRouteEstimateAsync(colomboLat, colomboLng, kandyLat, kandyLng);

        Assert.NotNull(result);
        Assert.False(result.IsFallback);
        Assert.True(result.DistanceKm > 50, "Colombo to Kandy distance should be greater than 50km");
        Assert.True(result.DurationMinutes > 60, "Transit time should reflect realistic road travel");
    }

    [Fact]
    public async Task GetRouteEstimateAsync_CancelledToken_ReturnsSafeFallbackWithoutThrowing()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel(); // Immediately trigger cancellation

        var result = await _adapter.GetRouteEstimateAsync(6.9271, 79.8612, 7.2906, 80.6337, cts.Token);

        Assert.NotNull(result);
        Assert.True(result.IsFallback, "When cancelled or timed out, fallback should be true");
        Assert.True(result.DistanceKm > 0);
        Assert.Contains("Fallback applied", result.Message);
    }
}
