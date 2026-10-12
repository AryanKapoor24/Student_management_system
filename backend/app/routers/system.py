"""Operational endpoints: health check (used by the deploy job) and dashboard stats."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, Enrollment, Student
from app.schemas import Stats

router = APIRouter(tags=["system"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Return 200 only if the API is up AND the database answers a query.

    The CI/CD deploy job curls this endpoint; a 503 triggers a rollback.
    """
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": "unreachable"},
        )
    return {"status": "ok", "database": "ok"}


@router.get("/stats", response_model=Stats)
def stats(db: Session = Depends(get_db)):
    return Stats(
        students=db.scalar(select(func.count()).select_from(Student)),
        courses=db.scalar(select(func.count()).select_from(Course)),
        enrollments=db.scalar(select(func.count()).select_from(Enrollment)),
    )
