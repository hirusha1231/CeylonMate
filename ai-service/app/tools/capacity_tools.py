import httpx
from typing import Dict, Any

BACKEND_BASE_URL = "http://localhost:5084/api"

async def search_guide_availability(date: str = "", guide_id: str = "") -> Dict[str, Any]:
    try:
        url = f"{BACKEND_BASE_URL}/capacity/search"
        params = {}
        if date:
            params["date"] = date
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                guides = data.get("availableGuides", [])
                if guide_id:
                    guides = [g for g in guides if g.get("localGuideUserId") == guide_id]
                avail = len(guides) > 0
                return {
                    "available": avail,
                    "capacity": len(guides),
                    "note": f"{len(guides)} guide slot(s) available" if avail else "No guide slot available",
                    "items": guides
                }
    except Exception as e:
        pass
    return {"available": True, "capacity": 1, "note": "Guide slot available (fallback mode)"}

async def search_transport_slots(date: str = "", party_size: int = 1) -> Dict[str, Any]:
    try:
        url = f"{BACKEND_BASE_URL}/capacity/search"
        params = {"partySize": party_size}
        if date:
            params["date"] = date
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                transports = data.get("availableTransport", [])
                avail = len(transports) > 0
                total_seats = sum(t.get("availableSeats", 0) for t in transports)
                return {
                    "available": avail,
                    "capacity": total_seats if avail else 0,
                    "note": f"{len(transports)} transport option(s) with {total_seats} seats" if avail else "No transport slot available",
                    "items": transports
                }
    except Exception as e:
        pass
    return {"available": True, "capacity": 15, "note": "Vehicle seats available (fallback mode)"}

async def search_attraction_slots(date: str = "", attraction_id: str = "", party_size: int = 1) -> Dict[str, Any]:
    try:
        url = f"{BACKEND_BASE_URL}/capacity/search"
        params = {"partySize": party_size}
        if date:
            params["date"] = date
        if attraction_id:
            params["attractionId"] = attraction_id
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                attractions = data.get("availableAttractions", [])
                avail = len(attractions) > 0
                rem_cap = sum(a.get("maxCapacity", 0) - a.get("bookedCapacity", 0) for a in attractions)
                return {
                    "available": avail,
                    "capacity": rem_cap if avail else 0,
                    "note": f"{len(attractions)} attraction slot(s) with capacity {rem_cap}" if avail else "No attraction capacity available",
                    "items": attractions
                }
    except Exception as e:
        pass
    return {"available": True, "capacity": 50, "note": "Attraction quota open (fallback mode)"}

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
