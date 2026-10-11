import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Import Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherHomework from './pages/TeacherHomework';
import StudentDashboard from './pages/StudentDashboard';

export default function App() {
  return (
    <AppProvider>
      <div className="flex min-h-screen bg-[#0F172A] font-sans">
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/homework" element={<TeacherHomework />} />
            
            <Route path="/student/dashboard" element={<StudentDashboard />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </AppProvider>
  );
}