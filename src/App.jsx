import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./Components/ProtectedRoute";

// Import Components & Pages
import Sidebar from "./Components/Sidebar";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import TrusteeDashboard from "./pages/TrusteeDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import SystemAudit from "./pages/SystemAudit";
import InstitutionalDirectory from "./pages/InstitutionalDirectory";
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
import StudentTransport from "./pages/StudentTransport";
import StudentRazorpayCheckout from "./pages/StudentRazorpayCheckout";
import RegisterInstitution from "./pages/RegisterInstitution";
import JoinSchool from "./pages/JoinSchool";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PricingPolicy from "./pages/PricingPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import ContactUs from "./pages/ContactUs";
import OfflineIndicator from "./Components/OfflineIndicator";
import ErrorBoundary from "./Components/ErrorBoundary";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/join",
  "/terms",
  "/privacy",
  "/pricing-policy",
  "/refund-policy",
  "/contact",
];

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isPublicPage = PUBLIC_ROUTES.includes(location.pathname);

  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [showInstallPill, setShowInstallPill] = React.useState(true);

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
      alert("To install on iOS or mobile browser: Tap Share (or Menu 3-dots) and choose 'Add to Home Screen' 📱");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F172A] font-sans w-full relative">
      <OfflineIndicator />
      {!isPublicPage && <Sidebar />}
      <main
        className={`flex-1 w-full overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-8 ${
          isPublicPage ? "" : "pt-20 md:pt-8 pb-24 md:pb-8"
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
              {/* PUBLIC ONBOARDING & AUTH ROUTES */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterInstitution />} />
              <Route path="/join" element={<JoinSchool />} />
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
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal"]}>
                  <SystemAudit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/directory"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "accountant"]}>
                  <InstitutionalDirectory />
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
                <ProtectedRoute allowedRoles={["accountant", "admin"]}>
                  <AccountantDashboard />
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
              path="/student/certificates"
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
            <Route
              path="/student/transport"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentTransport />
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