from fastapi import APIRouter
from app.schemas.feasibility import (
    FeasibilityCheckRequest, FeasibilityCheckResponse,
    RouteLogisticsRequest, RouteLogisticsResponse
)
from app.agent.feasibility_agent import feasibility_agent

router = APIRouter(prefix="/agent/feasibility", tags=["Feasibility Agent"])

@router.post("/check", response_model=FeasibilityCheckResponse)
async def check_feasibility(req: FeasibilityCheckRequest):
    """Evaluates itinerary feasibility in a strictly READ-ONLY manner."""
    return await feasibility_agent.evaluate_feasibility(req)

@router.post("/route-logistics", response_model=RouteLogisticsResponse)
async def calculate_route_logistics(req: RouteLogisticsRequest):
    """Strict dynamic Agent 3 route logistics & fleet dispatcher."""
    return await feasibility_agent.compute_route_logistics(req)
