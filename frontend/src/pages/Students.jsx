import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";
import { BRANCHES, SEMESTERS } from "../constants.js";

export default function Students() {
  const [filters, setFilters] = useState({ search: "", branch: "", semester: "" });
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");

  // Reload the list whenever a filter changes.
  useEffect(() => {
    let ignore = false; // drop responses from older, slower requests
    api
      .listStudents(filters)
      .then((data) => {
        if (!ignore) {
          setStudents(data);
          setError("");
        }
      })
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [filters]);

  function updateFilter(event) {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  }

  async function handleDelete(student) {
    if (!window.confirm(`Delete ${student.name} (${student.roll_no})?`)) return;
    try {
      await api.deleteStudent(student.id);
      setStudents(students.filter((s) => s.id !== student.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Students</h1>
        <Link className="button" to="/students/new">
          + Add student
        </Link>
      </div>

      <div className="card filters">
        <input
          name="search"
          type="search"
          placeholder="Search by name or roll no…"
          value={filters.search}
          onChange={updateFilter}
        />
        <select name="branch" value={filters.branch} onChange={updateFilter}>
          <option value="">All branches</option>
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select name="semester" value={filters.semester} onChange={updateFilter}>
          <option value="">All semesters</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="alert">{error}</p>}

      {students === null ? (
        <p className="muted">Loading…</p>
      ) : students.length === 0 ? (
        <p className="muted">No students found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll no</th>
                <th>Name</th>
                <th>Email</th>
                <th>Branch</th>
                <th>Sem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.roll_no}</td>
                  <td>
                    <Link to={`/students/${student.id}`}>{student.name}</Link>
                  </td>
                  <td>{student.email}</td>
                  <td>{student.branch}</td>
                  <td>{student.semester}</td>
                  <td className="row-actions">
                    <Link to={`/students/${student.id}/edit`}>Edit</Link>
                    <button className="link danger" onClick={() => handleDelete(student)}>
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
