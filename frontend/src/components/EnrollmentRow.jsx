import { useState } from "react";
import { MIN_ATTENDANCE } from "../constants.js";

// One row of the enrollments table, with editable marks and attendance.
export default function EnrollmentRow({ enrollment, onSave, onRemove }) {
  const [marks, setMarks] = useState(enrollment.marks ?? "");
  const [attendance, setAttendance] = useState(enrollment.attendance_percent ?? "");
  const [status, setStatus] = useState(""); // "", "saving", "saved" or an error message

  const changed =
    String(marks) !== String(enrollment.marks ?? "") ||
    String(attendance) !== String(enrollment.attendance_percent ?? "");
  const lowAttendance = attendance !== "" && Number(attendance) < MIN_ATTENDANCE;

  async function save() {
    setStatus("saving");
    try {
      await onSave(enrollment.id, {
        marks: marks === "" ? null : Number(marks),
        attendance_percent: attendance === "" ? null : Number(attendance),
      });
      setStatus("saved");
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <tr>
      <td>
        <strong>{enrollment.course.code}</strong> {enrollment.course.name}
      </td>
      <td>{enrollment.course.credits}</td>
      <td>
        <input
          className="cell-input"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
        />
      </td>
      <td>
        <input
          className={`cell-input ${lowAttendance ? "low" : ""}`}
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={attendance}
          onChange={(e) => setAttendance(e.target.value)}
          title={lowAttendance ? `Below ${MIN_ATTENDANCE}% attendance` : undefined}
        />
      </td>
      <td className="row-actions">
        <button className="small" onClick={save} disabled={!changed || status === "saving"}>
          Save
        </button>
        <button className="link danger" onClick={() => onRemove(enrollment)}>
          Remove
        </button>
        {status === "saved" && !changed && <span className="muted">✓ Saved</span>}
        {status && !["saving", "saved"].includes(status) && (
          <span className="error-text">{status}</span>
        )}
      </td>
    </tr>
  );
}
