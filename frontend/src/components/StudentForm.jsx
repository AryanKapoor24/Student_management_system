import { useState } from "react";
import { BRANCHES, SEMESTERS } from "../constants.js";

// Shared by "Add student" and "Edit student".
// onSubmit should return a promise; if it fails, its message is shown.
export default function StudentForm({ initial, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ ...form, semester: Number(form.semester) });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      {error && <p className="alert">{error}</p>}

      <label>
        Full name
        <input name="name" value={form.name} onChange={update} required maxLength={100} />
      </label>
      <label>
        Roll number
        <input name="roll_no" value={form.roll_no} onChange={update} required maxLength={20} />
      </label>
      <label>
        Email
        <input name="email" type="email" value={form.email} onChange={update} required />
      </label>
      <div className="form-row">
        <label>
          Branch
          <select name="branch" value={form.branch} onChange={update}>
            {BRANCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Semester
          <select name="semester" value={form.semester} onChange={update}>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
