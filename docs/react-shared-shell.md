# React staff shell

## Files and dependencies

- `web/src/main.tsx` and `web/src/App.tsx`: app entry and protected routes.
- `web/src/api/client.ts`: Axios instance, in-memory bearer token, 401 handling.
- `web/src/auth/types.ts`: API login/user types and staff roles.
- `web/src/auth/AuthProvider.tsx`: login state and `/api/auth/me` verification.
- `web/src/auth/RequireAuth.tsx`: authentication and role guard.
- `web/src/pages/LoginPage.tsx`: login form and validation/error state.
- `web/src/pages/StaffPage.tsx`: staff-only empty-state placeholders, not business pages.
- `web/src/components/AppLayout.tsx`: role-based navigation and logout.
- `web/src/styles.css` and `web/index.html`: responsive shell styling and HTML entry.
- `web/vite.config.ts`: development `/api` proxy to ASP.NET Core.
- `web/package.json` and `web/package-lock.json`: `axios` and `react-router` dependencies.

The shell uses the existing `POST /api/auth/login` and `GET /api/auth/me` endpoints. It accepts `CAPACITY_OFFICER`, `TRAVEL_AGENT`, and `ADMIN` on `/staff`; direct visits to role-specific pages are checked again. The API remains the authorization authority.

The JWT is held **only in memory**, not `localStorage` or `sessionStorage`. Refreshing the page requires signing in again because the backend does not offer a refresh-token flow. A `401` clears the session. Use HTTPS in deployed environments.

## Run

From the repository root, in separate PowerShell terminals:

```powershell
# API: configure ConnectionStrings__CeylonMate and Jwt__SigningKey first.
dotnet run --project backend/CeylonMate.Api
```

```powershell
Set-Location web
npm.cmd ci
npm.cmd run dev
```

Open the Vite URL (usually `http://localhost:5173`). The development proxy sends `/api` requests to `http://localhost:5084`; override with `API_PROXY_TARGET` if needed. For production, set `VITE_API_BASE_URL` to the HTTPS API origin or reverse-proxy `/api` on the same origin and configure CORS as appropriate.

## Manual checks

1. Open `/staff` while signed out: it redirects to `/login`. Invalid/blank credentials show validation or API errors; a stopped API shows the unavailable state.
2. Sign in as `CAPACITY_OFFICER`: `/staff` and `/staff/capacity` work. Agent/admin links are absent, and direct access is denied.
3. Sign in as `TRAVEL_AGENT`: `/staff` and `/staff/agents` work. Capacity/admin links are absent.
4. Sign in as `ADMIN`: all staff navigation links are visible. Placeholder pages show their empty state.
5. Sign in as `TRAVELER` or `LOCAL_GUIDE`: staff access is denied, with a logout action.
6. Log out and try browser Back or a direct staff URL: protected content stays inaccessible. Refresh after login: sign-in is required again.

Build check: `npm.cmd run build`.
