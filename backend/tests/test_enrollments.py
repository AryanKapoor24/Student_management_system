def test_enroll_student_and_list_enrollments(client, create_student, create_course):
    student = create_student()
    course = create_course()

    response = client.post(
        f"/students/{student['id']}/enrollments",
        json={"course_id": course["id"], "marks": 78.5, "attendance_percent": 91},
    )

    assert response.status_code == 201
    enrollments = client.get(f"/students/{student['id']}/enrollments").json()
    assert len(enrollments) == 1
    assert enrollments[0]["course"]["code"] == "CS101"
    assert enrollments[0]["marks"] == 78.5


def test_cannot_enroll_twice_in_same_course(client, create_student, create_course):
    student = create_student()
    course = create_course()
    url = f"/students/{student['id']}/enrollments"
    client.post(url, json={"course_id": course["id"]})

    response = client.post(url, json={"course_id": course["id"]})

    assert response.status_code == 409


def test_enroll_in_missing_course_returns_404(client, create_student):
    student = create_student()

    response = client.post(f"/students/{student['id']}/enrollments", json={"course_id": 9999})

    assert response.status_code == 404


def test_update_marks_and_attendance(client, create_student, create_course):
    student = create_student()
    course = create_course()
    enrollment = client.post(
        f"/students/{student['id']}/enrollments",
        json={"course_id": course["id"], "marks": 50, "attendance_percent": 70},
    ).json()

    # Send only marks: attendance must stay unchanged (partial update)
    response = client.patch(f"/enrollments/{enrollment['id']}", json={"marks": 88})

    assert response.status_code == 200
    assert response.json()["marks"] == 88
    assert response.json()["attendance_percent"] == 70


def test_marks_above_100_are_rejected(client, create_student, create_course):
    student = create_student()
    course = create_course()
    enrollment = client.post(
        f"/students/{student['id']}/enrollments", json={"course_id": course["id"]}
    ).json()

    response = client.patch(f"/enrollments/{enrollment['id']}", json={"marks": 101})

    assert response.status_code == 422


def test_deleting_student_removes_their_enrollments(client, create_student, create_course):
    student = create_student()
    course = create_course()
    client.post(f"/students/{student['id']}/enrollments", json={"course_id": course["id"]})

    client.delete(f"/students/{student['id']}")

    assert client.get("/stats").json()["enrollments"] == 0
