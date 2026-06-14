import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .database import Base, engine
from .routers import auth, delay, impact, track, vision
from .routers.sms import router as sms_router

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Resolve the frontend dist folder
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_FRONTEND_DIST = _BACKEND_DIR.parent / "frontend" / "dist"
_HAS_FRONTEND = _FRONTEND_DIST.exists() and (_FRONTEND_DIST / "index.html").exists()

# ---------------------------------------------------------------------------
# CORS — build allowed-origins list from env + hardcoded defaults
# Supports Vercel preview URLs like rail-sense-xyz-abc.vercel.app
# ---------------------------------------------------------------------------
_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://rail-sense.vercel.app",
]

# Accept comma-separated extra origins from CORS_ORIGIN env var
_extra = os.getenv("CORS_ORIGIN", "")
for _o in _extra.split(","):
    _o = _o.strip().rstrip("/")
    if _o and _o not in _CORS_ORIGINS:
        _CORS_ORIGINS.append(_o)

# Regex to match any *.vercel.app preview URL at runtime
_VERCEL_ORIGIN_RE = re.compile(r"^https://[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$")


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    Extends the static CORS list to also accept any *.vercel.app preview URL.
    This handles Vercel branch/PR deployments without having to hardcode each URL.
    """

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        origin = request.headers.get("origin", "")
        allowed = (
            origin in _CORS_ORIGINS
            or bool(_VERCEL_ORIGIN_RE.match(origin))
        )

        if request.method == "OPTIONS" and allowed:
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "86400",
                },
            )

        response = await call_next(request)

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

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

# Standard CORSMiddleware for the known static origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic middleware for Vercel preview URLs (*.vercel.app)
app.add_middleware(DynamicCORSMiddleware)

# ---------------------------------------------------------------------------
# API routers
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
        "frontend_found": _HAS_FRONTEND,
        "cors_origins": len(_CORS_ORIGINS),
    }


# ---------------------------------------------------------------------------
# Static SPA serving — only active when frontend/dist exists
# ---------------------------------------------------------------------------
if _HAS_FRONTEND:
    _assets_dir = _FRONTEND_DIST / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    logger.info("[RailSense] Serving React SPA from %s", _FRONTEND_DIST)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = _FRONTEND_DIST / full_path
        if target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(_FRONTEND_DIST / "index.html"))

else:
    logger.warning(
        "[RailSense] Frontend dist not found at %s — API-only mode.",
        _FRONTEND_DIST,
    )

    @app.get("/", include_in_schema=False)
    async def root_api_only():
        return {
            "message": "RailSense AI API is running.",
            "docs": "/api/docs",
        }
