"""FastAPI application for Claude Computer Use Demo."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes import chat, config

# Load .env file from project root (before accessing env vars)
load_dotenv()

# Set default screen dimensions if not provided (required by computer tools)
# These match the Docker container defaults
if not os.environ.get("WIDTH"):
    os.environ["WIDTH"] = "1024"
if not os.environ.get("HEIGHT"):
    os.environ["HEIGHT"] = "768"
if not os.environ.get("DISPLAY_NUM"):
    os.environ["DISPLAY_NUM"] = "1"

app = FastAPI(
    title="Claude Computer Use Demo API",
    description="API for interacting with Claude's computer use capabilities",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(config.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Serve static frontend files
# Check multiple possible locations for frontend build
POSSIBLE_FRONTEND_DIRS = [
    Path(__file__).parent.parent.parent
    / "frontend"
    / "dist",  # Development (relative to project)
    Path.home() / "frontend" / "dist",  # Docker container
]

FRONTEND_BUILD_DIR = None
for dir_path in POSSIBLE_FRONTEND_DIRS:
    if dir_path.exists() and (dir_path / "index.html").exists():
        FRONTEND_BUILD_DIR = dir_path
        break

if FRONTEND_BUILD_DIR is not None:
    _frontend_dir: Path = FRONTEND_BUILD_DIR  # Type-safe reference for closures

    # Mount static assets first (with higher priority)
    assets_dir = _frontend_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve other static files
    @app.get("/vite.svg")
    async def serve_vite_svg():
        svg_path = _frontend_dir / "vite.svg"
        if svg_path.exists():
            return FileResponse(svg_path)
        return {"error": "Not found"}

    # Serve index.html for all non-API routes (SPA support)
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the SPA for all non-API routes."""
        # Don't interfere with API routes
        if full_path.startswith("api/"):
            return {"error": "Not found"}

        # Try to serve the requested file first
        file_path = _frontend_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Fall back to index.html for SPA routing
        return FileResponse(_frontend_dir / "index.html")


def main():
    """Run the FastAPI server."""
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "computer_use_demo.api.main:app",
        host=host,
        port=port,
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )


if __name__ == "__main__":
    main()
