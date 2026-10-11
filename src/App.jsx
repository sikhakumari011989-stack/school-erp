import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Import Components & Pages
import Sidebar from './Components/Sidebar';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherHomework from './pages/TeacherHomework';
import TeacherAttendance from './pages/TeacherAttendance';
import StudentDashboard from './pages/StudentDashboard';
import StudentLMS from './pages/StudentLMS';
import PrincipalDashboard from './pages/PrincipalDashboard'; // NEW IMPORT

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex min-h-screen bg-[#0F172A] font-sans">
      {!isLoginPage && <Sidebar />}
      <main className="flex-1 w-full p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/principal/dashboard" element={<PrincipalDashboard />} /> {/* NEW ROUTE */}
          
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/homework" element={<TeacherHomework />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/lms" element={<StudentLMS />} />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppLayout>
    </AppProvider>
  );
}