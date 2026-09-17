from fastapi import FastAPI
from app.routers.objective_interpretation import router as objective_router

app = FastAPI(title="CeylonMate Internal AI Service")
app.include_router(objective_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
