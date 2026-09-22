from typing import List, Optional
from pydantic import BaseModel, Field

class ItineraryDayPlan(BaseModel):
    day_number: int
    title: str
    destination_id: int
    attraction_ids: List[int] = Field(default_factory=list)
    estimated_cost: float = 0.0

class ItineraryValidationRequest(BaseModel):
    trip_request_id: int
    budget_limit: float
    party_size: int
    days: List[ItineraryDayPlan]

class ItineraryValidationOutput(BaseModel):
    valid: bool
    requires_approval: bool
    status: str
    total_calculated_cost: float
    budget_limit: float
    violations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    approval_notes: Optional[str] = None
