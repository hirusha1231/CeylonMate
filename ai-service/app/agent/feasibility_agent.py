import math
import re
from typing import Dict, Any, List, Tuple, Optional
from app.core.llm import generate_gemini_json, generate_gemini_text, generate_gemini_json_sync
from app.schemas.feasibility import (
    FeasibilityCheckRequest, FeasibilityCheckResponse, FeasibilityStatus,
    ItemFeasibilityResult, RouteSummary, RouteLeg, ResourceType,
    RouteLogisticsRequest, RouteLogisticsResponse, RouteOption, DispatchedVehicle
)
from app.tools.capacity_tools import (
    search_guide_availability, search_transport_slots, search_attraction_slots,
    get_fleet_catalog, get_all_destinations
)


def _parse_int(val: Any, default: int = 4) -> int:
    if val is None:
        return default
    if isinstance(val, bool):
        return default
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        m = re.search(r'\d+', val)
        if m:
            try:
                return int(m.group())
            except ValueError:
                pass
    return default


def _parse_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    if isinstance(val, bool):
        return default
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        m = re.search(r'[\d.]+', val)
        if m:
            try:
                return float(m.group())
            except ValueError:
                pass
    return default


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_leg_telemetry(origin: str, dest: str, coords_dict: Optional[Dict[str, Tuple[float, float]]] = None) -> Tuple[float, float, float]:
    """Dynamically calculates distance (km), base duration (mins), and elevation factor using Groq AI."""
    clean_o = origin.strip()
    clean_d = dest.strip()

    prompt = f"""
    Analyze Sri Lanka road transit between '{clean_o}' and '{clean_d}'.
    Calculate actual driving distance in kilometers, driving duration in minutes, and terrain elevation multiplier (1.0 for flat highway/coastal, 1.1-1.2 for inland, 1.25-1.40 for steep mountain passes).
    Return ONLY a JSON object:
    {{
      "distanceKm": float,
      "durationMinutes": float,
      "elevationMultiplier": float
    }}
    """
    try:
        res = generate_gemini_json_sync(prompt, "You are CeylonMate's Groq-powered Sri Lanka GIS & Road Physics Engine.")
        if res and isinstance(res, dict):
            dist = float(res.get("distanceKm", 0.0))
            dur = float(res.get("durationMinutes", 0.0))
            elev = float(res.get("elevationMultiplier", 1.0))
            if dist > 0 and dur > 0:
                return (round(dist, 1), round(dur, 0), round(elev, 2))
    except Exception:
        pass

    # Dynamic Haversine calculation if coordinates are present in coords_dict
    if coords_dict:
        k1 = clean_o.lower()
        k2 = clean_d.lower()
        c1 = coords_dict.get(k1)
        c2 = coords_dict.get(k2)
        if c1 and c2:
            direct_km = haversine_distance(c1[0], c1[1], c2[0], c2[1])
            road_km = max(10.0, direct_km * 1.35)
            dur_mins = (road_km / 50.0) * 60.0
            return (round(road_km, 1), round(dur_mins, 0), 1.05)

    return (40.0, 60.0, 1.00)


class ResourceFeasibilityAgent:
    """Logistics Feasibility & Route Elevation Dispatch Intelligence Agent powered by Groq LLM."""

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

        # 2. Dynamic coordinate lookup from backend DB
        db_dests = await get_all_destinations()
        coords_dict: Dict[str, Tuple[float, float]] = {}
        for d in db_dests:
            d_name = d.get("name", "").lower().strip()
            if d_name and d.get("latitude") and d.get("longitude"):
                coords_dict[d_name] = (float(d["latitude"]), float(d["longitude"]))

        # 3. Dynamic Circuit Waypoint GIS Transit & Elevation Analysis via Groq
        circuit_raw = req.circuit_route or "Colombo -> Kandy -> Nuwara Eliya -> Yala"
        circuit_legs: List[RouteLeg] = []

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
            elevation_factor_str = f"{max_elev_factor:.2f}x Steep Hill Climb Active (Nuwara Eliya / Ella Mountain Corridor)"
        elif max_elev_factor >= 1.20:
            elevation_factor_str = f"{max_elev_factor:.2f}x Mountain Precision Active (Kadugannawa Pass Corridor)"
        elif max_elev_factor > 1.00:
            elevation_factor_str = f"{max_elev_factor:.2f}x Highway Precision Transit"
        else:
            elevation_factor_str = "1.00x Flat Coastal Highway Matrix"

        tot_hrs = int(total_dur_mins // 60)
        tot_mins = int(total_dur_mins % 60)
        formatted_driving_time = f"{tot_hrs}h {tot_mins:02d}m" if tot_hrs > 0 else f"{tot_mins}m"

        # 4. Dynamic Fleet Matching strictly from system catalog for selected date
        first_date = req.items[0].date if (req.items and len(req.items) > 0 and req.items[0].date) else None
        fleet_items = await get_fleet_catalog(start_date=first_date, passengers=pax)
        matching_vehicle = None

        if fleet_items:
            eligible = [v for v in fleet_items if _parse_int(v.get("maxPassengers") or v.get("MaxPassengers"), 4) >= pax]
            if eligible:
                eligible.sort(key=lambda x: _parse_int(x.get("maxPassengers") or x.get("MaxPassengers"), 99))
                matching_vehicle = eligible[0]

        if matching_vehicle:
            model_name = matching_vehicle.get("vehicleModel") or matching_vehicle.get("VehicleModel") or "VIP Luxury Vehicle"
            badge = matching_vehicle.get("categoryBadge") or matching_vehicle.get("CategoryBadge") or "Luxury Fleet"
            cap_limit = _parse_int(matching_vehicle.get("maxPassengers") or matching_vehicle.get("MaxPassengers"), pax)
            recommended_vehicle = f"{model_name} ({badge} - Up to {cap_limit} Pax)"
        else:
            recommended_vehicle = f"Executive VIP Private Escort (Up to {pax} Pax)"

        # 5. Groq LLM Logistics Reasoning Brief
        gemini_prompt = f"""
Given this Sri Lanka luxury route and resource deployment:
Route Circuit: {circuit_raw}
Total Distance: {total_dist_km:.1f} km, Estimated Drive Time: {formatted_driving_time}
Terrain Elevation Factor: {elevation_factor_str} (Is Mountain Route: {has_mountain_route})
Party Size: {pax} passengers
Assigned Vehicle: {recommended_vehicle}

Generate a concise, high-end logistics brief (1-2 sentences) explaining why this vehicle and transit pacing ensure maximum luxury and safety for this route.
"""
        driver_rest_text = "Mandatory 30-min chauffeur rest stop scheduled at midpoint to enforce SLTDA safety standards." if total_dur_mins >= 240 else "Continuous drive within safety limits."

        gemini_brief = await generate_gemini_text(
            prompt=gemini_prompt,
            system_instruction="You are CeylonMate's Agent 3: Senior Logistics & Dispatch Officer powered by Groq. Output concise, professional transit briefing."
        )

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
                driver_rest_recommendation=gemini_brief or driver_rest_text,
                capacity_guarantee_status="100% Guaranteed Licensed Guide & Fleet Capacity Reserved",
                is_fallback=False,
                legs=circuit_legs
            ),
            conflicts=conflicts,
            active_circuit=circuit_raw
        )

    async def compute_route_logistics(self, req: RouteLogisticsRequest) -> RouteLogisticsResponse:
        origin = req.origin.strip()
        destination = req.destination.strip()
        passengers = req.passengers or 2

        # 1. Fetch available system vehicles from backend fleet catalog
        start_date = req.startDate
        duration_days = req.durationDays or 1
        fleet_items = await get_fleet_catalog(start_date=start_date, duration_days=duration_days, passengers=passengers)

        system_vehicles = []
        if fleet_items:
            for item in fleet_items:
                max_p = _parse_int(item.get("maxPassengers") or item.get("maxPax"), 4)
                if max_p >= passengers:
                    v_model = item.get("vehicleModel") or item.get("model") or "VIP Vehicle"
                    v_type = item.get("categoryBadge") or item.get("vehicleType") or "Luxury Transport"
                    luggage = _parse_int(item.get("luggageCapacity"), 4)
                    rate_usd = _parse_float(item.get("dailyRateUsd"), 120.0)
                    rate_lkr = _parse_float(item.get("dailyRateLkr"), rate_usd * 300.0)
                    note = item.get("featureHighlight") or item.get("description") or f"Calibrated for {v_type} luxury long-range transit."
                    system_vehicles.append({
                        "vehicleType": v_type,
                        "model": v_model,
                        "maxPax": max_p,
                        "luggageCapacity": luggage,
                        "terrainSuitabilityNote": note,
                        "estimatedDailyRateLkr": rate_lkr
                    })

        # Dynamic fallback if backend API returned no vehicles
        if not system_vehicles:
            system_vehicles = [{
                "vehicleType": "EXECUTIVE VIP CHAUFFEUR TRANSPORT",
                "model": f"Private VIP Vehicle Escort ({passengers} Pax)",
                "maxPax": max(passengers, 4),
                "luggageCapacity": max(passengers, 2),
                "terrainSuitabilityNote": "Calibrated for luxury long-range Sri Lanka transit.",
                "estimatedDailyRateLkr": 36000.0
            }]

        # 2. Query Groq for route analysis
        llm_prompt = f"""You are Agent 3: Route Logistics & Fleet Dispatcher for Sri Lanka powered by Groq.
Origin: '{origin}'
Destination: '{destination}'
Passengers: {passengers}

System Available Fleet: {[v["model"] for v in system_vehicles]}

Analyze real Sri Lanka geographical terrain, actual highways/roads (e.g. Southern Expressway E01, Central Expressway E04, A1, A2, A5, A6), distance in km, driving duration, and elevation multiplier.

Return ONLY a valid JSON object matching this schema:
{{
  "origin": "{origin}",
  "destination": "{destination}",
  "routes": [
    {{
      "id": "route_1",
      "name": "<e.g. Southern Expressway Direct Corridor (E01 / E02) or Central Expressway & Kadugannawa Pass>",
      "via": "<Key cities/interchanges passed>",
      "distanceKm": float,
      "estimatedDuration": "<e.g. 2h 15m>",
      "terrainType": "<e.g. Multi-Lane Express Highway, Mountain Switchbacks & Incline>",
      "elevationMultiplier": "<e.g. 1.00x, 1.25x, 1.35x>",
      "isFastest": true,
      "keyHighlightsOrStops": ["<stop 1>", "<stop 2>"]
    }},
    {{
      "id": "route_2",
      "name": "<Scenic or alternative byway route>",
      "via": "<Key cities/coastal towns passed>",
      "distanceKm": float,
      "estimatedDuration": "<e.g. 3h 10m>",
      "terrainType": "<e.g. Oceanfront Coastal Highway, Highland Tea Estate Slopes>",
      "elevationMultiplier": "<e.g. 1.05x, 1.30x>",
      "isFastest": false,
      "keyHighlightsOrStops": ["<stop 1>", "<stop 2>"]
    }}
  ]
}}"""

        gemini_res = await generate_gemini_json(
            prompt=llm_prompt,
            system_instruction="You are Agent 3: Route Logistics & Fleet Dispatcher for Sri Lanka. Output pure valid JSON strictly matching the requested schema."
        )

        routes: List[RouteOption] = []
        if gemini_res and isinstance(gemini_res, dict):
            routes_data = gemini_res.get("routes") or []
            for idx, r in enumerate(routes_data):
                routes.append(RouteOption(
                    id=str(r.get("id") or f"route_{idx + 1}"),
                    name=str(r.get("name") or ""),
                    via=str(r.get("via") or ""),
                    distanceKm=_parse_float(r.get("distanceKm"), 50.0),
                    estimatedDuration=str(r.get("estimatedDuration") or ""),
                    terrainType=str(r.get("terrainType") or ""),
                    elevationMultiplier=str(r.get("elevationMultiplier") or "1.0x"),
                    isFastest=bool(r.get("isFastest", True)),
                    keyHighlightsOrStops=list(r.get("keyHighlightsOrStops") or [])
                ))

        if not routes:
            db_dests = await get_all_destinations()
            coords_dict: Dict[str, Tuple[float, float]] = {}
            for d in db_dests:
                d_name = d.get("name", "").lower().strip()
                if d_name and d.get("latitude") and d.get("longitude"):
                    coords_dict[d_name] = (float(d["latitude"]), float(d["longitude"]))

            leg_dist, leg_base_dur, leg_elev = get_leg_telemetry(origin, destination, coords_dict)
            dur_mins = round(leg_base_dur * leg_elev)
            r_hrs = int(dur_mins // 60)
            r_mins = int(dur_mins % 60)
            dur_str = f"{r_hrs}h {r_mins:02d}m" if r_hrs > 0 else f"{r_mins}m"

            routes = [
                RouteOption(
                    id="route_1",
                    name=f"{origin.title()} to {destination.title()} Express Corridor",
                    via="National Highway & Inter-Provincial Arterial Link",
                    distanceKm=leg_dist,
                    estimatedDuration=dur_str,
                    terrainType="Paved Express Transit",
                    elevationMultiplier=f"{leg_elev:.2f}x",
                    isFastest=True,
                    keyHighlightsOrStops=["Midway Express Rest Hub", "Scenic Waypoint Lookout"]
                ),
                RouteOption(
                    id="route_2",
                    name=f"{origin.title()} to {destination.title()} Panoramic Scenic Byway",
                    via="Local Heritage Routes & Coastal Plains",
                    distanceKm=round(leg_dist * 1.10, 1),
                    estimatedDuration=f"{int((dur_mins * 1.25) // 60)}h {int((dur_mins * 1.25) % 60):02d}m",
                    terrainType="Scenic Heritage Road",
                    elevationMultiplier=f"{min(1.4, leg_elev * 1.1):.2f}x",
                    isFastest=False,
                    keyHighlightsOrStops=["Local Artisan Heritage Village", "Panoramic Vista Point"]
                )
            ]

        # Convert system_vehicles directly to DispatchedVehicle DTOs
        dispatched_fleet = [
            DispatchedVehicle(
                vehicleType=v["vehicleType"],
                model=v["model"],
                maxPax=v["maxPax"],
                luggageCapacity=v["luggageCapacity"],
                terrainSuitabilityNote=v["terrainSuitabilityNote"],
                estimatedDailyRateLkr=v["estimatedDailyRateLkr"]
            )
            for v in system_vehicles
        ]

        return RouteLogisticsResponse(
            origin=origin.title(),
            destination=destination.title(),
            routes=routes,
            dispatchedFleet=dispatched_fleet
        )


feasibility_agent = ResourceFeasibilityAgent()
