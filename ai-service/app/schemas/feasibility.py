from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class ResourceType(str, Enum):
    GUIDE = "GUIDE"
    TRANSPORT = "TRANSPORT"
    ATTRACTION = "ATTRACTION"

class FeasibilityStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    PARTIALLY_FEASIBLE = "PARTIALLY_FEASIBLE"
    INFEASIBLE = "INFEASIBLE"

class ItineraryItemRequest(BaseModel):
    item_id: str
    resource_type: ResourceType
    date: str
    time_slot: Optional[str] = None
    party_size: int = 1
    lat: Optional[float] = None
    lng: Optional[float] = None

class FeasibilityCheckRequest(BaseModel):
    traveler_id: Optional[str] = None
    items: List[ItineraryItemRequest]

class ItemFeasibilityResult(BaseModel):
    item_id: str
    resource_type: ResourceType
    is_available: bool
    available_capacity: int
    message: str

class RouteSummary(BaseModel):
    total_distance_km: float
    total_duration_minutes: float
    is_fallback: bool

class FeasibilityCheckResponse(BaseModel):
    overall_feasibility: FeasibilityStatus
    items: List[ItemFeasibilityResult]
    route_summary: RouteSummary
    conflicts: List[str]
