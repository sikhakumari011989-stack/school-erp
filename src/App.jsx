import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importing your specific AppContext
import { AppProvider } from './context/AppContext'; 

// Import your pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentFees from './pages/StudentFees';
import Homework from './pages/Homework';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-[#0F172A]">
        {/* Do not add <BrowserRouter> here. main.jsx handles it. */}
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
    </AppProvider>
  );
}