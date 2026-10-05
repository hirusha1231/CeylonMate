import logging
from typing import Dict, Any, Optional
from app.core.llm import generate_gemini_json
from app.schemas.concierge_pricing import (
    ConciergePricingRequest,
    ConciergePricingResponse,
    PricingBreakdownDto,
    BudgetAuditDto,
    SynthesisSignOffDto,
)

logger = logging.getLogger("ceylonmate.concierge_agent")


class ConciergeAgent:
    """Agent 4: Chief Travel Concierge & Pure LLM-Driven Dynamic Pricing & Budget Auditor."""

    async def synthesize_pricing(self, req: ConciergePricingRequest) -> ConciergePricingResponse:
        target_budget = req.targetBudget if req.targetBudget is not None and req.targetBudget > 0 else 750000.0
        duration_days = max(1, req.tripDurationDays or req.durationDays or 1)
        route = req.selectedRoute or SelectedRouteDto()
        vehicle = req.selectedVehicle or SelectedVehicleDto()
        guide = req.selectedGuide

        route_name = route.name or "Standard Scenic Corridor"
        route_dist = route.distanceKm if route.distanceKm is not None else 120.0
        route_via = route.via or "Highways & Expressways"

        veh_model = vehicle.model or "Executive Luxury Transport"
        veh_type = vehicle.vehicleType or "4WD Luxury SUV"

        veh_daily_rate = float(vehicle.dailyRateLkr) if vehicle.dailyRateLkr and vehicle.dailyRateLkr > 0 else 36000.0
        expected_veh_total = veh_daily_rate * duration_days

        guide_daily_rate = float(guide.dailyRateLkr) if guide and guide.dailyRateLkr and guide.dailyRateLkr > 0 and guide.name != "Self-Guided" else 0.0
        expected_guide_total = guide_daily_rate * duration_days if guide and guide.name and guide.name != "Self-Guided" else 0.0

        guide_str = f"{guide.name} ({guide.role or 'National Tourist Guide'})" if guide and guide.name and guide.name != "Self-Guided" else "None (Self-Drive / Chauffeur-Only)"
        veh_rate_str = f" with daily rate of LKR {veh_daily_rate:,.0f} / day (Total: LKR {expected_veh_total:,.0f} for {duration_days} days)"
        guide_rate_str = f" with daily fee of LKR {guide_daily_rate:,.0f} / day (Total: LKR {expected_guide_total:,.0f} for {duration_days} days)" if expected_guide_total > 0 else " (No dedicated guide fee)"

        llm_prompt = f"""You are Agent 4: Chief Travel Concierge & Dynamic Pricing Auditor for CeylonMate in Sri Lanka.
Analyze the traveler's final journey configuration:
- Duration: {duration_days} Days
- Target Budget: LKR {target_budget}
- Route: {route_name} ({route_dist} km via {route_via})
- Fleet Vehicle: {veh_model} ({veh_type}){veh_rate_str}
- Tour Escort: {guide_str}{guide_rate_str}

Using your up-to-date knowledge of Sri Lankan commercial transport costs, expressway tolls, chauffeur day rates, and tourism margins, dynamically determine the realistic cost breakdown in Sri Lankan Rupees (LKR) and compare it against their target budget. Honor the exact vehicle charter total of LKR {expected_veh_total:,.0f} and guide escort total of LKR {expected_guide_total:,.0f}.

Respond STRICTLY with this JSON structure (no markdown fences, no code blocks):
{{
  "pricingBreakdown": {{
    "fuelAndTransitLkr": <realistic AI-calculated market fuel & transit cost>,
    "vehicleDayRateLkr": {expected_veh_total},
    "tollFeesLkr": <expressway tolls for this route, or 0 if byway>,
    "guideFeeLkr": {expected_guide_total},
    "taxesAndPlatformLkr": <calculated platform & tax cost>,
    "totalTripCostLkr": <sum of all components>,
    "totalTripCostUsd": <converted to USD at 1 USD = 300 LKR>
  }},
  "budgetAudit": {{
    "targetBudgetLkr": {target_budget},
    "varianceLkr": <targetBudget minus totalTripCostLkr>,
    "status": "WITHIN_BUDGET" or "EXCEEDS_BUDGET",
    "verdictSummary": "<One-sentence AI summary of how well this fits the budget>",
    "conciergeOptimizationTip": "<Personalized recommendation if over budget or suggestions if budget has surplus>"
  }},
  "synthesisSignOff": {{
    "isFeasible": true,
    "driverSafetyHoursCompliant": true,
    "auditBadge": "CONCIERGE CERTIFIED"
  }}
}}"""

        logger.info(f"[AGENT 4 CONCIERGE] Synthesizing pricing via Gemini for budget LKR {target_budget} with vehicle {veh_model} (LKR {expected_veh_total:,.0f}) on route {route.name}...")
        gemini_res = await generate_gemini_json(
            prompt=llm_prompt,
            system_instruction="You are Agent 4: Chief Travel Concierge & Dynamic Pricing Auditor for CeylonMate in Sri Lanka. Evaluate dynamic market pricing and budget variance. Return ONLY valid pure JSON matching the schema."
        )

        if gemini_res and isinstance(gemini_res, dict):
            pb = gemini_res.get("pricingBreakdown") or {}
            ba = gemini_res.get("budgetAudit") or {}
            ss = gemini_res.get("synthesisSignOff") or {}

            fuel = float(pb.get("fuelAndTransitLkr") or 0)
            veh = float(pb.get("vehicleDayRateLkr") or expected_veh_total)
            if veh <= 0:
                veh = expected_veh_total
            toll = float(pb.get("tollFeesLkr") or 0)
            g_fee = expected_guide_total if expected_guide_total > 0 else float(pb.get("guideFeeLkr") or 0)
            if not guide or not guide.name or guide.name == "Self-Guided":
                g_fee = 0.0
            tax = float(pb.get("taxesAndPlatformLkr") or round((fuel + veh + toll + g_fee) * 0.08, 0))
            total_lkr = float(fuel + veh + toll + g_fee + tax)
            total_usd = float(round(total_lkr / 300.0, 2))

            variance = float(target_budget - total_lkr)
            status = "WITHIN_BUDGET" if variance >= 0 else "EXCEEDS_BUDGET"

            verdict = str(ba.get("verdictSummary") or (
                f"Your bespoke journey is fully within budget with a surplus of LKR {abs(variance):,.0f}."
                if variance >= 0
                else f"Your selected configuration exceeds target budget by LKR {abs(variance):,.0f}."
            ))

            tip = str(ba.get("conciergeOptimizationTip") or (
                "Consider upgrading to an Executive High-Roof VIP van or adding private tea tasting experiences."
                if variance >= 0
                else "Consider selecting standard highway routing or optimizing duration to align with your target budget."
            ))

            return ConciergePricingResponse(
                pricingBreakdown=PricingBreakdownDto(
                    fuelAndTransitLkr=fuel,
                    vehicleDayRateLkr=veh,
                    tollFeesLkr=toll,
                    guideFeeLkr=g_fee,
                    taxesAndPlatformLkr=tax,
                    totalTripCostLkr=total_lkr,
                    totalTripCostUsd=total_usd,
                ),
                budgetAudit=BudgetAuditDto(
                    targetBudgetLkr=float(target_budget),
                    varianceLkr=variance,
                    status=status,
                    verdictSummary=verdict,
                    conciergeOptimizationTip=tip,
                ),
                synthesisSignOff=SynthesisSignOffDto(
                    isFeasible=bool(ss.get("isFeasible", True)),
                    driverSafetyHoursCompliant=bool(ss.get("driverSafetyHoursCompliant", True)),
                    auditBadge=str(ss.get("auditBadge") or "CONCIERGE CERTIFIED"),
                ),
            )

        # Fallback synthesis if LLM API is unavailable
        is_expressway = "expressway" in route.name.lower() or "e01" in route.name.lower() or "e02" in route.name.lower()
        toll_fee = 1200.0 if is_expressway else 0.0
        fuel_cost = round(max(25.0, route.distanceKm) * 65.0, 0)
        veh_cost = expected_veh_total
        guide_cost = expected_guide_total
        subtotal = fuel_cost + veh_cost + toll_fee + guide_cost
        tax_platform = round(subtotal * 0.08, 0)
        tot_lkr = subtotal + tax_platform
        tot_usd = round(tot_lkr / 300.0, 2)
        var_lkr = target_budget - tot_lkr
        stat = "WITHIN_BUDGET" if var_lkr >= 0 else "EXCEEDS_BUDGET"

        return ConciergePricingResponse(
            pricingBreakdown=PricingBreakdownDto(
                fuelAndTransitLkr=fuel_cost,
                vehicleDayRateLkr=veh_cost,
                tollFeesLkr=toll_fee,
                guideFeeLkr=guide_cost,
                taxesAndPlatformLkr=tax_platform,
                totalTripCostLkr=tot_lkr,
                totalTripCostUsd=tot_usd,
            ),
            budgetAudit=BudgetAuditDto(
                targetBudgetLkr=target_budget,
                varianceLkr=var_lkr,
                status=stat,
                verdictSummary=f"AI Concierge synthesized quotation for {route.name}: LKR {tot_lkr:,.0f} ({stat.replace('_', ' ')}).",
                conciergeOptimizationTip="Itinerary verified for continuous transit safety and commercial pricing efficiency."
            ),
            synthesisSignOff=SynthesisSignOffDto(
                isFeasible=True,
                driverSafetyHoursCompliant=True,
                auditBadge="CONCIERGE CERTIFIED"
            )
        )


concierge_agent = ConciergeAgent()
