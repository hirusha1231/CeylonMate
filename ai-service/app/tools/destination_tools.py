from typing import Any, List, Dict
from app.core.llm import generate_gemini_json

# Controlled catalog matching CeylonMate seeded locations, active advisories, and guide reports
DESTINATION_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "dest-bentota",
        "name": "Bentota Coastal Strip",
        "region": "south western coast",
        "category": "beach",
        "themes": ["beach", "coast", "water sports", "relaxation", "luxury", "culinary"],
        "attractions": [
            {"id": "attr-bentota-01", "name": "Bentota Private Lagoon & Beach Access", "price": 35.0, "status": "OPEN", "accessibility": "Wheelchair accessible"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-mirissa",
        "name": "Mirissa Beach & Bay",
        "region": "southern coast",
        "category": "beach",
        "themes": ["beach", "coast", "whale watching", "seafood", "relaxation"],
        "attractions": [
            {"id": "attr-mirissa-01", "name": "Mirissa Marine & Coastal Access", "price": 45.0, "status": "OPEN", "accessibility": "Level sandy access"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-weligama",
        "name": "Weligama Bay",
        "region": "southern coast",
        "category": "beach",
        "themes": ["beach", "surfing", "coast", "culinary"],
        "attractions": [
            {"id": "attr-weligama-01", "name": "Weligama Bay Surf & Coastline", "price": 30.0, "status": "OPEN", "accessibility": "Wheelchair accessible"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-sigiriya",
        "name": "Sigiriya Rock Fortress",
        "region": "cultural triangle",
        "category": "heritage",
        "themes": ["heritage", "culture", "archaeology", "history"],
        "attractions": [
            {"id": "attr-sigi-01", "name": "Sigiriya Ancient Citadel Entry", "price": 36.0, "status": "OPEN", "accessibility": "Steep stairways"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-nuwara-eliya",
        "name": "Nuwara Eliya Tea Country",
        "region": "hill country",
        "category": "nature",
        "themes": ["tea", "nature", "hill country", "culture"],
        "attractions": [
            {"id": "attr-tea-01", "name": "Nuwara Eliya Tea Experience", "price": 40.0, "status": "OPEN", "accessibility": "Wheelchair accessible"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-yala",
        "name": "Yala National Park",
        "region": "southern",
        "category": "wildlife",
        "themes": ["wildlife", "safari", "nature", "southern"],
        "attractions": [
            {"id": "attr-yala-01", "name": "Yala Wildlife Safari Slot", "price": 75.0, "status": "OPEN", "accessibility": "Adapted 4x4 jeeps"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-galle",
        "name": "Galle Fort",
        "region": "southern",
        "category": "heritage",
        "themes": ["culture", "heritage", "history", "southern", "coast"],
        "attractions": [
            {"id": "attr-galle-01", "name": "Galle Heritage Walk", "price": 25.0, "status": "OPEN", "accessibility": "Ramped access"}
        ],
        "advisories": [],
        "guideReports": []
    },
    {
        "id": "dest-ella",
        "name": "Ella Viewpoint",
        "region": "hill country",
        "category": "nature",
        "themes": ["tea", "nature", "scenic", "hill country"],
        "attractions": [
            {"id": "attr-ella-01", "name": "Ella Cliff Overlook", "price": 20.0, "status": "CLOSED_TEMPORARILY", "accessibility": None}
        ],
        "advisories": [{"type": "ROAD_BLOCK", "severity": "CRITICAL", "message": "Slope maintenance blockage"}],
        "guideReports": [{"type": "CLOSURE", "message": "Mudslide blocked the trail"}]
    }
]

async def search_destinations(region_or_theme: str) -> list[dict[str, Any]]:
    needle = region_or_theme.lower().strip()
    words = [w.strip() for w in needle.replace(",", " ").split() if len(w.strip()) > 2]
    
    matches = [
        d for d in DESTINATION_CATALOG
        if any(w in d["region"].lower() or w in d["category"].lower() or any(w in t.lower() for t in d.get("themes", [])) for w in words)
    ]
    return matches if matches else DESTINATION_CATALOG

async def get_attraction_rules(attraction_id: str) -> dict[str, Any]:
    for d in DESTINATION_CATALOG:
        for a in d["attractions"]:
            if a["id"] == attraction_id:
                return a
    return {"id": attraction_id, "status": "UNKNOWN", "price": 0.0}

async def get_active_advisories(destination_id: str) -> list[dict[str, Any]]:
    for d in DESTINATION_CATALOG:
        if d["id"] == destination_id:
            return d.get("advisories", [])
    return []

async def get_guide_reports(destination_id: str) -> list[dict[str, Any]]:
    for d in DESTINATION_CATALOG:
        if d["id"] == destination_id:
            return d.get("guideReports", [])
    return []

async def get_weather_summary(destination_id: str, date_str: str) -> dict[str, Any]:
    return {
        "condition": "Favorable / Partly Cloudy",
        "temperatureC": 26.5,
        "isSafe": True
    }
