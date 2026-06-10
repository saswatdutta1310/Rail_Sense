from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, delay, vision, sms, impact


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create all tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose of the engine
    await engine.dispose()


app = FastAPI(title="RailSense AI", version="1.0.0", lifespan=lifespan)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(delay.router)
app.include_router(vision.router)
app.include_router(sms.router)
app.include_router(impact.router)

@app.get("/")
async def root():
    return {"message": "Welcome to RailSense AI"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
