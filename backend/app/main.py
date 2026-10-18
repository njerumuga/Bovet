from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.api import api_router
from app.db.base import SessionLocal
from app.db.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and initial seed data
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
    allow_origins=["*"],
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
