"""Shared test fixtures.

Every test gets a fresh, empty in-memory SQLite database. We swap it in by
overriding the get_db dependency, so no PostgreSQL server is needed to run
the tests (locally or in CI).
"""

import os

# app.config requires DATABASE_URL at import time; the real engine is never
# used in tests because get_db is overridden below.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    # StaticPool keeps one shared connection, so the in-memory DB survives
    # across the sessions opened by different requests.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def create_student(client):
    """Factory: create a student through the API, overriding any field."""

    def _create(**overrides):
        payload = {
            "name": "Asha Verma",
            "roll_no": "CS001",
            "email": "asha@example.com",
            "branch": "CSE",
            "semester": 3,
        }
        payload.update(overrides)
        response = client.post("/students", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _create


@pytest.fixture()
def create_course(client):
    """Factory: create a course through the API, overriding any field."""

    def _create(**overrides):
        payload = {"code": "CS101", "name": "Data Structures", "credits": 4}
        payload.update(overrides)
        response = client.post("/courses", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _create
