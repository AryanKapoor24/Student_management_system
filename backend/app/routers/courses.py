"""CRUD endpoints for courses."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseRead

router = APIRouter(prefix="/courses", tags=["courses"])


def get_course_or_404(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def ensure_code_is_free(db: Session, code: str, current_id: int | None = None) -> None:
    """Raise 409 Conflict if another course already has this code."""
    existing = db.scalar(select(Course).where(Course.code == code))
    if existing is not None and existing.id != current_id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Course code {code} already exists")


@router.get("", response_model=list[CourseRead])
def list_courses(db: Session = Depends(get_db)):
    return db.scalars(select(Course).order_by(Course.code)).all()


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    ensure_code_is_free(db, payload.code)
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: int, db: Session = Depends(get_db)):
    return get_course_or_404(db, course_id)


@router.put("/{course_id}", response_model=CourseRead)
def update_course(course_id: int, payload: CourseCreate, db: Session = Depends(get_db)):
    course = get_course_or_404(db, course_id)
    ensure_code_is_free(db, payload.code, current_id=course_id)
    for field, value in payload.model_dump().items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = get_course_or_404(db, course_id)
    db.delete(course)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
