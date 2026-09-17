import re
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.objective_interpretation import (
    BudgetConstraint, DateConstraints, ObjectiveInterpretationOutput,
    ObjectiveInterpretationRequest,
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

    missing = []
    if not objective:
        missing.append("objective")
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

    steps = ["CLARIFY_MISSING_FIELDS"] if missing else [
        "RESEARCH_DESTINATION_OPTIONS", "DRAFT_ITINERARY", "CHECK_RESOURCE_FEASIBILITY",
        "PREPARE_QUOTATION", "REQUEST_HUMAN_APPROVAL",
    ]
    roles = [] if missing else [
        "DESTINATION_RESEARCH_AGENT", "ITINERARY_PLANNING_AGENT",
        "RESOURCE_FEASIBILITY_AGENT", "QUOTATION_AGENT",
    ]
    return {"output": ObjectiveInterpretationOutput(
        normalizedObjective=objective,
        regionsOrThemes=themes,
        interests=interests,
        dateConstraints=DateConstraints(startDate=trip.startDate, endDate=trip.endDate),
        budgetConstraint=BudgetConstraint(amount=trip.budget, currency=trip.currency),
        accessibilityConstraints=accessibility,
        requiredSteps=steps,
        delegatedAgentRoles=roles,
        missingCriticalFields=missing,
    )}


_builder = StateGraph(ObjectiveState)
_builder.add_node("objective_interpretation", interpret_objective_node)
_builder.add_edge(START, "objective_interpretation")
_builder.add_edge("objective_interpretation", END)
objective_interpretation_graph = _builder.compile()


async def interpret(request: ObjectiveInterpretationRequest) -> ObjectiveInterpretationOutput:
    result = await objective_interpretation_graph.ainvoke({"request": request, "output": None})
    return ObjectiveInterpretationOutput.model_validate(result["output"])
