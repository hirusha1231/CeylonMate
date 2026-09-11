# CeylonMate

Clean monorepo scaffold for the SE3090 agentic Sri Lanka travel-planning project. No business features are implemented.

## Architecture guardrails

- ASP.NET Core Web API is the only public backend.
- ASP.NET Core uses EF Core with PostgreSQL.
- React and Flutter call only ASP.NET Core—never PostgreSQL or the internal AI service.
- FastAPI + LangGraph is the internal AI framework; see [ADR 0001](docs/adr/0001-ai-service-framework.md).

## Recreate from an empty folder (Windows PowerShell)

Prerequisites: Git, .NET 8 SDK, Node.js 22+, Flutter stable, Python 3.11+, and PostgreSQL. Use `npm.cmd` because some Windows policies block the PowerShell npm shim.

```powershell
dotnet new sln -n CeylonMate
dotnet new webapi -n CeylonMate.Api -o backend/CeylonMate.Api --framework net8.0 --no-https
dotnet new xunit -n CeylonMate.Tests -o backend/CeylonMate.Tests --framework net8.0
dotnet sln CeylonMate.sln add backend/CeylonMate.Api/CeylonMate.Api.csproj backend/CeylonMate.Tests/CeylonMate.Tests.csproj
dotnet add backend/CeylonMate.Tests/CeylonMate.Tests.csproj reference backend/CeylonMate.Api/CeylonMate.Api.csproj
npm.cmd create vite@latest web -- --template react-ts
flutter create --project-name ceylonmate_mobile mobile
New-Item -ItemType Directory -Force ai-service, docs/adr, docs/diagrams, docs/ai-logs, docs/evidence, .github/workflows
py -3.12 -m venv ai-service/.venv
```

Add the tracked source and configuration files from this scaffold after running those generator commands. The generator commands establish the exact directory layout; the committed files define the architectural baseline.

## Prove each application runs

Run each command in a separate PowerShell terminal from the repository root:

```powershell
dotnet run --project backend/CeylonMate.Api
npm.cmd --prefix web install; npm.cmd --prefix web run dev
Set-Location mobile; flutter create . --project-name ceylonmate_mobile; flutter run
Set-Location ai-service; py -3.12 -m venv .venv; .venv\Scripts\python.exe -m pip install -e .; .venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The API health endpoint is `/health`; the internal AI health endpoint is also `/health` on its private service port.

