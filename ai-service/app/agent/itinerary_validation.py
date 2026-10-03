import re
from typing import TypedDict, Optional
from app.core.llm import generate_gemini_json
from app.schemas.itinerary_validation import (
    ItineraryValidationRequest,
    ItineraryValidationOutput,
    ItineraryDayPlan,
)
from app.tools.validation_tools import ItineraryValidationTools


class ValidationState(TypedDict):
    request: ItineraryValidationRequest
    output: Optional[ItineraryValidationOutput]


_INJECTION_PATTERN = re.compile(
    r"\b(ignore|disregard|override|skip|bypass|auto-approve|force_approve|execute)\b",
    re.IGNORECASE,
)


async def validate_itinerary(request: ItineraryValidationRequest) -> ItineraryValidationOutput:
    violations = []
    warnings = []

    # 1. Deterministic Schedule & Sequence Validation
    schedule_issues = ItineraryValidationTools.validate_schedule_continuity(request.days)
    violations.extend(schedule_issues)

    # 2. Authoritative Cost and Budget Validation
    total_cost, budget_issues = ItineraryValidationTools.validate_budget(request.days, request.budget_limit)
    violations.extend(budget_issues)

    # 3. Party Size Hard Limit Check
    if request.party_size <= 0:
        violations.append("Party size must be at least 1 person.")

    # 4. Gemini Temporal Quality & Concierge Audit
    itinerary_summary = [
        {
            "day": d.day_number,
            "title": d.title,
            "destination_id": d.destination_id,
            "attractions_count": len(d.attraction_ids),
            "estimated_cost": d.estimated_cost
        }
        for d in request.days
    ]

    audit_prompt = f"""
Audit the following Sri Lanka travel itinerary:
Days Breakdown: {itinerary_summary}
Total Cost: {total_cost} LKR
Budget Limit: {request.budget_limit} LKR
Party Size: {request.party_size} travelers

Evaluate:
1. Schedule continuity & pacing across Sri Lanka
2. Commercial integrity & cost efficiency (Fleet + Guide + 3% Platform Fee)
3. Concise Concierge audit notes (2 sentences summarizing readiness for approval)

Output JSON:
{{
  "is_valid": true/false,
  "warnings": ["list of advisory notices or recommendations if any"],
  "audit_notes": "Professional summary note for the concierge review desk"
}}
"""

    gemini_audit = await generate_gemini_json(
        prompt=audit_prompt,
        system_instruction="You are CeylonMate's Agent 4: Chief Itinerary Auditor & Financial Gating Concierge."
    )

    if gemini_audit and isinstance(gemini_audit, dict):
        if gemini_audit.get("warnings"):
            warnings.extend(gemini_audit["warnings"])
        llm_notes = gemini_audit.get("audit_notes")
    else:
        llm_notes = None

    is_valid = len(violations) == 0
    status = "PENDING_CONCIERGE_REVIEW" if is_valid else "REVISION_REQUIRED"
    requires_approval = is_valid

    notes = llm_notes or (
        "Itinerary satisfies all budget, temporal continuity, and SLTDA operational constraints. Pausing at PENDING_CONCIERGE_REVIEW for final sign-off."
        if is_valid
        else "Deterministic validation failed. Revisions required before approval."
    )

    return ItineraryValidationOutput(
        valid=is_valid,
        requires_approval=requires_approval,
        status=status,
        total_calculated_cost=total_cost,
        budget_limit=request.budget_limit,
        violations=violations,
        warnings=warnings,
        approval_notes=notes,
    )
