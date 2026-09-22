from fastapi import APIRouter
from app.schemas.destination import DestinationSuitabilityRequest, DestinationSuitabilityResponse
from app.agent.destination_suitability import destination_suitability_agent

router = APIRouter(prefix="/agent/destination-suitability", tags=["Destination Suitability Agent"])

@router.post("/evaluate", response_model=DestinationSuitabilityResponse)
async def evaluate_destination_suitability(req: DestinationSuitabilityRequest):
    return await destination_suitability_agent.evaluate_candidates(req)
