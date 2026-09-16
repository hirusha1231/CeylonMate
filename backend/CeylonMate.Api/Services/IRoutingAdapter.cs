namespace CeylonMate.Api.Services;

public record RouteEstimateRequest(double OriginLat, double OriginLng, double DestLat, double DestLng);
public record RouteEstimateResponse(double DistanceKm, double DurationMinutes, bool IsFallback, string Message);

public interface IRoutingAdapter
{
    Task<RouteEstimateResponse> GetRouteEstimateAsync(double originLat, double originLng, double destLat, double destLng, CancellationToken ct = default);
}
