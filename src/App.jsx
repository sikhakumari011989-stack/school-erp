import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Import Components & Pages
import Sidebar from './Components/Sidebar';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';
import AccountantDashboard from './pages/AccountantDashboard';
import TrusteeDashboard from './pages/TrusteeDashboard';
import StaffDashboard from './pages/StaffDashboard';
import SystemAudit from './pages/SystemAudit'; // NEW IMPORT
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherHomework from './pages/TeacherHomework';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherClasses from './pages/TeacherClasses';
import TeacherAnalytics from './pages/TeacherAnalytics';
import TeacherPlanner from './pages/TeacherPlanner';
import StudentDashboard from './pages/StudentDashboard';
import StudentLMS from './pages/StudentLMS';
import CertificateGenerator from './pages/CertificateGenerator';
import StudentCalendar from './pages/StudentCalendar';
import StudentGallery from './pages/StudentGallery';
import StudentConduct from './pages/StudentConduct';
import StudentFees from './pages/StudentFees';
import StudentTransport from './pages/StudentTransport';
import StudentRazorpayCheckout from './pages/StudentRazorpayCheckout';

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
          <Route path="/principal/dashboard" element={<PrincipalDashboard />} />
          <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
          <Route path="/trustee/dashboard" element={<TrusteeDashboard />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/admin/audit" element={<SystemAudit />} /> {/* NEW ROUTE */}
          
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/homework" element={<TeacherHomework />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          <Route path="/teacher/planner" element={<TeacherPlanner />} />
          
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/lms" element={<StudentLMS />} />
          <Route path="/student/certificates" element={<CertificateGenerator />} />
          <Route path="/student/calendar" element={<StudentCalendar />} />
          <Route path="/student/gallery" element={<StudentGallery />} />
          <Route path="/student/conduct" element={<StudentConduct />} />
          <Route path="/student/fees" element={<StudentFees />} />
          <Route path="/student/transport" element={<StudentTransport />} />
          <Route path="/student/pay" element={<StudentRazorpayCheckout />} />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppLayout>
    </AppProvider>
  );
}