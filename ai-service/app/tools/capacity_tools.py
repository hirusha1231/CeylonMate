import httpx
from typing import Dict, Any

BACKEND_BASE_URL = "http://localhost:5084/api"

async def search_guide_availability(date: str, guide_id: str = "") -> Dict[str, Any]:
    return {"available": True, "capacity": 1, "note": "Guide slot available"}

async def search_transport_slots(date: str, party_size: int) -> Dict[str, Any]:
    return {"available": True, "capacity": 15, "note": "Vehicle seats available"}

async def search_attraction_slots(date: str, attraction_id: str = "") -> Dict[str, Any]:
    return {"available": True, "capacity": 50, "note": "Attraction quota open"}

async def get_route_estimate(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(
                f"{BACKEND_BASE_URL}/capacity/routing/estimate",
                json={"originLat": origin_lat, "originLng": origin_lng, "destLat": dest_lat, "destLng": dest_lng}
            )
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass
    return {"distanceKm": 25.0, "durationMinutes": 40.0, "isFallback": True}
