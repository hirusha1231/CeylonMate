from fastapi import APIRouter
from app.schemas.destination import DestinationSuitabilityRequest, DestinationSuitabilityResponse, DestinationInspectRequest
from app.agent.destination_suitability import destination_suitability_agent
from app.agent.suitability_agent import suitability_agent

router = APIRouter(prefix="/agent/destination-suitability", tags=["Destination Suitability Agent"])

@router.post("/evaluate", response_model=DestinationSuitabilityResponse)
async def evaluate_destination_suitability(req: DestinationSuitabilityRequest):
    return await destination_suitability_agent.evaluate_candidates(req)

@router.post("/inspect")
async def inspect_destination_suitability(req: DestinationInspectRequest):
    return await suitability_agent.inspect_destination(req.destination)

