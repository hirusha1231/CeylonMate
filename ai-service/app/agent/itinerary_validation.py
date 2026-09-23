import re
from typing import TypedDict, Optional
from app.schemas.itinerary_validation import (
    ItineraryValidationRequest,
    ItineraryValidationOutput,
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

    # 4. Human-In-The-Loop Approval Gating
    is_valid = len(violations) == 0
    status = "PENDING_APPROVAL" if is_valid else "REVISION_REQUIRED"
    requires_approval = is_valid

    notes = (
        "Itinerary satisfies all budget and operational constraints. Pausing at PENDING_APPROVAL for Travel Agent review."
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
