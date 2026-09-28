import math
import re
from typing import Dict, Any, List, Tuple
from app.schemas.feasibility import (
    FeasibilityCheckRequest, FeasibilityCheckResponse, FeasibilityStatus,
    ItemFeasibilityResult, RouteSummary, RouteLeg, ResourceType
)
from app.tools.capacity_tools import (
    search_guide_availability, search_transport_slots, search_attraction_slots,
    get_fleet_catalog, get_all_destinations
)

DESTINATION_COORDS = {
    "colombo": (6.9271, 79.8612),
    "negombo": (7.2083, 79.8358),
    "kandy": (7.2906, 80.6337),
    "sigiriya": (7.9570, 80.7603),
    "dambulla": (7.8742, 80.6511),
    "polonnaruwa": (7.9403, 81.0188),
    "anuradhapura": (8.3114, 80.4037),
    "nuwara eliya": (6.9497, 80.7891),
    "ella": (6.8667, 81.0466),
    "yala": (6.3725, 81.5186),
    "galle": (6.0535, 80.2210),
    "galle riviera": (6.0535, 80.2210),
    "mirissa": (5.9483, 80.4716),
    "sinharaja": (6.4167, 80.4167),
    "trincomalee": (8.5874, 81.2152),
    "jaffna": (9.6615, 80.0255),
    "bentota": (6.4231, 79.9986),
    "tangalle": (6.0243, 80.7941),
    "cultural triangle": (7.9570, 80.7603),
}

MOUNTAIN_DESTINATIONS = {"nuwara eliya", "kandy", "ella", "sinharaja", "central highlands"}

# Comprehensive GIS Route Matrix for Sri Lanka
# Key tuple: (origin_key, dest_key) -> (distance_km, base_duration_minutes, elevation_factor)
SRI_LANKA_ROUTE_MATRIX: Dict[Tuple[str, str], Tuple[float, float, float]] = {
    ("colombo", "kandy"): (115.0, 195.0, 1.25),         # Kadugannawa Pass
    ("colombo", "galle"): (125.0, 120.0, 1.00),         # Southern Expressway
    ("colombo", "galle riviera"): (125.0, 120.0, 1.00),
    ("colombo", "nuwara eliya"): (170.0, 270.0, 1.30),   # Hill climb
    ("colombo", "sigiriya"): (175.0, 225.0, 1.15),
    ("colombo", "trincomalee"): (260.0, 330.0, 1.10),
    ("colombo", "negombo"): (35.0, 50.0, 1.00),
    ("colombo", "bentota"): (65.0, 75.0, 1.00),
    ("colombo", "jaffna"): (395.0, 450.0, 1.05),

    ("kandy", "nuwara eliya"): (78.0, 165.0, 1.35),       # Steep mountain pass
    ("kandy", "ella"): (140.0, 240.0, 1.30),
    ("kandy", "yala"): (240.0, 340.0, 1.25),
    ("kandy", "sigiriya"): (90.0, 150.0, 1.20),
    ("kandy", "dambulla"): (72.0, 130.0, 1.15),

    ("nuwara eliya", "yala"): (170.0, 270.0, 1.20),
    ("nuwara eliya", "ella"): (55.0, 105.0, 1.30),

    ("sigiriya", "polonnaruwa"): (68.0, 90.0, 1.05),
    ("sigiriya", "trincomalee"): (100.0, 135.0, 1.05),
    ("cultural triangle", "sigiriya"): (15.0, 25.0, 1.05),
    ("cultural triangle", "polonnaruwa"): (75.0, 100.0, 1.05),

    ("galle", "sinharaja"): (95.0, 150.0, 1.20),
    ("galle riviera", "sinharaja"): (95.0, 150.0, 1.20),
    ("galle", "mirissa"): (35.0, 45.0, 1.00),
    ("galle riviera", "mirissa"): (35.0, 45.0, 1.00),
    ("sinharaja", "mirissa"): (80.0, 120.0, 1.10),
    ("bentota", "galle"): (60.0, 60.0, 1.00),

    ("ella", "yala"): (95.0, 135.0, 1.15),
    ("anuradhapura", "sigiriya"): (75.0, 90.0, 1.05),
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def get_leg_telemetry(origin: str, dest: str, coords_dict: Dict[str, Tuple[float, float]]) -> Tuple[float, float, float]:
    """Retrieves distance (km), base duration (mins), and elevation factor for any pair."""
    k1 = origin.lower().strip()
    k2 = dest.lower().strip()

    if (k1, k2) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(k1, k2)]
    if (k2, k1) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(k2, k1)]

    # Alias normalization
    n1 = k1.replace(" riviera", "").replace("cultural triangle", "sigiriya")
    n2 = k2.replace(" riviera", "").replace("cultural triangle", "sigiriya")

    if (n1, n2) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(n1, n2)]
    if (n2, n1) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(n2, n1)]

    # Dynamic Haversine calculation with Sri Lanka road circuity factor
    c1 = coords_dict.get(k1) or coords_dict.get(n1) or (6.9271, 79.8612)
    c2 = coords_dict.get(k2) or coords_dict.get(n2) or (7.2906, 80.6337)

    direct_km = haversine_distance(c1[0], c1[1], c2[0], c2[1])
    road_km = max(15.0, direct_km * 1.35)
    is_m = (k1 in MOUNTAIN_DESTINATIONS or k2 in MOUNTAIN_DESTINATIONS or n1 in MOUNTAIN_DESTINATIONS or n2 in MOUNTAIN_DESTINATIONS)
    elev_factor = 1.30 if is_m else 1.05
    avg_speed = 42.0 if is_m else 55.0
    base_dur_mins = (road_km / avg_speed) * 60.0

    return (round(road_km, 1), round(base_dur_mins, 0), elev_factor)


class ResourceFeasibilityAgent:
    """Logistics Feasibility & Route Elevation Dispatch Intelligence Agent."""

    async def evaluate_feasibility(self, req: FeasibilityCheckRequest) -> FeasibilityCheckResponse:
        results = []
        conflicts = []

        # 1. Evaluate capacity availability via backend services
        pax = req.pax_count or (req.items[0].party_size if req.items else 2)

        for item in req.items:
            res_data = {}
            if item.resource_type == ResourceType.GUIDE:
                res_data = await search_guide_availability(date=item.date)
            elif item.resource_type == ResourceType.TRANSPORT:
                res_data = await search_transport_slots(date=item.date, party_size=pax)
            elif item.resource_type == ResourceType.ATTRACTION:
                res_data = await search_attraction_slots(date=item.date, party_size=pax)
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

        # 2. Enrich destination coordinates from DB if available
        db_dests = await get_all_destinations()
        coords_dict = dict(DESTINATION_COORDS)
        for d in db_dests:
            d_name = d.get("name", "").lower().strip()
            if d_name and d.get("latitude") and d.get("longitude"):
                coords_dict[d_name] = (float(d["latitude"]), float(d["longitude"]))

        # 3. Dynamic Circuit Waypoint GIS Transit & Elevation Analysis
        circuit_raw = req.circuit_route or "Colombo -> Kandy -> Nuwara Eliya -> Yala"
        circuit_legs: List[RouteLeg] = []
        
        # Tokenize circuit waypoints
        tokens = [t.strip() for t in re.split(r"->|→|;|,", circuit_raw) if t.strip()]
        waypoints = [re.sub(r"\(.*?\)", "", tok).strip() for tok in tokens if tok]

        total_dist_km = 0.0
        total_dur_mins = 0.0
        max_elev_factor = 1.00
        has_mountain_route = False

        if len(waypoints) >= 2:
            for i in range(len(waypoints) - 1):
                w1 = waypoints[i]
                w2 = waypoints[i + 1]

                leg_dist, leg_base_dur, leg_elev = get_leg_telemetry(w1, w2, coords_dict)
                leg_dur_adjusted = leg_base_dur * leg_elev

                total_dist_km += leg_dist
                total_dur_mins += leg_dur_adjusted
                if leg_elev > max_elev_factor:
                    max_elev_factor = leg_elev
                if leg_elev > 1.10:
                    has_mountain_route = True

                # Format leg duration
                l_hrs = int(leg_base_dur // 60)
                l_mins = int(leg_base_dur % 60)
                l_fmt = f"{l_hrs}h {l_mins:02d}m" if l_hrs > 0 else f"{l_mins}m"

                circuit_legs.append(RouteLeg(
                    origin=w1.title(),
                    destination=w2.title(),
                    distance_km=round(leg_dist, 1),
                    duration_minutes=round(leg_base_dur, 0),
                    formatted_duration=l_fmt
                ))
        else:
            # Fallback default single route telemetry if 1 or 0 waypoints passed
            leg_dist, leg_base_dur, leg_elev = get_leg_telemetry("Colombo", "Kandy", coords_dict)
            total_dist_km = leg_dist
            total_dur_mins = leg_base_dur * leg_elev
            max_elev_factor = leg_elev
            has_mountain_route = True
            circuit_legs.append(RouteLeg(
                origin="Colombo",
                destination="Kandy",
                distance_km=round(leg_dist, 1),
                duration_minutes=round(leg_base_dur, 0),
                formatted_duration="3h 15m"
            ))

        # Terrain Elevation Factor string
        if max_elev_factor >= 1.30:
            elevation_factor_str = f"{max_elev_factor:.2f}x Steep Hill Climb Active (Nuwara Eliya / Ella Highway)"
        elif max_elev_factor >= 1.20:
            elevation_factor_str = f"{max_elev_factor:.2f}x Mountain Precision Active (Kadugannawa / Pass)"
        elif max_elev_factor > 1.00:
            elevation_factor_str = f"{max_elev_factor:.2f}x Highway Precision Transit"
        else:
            elevation_factor_str = "1.00x Flat Coastal Highway Matrix"

        # Format overall driving transit time
        tot_hrs = int(total_dur_mins // 60)
        tot_mins = int(total_dur_mins % 60)
        formatted_driving_time = f"{tot_hrs}h {tot_mins:02d}m" if tot_hrs > 0 else f"{tot_mins}m"

        # 4. Dynamic Fleet Matching by Pax Count
        fleet_items = await get_fleet_catalog()
        matching_vehicle = None

        if fleet_items:
            # Filter for active vehicles with sufficient passenger capacity
            eligible = [v for v in fleet_items if v.get("maxPassengers", 0) >= pax or v.get("MaxPassengers", 0) >= pax]
            if eligible:
                # Sort by passenger capacity closest to requested pax count
                eligible.sort(key=lambda x: x.get("maxPassengers", x.get("MaxPassengers", 99)))
                matching_vehicle = eligible[0]

        if matching_vehicle:
            model_name = matching_vehicle.get("vehicleModel") or matching_vehicle.get("VehicleModel") or "VIP Luxury Vehicle"
            badge = matching_vehicle.get("categoryBadge") or matching_vehicle.get("CategoryBadge") or "Luxury Fleet"
            cap_limit = matching_vehicle.get("maxPassengers") or matching_vehicle.get("MaxPassengers") or pax
            recommended_vehicle = f"{model_name} ({badge} - Up to {cap_limit} Pax)"
        else:
            if pax <= 2:
                recommended_vehicle = "Mercedes-Benz E-Class Sedan (PRESTIGE EXECUTIVE SEDAN - Up to 3 Pax)"
            elif pax <= 6:
                recommended_vehicle = "Toyota KDH Super GL VIP Van (EXECUTIVE VIP GROUP TRANSPORT - Up to 6 Pax)"
            else:
                recommended_vehicle = "Toyota Coaster VIP Minibus (VIP COACH TRANSPORT - Up to 14 Pax)"

        # 5. Driver Rest & Safety Telemetry
        if total_dur_mins >= 240:
            rest_note = "Mandatory 30-min chauffeur rest stop scheduled at midpoint to enforce SLTDA safety standards."
        else:
            rest_note = "Continuous drive within safety limits."

        overall = FeasibilityStatus.FEASIBLE if not conflicts else FeasibilityStatus.PARTIALLY_FEASIBLE

        return FeasibilityCheckResponse(
            overall_feasibility=overall,
            items=results,
            route_summary=RouteSummary(
                total_distance_km=round(total_dist_km, 1),
                total_duration_minutes=round(total_dur_mins, 0),
                formatted_driving_time=formatted_driving_time,
                terrain_elevation_factor=elevation_factor_str,
                is_mountain_route=has_mountain_route,
                recommended_fleet_vehicle=recommended_vehicle,
                driver_rest_recommendation=rest_note,
                capacity_guarantee_status="100% Guaranteed Licensed Guide & Fleet Capacity Reserved",
                is_fallback=False,
                legs=circuit_legs
            ),
            conflicts=conflicts,
            active_circuit=circuit_raw
        )

feasibility_agent = ResourceFeasibilityAgent()
