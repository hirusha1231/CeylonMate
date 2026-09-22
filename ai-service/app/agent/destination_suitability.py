from datetime import datetime, timezone
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
        candidates = []
        themes = [t.lower() for t in req.regionsOrThemes + req.interests]

        for d in DESTINATION_CATALOG:
            matched = [t for t in themes if t in d["region"] or t in d["category"] or any(t in dt for dt in d["themes"])]
            if not matched:
                continue

            score = min(1.0, 0.4 + (len(matched) * 0.2))
            advisories = await get_active_advisories(d["id"])
            guide_reports = await get_guide_reports(d["id"])
            weather = await get_weather_summary(d["id"], str(req.startDate or ""))

            # Check rejection criteria
            is_rejected = False
            rejection_reason = None

            # 1. Closed attraction rule
            for attr in d["attractions"]:
                if attr.get("status") in ["CLOSED", "CLOSED_TEMPORARILY"]:
                    is_rejected = True
                    rejection_reason = f"Attraction '{attr['name']}' is currently marked {attr['status']}."
                    break

            # 2. Critical advisory rule
            if not is_rejected:
                for adv in advisories:
                    if adv.get("severity") == "CRITICAL":
                        is_rejected = True
                        rejection_reason = f"Critical advisory active: {adv['message']}."
                        break

            # 3. Local guide report rule
            if not is_rejected:
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
                attractionIds=[a["id"] for a in d["attractions"]],
                suitabilityScore=round(score, 2),
                matchedInterests=matched,
                openingStatus="CLOSED" if is_rejected else "OPEN",
                advisoryWarnings=[adv["message"] for adv in advisories],
                accessibilityNotes=d["attractions"][0].get("accessibility") if d["attractions"] else None,
                weatherSummary=f"{weather['condition']}, {weather['temperatureC']}°C",
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
