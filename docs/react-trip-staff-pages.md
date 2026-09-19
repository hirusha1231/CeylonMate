# React trip request staff pages

Files: `web/src/features/trips/types.ts`, `api.ts`, `TripRequestsPage.tsx`,
`TripDetailsPage.tsx`; integration in `web/src/App.tsx`,
`web/src/components/AppLayout.tsx`, and `web/src/styles.css`.

Run from `web`: `npm install`, then `npm run dev`. Set `VITE_API_BASE_URL`
in `web/.env.local` to the running ASP.NET API origin if needed. Log in as
TRAVEL_AGENT or ADMIN and open `/staff/trips`.

Manual tests:

1. Confirm TRAVEL_AGENT and ADMIN see Trip requests navigation. Confirm CAPACITY_OFFICER cannot open `/staff/trips` directly.
2. Confirm table rows open `/staff/trips/{id}` and details match the API response.
3. Search by exact traveler UUID and partial objective; verify a malformed UUID shows validation.
4. Filter by status and start-date range; verify a reversed range shows validation. Clear filters.
5. Create more than 20 matching requests, then use Next/Previous; verify loading, empty and API-error states.
6. Check workflow section: ID/status appear only if the API returns `workflowExecution`; otherwise the unavailable-data message appears. There are no approval controls.

Current API limitations: `GET /api/trips` supports travelerId, status and
pagination, but not objective/date queries. The UI fetches all server-filtered
pages for objective/date filtering, then paginates locally. Traveler search is
by exact UUID, not traveler name. The current trip DTO does not contain workflow
execution ID/status, so those values cannot be shown until the shared API adds
them.
