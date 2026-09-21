using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

[Tags("Capacity")]
[ApiController]
[Route("api/capacity/routing")]
[AllowAnonymous]
public class RoutingController : ControllerBase
{
    private readonly IRoutingAdapter _routingAdapter;

    public RoutingController(IRoutingAdapter routingAdapter)
    {
        _routingAdapter = routingAdapter;
    }

    [HttpPost("estimate")]
    public async Task<IActionResult> GetEstimate([FromBody] RouteEstimateRequest request, CancellationToken ct)
    {
        var estimate = await _routingAdapter.GetRouteEstimateAsync(request.OriginLat, request.OriginLng, request.DestLat, request.DestLng, ct);
        return Ok(estimate);
    }
}
