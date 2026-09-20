from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class DestinationCandidate(BaseModel):
    destinationId: str
    destinationName: str
    region: str
    category: str
    attractionIds: list[str] = Field(default_factory=list)
    suitabilityScore: float
    matchedInterests: list[str] = Field(default_factory=list)
    openingStatus: str = "OPEN"
    advisoryWarnings: list[str] = Field(default_factory=list)
    accessibilityNotes: Optional[str] = None
    weatherSummary: Optional[str] = None
    isRejected: bool = False
    rejectionReason: Optional[str] = None

class DestinationSuitabilityRequest(BaseModel):
    tripRequestId: str
    regionsOrThemes: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    accessibilityConstraints: list[str] = Field(default_factory=list)

class DestinationSuitabilityResponse(BaseModel):
    tripRequestId: str
    candidates: list[DestinationCandidate] = Field(default_factory=list)
    selectedCandidates: list[DestinationCandidate] = Field(default_factory=list)
    rejectedCandidates: list[DestinationCandidate] = Field(default_factory=list)
    evaluatedAt: str
