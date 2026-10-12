import { NavLink, Route, Routes } from "react-router";
import Courses from "./pages/Courses.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import StudentDetail from "./pages/StudentDetail.jsx";
import StudentFormPage from "./pages/StudentFormPage.jsx";
import Students from "./pages/Students.jsx";

export default function App() {
  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <span className="brand">🎓 Student Management</span>
          <nav>
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/students">Students</NavLink>
            <NavLink to="/courses">Courses</NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/new" element={<StudentFormPage />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/students/:id/edit" element={<StudentFormPage />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
