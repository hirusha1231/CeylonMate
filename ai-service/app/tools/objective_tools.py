from app.schemas.objective_interpretation import StoredTripRequest


class ObjectiveReadTools:
    """Bound to one trusted, validated trip snapshot; exposes only reads."""

    def __init__(self, stored_trip_request: StoredTripRequest) -> None:
        self._trip = stored_trip_request

    def read_trip_request(self, tripRequestId: str) -> StoredTripRequest:
        if str(self._trip.tripRequestId) != tripRequestId:
            raise ValueError("Trip request ID mismatch")
        return self._trip

    def read_reference_summary(self) -> dict[str, tuple[str, ...]]:
        """Small, static vocabulary; no destination IDs or business actions."""
        return {
            "wildlife": ("wildlife", "safari", "animals"),
            "culture": ("culture", "heritage", "temple", "history"),
            "beaches": ("beach", "coast", "sea"),
            "nature": ("nature", "hiking", "forest", "waterfall"),
            "food": ("food", "cuisine", "cooking"),
            "hill country": ("hill country", "tea country"),
            "south coast": ("south coast",),
            "central region": ("central region",),
        }
