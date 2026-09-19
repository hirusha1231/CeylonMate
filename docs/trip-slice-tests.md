# Trip Requests compact test set

Run from the repository root:

```powershell
dotnet test backend/CeylonMate.Tests/CeylonMate.Tests.csproj --filter FullyQualifiedName~TripApiTests
cd mobile; flutter test test/trip_form_validation_test.dart
cd ../web; npm ci; npm test
cd ../ai-service; python -m pip install -e ".[dev]"; python -m pytest -q tests/test_objective_interpretation.py
```

Coverage:

- `backend/CeylonMate.Tests/TripApiTests.cs`: traveler creation returns 201/DRAFT;
  another traveler gets 404 on PUT; invalid date order, zero budget and zero party
  size return 400; DRAFT start-planning returns 409; SUBMITTED start-planning
  returns 202/PLANNING and one QUEUED workflow execution.
- `mobile/test/trip_form_validation_test.dart`: invalid form never calls createTrip.
- `web/src/features/trips/TripRequestsPage.test.tsx`: list row on success and
  visible error/retry on API failure.
- `ai-service/tests/test_objective_interpretation.py`: schema-validated golden
  case, missing-fields case, and prompt-injection resistance.

To verify the workflow invariant in the current schema, run the backend test
`TravelerCanCreateSubmitAndStaffCanStartPlanningOnce`: it checks zero workflow
rows before submission, exactly one `QUEUED` row afterward, the trip's
`PLANNING` status, and three status-history rows. The current EF model has no
`Booking` or `Reservation` entity/table, which the test also checks; therefore
this code path cannot create such records in the current schema. If those
tables are introduced later, extend this integration test to compare their
per-trip row counts before and after start-planning. A repeated start-planning
request must return 409 and leave the workflow count at one.
