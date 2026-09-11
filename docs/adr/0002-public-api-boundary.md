# ADR 0002: Single public backend boundary

- Status: Accepted
- Date: 2026-09-10

## Decision

ASP.NET Core Web API is CeylonMate's only public backend. React and Flutter call only that API. Only ASP.NET Core accesses PostgreSQL and the internal Python AI service. The AI service does not access PostgreSQL unless a future ADR explicitly changes this decision.
