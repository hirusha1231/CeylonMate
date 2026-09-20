from typing import Any

# Controlled mock database of destinations and attraction rules matching backend seeded data
DESTINATION_CATALOG = [
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
        "themes": ["culture", "heritage", "history", "southern"],
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
    return [
        d for d in DESTINATION_CATALOG
        if needle in d["region"] or needle in d["category"] or any(needle in t for t in d["themes"])
    ]

async def get_attraction_rules(attraction_id: str) -> dict[str, Any]:
    for d in DESTINATION_CATALOG:
        for a in d["attractions"]:
            if a["id"] == attraction_id:
                return a
    return {"id": attraction_id, "status": "UNKNOWN", "price": 0.0}

async def get_active_advisories(destination_id: str) -> list[dict[str, Any]]:
    for d in DESTINATION_CATALOG:
        if d["id"] == destination_id:
            return d["advisories"]
    return []

async def get_guide_reports(destination_id: str) -> list[dict[str, Any]]:
    for d in DESTINATION_CATALOG:
        if d["id"] == destination_id:
            return d["guideReports"]
    return []

async def get_weather_summary(destination_id: str, date_str: str) -> dict[str, Any]:
    return {
        "condition": "Favorable / Partly Cloudy",
        "temperatureC": 26.5,
        "isSafe": True
    }
