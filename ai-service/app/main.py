from fastapi import FastAPI
from app.routers.objective_interpretation import router as objective_router
from app.routers.destination_suitability import router as destination_suitability_router
from app.routers.feasibility import router as feasibility_router

app = FastAPI(title="CeylonMate Internal AI Service")
app.include_router(objective_router)
app.include_router(destination_suitability_router)
app.include_router(feasibility_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
