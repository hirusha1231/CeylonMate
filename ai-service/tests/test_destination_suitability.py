from fastapi.testclient import TestClient
from app.main import app
from app.schemas.destination import DestinationSuitabilityResponse

client = TestClient(app)
url = "/agent/destination-suitability/evaluate"

def test_destination_suitability_selects_valid_and_rejects_closed() -> None:
    payload = {
        "tripRequestId": "123e4567-e89b-12d3-a456-426614174000",
        "regionsOrThemes": ["hill country", "wildlife", "tea"],
        "interests": ["nature", "culture"],
        "startDate": "2026-11-01",
        "endDate": "2026-11-04",
        "accessibilityConstraints": ["Wheelchair accessible"]
    }

    response = client.post(url, json=payload)
    assert response.status_code == 200
    data = DestinationSuitabilityResponse.model_validate(response.json())

    # Nuwara Eliya and Yala should be selected
    selected_names = [c.destinationName for c in data.selectedCandidates]
    assert any("Nuwara Eliya" in name for name in selected_names)
    assert any("Yala" in name for name in selected_names)

    # Ella Viewpoint should be rejected due to closed attraction & mudslide report
    rejected_names = [c.destinationName for c in data.rejectedCandidates]
    assert any("Ella" in name for name in rejected_names)

    ella_candidate = next(c for c in data.rejectedCandidates if "Ella" in c.destinationName)
    assert ella_candidate.isRejected is True
    assert ella_candidate.rejectionReason is not None
