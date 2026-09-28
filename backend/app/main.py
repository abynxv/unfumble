"""
FastAPI application entry point.

HOW FASTAPI WORKS:
FastAPI is a modern, high-performance Python web framework built on top of:
- Starlette (for the async web server and routing)
- Pydantic (for data validation and serialization)

Key concepts demonstrated here:
1. CORS middleware — allows the React frontend (on a different port/domain)
   to make API calls to this backend.
2. Router inclusion — organizes endpoints into logical groups.
3. Lifespan events — run setup/teardown code when the app starts/stops.
4. /docs — FastAPI auto-generates interactive API docs from our type hints.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import admin, generations
from app.core.config import get_settings

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.

    WHY LIFESPAN:
    This runs code at startup (before the 'yield') and shutdown (after the 'yield').
    It's the recommended way to handle initialization and cleanup in modern FastAPI.

    The older @app.on_event("startup") / @app.on_event("shutdown") decorators
    are deprecated in favor of this lifespan context manager.
    """
    # ─── Startup ───
    logger.info("🚀 AI Profile Studio backend starting up...")
    logger.info(f"   Environment: {settings.app_env}")
    logger.info(f"   HF Model: {settings.huggingface_model_id}")
    logger.info(f"   Admin emails: {len(settings.admin_email_list)} configured")

    yield  # Application runs here

    # ─── Shutdown ───
    logger.info("👋 AI Profile Studio backend shutting down...")


# Create the FastAPI application
app = FastAPI(
    title="AI Profile Studio",
    description=(
        "Generate professional LinkedIn-style profile pictures from your photos "
        "using AI. Upload a portrait, choose a style, and get a professional headshot."
    ),
    version="1.0.0",
    lifespan=lifespan,
    # These URLs are where the auto-generated API docs are served
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc",    # ReDoc
)

# ─── CORS Middleware ────────────────────────────────────────────
# WHY CORS:
# The React frontend runs on http://localhost:5173 (Vite dev server).
# The FastAPI backend runs on http://localhost:8000.
# Browsers block cross-origin requests by default (Same-Origin Policy).
# CORS middleware tells the browser "yes, these origins are allowed to call me."
#
# In production, replace ["*"] with your actual frontend domain(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include API Routers ───────────────────────────────────────
# Routers group related endpoints under a common prefix.
# The /api/v1 prefix enables API versioning — if we ever need breaking changes,
# we create /api/v2 without disrupting existing clients.
app.include_router(generations.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


# ─── Health Check ──────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Simple health check endpoint.

    WHY: Deployment platforms (Render, Railway, etc.) use health checks
    to verify the app is running. If this endpoint returns 200,
    the platform knows the service is alive.
    """
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — useful for quick browser verification."""
    return {
        "app": "AI Profile Studio",
        "version": "1.0.0",
        "docs": "/docs",
    }
