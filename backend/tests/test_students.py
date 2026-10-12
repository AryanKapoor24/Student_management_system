import pytest

VALID_STUDENT = {
    "name": "Rahul Mehta",
    "roll_no": "EC010",
    "email": "rahul@example.com",
    "branch": "ECE",
    "semester": 5,
}


# --- Create / read ----------------------------------------------------------


def test_create_student_returns_201_with_id(client):
    response = client.post("/students", json=VALID_STUDENT)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["roll_no"] == "EC010"


def test_get_student_by_id(client, create_student):
    student = create_student()

    response = client.get(f"/students/{student['id']}")

    assert response.status_code == 200
    assert response.json() == student


def test_get_missing_student_returns_404(client):
    response = client.get("/students/9999")

    assert response.status_code == 404


# --- Update / delete --------------------------------------------------------


def test_update_student(client, create_student):
    student = create_student()
    updated = {**VALID_STUDENT, "roll_no": student["roll_no"], "semester": 6}

    response = client.put(f"/students/{student['id']}", json=updated)

    assert response.status_code == 200
    assert response.json()["semester"] == 6
    assert response.json()["name"] == "Rahul Mehta"


def test_delete_student(client, create_student):
    student = create_student()

    response = client.delete(f"/students/{student['id']}")

    assert response.status_code == 204
    assert client.get(f"/students/{student['id']}").status_code == 404


# --- Validation errors ------------------------------------------------------


def test_duplicate_roll_no_is_rejected(client, create_student):
    create_student(roll_no="CS001")

    response = client.post("/students", json={**VALID_STUDENT, "roll_no": "CS001"})

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_update_cannot_steal_another_students_roll_no(client, create_student):
    create_student(roll_no="CS001")
    second = create_student(roll_no="CS002")

    response = client.put(f"/students/{second['id']}", json={**VALID_STUDENT, "roll_no": "CS001"})

    assert response.status_code == 409


def test_invalid_email_is_rejected(client):
    response = client.post("/students", json={**VALID_STUDENT, "email": "not-an-email"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "email"]


@pytest.mark.parametrize("semester", [0, 9])
def test_semester_out_of_range_is_rejected(client, semester):
    response = client.post("/students", json={**VALID_STUDENT, "semester": semester})

    assert response.status_code == 422


def test_missing_required_field_is_rejected(client):
    incomplete = {key: value for key, value in VALID_STUDENT.items() if key != "name"}

    response = client.post("/students", json=incomplete)

    assert response.status_code == 422


# --- Search and filter ------------------------------------------------------


def test_filter_students_by_branch_and_semester(client, create_student):
    create_student(roll_no="CS001", branch="CSE", semester=3)
    create_student(roll_no="CS002", branch="CSE", semester=5)
    create_student(roll_no="ME001", branch="MECH", semester=3)

    response = client.get("/students", params={"branch": "CSE", "semester": 3})

    roll_numbers = [s["roll_no"] for s in response.json()]
    assert roll_numbers == ["CS001"]


def test_search_students_by_name_or_roll_no(client, create_student):
    create_student(roll_no="CS001", name="Asha Verma")
    create_student(roll_no="CS002", name="Vikram Singh")

    by_name = client.get("/students", params={"search": "vikram"}).json()
    by_roll = client.get("/students", params={"search": "001"}).json()

    assert [s["name"] for s in by_name] == ["Vikram Singh"]
    assert [s["roll_no"] for s in by_roll] == ["CS001"]
