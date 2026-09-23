from app.schemas.feasibility import FeasibilityCheckRequest, FeasibilityCheckResponse, FeasibilityStatus, ItemFeasibilityResult, RouteSummary, ResourceType
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
            # 1. Evaluate capacity availability via tools
            res_data = {}
            if item.resource_type == ResourceType.GUIDE:
                res_data = await search_guide_availability(date=item.date)
            elif item.resource_type == ResourceType.TRANSPORT:
                res_data = await search_transport_slots(date=item.date, party_size=item.party_size)
            elif item.resource_type == ResourceType.ATTRACTION:
                res_data = await search_attraction_slots(date=item.date, party_size=item.party_size)
            else:
                res_data = {"available": True, "capacity": 1, "note": "Slot available"}

            avail = res_data.get("available", True)
            cap = res_data.get("capacity", 0)
            msg = res_data.get("note", "Slot available")

            if not avail:
                conflicts.append(f"Resource {item.item_id} ({item.resource_type.value}) is unavailable on {item.date}")

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

        if not conflicts:
            overall = FeasibilityStatus.FEASIBLE
        elif len(conflicts) < len(req.items):
            overall = FeasibilityStatus.PARTIALLY_FEASIBLE
        else:
            overall = FeasibilityStatus.INFEASIBLE

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
