import os
import re
import logging
from typing import TypedDict, List, Dict, Any

from langgraph.graph import END, START, StateGraph

from app.core.llm import generate_gemini_json
from app.schemas.objective_interpretation import (
    BudgetConstraint, DateConstraints, ObjectiveInterpretationOutput,
    ObjectiveInterpretationRequest, RecommendedDestination,
)
from app.tools.objective_tools import ObjectiveReadTools

logger = logging.getLogger("ceylonmate.agent1")


class ObjectiveState(TypedDict):
    request: ObjectiveInterpretationRequest
    output: ObjectiveInterpretationOutput | None


_COMMAND = re.compile(
    r"\b(ignore|disregard|override|skip|bypass|book|reserve|approve|execute|"
    r"system prompt|developer message|tool call)\b", re.IGNORECASE,
)


def _safe_objective(raw: str | None) -> str:
    clauses = re.split(r"[.;\n]+", raw or "")
    safe = [clause.strip() for clause in clauses if clause.strip() and not _COMMAND.search(clause)]
    return " ".join(safe).strip()


async def interpret_objective_node(state: ObjectiveState) -> dict[str, ObjectiveInterpretationOutput]:
    request = state["request"]
    tools = ObjectiveReadTools(request.storedTripRequest)
    trip = tools.read_trip_request(str(request.tripRequestId))
    reference = tools.read_reference_summary()
    objective = _safe_objective(trip.objective)
    text = objective.casefold()

    themes = [name for name, terms in reference.items() if any(term in text for term in terms)]
    interests = list(dict.fromkeys(item.strip() for item in trip.interests if item.strip()))
    accessibility = [trip.accessibilityNeeds.strip()] if trip.accessibilityNeeds and trip.accessibilityNeeds.strip() else []

    missing = []
    if not trip.startDate:
        missing.append("startDate")
    if not trip.endDate:
        missing.append("endDate")
    if trip.budget is None:
        missing.append("budget")

    if missing:
        steps = ["CLARIFY_MISSING_FIELDS"]
        roles: List[str] = []
        recommended: List[RecommendedDestination] = []
        pacing = "Moderate"
    else:
        steps = [
            "RESEARCH_DESTINATION_OPTIONS", "DRAFT_ITINERARY", "CHECK_RESOURCE_FEASIBILITY",
            "PREPARE_QUOTATION", "REQUEST_HUMAN_APPROVAL",
        ]
        roles = [
            "DESTINATION_RESEARCH_AGENT", "ITINERARY_PLANNING_AGENT",
            "RESOURCE_FEASIBILITY_AGENT", "QUOTATION_AGENT",
        ]

        # Destination match fallback catalog
        if any(w in text for w in ["beach", "coast", "ocean", "sea", "surf", "swim"]):
            recommended = [
                RecommendedDestination(name="Bentota Golden Beach Strip", region="South Western Coast", highlights="Pristine golden sands, luxury water sports & oceanfront private villas.", category="BEACH_AND_LEISURE"),
                RecommendedDestination(name="Mirissa Marine & Coastal Bay", region="Southern Coast", highlights="Private whale watching yachts, sunset dining & coconut hill palm vistas.", category="BEACH_AND_CULINARY"),
                RecommendedDestination(name="Weligama Bay Surfing Riviera", region="Southern Coast", highlights="Crescent bay surfing, fresh seafood grills & beachfront luxury cabanas.", category="BEACH_AND_LEISURE")
            ]
        elif any(w in text for w in ["tea", "mountain", "hill", "ella", "nuwara", "hiking", "cold"]):
            recommended = [
                RecommendedDestination(name="Ella Scenic Mountain Highlands", region="Central Highlands", highlights="Nine Arch Bridge panoramic train views, Little Adam's Peak & tea trails.", category="NATURE_AND_TEA"),
                RecommendedDestination(name="Nuwara Eliya Colonial Tea Country", region="Central Highlands", highlights="Historic planter bungalows, tea factory tasting tours & misty lakes.", category="NATURE_AND_TEA"),
                RecommendedDestination(name="Horton Plains & World's End", region="Central Highlands", highlights="Cloud forest trekking, dramatic 800m sheer drop & Baker's Falls.", category="SCENIC")
            ]
        elif any(w in text for w in ["safari", "wildlife", "animal", "leopard", "elephant", "yala"]):
            recommended = [
                RecommendedDestination(name="Yala Leopard Sanctuary", region="Southern Province", highlights="Dawn leopard tracking & modified luxury 4x4 private game drives.", category="WILDLIFE"),
                RecommendedDestination(name="Udawalawe Elephant Reserve", region="Uva Province", highlights="Vast herds of wild elephants, transit home rehabilitation & reservoir views.", category="WILDLIFE")
            ]
        elif any(w in text for w in ["culture", "heritage", "temple", "history", "ancient", "sigiriya"]):
            recommended = [
                RecommendedDestination(name="Sigiriya Ancient Rock Citadel", region="Cultural Triangle", highlights="UNESCO 5th-century palace fortress, mirror wall & royal water gardens.", category="HERITAGE"),
                RecommendedDestination(name="Kandy Royal Sacred City", region="Central Province", highlights="Temple of the Sacred Tooth Relic, Royal Botanical Gardens & cultural dance.", category="HERITAGE")
            ]
        else:
            recommended = [
                RecommendedDestination(name="Bentota Luxury Coastline", region="South Western Coast", highlights="Golden sand beaches, private lagoon river safaris & oceanfront resorts.", category="BEACH_AND_LEISURE"),
                RecommendedDestination(name="Sigiriya Rock Fortress", region="Cultural Triangle", highlights="5th-century iconic UNESCO citadel with royal water gardens.", category="HERITAGE"),
                RecommendedDestination(name="Ella Mountain Gap", region="Central Highlands", highlights="Tea estate hikes, Nine Arch Bridge and mist-clad mountain passes.", category="NATURE_AND_TEA")
            ]
        pacing = "Moderate"

        # Try dynamic LLM enrichment if API key is present
        has_api_key = bool(os.getenv("GOOGLE_API_KEY", "").strip())
        if has_api_key:
            llm_prompt = f"""
You are Agent 1 (Objective Interpretation) for CeylonMate Luxury Sri Lanka Tours.
The traveler says: '{objective}'.
Start Date: {trip.startDate}
End Date: {trip.endDate}
Party Size: {trip.partySize or 2} travelers
Budget: {trip.budget} {trip.currency or "USD"}
Interests: {", ".join(trip.interests) if trip.interests else "Not specified"}

Return a JSON object with:
{{
  "pacing": "Relaxed | Moderate | Active",
  "destinations": [
    {{
      "name": "Destination Name in Sri Lanka",
      "region": "Geographic Region in Sri Lanka",
      "highlights": "Key luxury highlights matching traveler intent",
      "category": "BEACH_AND_CULINARY | BEACH_AND_LEISURE | WILDLIFE | HERITAGE | NATURE_AND_TEA | SCENIC"
    }}
  ]
}}
"""
            try:
                gemini_data = await generate_gemini_json(
                    prompt=llm_prompt,
                    system_instruction="You are CeylonMate's Agent 1: Lead Travel Concierge & Objective Interpretation Agent for Sri Lanka luxury tours."
                )
                if gemini_data and isinstance(gemini_data, dict):
                    raw_destinations = gemini_data.get("destinations") or []
                    custom_dest: List[RecommendedDestination] = []
                    for d in raw_destinations:
                        if isinstance(d, dict) and d.get("name"):
                            custom_dest.append(RecommendedDestination(
                                name=d.get("name", "Sri Lanka Destination"),
                                region=d.get("region", "Sri Lanka"),
                                highlights=d.get("highlights", "Scenic luxury experience"),
                                category=d.get("category", "LEISURE")
                            ))
                    if custom_dest:
                        recommended = custom_dest
                    if gemini_data.get("pacing"):
                        pacing = gemini_data.get("pacing")
            except Exception as e:
                logger.warning(f"Gemini enrichment skipped: {e}")

    return {"output": ObjectiveInterpretationOutput(
        normalizedObjective=objective,
        regionsOrThemes=themes,
        themes=themes,
        interests=interests,
        pacing=pacing,
        dateConstraints=DateConstraints(startDate=trip.startDate, endDate=trip.endDate),
        budgetConstraint=BudgetConstraint(amount=trip.budget, currency=trip.currency),
        accessibilityConstraints=accessibility,
        requiredSteps=steps,
        delegatedAgentRoles=roles,
        missingCriticalFields=missing,
        recommendedDestinations=recommended,
        destinations=recommended,
    )}


_builder = StateGraph(ObjectiveState)
_builder.add_node("objective_interpretation", interpret_objective_node)
_builder.add_edge(START, "objective_interpretation")
_builder.add_edge("objective_interpretation", END)
objective_interpretation_graph = _builder.compile()


async def interpret(request: ObjectiveInterpretationRequest) -> ObjectiveInterpretationOutput:
    result = await objective_interpretation_graph.ainvoke({"request": request, "output": None})
    return ObjectiveInterpretationOutput.model_validate(result["output"])
