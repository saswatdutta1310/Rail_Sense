from fastapi import FastAPI

app = FastAPI(title="RailSense AI", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Welcome to RailSense AI"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
