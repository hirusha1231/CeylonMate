You are acting as the senior software engineer executing the Member 3 Full CRUD Enhancement Plan for CeylonMate.
Refer to the specification in `docs/M3_FULL_CRUD_IMPLEMENTATION_PLAN.md`.

### 🚨 CRITICAL CONSTRAINTS (READ FIRST):
1. **DO NOT PUSH TO GITHUB**: Under no circumstances should you run `git push` or interact with remote repositories. All git pushes will be handled manually by the developer after reviewing your code and test outputs.
2. **STRICT BRANCH ISOLATION**: Work entirely on a local feature branch named `feat/m3-full-crud-enhancement`.
3. **ZERO COMPILATION OR TEST REGRESSIONS**: All existing 12 xUnit tests, React production builds, and Flutter widget tests must continue to pass without error.

---

### Tasks to Implement:

#### 1. Git Setup:
- Ensure you are on a new local branch: `git checkout -b feat/m3-full-crud-enhancement`.

#### 2. Backend Enhancements (M3-A):
- Add `[Tags("Capacity")]` above `GuideAvailabilityController`, `TransportAvailabilityController`, `AttractionAvailabilityController`, and `RoutingController` so that all Member 3 endpoints group under "Capacity" in Swagger.
- Implement `PUT` (Update) and `DELETE` (Delete) endpoints in:
  - `GuideAvailabilityController.cs` (`PUT /api/guides/availability/{slotId}`, `DELETE /api/guides/availability/{slotId}`)
  - `TransportAvailabilityController.cs` (`PUT /api/transport/slots/{slotId}`, `DELETE /api/transport/slots/{slotId}`)
  - `AttractionAvailabilityController.cs` (`PUT /api/attractions/slots/{slotId}`, `DELETE /api/attractions/slots/{slotId}`)
- Enforce business logic:
  - Updates must validate constraints and respect `RowVersion` for OCC.
  - Delete must prevent deletion if active reservations/holds exist, returning an appropriate conflict or error response.

#### 3. Backend Tests:
- Add unit/integration tests in `backend/CeylonMate.Tests` verifying:
  - Successful update of a slot.
  - Deletion of an available slot.
  - Prevention of deletion when a slot has active holds.

#### 4. Web Dashboard Enhancements (M3-D):
- In `web/src/pages/GuideAvailabilityPage.tsx`:
  - Add Edit and Delete action buttons to the table rows.
  - Implement an Edit Modal to update slot parameters.
  - Implement a Delete confirmation modal.
- Ensure `web/src/pages/TransportAttractionCapacityPage.tsx` allows updating capacities.

#### 5. Mobile Flutter Enhancements (M3-C):
- In `mobile/lib/features/guide/screens/add_edit_availability_screen.dart`:
  - Allow editing existing slots when an existing slot is passed in.
- In `mobile/lib/features/guide/screens/my_availability_screen.dart`:
  - Add a delete option with a confirmation dialog.
- In `mobile/lib/features/guide/services/guide_availability_service.dart`:
  - Add `updateAvailabilitySlot` and `deleteAvailabilitySlot` API methods.

---

### Verification Commands (Run Locally & Report Output):
1. `dotnet build backend/CeylonMate.Api`
2. `dotnet test backend/CeylonMate.Tests`
3. `cd web; npm run build; cd ..`
4. `cd mobile; flutter analyze; flutter test; cd ..`

DO NOT run `git push`. When finished, provide a concise summary of the modified files and test execution results.