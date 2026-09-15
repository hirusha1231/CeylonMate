# Member 3: Master Technical Execution & Living Task Manual (CeylonMate - SE3090)

**Role:** Member 3 (Guide, Transport & Attraction Capacity Subsystem, AI Resource Feasibility Node & Concurrency Engine)  
**Assigned Roles:** `CAPACITY_OFFICER` (Web / React) & `LOCAL_GUIDE` (Mobile / Flutter)  
**Execution Window:** Sep 09 – Sep 25, 2026 (Buffer: Sep 26–30, 2026)  
**Primary Tech Stack:** ASP.NET Core Web API (.NET 8), Entity Framework Core (PostgreSQL), Flutter, React (TypeScript), LangGraph (Python / FastAPI), xUnit.  
**Git Working Branch:** `m3/capacity-docs`  

---

## 🚨 1. Team Dependency & Handshake Contract (Member 4)

> ⚠️ **STRICT ARCHITECTURAL RULE:**  
> While the Resource Feasibility AI Agent or backend check endpoints run, **DO NOT LOCK OR DECREMENT DATABASE SLOTS**.  
> The feasibility node performs **READ-ONLY AVAILABILITY CHECKS**. Resource locking and decrementing must occur **EXCLUSIVELY** inside Member 4's final travel agent approval and booking transaction.

---

## 📋 3. Step-by-Step Implementation Phases

---

### 🔹 Phase 1: Shared Mobile Shell & Authentication Client Setup
- [x] **1.1 Git Branch Setup**: Created `m3/flutter-shell` branch.
- [x] **1.2 Implementation Tasks**:
  - `mobile/lib/core/network/api_client.dart`: Dio HTTP client with JWT interceptors.
  - `mobile/lib/core/network/api_config.dart`: Configuration endpoints.
- [x] **1.3 Local Testing & Verification**: Clean build with zero Flutter analyze warnings.
- [x] **1.4 Git Commit, Push & PR**: Merged into `main`.

---

### 🔹 Phase 2: Capacity Backend, DB Models & Concurrency Engine
- [x] **2.1 Git Branch Setup**: Created `m3/capacity-backend` branch.
- [x] **2.2 Domain Models Implementation**:
  - Created `GuideProfile.cs`, `GuideAvailability.cs`, `TransportOption.cs`, `TransportSlot.cs`, `AttractionSlot.cs`, `Enums.cs`.
- [x] **2.3 DbContext Configuration & Migration**:
  - `CeylonMateDbContext.cs`: Configured `.IsConcurrencyToken().ValueGeneratedNever()` on all `RowVersion` properties.
  - Applied migration `20260914054750_AddCapacityAndAvailabilityModels`.
- [x] **2.4 Services & Controllers Implementation**:
  - `CapacityReservationService.cs` implementing `ReserveResourcesAsync` with optimistic concurrency checks and atomic database transactions.
  - `CapacityController.cs` & `GuideAvailabilityController.cs` endpoints.
- [x] **2.5 Local Testing & Verification**: Verified Swagger UI and query filters.
- [x] **2.6 Git Commit, Push & PR**: Merged into `main`.

---

### 🔹 Phase 3: Flutter Mobile Screens (Local Guide & Traveler)
- [x] **3.1 Git Branch Setup**: Created `m3/flutter-availability` branch.
- [x] **3.2 Guide Availability Model & Service**:
  - `GuideAvailabilitySlot.dart` and `GuideAvailabilityService.dart`.
- [x] **3.3 Screen Implementation Tasks**:
  - `MyAvailabilityScreen.dart`: Monthly calendar view with status filter chips (`All`, `Available`, `Reserved`, `Booked`, `Blocked`).
  - `AddEditAvailabilityScreen.dart`: Slot creation form with SegmentedButton, date/time pickers, and price inputs.
  - `ResourceFeasibilityView.dart`: Reusable traveler itinerary card with dynamic status chips for Guide, Transport, and Attraction resources.
- [x] **3.4 Local Testing & Verification**:
  - `widget_test.dart` updated with `MockHttpOverrides` and `FakeGuideAvailabilityService`. Passed all `flutter test` checks.
- [x] **3.5 Git Commit, Push & PR**: Merged into `main`.

---

### 🔹 Phase 4: Multi-Resource Extension & TTL Hold Logic
- [x] **4.1 Implementation Tasks**:
  - Extended `CapacityReservationService.cs` with `GetTransportAvailabilityAsync`, `AddTransportSlotAsync`, `GetAttractionAvailabilityAsync`, and `AddAttractionSlotAsync`.
  - Added `ReleaseExpiredHoldsAsync` to automatically clean up expired `RESERVED` holds (`HeldUntilUtc < DateTimeOffset.UtcNow`).
  - Added `TransportAvailabilityController.cs` and `AttractionAvailabilityController.cs`.
- [x] **4.2 Testing & Verification**: `dotnet build` succeeded with 0 warnings and 0 errors.
- [x] **4.3 Git Commit, Push & PR**: Merged into `main`.

---

### 🔹 Phase 5: Automated Concurrency & Resilience Tests
- [x] **5.1 Test Project Setup**:
  - Referenced `FluentAssertions` and `Microsoft.EntityFrameworkCore.Sqlite` in `CeylonMate.Tests.csproj`.
- [x] **5.2 Implementation Tasks**:
  - Created `GuideAvailabilityConcurrencyTests.cs` verifying `DbUpdateConcurrencyException` on simultaneous bookings with stale `RowVersion`.
  - Created `CapacityReservationServiceTests.cs` verifying valid slot creation, date range filtering, and invalid date validation (`EndTimeUtc <= StartTimeUtc`).
- [x] **5.3 Test Execution**:
  - Executed `dotnet test`: **7 / 7 tests passed**.
- [x] **5.4 Git Commit, Push & PR**: Merged into `main`.

---

### 🔹 Phase 6: Subsystem Documentation & Architecture Specification
- [x] **6.1 Documentation Tasks**:
  - Created `docs/Capacity_Subsystem_Architecture.md` detailing OCC justification, PostgreSQL implementation, TTL engine, xUnit test verification, and Flutter integration.
  - Created `Member3_Completed_Progress.md` and updated `Member3_Living_Plan.md`.
- [x] **6.2 Final Status**: All Member 3 tasks 100% completed.
