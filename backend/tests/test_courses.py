def test_course_crud_lifecycle(client):
    # Create
    created = client.post("/courses", json={"code": "MA201", "name": "Maths II", "credits": 3})
    assert created.status_code == 201
    course_id = created.json()["id"]

    # Read (single and list)
    assert client.get(f"/courses/{course_id}").json()["code"] == "MA201"
    assert len(client.get("/courses").json()) == 1

    # Update
    updated = client.put(
        f"/courses/{course_id}",
        json={"code": "MA201", "name": "Engineering Maths II", "credits": 4},
    )
    assert updated.status_code == 200
    assert updated.json()["credits"] == 4

    # Delete
    assert client.delete(f"/courses/{course_id}").status_code == 204
    assert client.get(f"/courses/{course_id}").status_code == 404


def test_duplicate_course_code_is_rejected(client, create_course):
    create_course(code="CS101")

    response = client.post("/courses", json={"code": "CS101", "name": "Other", "credits": 2})

    assert response.status_code == 409


def test_invalid_credits_are_rejected(client):
    response = client.post("/courses", json={"code": "CS999", "name": "Bad", "credits": 0})

    assert response.status_code == 422
