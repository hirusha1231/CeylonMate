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
    items: List[ItineraryItemRequest] = Field(default_factory=list)
    circuit_route: Optional[str] = None
    pax_count: Optional[int] = None

class ItemFeasibilityResult(BaseModel):
    item_id: str
    resource_type: ResourceType
    is_available: bool
    available_capacity: int
    message: str

class RouteLeg(BaseModel):
    origin: str
    destination: str
    distance_km: float
    duration_minutes: float
    formatted_duration: str

class RouteSummary(BaseModel):
    total_distance_km: float
    total_duration_minutes: float
    is_fallback: bool
    formatted_driving_time: Optional[str] = None
    terrain_elevation_factor: Optional[str] = None
    is_mountain_route: Optional[bool] = False
    recommended_fleet_vehicle: Optional[str] = None
    driver_rest_recommendation: Optional[str] = None
    capacity_guarantee_status: Optional[str] = "100% Guaranteed Licensed Guide & Fleet Capacity Reserved"
    legs: List[RouteLeg] = Field(default_factory=list)

class FeasibilityCheckResponse(BaseModel):
    overall_feasibility: FeasibilityStatus
    items: List[ItemFeasibilityResult]
    route_summary: RouteSummary
    conflicts: List[str]
    active_circuit: Optional[str] = None


class RouteOption(BaseModel):
    id: str = "route_1"
    name: str
    via: str
    distanceKm: float
    estimatedDuration: str
    terrainType: str
    elevationMultiplier: str
    isFastest: bool = True
    keyHighlightsOrStops: List[str] = Field(default_factory=list)


class DispatchedVehicle(BaseModel):
    vehicleType: str
    model: str
    maxPax: int
    luggageCapacity: int
    terrainSuitabilityNote: str
    estimatedDailyRateLkr: float


class RouteLogisticsRequest(BaseModel):
    origin: str
    destination: str
    passengers: Optional[int] = 2
    startDate: Optional[str] = None
    durationDays: Optional[int] = None


class RouteLogisticsResponse(BaseModel):
    origin: str
    destination: str
    routes: List[RouteOption] = Field(default_factory=list)
    dispatchedFleet: List[DispatchedVehicle] = Field(default_factory=list)

