from fastapi import APIRouter

from app.agent.objective_interpretation import interpret
from app.schemas.objective_interpretation import ObjectiveInterpretationOutput, ObjectiveInterpretationRequest

router = APIRouter(prefix="/agent/objective-interpretation", tags=["Objective Interpretation Agent"])


@router.post("/interpret", response_model=ObjectiveInterpretationOutput)
async def interpret_objective(request: ObjectiveInterpretationRequest) -> ObjectiveInterpretationOutput:
    return await interpret(request)
