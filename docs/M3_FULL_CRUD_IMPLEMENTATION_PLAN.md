# Member 3: Full CRUD & Subsystem Hardening Plan
**Project:** CeylonMate — Capacity & Availability Subsystem (Member 3)  
**Author / Subsystem Owner:** Member 3  
**Status:** APPROVED FOR LOCAL EXECUTION (STRICT NO AUTO-PUSH)  
**Target Date:** September 2026  

---

## 1. Executive Summary & Architectural Scope
මෙම සැලසුමේ අරමුණ වන්නේ දැනට පවතින **Read (GET)** සහ **Create (POST)** හැකියාවන්ට අමතරව **Update (PUT)** සහ **Delete (DELETE)** පහසුකම් Backend, Web Dashboard සහ Mobile App වෙත එක් කර පද්ධතිය 100% Full CRUD Enterprise Subsystem එකක් බවට පත් කිරීමයි.

---

## 2. Strict Operational Guardrails & Git Rules
1. **Zero Direct GitHub Push by AI**: AI සහායකයා (Antigravity) කිසිදු අවස්ථාවක remote repository එකට (`git push`) නොකළ යුතුය. සියලුම code changes local feature branch එක තුළ පමණක් සිදු විය යුතුය.
2. **Pre-Push Quality Gates (All 3 Must Pass 100%)**:
   - Backend: `dotnet test backend/CeylonMate.Tests` -> All tests pass (0 failures).
   - Web: `npm run build` inside `web/` -> 0 TypeScript & bundling errors.
   - Mobile: `flutter analyze` & `flutter test` inside `mobile/` -> 0 issues.
3. **Soft Delete vs Hard Delete Protection**:
   - දැනටමත් Bookings හෝ Active Holds (`RESERVED` / `BOOKED`) පවතින slot එකක් Hard Delete කළ නොහැක. එය `CANCELLED` හෝ `BLOCKED` තත්ත්වයට මාරු විය යුතුය.
   - කිසිදු hold එකක් නොමැති (`AVAILABLE`) slots පමණක් Hard Delete කිරීමට ඉඩ ලැබේ.
4. **Optimistic Concurrency Control (OCC) on Updates**:
   - Update (PUT) වලදී `RowVersion` token එක අනිවාර්යයෙන්ම verify විය යුතුය. Concurrent write එකකදී HTTP 409 Conflict return විය යුතුය.
5. **AI Feasibility Agent Isolation**:
   - AI Agent එක කිසිදු mutation එකක් (POST/PUT/DELETE) නොකරන අතර එය තවදුරටත් 100% Read-Only විය යුතුය.
