from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.api import api_router
from app.db.base import SessionLocal
from app.db.init_db import init_db
from app.core.config import settings

STATIC_DIR = Path(__file__).resolve().parents[1] / "static"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables without inserting demo data
    db = SessionLocal()
    try:
        init_db(db)
    except Exception as e:
        print(f"Database initialization error (will retry when DB is available): {e}")
    finally:
        db.close()
    yield

app = FastAPI(title="Bovet Agri Ventures API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.APP_ORIGIN.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include with /api/v1, /api prefix and root for maximum proxy compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Bovet Agri API"}

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    def serve_frontend():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{path:path}")
    def serve_frontend_route(path: str):
        if path.startswith(("api/", "api", "auth/", "auth", "health")):
            return {"detail": "Not found"}
        requested_file = STATIC_DIR / path
        if requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(STATIC_DIR / "index.html")
