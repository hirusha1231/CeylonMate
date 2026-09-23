import pytest
from unittest.mock import AsyncMock, patch
from app.schemas.feasibility import FeasibilityCheckRequest, ItineraryItemRequest, ResourceType, FeasibilityStatus
from app.agent.feasibility_agent import ResourceFeasibilityAgent
from app.tools.capacity_tools import search_guide_availability, search_transport_slots, search_attraction_slots, get_route_estimate

@pytest.mark.anyio
async def test_feasibility_agent_all_feasible():
    agent = ResourceFeasibilityAgent()
    req = FeasibilityCheckRequest(
        traveler_id="t-123",
        items=[
            ItineraryItemRequest(item_id="i-1", resource_type=ResourceType.GUIDE, date="2026-10-01", party_size=2, lat=7.2906, lng=80.6337),
            ItineraryItemRequest(item_id="i-2", resource_type=ResourceType.ATTRACTION, date="2026-10-01", party_size=2, lat=7.9570, lng=80.7600),
        ]
    )

    with patch("app.agent.feasibility_agent.search_guide_availability", new_callable=AsyncMock) as mock_guide, \
         patch("app.agent.feasibility_agent.search_attraction_slots", new_callable=AsyncMock) as mock_attraction, \
         patch("app.agent.feasibility_agent.get_route_estimate", new_callable=AsyncMock) as mock_route:

        mock_guide.return_value = {"available": True, "capacity": 1, "note": "Guide available"}
        mock_attraction.return_value = {"available": True, "capacity": 50, "note": "Attraction quota open"}
        mock_route.return_value = {"distanceKm": 90.0, "durationMinutes": 135.0, "isFallback": False}

        res = await agent.evaluate_feasibility(req)

        assert res.overall_feasibility == FeasibilityStatus.FEASIBLE
        assert len(res.items) == 2
        assert res.items[0].is_available is True
        assert res.items[1].is_available is True
        assert len(res.conflicts) == 0
        assert res.route_summary.total_distance_km == 90.0
        assert res.route_summary.total_duration_minutes == 135.0

@pytest.mark.anyio
async def test_feasibility_agent_with_unavailable_resource():
    agent = ResourceFeasibilityAgent()
    req = FeasibilityCheckRequest(
        traveler_id="t-123",
        items=[
            ItineraryItemRequest(item_id="i-1", resource_type=ResourceType.GUIDE, date="2026-10-01", party_size=2),
            ItineraryItemRequest(item_id="i-2", resource_type=ResourceType.TRANSPORT, date="2026-10-01", party_size=10),
        ]
    )

    with patch("app.agent.feasibility_agent.search_guide_availability", new_callable=AsyncMock) as mock_guide, \
         patch("app.agent.feasibility_agent.search_transport_slots", new_callable=AsyncMock) as mock_transport:

        mock_guide.return_value = {"available": True, "capacity": 1, "note": "Guide available"}
        mock_transport.return_value = {"available": False, "capacity": 0, "note": "No transport seats available"}

        res = await agent.evaluate_feasibility(req)

        assert res.overall_feasibility == FeasibilityStatus.PARTIALLY_FEASIBLE
        assert len(res.items) == 2
        assert res.items[0].is_available is True
        assert res.items[1].is_available is False
        assert len(res.conflicts) == 1
        assert "unavailable" in res.conflicts[0].lower()

@pytest.mark.anyio
async def test_capacity_tools_fallback():
    # Test tool fallback resilience when backend API is unreachable
    guide_res = await search_guide_availability("2026-10-01")
    assert "available" in guide_res
    assert guide_res["available"] is True

    transport_res = await search_transport_slots("2026-10-01", party_size=4)
    assert "available" in transport_res
    assert transport_res["available"] is True

    attraction_res = await search_attraction_slots("2026-10-01", party_size=2)
    assert "available" in attraction_res
    assert attraction_res["available"] is True

    route_res = await get_route_estimate(7.29, 80.63, 6.92, 79.86)
    assert "distanceKm" in route_res
