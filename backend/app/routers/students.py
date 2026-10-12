"""CRUD endpoints for students, plus search and filtering."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.schemas import StudentCreate, StudentRead

router = APIRouter(prefix="/students", tags=["students"])


def get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def ensure_roll_no_is_free(db: Session, roll_no: str, current_id: int | None = None) -> None:
    """Raise 409 Conflict if another student already has this roll number."""
    existing = db.scalar(select(Student).where(Student.roll_no == roll_no))
    if existing is not None and existing.id != current_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Roll number {roll_no} already exists"
        )


@router.get("", response_model=list[StudentRead])
def list_students(
    branch: str | None = None,
    semester: int | None = Query(default=None, ge=1, le=8),
    search: str | None = Query(default=None, description="Matches name or roll number"),
    db: Session = Depends(get_db),
):
    query = select(Student).order_by(Student.roll_no)
    if branch:
        query = query.where(Student.branch == branch)
    if semester:
        query = query.where(Student.semester == semester)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Student.name.ilike(pattern), Student.roll_no.ilike(pattern)))
    return db.scalars(query).all()


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    ensure_roll_no_is_free(db, payload.roll_no)
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentRead)
def get_student(student_id: int, db: Session = Depends(get_db)):
    return get_student_or_404(db, student_id)


@router.put("/{student_id}", response_model=StudentRead)
def update_student(student_id: int, payload: StudentCreate, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    ensure_roll_no_is_free(db, payload.roll_no, current_id=student_id)
    for field, value in payload.model_dump().items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    db.delete(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
