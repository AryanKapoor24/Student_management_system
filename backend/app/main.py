"""FastAPI application entry point.

Run locally with:  uvicorn app.main:app --reload --env-file .env
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.database import Base, engine
from app.routers import courses, enrollments, students, system


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create tables on startup if they don't exist yet.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Student Management System API", version="1.0.0", lifespan=lifespan)

if config.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(system.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(enrollments.router)
