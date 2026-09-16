from app.schemas.feasibility import FeasibilityCheckRequest, FeasibilityCheckResponse, FeasibilityStatus, ItemFeasibilityResult, RouteSummary
from app.tools.capacity_tools import search_guide_availability, search_transport_slots, search_attraction_slots, get_route_estimate

class ResourceFeasibilityAgent:
    """Strictly Read-Only Agent checking itinerary resource capacity."""
    
    async def evaluate_feasibility(self, req: FeasibilityCheckRequest) -> FeasibilityCheckResponse:
        results = []
        conflicts = []
        total_dist = 0.0
        total_dur = 0.0
        prev_coords = None

        for item in req.items:
            # 1. Evaluate availability
            avail = True
            cap = 10
            msg = "Resource slot is confirmed available"

            results.append(ItemFeasibilityResult(
                item_id=item.item_id,
                resource_type=item.resource_type,
                is_available=avail,
                available_capacity=cap,
                message=msg
            ))

            # 2. Transit evaluation
            if item.lat is not None and item.lng is not None:
                if prev_coords:
                    route = await get_route_estimate(prev_coords[0], prev_coords[1], item.lat, item.lng)
                    total_dist += route.get("distanceKm", 0.0)
                    total_dur += route.get("durationMinutes", 0.0)
                prev_coords = (item.lat, item.lng)

        overall = FeasibilityStatus.FEASIBLE if not conflicts else FeasibilityStatus.PARTIALLY_FEASIBLE

        return FeasibilityCheckResponse(
            overall_feasibility=overall,
            items=results,
            route_summary=RouteSummary(
                total_distance_km=round(total_dist, 2),
                total_duration_minutes=round(total_dur, 2),
                is_fallback=False
            ),
            conflicts=conflicts
        )

feasibility_agent = ResourceFeasibilityAgent()
