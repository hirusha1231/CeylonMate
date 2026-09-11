# ADR 0001: Internal AI orchestration framework

- Status: Accepted
- Date: 2026-09-10

## Context

CeylonMate needs agentic workflows while preserving ASP.NET Core Web API as its only public backend. AI orchestration must remain internal and independently testable.

## Decision

Use Python FastAPI with LangGraph for the internal AI service. ASP.NET Core is the sole caller of this service. React and Flutter never call it directly. The service is not publicly exposed in production.

FastAPI provides a small typed HTTP boundary around Python's AI ecosystem. LangGraph provides explicit, stateful workflow graphs suitable for agent orchestration and human-in-the-loop extensions.

## Consequences

- The team owns a private HTTP contract between ASP.NET Core and Python.
- Authentication, authorization, validation, and public API composition remain in ASP.NET Core.
- Deployment must restrict AI-service network access to the backend.
- Additional operational monitoring is required for a second runtime.
