import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [healthy, setHealthy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((err) => setError(err.message));
    api
      .health()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className={`badge ${healthy ? "badge-ok" : healthy === false ? "badge-bad" : ""}`}>
          API {healthy === null ? "checking…" : healthy ? "healthy" : "unreachable"}
        </span>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="stat-grid">
        <StatCard label="Students" value={stats?.students} to="/students" />
        <StatCard label="Courses" value={stats?.courses} to="/courses" />
        <StatCard label="Enrollments" value={stats?.enrollments} />
      </div>

      <div className="actions">
        <Link className="button" to="/students/new">
          + Add student
        </Link>
        <Link className="button secondary" to="/courses">
          Manage courses
        </Link>
      </div>
    </>
  );
}

function StatCard({ label, value, to }) {
  const content = (
    <>
      <span className="stat-value">{value ?? "–"}</span>
      <span className="stat-label">{label}</span>
    </>
  );
  return to ? (
    <Link className="card stat-card" to={to}>
      {content}
    </Link>
  ) : (
    <div className="card stat-card">{content}</div>
  );
}
