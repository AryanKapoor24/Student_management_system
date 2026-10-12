import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api.js";
import EnrollmentRow from "../components/EnrollmentRow.jsx";
import { MIN_ATTENDANCE } from "../constants.js";

// Empty input -> null (not recorded yet), otherwise a number.
const toNumberOrNull = (value) => (value === "" ? null : Number(value));

function average(values) {
  const recorded = values.filter((v) => v !== null);
  if (recorded.length === 0) return null;
  return recorded.reduce((sum, v) => sum + v, 0) / recorded.length;
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newEnrollment, setNewEnrollment] = useState({
    course_id: "",
    marks: "",
    attendance_percent: "",
  });
  const [error, setError] = useState("");

  // Load the student, their enrollments and all courses in parallel.
  useEffect(() => {
    Promise.all([api.getStudent(id), api.listEnrollments(id), api.listCourses()])
      .then(([studentData, enrollmentData, courseData]) => {
        setStudent(studentData);
        setEnrollments(enrollmentData);
        setCourses(courseData);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const enrolledIds = new Set(enrollments.map((e) => e.course.id));
  const availableCourses = courses.filter((c) => !enrolledIds.has(c.id));
  const avgMarks = average(enrollments.map((e) => e.marks));
  const avgAttendance = average(enrollments.map((e) => e.attendance_percent));

  async function handleEnroll(event) {
    event.preventDefault();
    setError("");
    try {
      const created = await api.enroll(id, {
        course_id: Number(newEnrollment.course_id),
        marks: toNumberOrNull(newEnrollment.marks),
        attendance_percent: toNumberOrNull(newEnrollment.attendance_percent),
      });
      setEnrollments([...enrollments, created]);
      setNewEnrollment({ course_id: "", marks: "", attendance_percent: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(enrollmentId, changes) {
    const updated = await api.updateEnrollment(enrollmentId, changes);
    setEnrollments(enrollments.map((e) => (e.id === enrollmentId ? updated : e)));
  }

  async function handleRemove(enrollment) {
    if (!window.confirm(`Remove ${student.name} from ${enrollment.course.code}?`)) return;
    try {
      await api.deleteEnrollment(enrollment.id);
      setEnrollments(enrollments.filter((e) => e.id !== enrollment.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStudent() {
    if (!window.confirm(`Delete ${student.name} and all their enrollments?`)) return;
    try {
      await api.deleteStudent(student.id);
      navigate("/students");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!student) {
    return error ? <p className="alert">{error}</p> : <p className="muted">Loading…</p>;
  }

  return (
    <>
      <div className="page-header">
        <h1>{student.name}</h1>
        <div className="actions">
          <Link className="button secondary" to={`/students/${student.id}/edit`}>
            Edit
          </Link>
          <button className="danger" onClick={handleDeleteStudent}>
            Delete
          </button>
        </div>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="card details">
        <div>
          <span className="muted">Roll no</span> {student.roll_no}
        </div>
        <div>
          <span className="muted">Email</span> {student.email}
        </div>
        <div>
          <span className="muted">Branch</span> {student.branch}
        </div>
        <div>
          <span className="muted">Semester</span> {student.semester}
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-value">{enrollments.length}</span>
          <span className="stat-label">Courses</span>
        </div>
        <div className="card stat-card">
          <span className="stat-value">{avgMarks === null ? "–" : avgMarks.toFixed(1)}</span>
          <span className="stat-label">Average marks</span>
        </div>
        <div className="card stat-card">
          <span
            className={`stat-value ${avgAttendance !== null && avgAttendance < MIN_ATTENDANCE ? "low" : ""}`}
          >
            {avgAttendance === null ? "–" : `${avgAttendance.toFixed(1)}%`}
          </span>
          <span className="stat-label">Average attendance</span>
        </div>
      </div>

      <h2>Enrollments</h2>
      {enrollments.length === 0 ? (
        <p className="muted">Not enrolled in any course yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Credits</th>
                <th>Marks (0–100)</th>
                <th>Attendance %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <EnrollmentRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  onSave={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Enroll in a course</h2>
      {availableCourses.length === 0 ? (
        <p className="muted">
          No more courses available. <Link to="/courses">Add a course</Link>
        </p>
      ) : (
        <form className="card form-inline" onSubmit={handleEnroll}>
          <select
            required
            value={newEnrollment.course_id}
            onChange={(e) => setNewEnrollment({ ...newEnrollment, course_id: e.target.value })}
          >
            <option value="">Choose a course…</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder="Marks"
            value={newEnrollment.marks}
            onChange={(e) => setNewEnrollment({ ...newEnrollment, marks: e.target.value })}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder="Attendance %"
            value={newEnrollment.attendance_percent}
            onChange={(e) =>
              setNewEnrollment({ ...newEnrollment, attendance_percent: e.target.value })
            }
          />
          <button type="submit">Enroll</button>
        </form>
      )}
    </>
  );
}
