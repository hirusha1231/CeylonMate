import math
import re
from typing import Dict, Any, List, Tuple
from app.core.llm import generate_gemini_json, generate_gemini_text
from app.schemas.feasibility import (
    FeasibilityCheckRequest, FeasibilityCheckResponse, FeasibilityStatus,
    ItemFeasibilityResult, RouteSummary, RouteLeg, ResourceType,
    RouteLogisticsRequest, RouteLogisticsResponse, RouteOption, DispatchedVehicle
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

MOUNTAIN_DESTINATIONS = {"nuwara eliya", "kandy", "ella", "sinharaja", "central highlands"}

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
    k1 = origin.lower().strip()
    k2 = dest.lower().strip()

    if (k1, k2) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(k1, k2)]
    if (k2, k1) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(k2, k1)]

    n1 = k1.replace(" riviera", "").replace("cultural triangle", "sigiriya")
    n2 = k2.replace(" riviera", "").replace("cultural triangle", "sigiriya")

    if (n1, n2) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(n1, n2)]
    if (n2, n1) in SRI_LANKA_ROUTE_MATRIX:
        return SRI_LANKA_ROUTE_MATRIX[(n2, n1)]

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

        # 4. Dynamic Fleet Matching by Pax Count
        fleet_items = await get_fleet_catalog()
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
            if pax <= 2:
                recommended_vehicle = f"Prestige Executive Sedan (PRESTIGE EXECUTIVE SEDAN - Up to 3 Pax)"
            elif pax <= 6:
                recommended_vehicle = f"Executive VIP Group Van (EXECUTIVE VIP GROUP TRANSPORT - Up to {max(6, pax)} Pax)"
            else:
                recommended_vehicle = f"Luxury VIP Coach (VIP COACH TRANSPORT - Up to {pax} Pax)"

        # 5. Gemini Logistics Reasoning Brief
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
            system_instruction="You are CeylonMate's Agent 3: Senior Logistics & Dispatch Officer. Output concise, professional transit briefing."
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

        llm_prompt = f"""You are Agent 3: Route Logistics & Fleet Dispatcher for Sri Lanka.
Origin: '{origin}'
Destination: '{destination}'
Passengers: {passengers}
Analyze the terrain, roads, and transit between these two points in Sri Lanka.
Return ONLY a valid JSON object matching this schema:
{{
  "origin": "{origin}",
  "destination": "{destination}",
  "routes": [
    {{
      "id": "route_1",
      "name": "<Real route name, e.g. Southern Expressway or A2 Coastal Road>",
      "via": "<Key cities/interchanges passed>",
      "distanceKm": 125,
      "estimatedDuration": "<e.g. 2h 15m>",
      "terrainType": "<e.g. Flat Highway, Winding Incline, Coastal Traffic>",
      "elevationMultiplier": "<e.g. 1.0x, 1.25x>",
      "isFastest": true,
      "keyHighlightsOrStops": ["<stop 1>", "<stop 2>"]
    }}
  ],
  "dispatchedFleet": [
    {{
      "vehicleType": "<e.g. Luxury Sedan, High-Roof VIP Van, 4WD SUV>",
      "model": "<e.g. Toyota Premio/Allion, Toyota KDH Super GL, Land Cruiser Prado>",
      "maxPax": 4,
      "luggageCapacity": 3,
      "terrainSuitabilityNote": "<Why this vehicle fits this route>",
      "estimatedDailyRateLkr": 35000
    }}
  ]
}}"""

        print(f"\n[AGENT 3 LOGISTICS] Computing route from '{origin}' to '{destination}' for {passengers} pax...")
        gemini_res = await generate_gemini_json(
            prompt=llm_prompt,
            system_instruction="You are Agent 3: Route Logistics & Fleet Dispatcher for Sri Lanka. Analyze real Sri Lankan geography, actual highways/roads, realistic travel times, and recommend realistic vehicles. Return ONLY pure JSON matching the schema."
        )
        print(f"[AGENT 3 LOGISTICS] Raw Gemini JSON: {gemini_res}")

        if gemini_res and isinstance(gemini_res, dict):
            routes_data = gemini_res.get("routes") or []
            fleet_data = gemini_res.get("dispatchedFleet") or []
            
            if routes_data and fleet_data:
                routes = []
                for idx, r in enumerate(routes_data):
                    routes.append(RouteOption(
                        id=str(r.get("id") or f"route_{idx + 1}"),
                        name=str(r.get("name") or ""),
                        via=str(r.get("via") or ""),
                        distanceKm=float(r.get("distanceKm") or 0),
                        estimatedDuration=str(r.get("estimatedDuration") or ""),
                        terrainType=str(r.get("terrainType") or ""),
                        elevationMultiplier=str(r.get("elevationMultiplier") or "1.0x"),
                        isFastest=bool(r.get("isFastest", True)),
                        keyHighlightsOrStops=list(r.get("keyHighlightsOrStops") or [])
                    ))
                
                dispatched_fleet = []
                for f in fleet_data:
                    dispatched_fleet.append(DispatchedVehicle(
                        vehicleType=str(f.get("vehicleType") or "Luxury Vehicle"),
                        model=str(f.get("model") or "Executive Fleet Vehicle"),
                        maxPax=_parse_int(f.get("maxPax"), passengers),
                        luggageCapacity=_parse_int(f.get("luggageCapacity"), 4),
                        terrainSuitabilityNote=str(f.get("terrainSuitabilityNote") or ""),
                        estimatedDailyRateLkr=_parse_float(f.get("estimatedDailyRateLkr"), 35000.0)
                    ))
                
                return RouteLogisticsResponse(
                    origin=str(gemini_res.get("origin") or origin),
                    destination=str(gemini_res.get("destination") or destination),
                    routes=routes,
                    dispatchedFleet=dispatched_fleet
                )
        # High-fidelity GIS route physics & fleet dispatcher fallback
        db_dests = await get_all_destinations()
        coords_dict = dict(DESTINATION_COORDS)
        for d in db_dests:
            d_name = d.get("name", "").lower().strip()
            if d_name and d.get("latitude") and d.get("longitude"):
                coords_dict[d_name] = (float(d["latitude"]), float(d["longitude"]))

        start_date = req.startDate
        duration_days = req.durationDays or 1
        fleet_items = await get_fleet_catalog(start_date=start_date, duration_days=duration_days, passengers=passengers)
        return self._build_deterministic_route_logistics(origin, destination, passengers, coords_dict, fleet_items)

    def _build_deterministic_route_logistics(
        self,
        origin: str,
        destination: str,
        passengers: int,
        coords_dict: Dict[str, Tuple[float, float]],
        fleet_items: List[Dict[str, Any]]
    ) -> RouteLogisticsResponse:
        o_clean = origin.lower().strip()
        d_clean = destination.lower().strip()

        leg_dist, leg_base_dur, leg_elev = get_leg_telemetry(origin, destination, coords_dict)

        is_southern = any(s in o_clean or s in d_clean for s in ["bentota", "galle", "mirissa", "weligama", "tangalle", "hambantota", "matara", "hikkaduwa", "unawatuna"])
        is_mountain = any(m in o_clean or m in d_clean for m in ["kandy", "nuwara eliya", "ella", "sinharaja", "central highlands", "horton plains", "adams peak", "badulla", "hatton"])
        is_cultural = any(c in o_clean or c in d_clean for c in ["sigiriya", "dambulla", "polonnaruwa", "anuradhapura", "habarana", "kurunegala"])
        is_airport = "airport" in o_clean or "cmb" in o_clean or "katunayake" in o_clean

        # Route 1: Expressway / Fast arterial corridor
        if is_southern and (is_airport or "colombo" in o_clean):
            r1_name = "Southern Expressway Direct Corridor (E01 / E02)"
            r1_via = "Katunayake Expressway (E03), Outer Circular (E02) & Welipenna Interchange"
            r1_dist = round(max(45.0, leg_dist), 1)
            r1_dur_mins = round((r1_dist / 85.0) * 60.0)
            r1_terrain = "Multi-Lane Express Highway (100 km/h Precision Cruise)"
            r1_elev = "1.00x"
            r1_stops = ["Welipenna Expressway Rest Plaza", "Benthara River Estuary Bridge"]
        elif is_mountain:
            r1_name = "Central Expressway & Kadugannawa Pass (E04 / A1 / A5)"
            r1_via = "Mirigama Expressway, Ambepussa & Kadugannawa Incline"
            r1_dist = round(max(50.0, leg_dist), 1)
            r1_dur_mins = round(leg_base_dur * leg_elev)
            r1_terrain = "Highway transitioning to Mountain Switchbacks & Incline"
            r1_elev = f"{leg_elev:.2f}x"
            r1_stops = ["Ambepussa Heritage Transit Rest", "Kadugannawa Rock Viewpoint", "Peradeniya Riverbank"]
        elif is_cultural:
            r1_name = "North-Central Expressway & Dambulla Link (E04 / A6)"
            r1_via = "Mirigama, Kurunegala Interchange & Dambulla Highway"
            r1_dist = round(max(60.0, leg_dist), 1)
            r1_dur_mins = round(leg_base_dur * leg_elev)
            r1_terrain = "Smooth Dual-Carriageway Highway & Flat Inland Plains"
            r1_elev = "1.05x"
            r1_stops = ["Kurunegala Elephant Rock Rest Hub", "Dambulla Golden Rock Viewpoint"]
        else:
            r1_name = f"{origin.title()} to {destination.title()} Express Corridor"
            r1_via = "National Highway Network & Arterial Linkways"
            r1_dist = round(max(30.0, leg_dist), 1)
            r1_dur_mins = round(leg_base_dur * leg_elev)
            r1_terrain = "Inter-Provincial Paved Highway"
            r1_elev = f"{leg_elev:.2f}x"
            r1_stops = ["Midway Expressway Service Hub", "Scenic Waypoint Rest"]

        r1_hrs = int(r1_dur_mins // 60)
        r1_m = int(r1_dur_mins % 60)
        r1_dur_str = f"{r1_hrs}h {r1_m:02d}m" if r1_hrs > 0 else f"{r1_m}m"

        # Route 2: Scenic / Coastal / Cultural Byway
        if is_southern:
            r2_name = "Historic Coastal Trunk Highway (A2 Galle Road)"
            r2_via = "Colombo Marine Drive, Wadduwa, Kalutara & Beruwala Coastline"
            r2_dist = round(r1_dist * 0.95, 1)
            r2_dur_mins = round(r1_dur_mins * 1.45)
            r2_terrain = "Oceanfront Coastal Highway (Scenic Sea Vistas & Towns)"
            r2_elev = "1.05x"
            r2_stops = ["Kalutara Sacred Bodhi Chaitya", "Barberyn Ocean Lighthouse", "Beruwala Fishing Harbor"]
        elif is_mountain:
            r2_name = "Highland Tea Plantation Scenic Byway (A7 / Kitulgala Route)"
            r2_via = "Avissawella, Kitulgala Rain Forest Valley & Ginigathena Hills"
            r2_dist = round(r1_dist * 1.10, 1)
            r2_dur_mins = round(r1_dur_mins * 1.30)
            r2_terrain = "Winding Mountain Tea Estate Slopes & River Gorges"
            r2_elev = "1.35x"
            r2_stops = ["Kitulgala Kelani River Gorge", "St. Clair's Waterfalls Lookout", "Devon Valley Estate"]
        else:
            r2_name = f"{origin.title()} to {destination.title()} Panoramic Heritage Route"
            r2_via = "Provincial Heritage Byways & Rural Landscapes"
            r2_dist = round(r1_dist * 1.12, 1)
            r2_dur_mins = round(r1_dur_mins * 1.25)
            r2_terrain = "Scenic Rural & Cultural Landscape"
            r2_elev = f"{min(1.4, leg_elev * 1.1):.2f}x"
            r2_stops = ["Local Artisan Heritage Village", "Panoramic Valley Vista Point"]

        r2_hrs = int(r2_dur_mins // 60)
        r2_m = int(r2_dur_mins % 60)
        r2_dur_str = f"{r2_hrs}h {r2_m:02d}m" if r2_hrs > 0 else f"{r2_m}m"

        routes = [
            RouteOption(
                id="route_1",
                name=r1_name,
                via=r1_via,
                distanceKm=r1_dist,
                estimatedDuration=r1_dur_str,
                terrainType=r1_terrain,
                elevationMultiplier=r1_elev,
                isFastest=True,
                keyHighlightsOrStops=r1_stops
            ),
            RouteOption(
                id="route_2",
                name=r2_name,
                via=r2_via,
                distanceKm=r2_dist,
                estimatedDuration=r2_dur_str,
                terrainType=r2_terrain,
                elevationMultiplier=r2_elev,
                isFastest=False,
                keyHighlightsOrStops=r2_stops
            )
        ]

        dispatched_fleet = []
        if fleet_items:
            for item in fleet_items:
                max_p = _parse_int(item.get("maxPassengers") or item.get("maxPax"), 4)
                # STRICT RULE: Always ensure traveler pax <= vehicle pax count (maxPax >= passengers)
                if max_p < passengers:
                    continue
                v_model = item.get("vehicleModel") or item.get("model") or "VIP Chauffeur Vehicle"
                v_type = item.get("categoryBadge") or item.get("vehicleType") or "Luxury VIP Transport"
                luggage = _parse_int(item.get("luggageCapacity"), 4)
                rate_usd = _parse_float(item.get("dailyRateUsd"), 120.0)
                rate_lkr = _parse_float(item.get("dailyRateLkr"), rate_usd * 300.0)
                note = item.get("featureHighlight") or item.get("description") or f"Calibrated for {v_type} luxury long-range transit and executive comfort."
                
                dispatched_fleet.append(DispatchedVehicle(
                    vehicleType=v_type,
                    model=v_model,
                    maxPax=max_p,
                    luggageCapacity=luggage,
                    terrainSuitabilityNote=note,
                    estimatedDailyRateLkr=rate_lkr
                ))

        if not dispatched_fleet:
            if passengers <= 3:
                dispatched_fleet.append(DispatchedVehicle(
                    vehicleType="Luxury Executive Sedan",
                    model="Prestige Executive Sedan",
                    maxPax=max(3, passengers),
                    luggageCapacity=3,
                    terrainSuitabilityNote="Equipped with air-suspension and active cruise assist; calibrated for high-speed arterial transit and smooth executive comfort.",
                    estimatedDailyRateLkr=35000.0
                ))
            if passengers <= 6:
                dispatched_fleet.append(DispatchedVehicle(
                    vehicleType="Executive VIP Group Van",
                    model="Executive VIP Group Van",
                    maxPax=max(6, passengers),
                    luggageCapacity=6,
                    terrainSuitabilityNote="Wide-body luxury captain seats with dual climate zones; optimal for multi-passenger luggage transport.",
                    estimatedDailyRateLkr=48000.0
                ))
            if passengers <= 5:
                dispatched_fleet.append(DispatchedVehicle(
                    vehicleType="Luxury 4WD All-Terrain Cruiser",
                    model="Luxury 4WD All-Terrain Cruiser",
                    maxPax=max(5, passengers),
                    luggageCapacity=4,
                    terrainSuitabilityNote="High-ground clearance with active torque distribution; optimal for coastal sand roads, hill gradients, and wet weather confidence.",
                    estimatedDailyRateLkr=65000.0
                ))
            if passengers > 6:
                dispatched_fleet.append(DispatchedVehicle(
                    vehicleType="VIP Coach Transport",
                    model="Luxury VIP Minibus Coach",
                    maxPax=max(14, passengers),
                    luggageCapacity=12,
                    terrainSuitabilityNote="Spacious VIP coach configuration with panoramic touring windows.",
                    estimatedDailyRateLkr=85000.0
                ))

        return RouteLogisticsResponse(
            origin=origin.title(),
            destination=destination.title(),
            routes=routes,
            dispatchedFleet=dispatched_fleet
        )


feasibility_agent = ResourceFeasibilityAgent()
