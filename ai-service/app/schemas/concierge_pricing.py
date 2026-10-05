from pydantic import BaseModel, Field
from typing import Optional, Literal

class SelectedRouteDto(BaseModel):
    name: Optional[str] = "Standard Route"
    distanceKm: Optional[float] = 120.0
    via: Optional[str] = "Trunk Highways"

class SelectedVehicleDto(BaseModel):
    model: Optional[str] = "Toyota Land Cruiser Prado"
    vehicleType: Optional[str] = "4WD Luxury SUV"
    dailyRateLkr: Optional[float] = None

class SelectedGuideDto(BaseModel):
    name: Optional[str] = "Self-Guided"
    role: Optional[str] = "National Tourist Guide"
    dailyRateLkr: Optional[float] = None

class ConciergePricingRequest(BaseModel):
    targetBudget: Optional[float] = 750000.0
    tripDurationDays: Optional[int] = 1
    durationDays: Optional[int] = 1
    selectedRoute: Optional[SelectedRouteDto] = Field(default_factory=SelectedRouteDto)
    selectedVehicle: Optional[SelectedVehicleDto] = Field(default_factory=SelectedVehicleDto)
    selectedGuide: Optional[SelectedGuideDto] = None

class PricingBreakdownDto(BaseModel):
    fuelAndTransitLkr: float
    vehicleDayRateLkr: float
    tollFeesLkr: float
    guideFeeLkr: float
    taxesAndPlatformLkr: float
    totalTripCostLkr: float
    totalTripCostUsd: float

class BudgetAuditDto(BaseModel):
    targetBudgetLkr: float
    varianceLkr: float
    status: Literal["WITHIN_BUDGET", "EXCEEDS_BUDGET"]
    verdictSummary: str
    conciergeOptimizationTip: str

class SynthesisSignOffDto(BaseModel):
    isFeasible: bool = True
    driverSafetyHoursCompliant: bool = True
    auditBadge: str = "CONCIERGE CERTIFIED"

class ConciergePricingResponse(BaseModel):
    pricingBreakdown: PricingBreakdownDto
    budgetAudit: BudgetAuditDto
    synthesisSignOff: SynthesisSignOffDto
