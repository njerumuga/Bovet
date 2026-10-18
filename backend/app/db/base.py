from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings

db_url = settings.DATABASE_URL
engine = None

if "sqlite" in db_url:
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        engine = create_engine(db_url)
        # Attempt simple test connection
        with engine.connect() as conn:
            pass
    except Exception as e:
        print(f"[DB Info] PostgreSQL database unavailable or driver blocked ({e}). Initializing local SQLite database for development...")
        engine = create_engine("sqlite:///./bovet.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
