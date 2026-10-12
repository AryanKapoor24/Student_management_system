import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY_COURSE = { code: "", name: "", credits: 3 };

export default function Courses() {
  const [courses, setCourses] = useState(null);
  const [form, setForm] = useState(EMPTY_COURSE);
  const [editingId, setEditingId] = useState(null); // null = adding a new course
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listCourses()
      .then(setCourses)
      .catch((err) => setError(err.message));
  }, []);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEdit(course) {
    setEditingId(course.id);
    setForm({ code: course.code, name: course.name, credits: course.credits });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_COURSE);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const data = { ...form, credits: Number(form.credits) };
    try {
      if (editingId === null) {
        const created = await api.createCourse(data);
        setCourses([...courses, created].sort((a, b) => a.code.localeCompare(b.code)));
      } else {
        const updated = await api.updateCourse(editingId, data);
        setCourses(courses.map((c) => (c.id === editingId ? updated : c)));
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`Delete ${course.code}? Students enrolled in it will be unenrolled.`)) {
      return;
    }
    try {
      await api.deleteCourse(course.id);
      setCourses(courses.filter((c) => c.id !== course.id));
      if (editingId === course.id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Courses</h1>
      </div>

      <form className="card form-inline" onSubmit={handleSubmit}>
        <input
          name="code"
          placeholder="Code (e.g. CS101)"
          value={form.code}
          onChange={update}
          required
          maxLength={20}
        />
        <input
          name="name"
          placeholder="Course name"
          value={form.name}
          onChange={update}
          required
          maxLength={100}
        />
        <label className="inline-label">
          Credits
          <input
            name="credits"
            type="number"
            min="1"
            max="10"
            value={form.credits}
            onChange={update}
            required
          />
        </label>
        <button type="submit">{editingId === null ? "+ Add course" : "Save changes"}</button>
        {editingId !== null && (
          <button type="button" className="secondary" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      {error && <p className="alert">{error}</p>}

      {courses === null ? (
        <p className="muted">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="muted">No courses yet. Add one above.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Credits</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className={course.id === editingId ? "editing" : ""}>
                  <td>
                    <strong>{course.code}</strong>
                  </td>
                  <td>{course.name}</td>
                  <td>{course.credits}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => startEdit(course)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => handleDelete(course)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
