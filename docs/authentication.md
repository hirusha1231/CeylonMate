# Shared authentication foundation

## 1. Configure local secrets

Configuration keys are shown in `.env.example`; ASP.NET Core reads the double-underscore names from environment variables. In PowerShell:

```powershell
$env:ConnectionStrings__CeylonMate='Host=localhost;Port=5432;Database=ceylonmate;Username=postgres;Password=YOUR_PASSWORD'
$env:Jwt__SigningKey='REPLACE_WITH_AT_LEAST_32_RANDOM_BYTES'
```

Swagger test: run `dotnet run --project backend/CeylonMate.Api`, open `http://localhost:5084/swagger`, and confirm the three `/api/auth` operations appear.

## 2. Apply the PostgreSQL migration

```powershell
dotnet ef database update --project backend/CeylonMate.Api --startup-project backend/CeylonMate.Api
```

Swagger test: execute `POST /api/auth/register` with:

```json
{
  "email": "traveler@example.com",
  "password": "StrongPassword!123",
  "role": "TRAVELER"
}
```

Expected: `201 Created`. Repeating the request (email matching is case-insensitive) returns `409 Conflict`. Invalid email, a password shorter than 12 characters, an unknown role, or self-registration as `ADMIN`/`CAPACITY_OFFICER` returns `400 Bad Request`.

## 3. Login and authorize Swagger

Execute `POST /api/auth/login` with:

```json
{
  "email": "traveler@example.com",
  "password": "StrongPassword!123"
}
```

Swagger test: expect `200 OK`, copy `accessToken`, select **Authorize**, and paste the token. A wrong email or password returns `401 Unauthorized`.

## 4. Read the authenticated user

Swagger test: with Swagger authorized, execute `GET /api/auth/me`. Expect `200 OK` with `id`, `email`, and `role`. Remove the bearer token and retry; expect `401 Unauthorized`.

The JWT includes the standard role claim. Future endpoints can use `[Authorize(Roles = "ADMIN")]` or one of the registered policies, for example `[Authorize(Policy = "RequireADMIN")]`.

## 5. Optional Development-only users

Set these variables only for local development:

```powershell
$env:SeedUsers__Enabled='true'
$env:SeedUsers__Password='LocalSeedPassword!123'
dotnet run --project backend/CeylonMate.Api
```

The Development environment applies pending migrations and idempotently creates:

- `traveler@local.ceylonmate`
- `local_guide@local.ceylonmate`
- `capacity_officer@local.ceylonmate`
- `travel_agent@local.ceylonmate`
- `admin@local.ceylonmate`

Swagger test: log in as any listed user with the configured local seed password, authorize with its token, then call `GET /api/auth/me` and verify its role. Seeding is not registered or executed outside Development.
