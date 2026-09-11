from fastapi import FastAPI

app = FastAPI(title="CeylonMate Internal AI Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
