from typing import Any, Dict, Union
import uuid
from fastapi import APIRouter, Request, Body
from pydantic import BaseModel

from app.agent.objective_interpretation import interpret
from app.schemas.objective_interpretation import (
    ObjectiveInterpretationOutput,
    ObjectiveInterpretationRequest,
    StoredTripRequest,
)

router = APIRouter(prefix="/agent/objective-interpretation", tags=["Objective Interpretation Agent"])


class SimplePromptRequest(BaseModel):
    prompt: str | None = None
    objective: str | None = None


@router.post("/interpret", response_model=ObjectiveInterpretationOutput)
async def interpret_objective(raw_body: Dict[str, Any] = Body(...)) -> ObjectiveInterpretationOutput:
    # 1. Check if payload matches standard ObjectiveInterpretationRequest
    if "storedTripRequest" in raw_body and "tripRequestId" in raw_body:
        req = ObjectiveInterpretationRequest.model_validate(raw_body)
        return await interpret(req)

    # 2. Support simplified/ad-hoc JSON (e.g. {"prompt": "..."} or {"objective": "..."})
    user_prompt = raw_body.get("prompt") or raw_body.get("objective") or "Bespoke Sri Lanka Tour"
    req_id = uuid.uuid4()
    
    stored = StoredTripRequest(
        tripRequestId=req_id,
        objective=str(user_prompt),
        startDate=raw_body.get("startDate"),
        endDate=raw_body.get("endDate"),
        budget=raw_body.get("budget"),
        currency=raw_body.get("currency", "USD"),
        partySize=raw_body.get("partySize") or raw_body.get("passengerCount", 2),
        interests=raw_body.get("interests") or raw_body.get("highlights", []),
        accessibilityNeeds=raw_body.get("accessibilityNeeds")
    )

    req = ObjectiveInterpretationRequest(
        tripRequestId=req_id,
        storedTripRequest=stored
    )

    return await interpret(req)
