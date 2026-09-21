# Member 1: trip requests and traveler preferences

This slice adds only traveler profiles, trip requests, trip status history, and a durable `QUEUED` workflow request. It does not build itineraries, bookings, or reservations.

## Stage 1 — model, EF mapping, migration

Files: `Trips/TravelerProfile.cs`, `Trips/TripRequest.cs`, `Trips/TripStatus.cs`, `Trips/WorkflowExecution.cs`, `Trips/TripEntityConfigurations.cs`, `Data/CeylonMateDbContext.cs`, and `Data/Migrations/*_TripRequests*`.

Apply locally after setting `ConnectionStrings__CeylonMate` and `Jwt__SigningKey`:

```powershell
dotnet ef database update --project backend/CeylonMate.Api --startup-project backend/CeylonMate.Api
```

Swagger check after this stage (once the controller is wired): create a trip with the sample below. It must return `DRAFT`, `travelerId`, `travelerProfileId`, and UTC audit timestamps. The database migration creates `traveler_profiles`, `trip_requests`, `trip_request_status_histories`, and `workflow_executions` only.

## Stage 2 — DTO and service

Files: `Trips/TripDtos.cs`, `Trips/TripService.cs`.

Swagger check after this stage (once the controller is wired): submit invalid dates, zero budget, or zero party size through `POST /api/trips`; each returns `400`. The service creates a profile automatically if this traveler has none, and returns DTOs rather than EF entities.

## Stage 3 — controller and authorization

Files: `Trips/TripsController.cs`, `Program.cs`.

In Development, open `/swagger`. Register a `TRAVELER` with `/api/auth/register`, copy `accessToken`, and use Swagger's **Authorize** button. Then call `POST /api/trips`:

```json
{
  "objective": "Wildlife and culture",
  "startDate": "2026-12-01",
  "endDate": "2026-12-10",
  "budget": 50000,
  "currency": "LKR",
  "partySize": 2,
  "startingLatitude": 6.927079,
  "startingLongitude": 79.861244,
  "accessibilityNeeds": "Step-free access"
}
```

Expected: `201 Created`. Save its `id`.

Swagger checks:

1. `GET /api/trips/my` and `GET /api/trips/{id}` return the trip for its owner. A different traveler receives `404` for that ID.
2. `PUT /api/trips/{id}` can update `DRAFT` or `REVISION_REQUIRED`; `DELETE /api/trips/{id}` returns `204` and *cancels* the trip rather than hard-deleting audit data.
3. `POST /api/trips/{id}/submit` returns `SUBMITTED`; repeating it returns `409`.
4. `GET /api/trips` is staff-only (`TRAVEL_AGENT`/`ADMIN`) and supports `travelerId`, `status`, `page`, and `pageSize` filters. A traveler receives `403`.
5. With a staff token, `POST /api/trips/{id}/start-planning` returns `202` and `PLANNING`. It stores one queued `WorkflowExecution`. Calling it before submit or a second time returns `409`; a traveler receives `403`. No AI worker or booking runs here.
6. `PUT /api/traveler/profile` sets reusable `visitorCategory` and `preferences`; `GET /api/traveler/profile` reads them. Both are traveler-only.

Run automated checks with `dotnet test CeylonMate.sln -c Release --no-restore -p:UseAppHost=false` if a running Debug API locks its DLL.

## Merge note

The shared contract assigns trip/workflow entities to another workstream and reserves the EF snapshot for the schema integrator. Coordinate this migration with that owner before merging parallel migrations; regenerate from the latest snapshot rather than hand-merging it.
