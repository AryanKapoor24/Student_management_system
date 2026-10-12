from sqlalchemy.exc import OperationalError

from app.database import get_db
from app.main import app


def test_health_ok_when_database_reachable(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_returns_503_when_database_down(client):
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    app.dependency_overrides[get_db] = lambda: BrokenSession()

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["database"] == "unreachable"


def test_stats_counts_records(client, create_student, create_course):
    student = create_student()
    course = create_course()
    create_student(roll_no="CS002")
    client.post(f"/students/{student['id']}/enrollments", json={"course_id": course["id"]})

    response = client.get("/stats")

    assert response.json() == {"students": 2, "courses": 1, "enrollments": 1}
