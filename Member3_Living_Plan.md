# Member 3: Master Technical Execution & Living Task Manual (CeylonMate - SE3090)

**Role:** Member 3 (Guide, Transport & Attraction Capacity Subsystem, AI Resource Feasibility Node & Concurrency Engine)  
**Assigned Roles:** `CAPACITY_OFFICER` (Web / React) & `LOCAL_GUIDE` (Mobile / Flutter)  
**Execution Window:** Sep 09 – Sep 25, 2026 (Buffer: Sep 26–30, 2026)  
**Primary Tech Stack:** ASP.NET Core Web API (.NET 8), Entity Framework Core (PostgreSQL), Flutter, React (TypeScript), LangGraph (Python / FastAPI), xUnit.  
**Git Base Branch:** `main`  
**Active Working Branch:** `m3/capacity-backend`

---

## 🚨 1. Team Dependency & Handshake Contract (Member 4)

> ⚠️ **STRICT ARCHITECTURAL RULE:**  
> While the Resource Feasibility AI Agent or backend check endpoints run, **DO NOT LOCK OR DECREMENT DATABASE SLOTS**.  
> The feasibility node performs **READ-ONLY AVAILABILITY CHECKS**. Resource locking and decrementing must occur **EXCLUSIVELY** inside Member 4's final travel agent approval and booking transaction.

### 💬 Notification to Send to Member 4 (Copy & Paste):
```text
"Hey Member 4, my Resource Feasibility Agent only checks resource availability (read-only). When you implement the final booking confirmation transaction in your Travel Agent Approval flow, ensure you invoke my `ReserveResourcesAsync` method within that PostgreSQL transaction. That ensures atomic locking and concurrency validation for guide, transport, and attraction slots. Please make sure to wire this up in your final booking pipeline!"
```

---

## 🗄️ 2. Database Environment Setup & Strategy

### 2.1 Local PostgreSQL Development Setup
Inject the local database connection string in PowerShell before running migrations:
```powershell
$env:ConnectionStrings__CeylonMate="Host=localhost;Port=5432;Database=ceylonmate;Username=postgres;Password=postgres"
```

### 2.2 Shared Cloud Database Setup (Neon.tech - Recommended for Team Sync)
If the team connects to a shared cloud database, configure the connection string in `appsettings.Development.json` or as an environment variable:
```text
Host=ep-xyz.ap-southeast-1.aws.neon.tech;Database=ceylonmate;Username=ceylon_admin;Password=YourSecurePassword;SSL Mode=Require;Trust Server Certificate=true
```

---

## 📋 3. Step-by-Step Implementation Phases

---

### 🔹 Phase 1: Shared Mobile Shell & Authentication Client Setup (Day 2)

- [ ] **1.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/flutter-shell
  ```

- [ ] **1.2 Implementation Tasks**
  - File: `mobile/lib/core/network/api_client.dart`
    - Configure `Dio` HTTP client with base URL, timeout, and JWT authorization interceptors.
  - File: `mobile/lib/core/auth/token_storage.dart`
    - Secure JWT storage implementation using `flutter_secure_storage`.
  - File: `mobile/lib/router/app_router.dart`
    - Setup role-based routing (`LOCAL_GUIDE` screens vs `TRAVELER` screens).

- [ ] **1.3 Local Testing & Verification**
  ```bash
  cd mobile
  flutter pub get
  flutter analyze
  flutter test test/widget_test.dart
  flutter run
  ```
  - Checklist:
    - [ ] Clean build with zero Flutter analyze warnings.
    - [ ] Successful authentication and JWT token persistence.
    - [ ] Role router navigates correctly to assigned screens.

- [ ] **1.4 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "feat(mobile): setup shared flutter shell, dio client and role-based routing"
  git push -u origin m3/flutter-shell
  ```
  - [ ] Create PR on GitHub from `m3/flutter-shell` into `main` and merge.

---

### 🔹 Phase 2: Capacity Backend, DB Models & Concurrency Engine (Days 3–5)

- [x] **2.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/capacity-backend
  ```

- [x] **2.2 Domain Models Implementation**
  - Files to create in `backend/CeylonMate.Api/Models/`:
    - `GuideAvailability.cs`: `GuideProfile`, `GuideAvailability`, `SlotType`, `AvailabilityStatus`, `[Timestamp] RowVersion`
    - `TransportSlot.cs`: `TransportOption`, `TransportSlot`, `VehicleType`, `SlotStatus`, `[Timestamp] RowVersion`
    - `AttractionSlot.cs`: `AttractionSlot`, `SlotStatus`, `[Timestamp] RowVersion`

- [x] **2.3 DbContext Configuration & Migration**
  - File: `backend/CeylonMate.Api/Data/CeylonMateDbContext.cs`
    - Add `DbSet` properties and configure optimistic concurrency tokens (`IsRowVersion()`) in `OnModelCreating`.
  - Generate and apply EF Core migration:
    ```powershell
    cd backend/CeylonMate.Api
    $env:ConnectionStrings__CeylonMate="Host=localhost;Port=5432;Database=ceylonmate;Username=postgres;Password=postgres"
    dotnet ef migrations add AddCapacityAndAvailabilityModels
    dotnet ef database update
    ```

- [x] **2.4 Services & Controllers Implementation**
  - File: `backend/CeylonMate.Api/DTOs/CapacityDtos.cs`
  - File: `backend/CeylonMate.Api/Services/CapacityReservationService.cs`
    - Implement `ReserveResourcesAsync(ReservationRequestDto dto)` using database transactions and optimistic locking check.
  - File: `backend/CeylonMate.Api/Controllers/CapacityController.cs`
    - `GET /api/capacity/search?date={date}&partySize={size}`
    - `POST /api/capacity/reserve`
  - File: `backend/CeylonMate.Api/Controllers/GuideAvailabilityController.cs`
    - `GET /api/guides/{guideId}/availability`
    - `POST /api/guides/{guideId}/availability`

- [ ] **2.5 Local Testing & Verification**
  ```powershell
  cd backend/CeylonMate.Api
  dotnet build
  dotnet run
  ```
  - Checklist:
    - [ ] Open Swagger UI at `https://localhost:7xxx/swagger`.
    - [ ] Execute `POST /api/guides/{id}/availability` to add a slot.
    - [ ] Execute `GET /api/capacity/search` to verify slot query filtering.
    - [ ] Run automated tests:
      ```powershell
      cd ../CeylonMate.Tests
      dotnet test
      ```

- [ ] **2.6 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "feat(capacity): implement domain models, optimistic locking, and reservation service"
  git push -u origin m3/capacity-backend
  ```
  - [ ] Create PR on GitHub from `m3/capacity-backend` into `main` and merge.

---

### 🔹 Phase 3: Flutter Mobile Screens (Local Guide & Traveler) (Days 6–7)

- [x] **3.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/flutter-availability
  ```

- [x] **3.2 Screen Implementation Tasks**
  - **Local Guide Features (`mobile/lib/features/guide/`):**
    - `my_availability_screen.dart`: Monthly calendar and slot list with status badges.
    - `add_edit_availability_screen.dart`: Date selection, morning/afternoon/full-day toggles.
  - **Traveler Feasibility View (`mobile/lib/features/traveler/`):**
    - `resource_feasibility_view.dart`: Read-only itinerary card showing confirmed/pending availability chips.

- [x] **3.3 Local Testing & Verification**
  ```bash
  cd mobile
  flutter analyze
  flutter test
  flutter run
  ```
  - Checklist:
    - [x] Local Guide can create and toggle slots.
    - [x] API successfully reflects updated slot statuses.
    - [x] Traveler card renders resource badges cleanly.
    - [x] Clean build with zero `flutter analyze` errors or warnings.

- [ ] **3.4 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "feat(mobile): add local guide availability screens and traveler feasibility summary"
  git push -u origin m3/flutter-availability
  ```
  - [ ] Create PR on GitHub from `m3/flutter-availability` into `main` and merge.

---

### 🔹 Phase 4: React Web Management Console for Capacity Officer (Days 8–9)

- [ ] **4.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/react-capacity
  ```

- [ ] **4.2 Implementation Tasks**
  - Directory: `web/src/pages/capacity/`
    - `CapacityDashboard.tsx`: Operational summary metrics (total guides, active transport, booked attractions).
    - `GuideAvailabilityTable.tsx`: Live searchable and filterable table by date, language, and status.
    - `TransportSlotManager.tsx`: Manage vehicle capacities and slot cancellations.
    - `AttractionSlotManager.tsx`: Manage maximum capacities and emergency blackout dates.
    - `FeasibilityCheckSandbox.tsx`: Staff test sandbox to query dates and party sizes.

- [ ] **4.3 Local Testing & Verification**
  ```bash
  cd web
  npm install
  npm run build
  npm run dev
  ```
  - Checklist:
    - [ ] Open `http://localhost:5173`.
    - [ ] Log in with `CAPACITY_OFFICER` credentials.
    - [ ] Confirm tables filter accurately and slot modifications persist.

- [ ] **4.4 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "feat(web): add capacity officer dashboard, slot managers, and sandbox tester"
  git push -u origin m3/react-capacity
  ```
  - [ ] Create PR on GitHub from `m3/react-capacity` into `main` and merge.

---

### 🔹 Phase 5: Resource Feasibility AI Agent & Routing Adapter (Days 10–12)

- [ ] **5.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/resource-feasibility-agent
  ```

- [ ] **5.2 Implementation Tasks**
  - **AI Service (`ai-service/app/agents/`):**
    - `resource_feasibility_agent.py`: LangGraph Node 3 parsing itinerary payloads.
    - Function calling tools:
      - `search_guide_availability`
      - `search_attraction_slots`
      - `search_transport_slots`
      - `get_route_estimate`
  - **Resilient Routing Adapter (`backend/CeylonMate.Api/Services/`):**
    - `RoutingAdapter.cs`: External routing API caller with 3-second timeout and Haversine fallback calculation.

- [ ] **5.3 Local Testing & Verification**
  ```bash
  cd ai-service
  poetry run pytest tests/test_resource_feasibility.py
  ```
  - Checklist:
    - [ ] LangGraph agent emits schema contract: `{ feasible: bool, guideOptions: [], conflicts: [] }`.
    - [ ] Routing adapter seamlessly falls back to Haversine on simulated timeout.

- [ ] **5.4 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "feat(ai): integrate langgraph node 3 feasibility agent and resilient routing adapter"
  git push -u origin m3/resource-feasibility-agent
  ```
  - [ ] Create PR on GitHub from `m3/resource-feasibility-agent` into `main` and merge.

---

### 🔹 Phase 6: Automated Concurrency & Resilience Tests (Day 13)

- [ ] **6.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/capacity-tests
  ```

- [ ] **6.2 Implementation Tasks**
  - File: `backend/CeylonMate.Tests/CapacityConcurrencyTests.cs`
    - Parallel test execution: 2 concurrent threads booking the final remaining slot.
    - Assert: 1 request returns `200 OK`, 1 request throws `409 Conflict` (RowVersion mismatch).
  - File: `backend/CeylonMate.Tests/RoutingFallbackTests.cs`
    - Simulate routing provider timeout and verify distance calculation succeeds via fallback.

- [ ] **6.3 Local Testing & Verification**
  ```powershell
  cd backend/CeylonMate.Tests
  dotnet test --logger "console;verbosity=detailed"
  ```
  - Checklist:
    - [ ] All unit, concurrency, and fallback resilience tests pass.

- [ ] **6.4 Git Commit, Push & Pull Request**
  ```bash
  git add .
  git commit -m "test(capacity): add parallel concurrency conflict tests and routing fallback tests"
  git push -u origin m3/capacity-tests
  ```
  - [ ] Create PR on GitHub from `m3/capacity-tests` into `main` and merge.

---

### 🔹 Phase 7: Evidence Collection, Documentation & Viva Preparation (Days 15–16)

- [ ] **7.1 Git Branch Setup**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b m3/docs-evidence
  ```

- [ ] **7.2 Evidence Compilation**
  - Collect artifacts in `docs/evidence/m3/`:
    - `01_swagger_capacity_search.png`: Swagger query screenshot.
    - `02_concurrency_test_pass.png`: Terminal logs verifying passing concurrency tests.
    - `03_react_capacity_officer.png`: React management console screenshot.
    - `04_flutter_guide_calendar.png`: Flutter guide availability calendar view.
    - `05_ai_agent_feasibility_run.log`: LangGraph node 3 payload execution logs.

- [ ] **7.3 Git Commit, Push & Final Pull Request**
  ```bash
  git add docs/evidence/m3
  git commit -m "docs(evidence): complete member 3 viva voce evidence dossier and final report"
  git push -u origin m3/docs-evidence
  ```
  - [ ] Merge final PR into `main`.
