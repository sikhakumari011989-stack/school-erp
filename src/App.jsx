import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import TimeTable from "./pages/TimeTable";
import Notices from "./pages/Notices";
import Settings from "./pages/Settings";
import Homework from "./pages/Homework";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import StudentApp from "./pages/StudentApp";
import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendance from "./pages/StudentAttendance";
import StudentFees from "./pages/StudentFees";
import StudentTimeTable from "./pages/StudentTimeTable";
import MainLayout from "./layout/MainLayout";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/admin-dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/admin/students" element={<MainLayout><Students /></MainLayout>} />
          <Route path="/admin/classes" element={<MainLayout><Classes /></MainLayout>} />
          <Route path="/admin/attendance" element={<MainLayout><Attendance /></MainLayout>} />
          <Route path="/admin/fees" element={<MainLayout><Fees /></MainLayout>} />
          <Route path="/admin/timetable" element={<MainLayout><TimeTable /></MainLayout>} />
          <Route path="/admin/notices" element={<MainLayout><Notices /></MainLayout>} />
          <Route path="/admin/homework" element={<MainLayout><Homework /></MainLayout>} />
          <Route path="/admin/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/admin/analytics" element={<MainLayout><Analytics /></MainLayout>} />
          <Route path="/admin/settings" element={<MainLayout><Settings /></MainLayout>} />

          <Route path="/teacher-dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/teacher/homework" element={<MainLayout><Homework /></MainLayout>} />
          <Route path="/teacher/attendance" element={<MainLayout><Attendance /></MainLayout>} />
          <Route path="/teacher/notices" element={<MainLayout><Notices /></MainLayout>} />

          <Route path="/student-dashboard" element={<MainLayout><StudentDashboard /></MainLayout>} />
          <Route path="/student/homework" element={<MainLayout><StudentApp /></MainLayout>} />
          <Route path="/student/attendance" element={<MainLayout><StudentAttendance /></MainLayout>} />
          <Route path="/student/fees" element={<MainLayout><StudentFees /></MainLayout>} />
          <Route path="/student/timetable" element={<MainLayout><StudentTimeTable /></MainLayout>} />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;