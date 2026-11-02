from sqlalchemy.orm import Session

from app.db.base import Base, engine


def init_db(db: Session) -> None:
    """Create the database schema without inserting demo or default data."""
    Base.metadata.create_all(bind=engine)
