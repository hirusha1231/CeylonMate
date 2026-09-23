from typing import List, Tuple
from app.schemas.itinerary_validation import ItineraryDayPlan

class ItineraryValidationTools:
    @staticmethod
    def validate_budget(days: List[ItineraryDayPlan], budget_limit: float) -> Tuple[float, List[str]]:
        total = sum(day.estimated_cost for day in days)
        violations = []
        if total > budget_limit:
            violations.append(f"Total estimated cost (${total:.2f}) exceeds the trip budget limit (${budget_limit:.2f}).")
        return total, violations

    @staticmethod
    def validate_schedule_continuity(days: List[ItineraryDayPlan]) -> List[str]:
        violations = []
        if not days:
            violations.append("Itinerary must contain at least one day plan.")
            return violations

        expected_day = 1
        for day in days:
            if day.day_number != expected_day:
                violations.append(f"Discontinuous schedule: expected Day {expected_day}, found Day {day.day_number}.")
            if not day.attraction_ids:
                violations.append(f"Day {day.day_number} has no attractions assigned.")
            expected_day += 1
        return violations
