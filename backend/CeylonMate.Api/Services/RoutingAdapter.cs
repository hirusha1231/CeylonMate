namespace CeylonMate.Api.Services;

public class RoutingAdapter : IRoutingAdapter
{
    private const double EarthRadiusKm = 6371.0;
    private const double AverageSpeedKmh = 40.0;
    private const double SriLankaTerrainFactor = 1.25;

    public async Task<RouteEstimateResponse> GetRouteEstimateAsync(double originLat, double originLng, double destLat, double destLng, CancellationToken ct = default)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(3));

            var dLat = DegreesToRadians(destLat - originLat);
            var dLng = DegreesToRadians(destLng - originLng);

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(DegreesToRadians(originLat)) * Math.Cos(DegreesToRadians(destLat)) *
                    Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            var straightDistance = EarthRadiusKm * c;
            var roadDistanceKm = Math.Round(straightDistance * SriLankaTerrainFactor, 2);
            var durationMinutes = Math.Round((roadDistanceKm / AverageSpeedKmh) * 60, 0);

            await Task.Delay(10, cts.Token);

            return new RouteEstimateResponse(roadDistanceKm, durationMinutes, false, "Estimated using resilient routing adapter");
        }
        catch (Exception ex)
        {
            return new RouteEstimateResponse(30.0, 45.0, true, $"Fallback applied due to timeout or error: {ex.Message}");
        }
    }

    private static double DegreesToRadians(double deg) => deg * (Math.PI / 180.0);
}
