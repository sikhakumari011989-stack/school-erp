import React, { useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Providers and Components
import { AppProvider, AppContext } from './context/AppContext'; 
import Sidebar from './Components/Sidebar'; 

// Import your pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentFees from './pages/StudentFees';
import Homework from './pages/Homework';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';

// We put the layout inside a child component so it can access the user data from Context
function AppContent() {
  const { user, logout } = useContext(AppContext);
  const location = useLocation();
  
  // We don't want the sidebar showing on the Login page
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      
      {/* 1. SIDEBAR RESTORED HERE */}
      {!isLoginPage && <Sidebar role={user?.role || 'student'} handleLogout={logout} />}
      
      {/* 2. MAIN CONTENT AREA (This flex-1 constraint stops the zoomed-in look) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/admin/homework" element={<Homework />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/analytics" element={<Analytics />} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/homework" element={<Homework />} />
          <Route path="/teacher/reports" element={<Reports />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/fees" element={<StudentFees />} />
          <Route path="/student/homework" element={<Homework />} />
        </Routes>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}