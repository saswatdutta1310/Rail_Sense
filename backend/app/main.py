import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import auth, delay, impact, track, vision
from .routers.sms import router as sms_router

# ---------------------------------------------------------------------------
# Resolve the frontend dist folder (evaluated fresh every server start)
#
# Project layout:
#   Rail_Sense-main/
#     backend/
#       app/main.py   ← this file
#     frontend/
#       dist/         ← React build output
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent   # .../backend
_FRONTEND_DIST = _BACKEND_DIR.parent / "frontend" / "dist"
_HAS_FRONTEND = _FRONTEND_DIST.exists() and (_FRONTEND_DIST / "index.html").exists()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="RailSense AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — permits the Vite dev server (:5173) when developing separately
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API routers — always mounted regardless of frontend presence
# ---------------------------------------------------------------------------
app.include_router(sms_router, prefix="/api/sms", tags=["sms"])
app.include_router(auth.router)
app.include_router(delay.router)
app.include_router(vision.router)
app.include_router(impact.router)
app.include_router(track.router, prefix="/api/track", tags=["Track Inspector"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "mode": "unified" if _HAS_FRONTEND else "api-only",
        "frontend_dist": str(_FRONTEND_DIST),
        "frontend_found": _HAS_FRONTEND,
    }


# ---------------------------------------------------------------------------
# Static file + SPA serving — only active when dist/ exists
# ---------------------------------------------------------------------------
if _HAS_FRONTEND:
    # Serve the /assets directory (hashed JS/CSS bundles)
    _assets_dir = _FRONTEND_DIST / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    print(f"[RailSense] ✓ Serving React SPA from {_FRONTEND_DIST}")

    # Catch-all — must be the LAST route registered
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Serve real files (favicon.ico, manifest.json, vite.svg …)
        target = _FRONTEND_DIST / full_path
        if target.is_file():
            return FileResponse(str(target))
        # All other paths → React Router handles routing client-side
        return FileResponse(str(_FRONTEND_DIST / "index.html"))

else:
    print(
        f"[RailSense] ⚠ Frontend dist not found at {_FRONTEND_DIST}. "
        "Run  npm run build  inside /frontend  to enable unified mode."
    )

    @app.get("/", include_in_schema=False)
    async def root_api_only():
        return {
            "message": "RailSense AI API is running.",
            "hint": "Run `npm run build` inside /frontend then restart the server.",
            "docs": "/api/docs",
        }
