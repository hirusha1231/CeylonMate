import re
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.objective_interpretation import (
    BudgetConstraint, DateConstraints, ObjectiveInterpretationOutput,
    ObjectiveInterpretationRequest, RecommendedDestination,
)
from app.tools.objective_tools import ObjectiveReadTools


class ObjectiveState(TypedDict):
    request: ObjectiveInterpretationRequest
    output: ObjectiveInterpretationOutput | None


_COMMAND = re.compile(
    r"\b(ignore|disregard|override|skip|bypass|book|reserve|approve|execute|"
    r"system prompt|developer message|tool call)\b", re.IGNORECASE,
)


def _safe_objective(raw: str | None) -> str:
    # Traveler text is data, never an instruction. Drop command-like clauses.
    clauses = re.split(r"[.;\n]+", raw or "")
    safe = [clause.strip() for clause in clauses if clause.strip() and not _COMMAND.search(clause)]
    return " ".join(safe).strip()


TRAVEL_VOCABULARY = {
    "travel", "trip", "tour", "visit", "explore", "vacation", "holiday", "journey", "expedition",
    "stay", "flight", "wildlife", "safari", "leopard", "elephant", "national park", "yala",
    "wilpattu", "udawalawe", "culture", "heritage", "temple", "history", "ancient", "unesco",
    "sigiriya", "dambulla", "anuradhapura", "polonnaruwa", "kandy", "beach", "coast", "sea",
    "ocean", "coastal", "riviera", "surf", "scuba", "marine", "galle", "bentota", "mirissa",
    "trincomalee", "tangalle", "weligama", "nature", "hiking", "forest", "waterfall", "mountain",
    "peak", "scenic", "trekking", "view", "food", "cuisine", "cooking", "curry", "spice",
    "culinary", "hill country", "tea", "estate", "bungalow", "nuwara eliya", "ella", "haputale",
    "highland", "mist", "train", "railway", "chauffeur", "resort", "hotel", "villa", "luxury",
    "relax", "wellness", "ayurveda", "spa", "honeymoon", "romantic", "sri lanka", "colombo",
    "negombo", "jaffna"
}

DESTINATION_CATALOG = [
    {
        "name": "Sigiriya Rock Fortress",
        "region": "Cultural Triangle",
        "highlights": "Ancient palace ruins, 360-degree panorama, frescoes",
        "category": "HERITAGE",
        "keywords": ["culture", "heritage", "sigiriya", "unesco", "temple", "ancient", "history"]
    },
    {
        "name": "Nuwara Eliya Tea Country",
        "region": "Central Highlands",
        "highlights": "Colonial bungalows, tea plucking experience, waterfalls",
        "category": "NATURE_AND_TEA",
        "keywords": ["hill country", "tea country", "tea", "estate", "bungalow", "nuwara eliya", "mist", "highland"]
    },
    {
        "name": "Yala National Park",
        "region": "Southern Province",
        "highlights": "High-density leopard safari, elephant herds, 4x4 naturalist escort",
        "category": "WILDLIFE",
        "keywords": ["wildlife", "safari", "yala", "animals", "leopard", "elephant"]
    },
    {
        "name": "Galle Dutch Fort & Coastal Riviera",
        "region": "Southern Coast",
        "highlights": "XVII century ramparts, oceanfront dining, boutique villas",
        "category": "BEACH_AND_HERITAGE",
        "keywords": ["beaches", "south coast", "beach", "coast", "galle", "riviera", "bentota", "mirissa", "sea"]
    },
    {
        "name": "Temple of the Sacred Tooth Relic",
        "region": "Central Province",
        "highlights": "Royal palace complex, Kandyan cultural performance, botanical gardens",
        "category": "CULTURE",
        "keywords": ["culture", "kandy", "temple", "relics", "heritage", "central region"]
    },
    {
        "name": "Ella Gap & Nine Arch Bridge",
        "region": "Badulla Highlands",
        "highlights": "Iconic mountain viaduct train ride, Ella Rock sunrise trek",
        "category": "NATURE_AND_HIKING",
        "keywords": ["nature", "hiking", "ella", "train", "view", "mountain", "waterfall", "scenic"]
    }
]


def interpret_objective_node(state: ObjectiveState) -> dict[str, ObjectiveInterpretationOutput]:
    request = state["request"]
    tools = ObjectiveReadTools(request.storedTripRequest)
    trip = tools.read_trip_request(str(request.tripRequestId))
    reference = tools.read_reference_summary()
    objective = _safe_objective(trip.objective)
    text = objective.casefold()
    themes = [name for name, terms in reference.items() if any(term in text for term in terms)]
    interests = list(dict.fromkeys(item.strip() for item in trip.interests if item.strip()))
    accessibility = [trip.accessibilityNeeds.strip()] if trip.accessibilityNeeds and trip.accessibilityNeeds.strip() else []

    # Semantic & meaningful intent detection
    matched_words = [word for word in TRAVEL_VOCABULARY if word in text]
    is_gibberish_length = len(text.strip()) < 15
    has_zero_intent = len(matched_words) == 0 and len(themes) == 0

    alpha_chars = [c for c in text if c.isalpha()]
    distinct_alpha = set(alpha_chars)
    has_repeating_gibberish = len(alpha_chars) > 0 and len(distinct_alpha) < 4

    is_invalid_prompt = is_gibberish_length or has_zero_intent or has_repeating_gibberish

    missing = []
    if is_invalid_prompt:
        missing.append("Valid travel description or destinations")
        normalized_obj = "Input does not contain recognizable travel intent or destinations."
        themes = []
    else:
        normalized_obj = objective

    if not trip.startDate:
        missing.append("startDate")
    if not trip.endDate:
        missing.append("endDate")
    if trip.budget is None:
        missing.append("budget")
    if not trip.currency:
        missing.append("currency")
    if trip.partySize is None:
        missing.append("partySize")

    if is_invalid_prompt:
        steps = ["Prompt Clarification Required"]
        roles = []
        recommended = []
    elif missing:
        steps = ["CLARIFY_MISSING_FIELDS"]
        roles = []
        recommended = []
    else:
        steps = [
            "RESEARCH_DESTINATION_OPTIONS", "DRAFT_ITINERARY", "CHECK_RESOURCE_FEASIBILITY",
            "PREPARE_QUOTATION", "REQUEST_HUMAN_APPROVAL",
        ]
        roles = [
            "DESTINATION_RESEARCH_AGENT", "ITINERARY_PLANNING_AGENT",
            "RESOURCE_FEASIBILITY_AGENT", "QUOTATION_AGENT",
        ]
        recommended_raw = []
        for dest in DESTINATION_CATALOG:
            if any(kw in text or any(kw in t for t in themes) or any(kw in i.lower() for i in interests) for kw in dest["keywords"]):
                recommended_raw.append(RecommendedDestination(
                    name=dest["name"],
                    region=dest["region"],
                    highlights=dest["highlights"],
                    category=dest["category"]
                ))
        if not recommended_raw:
            for dest in DESTINATION_CATALOG[:3]:
                recommended_raw.append(RecommendedDestination(
                    name=dest["name"],
                    region=dest["region"],
                    highlights=dest["highlights"],
                    category=dest["category"]
                ))
        recommended = recommended_raw

    return {"output": ObjectiveInterpretationOutput(
        normalizedObjective=normalized_obj,
        regionsOrThemes=themes,
        interests=interests,
        dateConstraints=DateConstraints(startDate=trip.startDate, endDate=trip.endDate),
        budgetConstraint=BudgetConstraint(amount=trip.budget, currency=trip.currency),
        accessibilityConstraints=accessibility,
        requiredSteps=steps,
        delegatedAgentRoles=roles,
        missingCriticalFields=missing,
        recommendedDestinations=recommended,
    )}


_builder = StateGraph(ObjectiveState)
_builder.add_node("objective_interpretation", interpret_objective_node)
_builder.add_edge(START, "objective_interpretation")
_builder.add_edge("objective_interpretation", END)
objective_interpretation_graph = _builder.compile()


async def interpret(request: ObjectiveInterpretationRequest) -> ObjectiveInterpretationOutput:
    result = await objective_interpretation_graph.ainvoke({"request": request, "output": None})
    return ObjectiveInterpretationOutput.model_validate(result["output"])
