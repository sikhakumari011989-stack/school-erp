import React from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import ProtectedRoute from "./Components/ProtectedRoute";

// Import Components & Pages
import Sidebar from "./Components/Sidebar";
import Login, { dashboardFor, inferRoleFromCode } from "./pages/Login";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import TrusteeDashboard from "./pages/TrusteeDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AcademicCalendar from "./pages/AcademicCalendar";

import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherHomework from "./pages/TeacherHomework";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherClasses from "./pages/TeacherClasses";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import TeacherPlanner from "./pages/TeacherPlanner";
import StudentDashboard from "./pages/StudentDashboard";
import StudentHomework from "./pages/StudentHomework";
import StudentLMS from "./pages/StudentLMS";
import CertificateGenerator from "./pages/CertificateGenerator";
import StudentCalendar from "./pages/StudentCalendar";
import StudentGallery from "./pages/StudentGallery";
import StudentConduct from "./pages/StudentConduct";
import StudentFees from "./pages/StudentFees";
import StudentRazorpayCheckout from "./pages/StudentRazorpayCheckout";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PricingPolicy from "./pages/PricingPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import ContactUs from "./pages/ContactUs";
import SystemDiagnosticPage from "./pages/SystemDiagnosticPage";
import MasterSchoolSetup from "./pages/MasterSchoolSetup";
import AdmissionsCRM from "./pages/AdmissionsCRM";

import OnlineExams from "./pages/OnlineExams";
import StudentExam from "./pages/StudentExam";
import PayrollManager from "./pages/PayrollManager";
import BroadcastManager from "./pages/BroadcastManager";
import StaffMessenger from "./pages/StaffMessenger";
import ExpenseManagerPage from "./pages/ExpenseManager";
import OfflineBanner from "./Components/OfflineBanner";
import ErrorBoundary from "./Components/ErrorBoundary";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/portal",
  "/system-check",
  "/master-setup",
  "/terms",
  "/privacy",
  "/pricing-policy",
  "/refund-policy",
  "/contact",
];

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isPublicPage = PUBLIC_ROUTES.includes(location.pathname);

  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [showInstallPill, setShowInstallPill] = React.useState(true);

  // Mobile Swipe-to-Refresh & Persistent Session Auto-Router:
  // If user opens `/`, `/login`, or `/portal` while a valid session is stored in localStorage,
  // strictly bypass login and auto-route them directly to their respective dashboard.
  React.useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get("signedOut") === "true") return;

      const currentPath = location.pathname;
      if (currentPath === "/" || currentPath === "/login" || currentPath === "/portal") {
        const saved =
          localStorage.getItem("erp_session_user") ||
          localStorage.getItem("erp_demo_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.role || parsed.role_code)) {
            const dest = dashboardFor(
              parsed.role ||
                inferRoleFromCode(parsed.role_code || parsed.roll_number)
            );
            navigate(dest, { replace: true });
          }
        }
      }
    } catch (e) {
      console.warn("Session auto-route check:", e);
    }
  }, [location.pathname, location.search, navigate]);

  React.useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallPill(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } else {
      showToast("To install on iOS or mobile browser: Tap Share (or Menu 3-dots) and choose 'Add to Home Screen' 📱", "info", 6000);
    }
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans relative">
      <OfflineBanner />
      {!isPublicPage && <Sidebar />}
      <main
        className={`flex-1 h-full overflow-y-auto ${
          isPublicPage ? "p-4 sm:p-6 lg:p-8" : "p-4 sm:p-6 lg:p-8 pt-20 md:pt-8 pb-24 md:pb-8"
        }`}
      >
        {children}
      </main>

      {/* PERSISTENT SLEEK PWA INSTALL FLOATING PILL */}
      {!isInstalled && showInstallPill && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600/95 via-indigo-600/95 to-purple-600/95 backdrop-blur-xl border border-white/20 text-white px-4 py-2.5 rounded-full shadow-2xl shadow-blue-500/40 text-xs font-bold transition-all hover:scale-105">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-base">📲</span>
            <span>Install App</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
          <button
            onClick={() => setShowInstallPill(false)}
            className="text-white/60 hover:text-white ml-1 text-sm font-bold cursor-pointer"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppLayout>
          <ErrorBoundary>
            <Routes>
              {/* ENTERPRISE PORTAL AUTHENTICATION & LEGAL ROUTES */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/portal" element={<Login isDirectPortal={true} />} />
              <Route path="/system-check" element={<SystemDiagnosticPage />} />
              <Route path="/master-setup" element={<MasterSchoolSetup />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/join" element={<Navigate to="/login" replace />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/pricing-policy" element={<PricingPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/contact" element={<ContactUs />} />

            {/* SUPER ADMIN & SYSTEM AUDIT (Admin only) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/calendar"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal"]}>
                  <AcademicCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/admissions"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "accountant"]}>
                  <AdmissionsCRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/broadcasts"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal"]}>
                  <BroadcastManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "teacher", "accountant", "staff"]}>
                  <StaffMessenger />
                </ProtectedRoute>
              }
            />

            {/* HOD & PRINCIPAL / TRUSTEE SUITE */}
            <Route
              path="/trustee/dashboard"
              element={
                <ProtectedRoute allowedRoles={["trustee", "principal", "admin"]}>
                  <TrusteeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/principal/dashboard"
              element={
                <ProtectedRoute allowedRoles={["principal", "trustee", "admin"]}>
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            />

            {/* ACCOUNTANT FINANCIAL SUITE */}
            <Route
              path="/accountant/dashboard"
              element={
                <ProtectedRoute allowedRoles={["accountant", "admin", "trustee", "principal"]}>
                  <AccountantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accountant/payroll"
              element={
                <ProtectedRoute allowedRoles={["accountant", "admin", "trustee", "principal"]}>
                  <PayrollManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accountant/expenses"
              element={
                <ProtectedRoute allowedRoles={["accountant", "admin", "trustee", "principal"]}>
                  <ExpenseManagerPage />
                </ProtectedRoute>
              }
            />

            {/* OPERATIONS STAFF */}
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* FACULTY / TEACHER SUITE */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/homework"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherHomework />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/attendance"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherClasses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/analytics"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/planner"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                  <TeacherPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "trustee", "principal"]}>
                  <OnlineExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/messages"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "trustee", "principal", "accountant", "staff"]}>
                  <StaffMessenger />
                </ProtectedRoute>
              }
            />

            {/* STUDENT & PARENT SUITE */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/homework"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentHomework />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/fees"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentFees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/pay"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentRazorpayCheckout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/lms"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentLMS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <CertificateGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificate-request"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <CertificateGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/calendar"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/gallery"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentGallery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/conduct"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentConduct />
                </ProtectedRoute>
              }
            />

            {/* FALLBACK CATCH-ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </AppLayout>
      </ToastProvider>
    </AppProvider>
  );
}