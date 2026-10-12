// All calls to the backend go through this file.
// VITE_API_URL is set at build time (see .env.example); it defaults to "/api".
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Turn FastAPI's error body into a readable message.
// 409/404 send { detail: "text" }, 422 sends { detail: [{ loc, msg }, ...] }.
function errorMessage(body, status) {
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((err) => `${err.loc.at(-1)}: ${err.msg}`).join("; ");
  }
  return `Request failed (HTTP ${status})`;
}

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(data, response.status));
  return data;
}

// Build "?branch=CSE&semester=3", skipping empty filters.
function queryString(params) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  );
  return query.size ? `?${query}` : "";
}

export const api = {
  health: () => request("/health"),
  stats: () => request("/stats"),

  listStudents: (filters = {}) => request(`/students${queryString(filters)}`),
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (student) => request("/students", { method: "POST", body: student }),
  updateStudent: (id, student) => request(`/students/${id}`, { method: "PUT", body: student }),
  deleteStudent: (id) => request(`/students/${id}`, { method: "DELETE" }),

  listCourses: () => request("/courses"),
  createCourse: (course) => request("/courses", { method: "POST", body: course }),
  updateCourse: (id, course) => request(`/courses/${id}`, { method: "PUT", body: course }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: "DELETE" }),

  listEnrollments: (studentId) => request(`/students/${studentId}/enrollments`),
  enroll: (studentId, enrollment) =>
    request(`/students/${studentId}/enrollments`, { method: "POST", body: enrollment }),
  updateEnrollment: (id, changes) => request(`/enrollments/${id}`, { method: "PATCH", body: changes }),
  deleteEnrollment: (id) => request(`/enrollments/${id}`, { method: "DELETE" }),
};
