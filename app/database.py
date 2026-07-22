"""SQLite database setup with SQLAlchemy."""

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Store database next to the app, in user's home by default
DB_DIR = Path.home() / ".schedule-planner"
DB_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("SCHEDULE_DB_URL", f"sqlite:///{DB_DIR}/schedule.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Enable SQLite foreign key support on every connection
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call once at startup."""
    Base.metadata.create_all(bind=engine)
