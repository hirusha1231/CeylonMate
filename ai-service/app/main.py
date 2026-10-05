from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers.objective_interpretation import router as objective_router
from app.routers.destination_suitability import router as destination_suitability_router
from app.routers.feasibility import router as feasibility_router
from app.routers.itinerary_validation import router as itinerary_validation_router
from app.routers.concierge_pricing import router as concierge_pricing_router

app = FastAPI(title="CeylonMate Internal AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def handle_vercel_prefixes(request: Request, call_next):
    path = request.scope.get("path", "")
    for prefix in ("/api/index.py", "/api/index", "/api"):
        if path == prefix or path == prefix + "/":
            request.scope["path"] = "/"
            break
        elif path.startswith(prefix + "/"):
            request.scope["path"] = path[len(prefix):]
            break
    return await call_next(request)

app.include_router(objective_router)
app.include_router(destination_suitability_router)
app.include_router(feasibility_router)
app.include_router(itinerary_validation_router)
app.include_router(concierge_pricing_router)

@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return JSONResponse({
            "service": "CeylonMate AI Agentic Service",
            "status": "online",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health"
        })

    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CeylonMate AI Service</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1120; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 600px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .badge::before { content: ""; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; }
        h1 { margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
        .endpoints { background: #0f172a; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
        .endpoint { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
        .endpoint:last-child { border-bottom: none; }
        .endpoint-method { font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
        .post { background: #2563eb; color: #fff; }
        .get { background: #16a34a; color: #fff; }
        .endpoint-path { color: #cbd5e1; font-family: monospace; }
        .actions { display: flex; gap: 12px; }
        .btn { flex: 1; text-align: center; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #334155; color: #cbd5e1; }
        .btn-secondary:hover { background: #475569; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">AI Multi-Agent Service Online</div>
        <h1>CeylonMate Intelligent Travel Service</h1>
        <p>FastAPI multi-agent orchestration engine delivering autonomous objective interpretation, GIS feasibility routing, destination safety analysis, and concierge dynamic pricing.</p>
        
        <div class="endpoints">
            <div class="endpoint">
                <span class="endpoint-path">/health</span>
                <span class="endpoint-method get">GET</span>
            </div>
            <div class="endpoint">
                <span class="endpoint-path">/agent/objective-interpretation/interpret</span>
                <span class="endpoint-method post">POST</span>
            </div>
            <div class="endpoint">
                <span class="endpoint-path">/agent/destination-suitability/evaluate</span>
                <span class="endpoint-method post">POST</span>
            </div>
            <div class="endpoint">
                <span class="endpoint-path">/agent/feasibility/check</span>
                <span class="endpoint-method post">POST</span>
            </div>
            <div class="endpoint">
                <span class="endpoint-path">/agent/itinerary-validation/validate</span>
                <span class="endpoint-method post">POST</span>
            </div>
            <div class="endpoint">
                <span class="endpoint-path">/agent/concierge-pricing/synthesize</span>
                <span class="endpoint-method post">POST</span>
            </div>
        </div>

        <div class="actions">
            <a href="/docs" class="btn btn-primary">Open Swagger UI Docs</a>
            <a href="/health" class="btn btn-secondary">Health Status</a>
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
