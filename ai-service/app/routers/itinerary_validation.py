from fastapi import APIRouter
from app.agent.itinerary_validation import validate_itinerary
from app.schemas.itinerary_validation import (
    ItineraryValidationRequest,
    ItineraryValidationOutput,
)

router = APIRouter(prefix="/agent/itinerary-validation", tags=["Itinerary Validation Agent"])

@router.post("/validate", response_model=ItineraryValidationOutput)
async def validate_itinerary_endpoint(request: ItineraryValidationRequest) -> ItineraryValidationOutput:
    return await validate_itinerary(request)
