import logging
from typing import Dict, Any, Optional
from app.schemas.concierge_pricing import (
    ConciergePricingRequest,
    ConciergePricingResponse,
    PricingBreakdownDto,
    BudgetAuditDto,
    SynthesisSignOffDto,
    SelectedRouteDto,
    SelectedVehicleDto,
    SelectedGuideDto,
)

logger = logging.getLogger("ceylonmate.concierge_agent")


class ConciergeAgent:
    """Agent 4: Chief Travel Concierge & Authoritative Rule-Based Dynamic Pricing & Budget Auditor."""

    async def synthesize_pricing(self, req: ConciergePricingRequest) -> ConciergePricingResponse:
        target_budget = req.targetBudget if req.targetBudget is not None and req.targetBudget > 0 else 750000.0
        duration_days = max(1, req.tripDurationDays or req.durationDays or 1)
        route = req.selectedRoute or SelectedRouteDto()
        vehicle = req.selectedVehicle or SelectedVehicleDto()
        guide = req.selectedGuide

        route_name = route.name or "Standard Scenic Corridor"
        route_dist = float(route.distanceKm) if route.distanceKm is not None and route.distanceKm > 0 else 120.0
        route_via = route.via or "Highways & Expressways"

        veh_model = vehicle.model or "Executive Luxury Transport"
        veh_type = vehicle.vehicleType or "4WD Luxury SUV"

        # 1. Authoritative Rule-Based Vehicle Charter Cost
        veh_daily_rate = float(vehicle.dailyRateLkr) if vehicle.dailyRateLkr and vehicle.dailyRateLkr > 0 else 36000.0
        expected_veh_total = round(veh_daily_rate * duration_days, 2)

        # 2. Authoritative Rule-Based Tour Escort / Guide Fee
        guide_daily_rate = float(guide.dailyRateLkr) if guide and guide.dailyRateLkr and guide.dailyRateLkr > 0 and guide.name != "Self-Guided" else 0.0
        expected_guide_total = round(guide_daily_rate * duration_days, 2) if guide and guide.name and guide.name != "Self-Guided" else 0.0

        # 3. Rule-Based Fuel & Terrain Elevation Transit Cost
        # Base fuel = 70 LKR per km
        # Mountain / incline route elevation factor (1.30x for Nuwara Eliya / Ella / Kandy, 1.05x for coastal/expressway)
        is_mountain = any(m in route_name.lower() or m in route_via.lower() for m in ["nuwara", "ella", "kandy", "mountain", "hill", "incline"])
        elevation_mult = 1.30 if is_mountain else 1.05
        base_fuel_per_km = 70.0
        fuel_cost = round(route_dist * base_fuel_per_km * elevation_mult, 2)

        # 4. Rule-Based Expressway Toll Tariff
        is_expressway = any(e in route_name.lower() or e in route_via.lower() for e in ["expressway", "e01", "e02", "highway", "e04"])
        toll_fee = round(1200.0 * min(duration_days, 3), 2) if is_expressway else 0.0

        # 5. Authoritative Rule-Based Tax & CeylonMate Platform Fee
        # 3% CeylonMate Platform Fee + 5% VAT (total 8% of commercial subtotal)
        commercial_subtotal = fuel_cost + expected_veh_total + toll_fee + expected_guide_total
        tax_and_platform = round(commercial_subtotal * 0.08, 2)
        total_trip_cost_lkr = round(commercial_subtotal + tax_and_platform, 2)

        # Convert to USD at fixed commercial reference exchange rate (1 USD = 300 LKR)
        total_trip_cost_usd = round(total_trip_cost_lkr / 300.0, 2)

        # 6. Authoritative Rule-Based Budget Audit & Variance
        variance_lkr = round(float(target_budget) - total_trip_cost_lkr, 2)
        status = "WITHIN_BUDGET" if variance_lkr >= 0 else "EXCEEDS_BUDGET"

        if variance_lkr >= 0:
            verdict = f"Your bespoke journey for {route_name} is fully within budget with a surplus of LKR {variance_lkr:,.0f}."
            optimization_tip = "You have surplus budget to add private high-tea estate visits, luxury river safaris, or upgrade to an Executive High-Roof VIP van."
        else:
            verdict = f"Your selected configuration for {route_name} exceeds your target budget by LKR {abs(variance_lkr):,.0f}."
            optimization_tip = "Consider adjusting route duration or selecting standard highway routing to bring the journey within your target budget."

        # 7. Driver Safety Hours Compliance (8-hour daily driving ceiling)
        daily_drive_hours = (route_dist / 50.0) / duration_days
        safety_hours_compliant = daily_drive_hours <= 8.0

        logger.info(f"[AGENT 4 CONCIERGE RULE-BASED] Synthesized quote: LKR {total_trip_cost_lkr:,.2f} (USD ${total_trip_cost_usd:,.2f}), Budget Variance: LKR {variance_lkr:,.2f} ({status})")

        return ConciergePricingResponse(
            pricingBreakdown=PricingBreakdownDto(
                fuelAndTransitLkr=fuel_cost,
                vehicleDayRateLkr=expected_veh_total,
                tollFeesLkr=toll_fee,
                guideFeeLkr=expected_guide_total,
                taxesAndPlatformLkr=tax_and_platform,
                totalTripCostLkr=total_trip_cost_lkr,
                totalTripCostUsd=total_trip_cost_usd,
            ),
            budgetAudit=BudgetAuditDto(
                targetBudgetLkr=float(target_budget),
                varianceLkr=variance_lkr,
                status=status,
                verdictSummary=verdict,
                conciergeOptimizationTip=optimization_tip,
            ),
            synthesisSignOff=SynthesisSignOffDto(
                isFeasible=True,
                driverSafetyHoursCompliant=safety_hours_compliant,
                auditBadge="CONCIERGE CERTIFIED",
            ),
        )


concierge_agent = ConciergeAgent()
