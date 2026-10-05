import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any

from app.core.llm import generate_gemini_json
from app.schemas.destination import (
    DestinationSuitabilityRequest,
    DestinationSuitabilityResponse,
    DestinationCandidate,
)
from app.tools.destination_tools import (
    DESTINATION_CATALOG,
    get_active_advisories,
    get_guide_reports,
    get_weather_summary,
)


class DestinationSuitabilityAgent:
    async def evaluate_candidates(self, req: DestinationSuitabilityRequest) -> DestinationSuitabilityResponse:
        themes = [t.lower() for t in (req.regionsOrThemes or []) + (req.interests or [])]

        matched_catalog_dests = []
        for d in DESTINATION_CATALOG:
            matched = [t for t in themes if t in d["region"].lower() or t in d["category"].lower() or any(t in dt.lower() for dt in d.get("themes", []))]
            if matched or len(themes) == 0:
                matched_catalog_dests.append(d)

        # Augment with any custom destination names provided in request
        custom_names = [r for r in (req.regionsOrThemes or []) if isinstance(r, str) and len(r.strip()) > 1]
        for cn in custom_names:
            clean_cn = cn.strip()
            if not any(clean_cn.lower() in d["name"].lower() for d in matched_catalog_dests):
                slug = re.sub(r'[^a-zA-Z0-9]+', '-', clean_cn.lower()).strip('-')
                matched_catalog_dests.append({
                    "id": f"dest-{slug}",
                    "name": clean_cn,
                    "region": "Sri Lanka",
                    "category": "bespoke",
                    "themes": [clean_cn.lower()],
                    "attractions": [
                        {"id": f"attr-{slug}-01", "name": f"{clean_cn} Sightseeing", "price": 30.0, "status": "OPEN", "accessibility": "Standard access"}
                    ],
                    "advisories": [],
                    "guideReports": []
                })

        if not matched_catalog_dests:
            matched_catalog_dests = DESTINATION_CATALOG[:4]

        # 2. Build Gemini prompt for climate, monsoon, ocean & route viability evaluation
        dest_summary_list = [
            {"id": d["id"], "name": d["name"], "region": d["region"], "category": d["category"]}
            for d in matched_catalog_dests
        ]

        llm_prompt = f"""
Evaluate the seasonal weather, monsoon dynamics, and travel suitability for these Sri Lanka destinations:
Destinations: {json.dumps(dest_summary_list)}
Travel Window: {req.startDate or "Current Season"} to {req.endDate or "Flexible"}
Traveler Themes & Interests: {themes}

For EACH destination in the list, evaluate Sri Lanka's climate patterns (e.g. Southwest vs Northeast monsoon, coastal sea conditions, hill country rainfall, mountain road conditions) and output a JSON array of evaluations:
{{
  "evaluations": [
    {{
      "destinationId": "same id from list",
      "destinationName": "destination name",
      "suitabilityScore": 0.0 to 1.0 (float reflecting climate, weather, and experience match),
      "weatherSummary": "e.g. Sunny & Clear Oceanfront, 29°C or Tropical Mist with Pleasant Breeze, 19°C",
      "openingStatus": "OPEN" or "RESTRICTED",
      "advisoryWarnings": ["list of advisory notes if any, e.g. High UV index during midday, Calm waters ideal for swimming"],
      "rejectionReason": null or string if unsuitable
    }}
  ]
}}
"""

        gemini_res = await generate_gemini_json(
            prompt=llm_prompt,
            system_instruction="You are CeylonMate's Agent 2: Destination Suitability & Sri Lanka Meteorological / Regional Viability Intelligence Agent."
        )

        gemini_map = {}
        if gemini_res and isinstance(gemini_res, dict) and "evaluations" in gemini_res:
            for ev in gemini_res["evaluations"]:
                gemini_map[ev.get("destinationId")] = ev

        candidates: List[DestinationCandidate] = []

        for d in matched_catalog_dests:
            d_id = d["id"]
            matched = [t for t in themes if t in d["region"].lower() or t in d["category"].lower() or any(t in dt.lower() for dt in d.get("themes", []))]

            advisories = await get_active_advisories(d_id)
            guide_reports = await get_guide_reports(d_id)
            live_weather = await get_weather_summary(d_id, str(req.startDate or ""))

            ev = gemini_map.get(d_id)

            if ev:
                score = float(ev.get("suitabilityScore", 0.90))
                weather_str = ev.get("weatherSummary") or f"{live_weather['condition']}, {live_weather['temperatureC']}°C"
                open_status = ev.get("openingStatus", "OPEN")
                warnings = ev.get("advisoryWarnings") or [adv["message"] for adv in advisories]
                is_rejected = bool(ev.get("rejectionReason"))
                rejection_reason = ev.get("rejectionReason")
            else:
                score = min(1.0, 0.5 + (len(matched) * 0.15))
                weather_str = f"{live_weather['condition']}, {live_weather['temperatureC']}°C"
                open_status = "OPEN"
                warnings = [adv["message"] for adv in advisories]
                is_rejected = False
                rejection_reason = None

            # Hard safety checks
            for attr in d.get("attractions", []):
                if attr.get("status") in ["CLOSED", "CLOSED_TEMPORARILY"]:
                    is_rejected = True
                    open_status = "CLOSED"
                    rejection_reason = f"Attraction '{attr['name']}' is currently marked {attr['status']}."
                    break

            for adv in advisories:
                if adv.get("severity") == "CRITICAL":
                    is_rejected = True
                    rejection_reason = f"Critical advisory active: {adv['message']}."
                    break

            for rep in guide_reports:
                if rep.get("type") in ["CLOSURE", "ROAD_BLOCK"]:
                    is_rejected = True
                    rejection_reason = f"Local Guide reported issue: {rep['message']}."
                    break

            candidate = DestinationCandidate(
                destinationId=d["id"],
                destinationName=d["name"],
                region=d["region"],
                category=d["category"],
                attractionIds=[a["id"] for a in d.get("attractions", [])],
                suitabilityScore=round(score, 2),
                matchedInterests=matched if matched else ["Scenic Exploration"],
                openingStatus=open_status,
                advisoryWarnings=warnings,
                accessibilityNotes=d["attractions"][0].get("accessibility") if d.get("attractions") else None,
                weatherSummary=weather_str,
                isRejected=is_rejected,
                rejectionReason=rejection_reason,
            )
            candidates.append(candidate)

        selected = [c for c in candidates if not c.isRejected]
        rejected = [c for c in candidates if c.isRejected]

        return DestinationSuitabilityResponse(
            tripRequestId=req.tripRequestId,
            candidates=candidates,
            selectedCandidates=selected,
            rejectedCandidates=rejected,
            evaluatedAt=datetime.now(timezone.utc).isoformat(),
        )


destination_suitability_agent = DestinationSuitabilityAgent()
