from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StoredTripRequest(BaseModel):
    """Validated snapshot supplied by the trusted ASP.NET workflow caller."""

    model_config = ConfigDict(extra="forbid")

    tripRequestId: UUID
    objective: str | None = Field(default=None, max_length=4000)
    startDate: date | None = None
    endDate: date | None = None
    budget: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    partySize: int | None = Field(default=None, gt=0)
    interests: list[str] = Field(default_factory=list)
    accessibilityNeeds: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "StoredTripRequest":
        if self.startDate and self.endDate and self.endDate < self.startDate:
            raise ValueError("endDate must be on or after startDate")
        return self


class ObjectiveInterpretationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tripRequestId: UUID
    storedTripRequest: StoredTripRequest

    @model_validator(mode="after")
    def validate_id(self) -> "ObjectiveInterpretationRequest":
        if self.tripRequestId != self.storedTripRequest.tripRequestId:
            raise ValueError("tripRequestId does not match storedTripRequest")
        return self


class DateConstraints(BaseModel):
    startDate: date | None
    endDate: date | None


class BudgetConstraint(BaseModel):
    amount: Decimal | None
    currency: str | None


class ObjectiveInterpretationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    normalizedObjective: str
    regionsOrThemes: list[str]
    interests: list[str]
    dateConstraints: DateConstraints
    budgetConstraint: BudgetConstraint
    accessibilityConstraints: list[str]
    requiredSteps: list[str]
    delegatedAgentRoles: list[str]
    missingCriticalFields: list[str]
