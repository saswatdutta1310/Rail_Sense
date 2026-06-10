from fastapi import FastAPI
from .routers import auth, delay, vision

app = FastAPI(title="RailSense AI", version="1.0.0")

app.include_router(auth.router)
app.include_router(delay.router)
app.include_router(vision.router)

@app.get("/")
async def root():
    return {"message": "Welcome to RailSense AI"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
