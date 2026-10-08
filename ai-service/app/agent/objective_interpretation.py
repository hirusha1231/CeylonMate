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

    # Base rule-based theme extraction
    extracted_themes = [name for name, terms in reference.items() if any(term in text for term in terms)]
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
        final_themes = extracted_themes
        normalized_obj = objective
    else:
        steps = [
            "RESEARCH_DESTINATION_OPTIONS", "DRAFT_ITINERARY", "CHECK_RESOURCE_FEASIBILITY",
            "PREPARE_QUOTATION", "REQUEST_HUMAN_APPROVAL",
        ]
        roles = [
            "DESTINATION_RESEARCH_AGENT", "ITINERARY_PLANNING_AGENT",
            "RESOURCE_FEASIBILITY_AGENT", "QUOTATION_AGENT",
        ]
        pacing = "Moderate"
        final_themes = extracted_themes
        normalized_obj = objective
        recommended: List[RecommendedDestination] = []

        # ---------------------------------------------------------------------
        # Dynamic Gemini LLM Generation (Zero Hardcoding)
        # ---------------------------------------------------------------------
        llm_prompt = f"""You are Agent 1 (Objective & Destination Matcher) for CeylonMate Luxury Sri Lanka Tours.
Analyze the traveler's natural language vision prompt and extract all destination/location words, themes, and travel preferences.

Traveler Input:
- Raw Vision Prompt: {trip.objective}
- Cleaned Objective: {objective}
- Start Date: {trip.startDate}
- End Date: {trip.endDate}
- Budget: {trip.budget} {trip.currency or 'USD'}
- Party Size: {trip.partySize or 2}
- Stated Interests: {', '.join(interests) if interests else 'Not specified'}
- Accessibility Constraints: {', '.join(accessibility) if accessibility else 'None'}

CRITICAL INSTRUCTION:
1. Identify all explicit or implicit Sri Lankan locations/destinations mentioned in the traveler's prompt (e.g. Ella, Mirissa, Nuwara Eliya, Sigiriya, Kandy, Galle, Yala, Bentota, Trincomalee, etc.).
2. The first recommended destination MUST be the primary destination mentioned or implied in the prompt so that downstream weather (Agent 2) and logistics (Agent 3) agents immediately evaluate it.

Return ONLY a JSON object strictly matching this schema:
{{
  "normalizedObjective": "Refined one-sentence luxury travel objective",
  "extractedLocations": ["List of all location names identified from the user prompt"],
  "primaryLocation": "The top primary location identified from prompt",
  "themes": ["Extracted theme tags e.g. wildlife, culture, beaches, hill country, tea, heritage, wellness, culinary"],
  "refinedInterests": ["List of extracted traveler interest keywords"],
  "pacing": "Relaxed | Moderate | Active",
  "destinations": [
    {{
      "name": "Specific Sri Lanka destination name (e.g. Mirissa Marine Bay, Ella Scenic Highlands, Sigiriya Ancient Citadel)",
      "region": "Sri Lankan geographic region (e.g. Southern Coast, Central Highlands, Cultural Triangle)",
      "highlights": "Specific bespoke luxury activities and highlights matching traveler intent",
      "category": "BEACH_AND_LEISURE | BEACH_AND_CULINARY | NATURE_AND_TEA | WILDLIFE | HERITAGE | WELLNESS | SCENIC"
    }}
  ]
}}"""

        try:
            gemini_data = await generate_gemini_json(
                prompt=llm_prompt,
                system_instruction="You are CeylonMate's Agent 1: Lead Travel Concierge & Destination Matcher for Sri Lanka luxury tours. Extract location words accurately from user prompts and generate tailored destination recommendations."
            )
            if gemini_data and isinstance(gemini_data, dict):
                # Dynamically extract destinations from LLM
                raw_destinations = gemini_data.get("destinations") or gemini_data.get("recommendedDestinations") or []
                for d in raw_destinations:
                    if isinstance(d, dict) and d.get("name"):
                        raw_name = str(d.get("name", "Sri Lanka Destination"))
                        clean_name = re.sub(r'(?i)\bexperience\b', '', raw_name).strip()
                        clean_name = re.sub(r'\s+', ' ', clean_name).strip()
                        if not clean_name:
                            clean_name = "Sri Lanka Destination"

                        raw_hl = str(d.get("highlights", "Curated luxury travel tailored to your trip preferences."))
                        clean_hl = re.sub(r'(?i)\bexperience\b', 'journey', raw_hl).strip()

                        recommended.append(RecommendedDestination(
                            name=clean_name,
                            region=str(d.get("region", "Sri Lanka")),
                            highlights=clean_hl,
                            category=str(d.get("category", "RECOMMENDED"))
                        ))

                if gemini_data.get("pacing"):
                    pacing = str(gemini_data.get("pacing"))

                if not final_themes and gemini_data.get("themes") and isinstance(gemini_data.get("themes"), list):
                    final_themes = [str(t).lower() for t in gemini_data.get("themes") if str(t).strip()]

                if not interests and gemini_data.get("refinedInterests") and isinstance(gemini_data.get("refinedInterests"), list):
                    interests = [str(in_item).strip() for in_item in gemini_data.get("refinedInterests") if str(in_item).strip()]
        except Exception as e:
            logger.warning(f"[AGENT 1] Gemini dynamic generation exception: {e}")

        # If recommended is empty, extract dynamically from user prompt
        if not recommended and objective:
            words = [w.strip() for w in re.split(r'[,.\s]+', objective) if len(w.strip()) > 3]
            for w in words[:3]:
                clean_name = w.title()
                clean_name = re.sub(r'(?i)\bexperience\b', '', clean_name).strip()
                if clean_name and clean_name.lower() not in ["want", "luxury", "holiday", "trip", "tour", "days"]:
                    recommended.append(RecommendedDestination(
                        name=f"{clean_name} Region",
                        region="Sri Lanka",
                        highlights=f"Custom bespoke itinerary centered around {clean_name}.",
                        category="RECOMMENDED"
                    ))

    return {"output": ObjectiveInterpretationOutput(
        normalizedObjective=normalized_obj,
        regionsOrThemes=final_themes,
        themes=final_themes,
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
