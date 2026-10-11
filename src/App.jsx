import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      <Router>
        {/* If you have a Sidebar or Layout component, it typically wraps the Routes here */}
        <div className="flex min-h-screen bg-[#0F172A] font-sans">
          
          <main className="flex-1 w-full">
            <Routes>
              {/* Default Redirect to Login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Authentication */}
              <Route path="/login" element={<Login />} />
              
              {/* Admin Portal */}
              <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
              
              {/* Teacher Portal */}
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/homework" element={<TeacherHomework />} />
              
              {/* Student Portal */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              
              {/* 
                Keep your existing routes for student fees, etc., down here if you have them in separate files.
                Example: <Route path="/student/fees" element={<StudentFees />} /> 
              */}

              {/* Catch-all 404: Send back to login if route doesn't exist */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>

        </div>
      </Router>
    </AppProvider>
  );
}