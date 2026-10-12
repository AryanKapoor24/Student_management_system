import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api.js";
import StudentForm from "../components/StudentForm.jsx";
import { EMPTY_STUDENT } from "../constants.js";

// Handles both /students/new (add) and /students/:id/edit (edit).
export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api
      .getStudent(id)
      .then(setStudent)
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  async function save(data) {
    const saved = isEdit ? await api.updateStudent(id, data) : await api.createStudent(data);
    navigate(`/students/${saved.id}`);
  }

  // When editing, wait until the right student has loaded before showing the form.
  const loaded = !isEdit || String(student?.id) === id;

  return (
    <>
      <div className="page-header">
        <h1>{isEdit ? "Edit student" : "Add student"}</h1>
        <Link to={isEdit ? `/students/${id}` : "/students"}>← Back</Link>
      </div>

      {error ? (
        <p className="alert">{error}</p>
      ) : !loaded ? (
        <p className="muted">Loading…</p>
      ) : (
        <StudentForm
          key={id ?? "new"}
          initial={isEdit ? student : EMPTY_STUDENT}
          onSubmit={save}
          submitLabel={isEdit ? "Save changes" : "Add student"}
        />
      )}
    </>
  );
}
