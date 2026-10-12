"""Enroll students in courses and record their marks and attendance."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Enrollment
from app.routers.courses import get_course_or_404
from app.routers.students import get_student_or_404
from app.schemas import EnrollmentCreate, EnrollmentRead, EnrollmentUpdate

router = APIRouter(tags=["enrollments"])


def get_enrollment_or_404(db: Session, enrollment_id: int) -> Enrollment:
    enrollment = db.get(Enrollment, enrollment_id)
    if enrollment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    return enrollment


@router.get("/students/{student_id}/enrollments", response_model=list[EnrollmentRead])
def list_enrollments(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    return student.enrollments


@router.post(
    "/students/{student_id}/enrollments",
    response_model=EnrollmentRead,
    status_code=status.HTTP_201_CREATED,
)
def enroll_student(student_id: int, payload: EnrollmentCreate, db: Session = Depends(get_db)):
    get_student_or_404(db, student_id)
    get_course_or_404(db, payload.course_id)

    already_enrolled = db.scalar(
        select(Enrollment).where(
            Enrollment.student_id == student_id, Enrollment.course_id == payload.course_id
        )
    )
    if already_enrolled is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Student is already enrolled in this course"
        )

    enrollment = Enrollment(student_id=student_id, **payload.model_dump())
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.patch("/enrollments/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment(enrollment_id: int, payload: EnrollmentUpdate, db: Session = Depends(get_db)):
    enrollment = get_enrollment_or_404(db, enrollment_id)
    # exclude_unset: only change the fields the client actually sent
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(enrollment, field, value)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enrollment = get_enrollment_or_404(db, enrollment_id)
    db.delete(enrollment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
