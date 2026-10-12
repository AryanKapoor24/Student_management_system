"""Database engine, session factory and the get_db dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL

# pool_pre_ping checks a connection is alive before using it, so the app
# recovers if PostgreSQL restarts.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session]:
    """Give each request its own session and always close it afterwards.

    Tests override this dependency to use an in-memory SQLite database.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
