from fastapi import APIRouter
from app.schemas.concierge_pricing import ConciergePricingRequest, ConciergePricingResponse
from app.agent.concierge_agent import concierge_agent

router = APIRouter(prefix="/agent/concierge-pricing", tags=["Concierge Pricing & Auditor"])


@router.post("/synthesize", response_model=ConciergePricingResponse)
async def synthesize_concierge_pricing(req: ConciergePricingRequest):
    """Pure LLM-driven pricing synthesis, commercial feasibility audit, and budget variance evaluation."""
    return await concierge_agent.synthesize_pricing(req)
