"""Pydantic schemas: validate request bodies and shape API responses.

`...Create` schemas describe what a client sends, `...Read` schemas
describe what the API returns.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# --- Students ---------------------------------------------------------------


class StudentBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    roll_no: str = Field(min_length=1, max_length=20)
    email: EmailStr
    branch: str = Field(min_length=1, max_length=50)
    semester: int = Field(ge=1, le=8)


class StudentCreate(StudentBase):
    pass


class StudentRead(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# --- Courses ----------------------------------------------------------------


class CourseBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    credits: int = Field(ge=1, le=10)


class CourseCreate(CourseBase):
    pass


class CourseRead(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# --- Enrollments ------------------------------------------------------------


class EnrollmentCreate(BaseModel):
    course_id: int
    marks: float | None = Field(default=None, ge=0, le=100)
    attendance_percent: float | None = Field(default=None, ge=0, le=100)


class EnrollmentUpdate(BaseModel):
    """Only the fields sent by the client are changed."""

    marks: float | None = Field(default=None, ge=0, le=100)
    attendance_percent: float | None = Field(default=None, ge=0, le=100)


class EnrollmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course: CourseRead
    marks: float | None
    attendance_percent: float | None


# --- Misc -------------------------------------------------------------------


class Stats(BaseModel):
    students: int
    courses: int
    enrollments: int
