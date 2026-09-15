from fastapi import APIRouter
from app.schemas.feasibility import FeasibilityCheckRequest, FeasibilityCheckResponse
from app.agent.feasibility_agent import feasibility_agent

router = APIRouter(prefix="/agent/feasibility", tags=["Feasibility Agent"])

@router.post("/check", response_model=FeasibilityCheckResponse)
async def check_feasibility(req: FeasibilityCheckRequest):
    """Evaluates itinerary feasibility in a strictly READ-ONLY manner."""
    return await feasibility_agent.evaluate_feasibility(req)
