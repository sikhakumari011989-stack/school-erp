import React from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppProvider, AppContext, useAppContext } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import ProtectedRoute from "./Components/ProtectedRoute";

// Import Components & Pages
import Sidebar from "./Components/Sidebar";
import Login, { dashboardFor, inferRoleFromCode, normalizeRole } from "./pages/Login";

// Lazy-loaded routes for optimal bundle chunking and performance
const SuperAdminDashboard = React.lazy(() => import("./pages/SuperAdminDashboard"));
const PrincipalDashboard = React.lazy(() => import("./pages/PrincipalDashboard"));
const AccountantDashboard = React.lazy(() => import("./pages/AccountantDashboard"));
const TrusteeDashboard = React.lazy(() => import("./pages/TrusteeDashboard"));
const StaffDashboard = React.lazy(() => import("./pages/StaffDashboard"));
const AcademicCalendar = React.lazy(() => import("./pages/AcademicCalendar"));

const TeacherDashboard = React.lazy(() => import("./pages/TeacherDashboard"));
const TeacherHomework = React.lazy(() => import("./pages/TeacherHomework"));
const TeacherAttendance = React.lazy(() => import("./pages/TeacherAttendance"));
const TeacherClasses = React.lazy(() => import("./pages/TeacherClasses"));
const TeacherAnalytics = React.lazy(() => import("./pages/TeacherAnalytics"));
const TeacherPlanner = React.lazy(() => import("./pages/TeacherPlanner"));
const TeacherClassTests = React.lazy(() => import("./pages/TeacherClassTests"));

const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const StudentMarks = React.lazy(() => import("./pages/StudentMarks"));
const StudentHomework = React.lazy(() => import("./pages/StudentHomework"));
const StudentLMS = React.lazy(() => import("./pages/StudentLMS"));
const CertificateGenerator = React.lazy(() => import("./pages/CertificateGenerator"));
const StudentCalendar = React.lazy(() => import("./pages/StudentCalendar"));
const StudentGallery = React.lazy(() => import("./pages/StudentGallery"));
const StudentConduct = React.lazy(() => import("./pages/StudentConduct"));
const StudentFees = React.lazy(() => import("./pages/StudentFees"));
const StudentRazorpayCheckout = React.lazy(() => import("./pages/StudentRazorpayCheckout"));

const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const PricingPolicy = React.lazy(() => import("./pages/PricingPolicy"));
const RefundPolicy = React.lazy(() => import("./pages/RefundPolicy"));
const ContactUs = React.lazy(() => import("./pages/ContactUs"));
const SystemDiagnosticPage = React.lazy(() => import("./pages/SystemDiagnosticPage"));
const MasterSchoolSetup = React.lazy(() => import("./pages/MasterSchoolSetup"));

const AdmissionsCRM = React.lazy(() => import("./pages/AdmissionsCRM"));
const DocumentIntelligence = React.lazy(() => import("./pages/DocumentIntelligence"));
const TransportManager = React.lazy(() => import("./pages/TransportManager"));
const AccreditationCenter = React.lazy(() => import("./pages/AccreditationCenter"));
const PublicCredentialVerify = React.lazy(() => import("./pages/PublicCredentialVerify"));
const ClinicHealthVault = React.lazy(() => import("./pages/ClinicHealthVault"));

const OnlineExams = React.lazy(() => import("./pages/OnlineExams"));
const StudentExam = React.lazy(() => import("./pages/StudentExam"));
const PayrollManager = React.lazy(() => import("./pages/PayrollManager"));
const BroadcastManager = React.lazy(() => import("./pages/BroadcastManager"));
const StaffMessenger = React.lazy(() => import("./pages/StaffMessenger"));
const ExpenseManagerPage = React.lazy(() => import("./pages/ExpenseManager"));
import OfflineBanner from "./Components/OfflineBanner";
import ErrorBoundary from "./Components/ErrorBoundary";
import CommandPalette from "./Components/CommandPalette";
import SuspensionNoticeBarrier from "./Components/SuspensionNoticeBarrier";
import { SentryErrorBoundary, initSentry } from "./telemetry/sentry";

// Initialize Sentry Telemetry for production observability
initSentry();

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
  "/verify-credential",
];

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, subscription, tenant, logout } = useAppContext();
  const isPublicPage =
    PUBLIC_ROUTES.includes(location.pathname) ||
    location.pathname.startsWith("/verify-credential");

  const canonicalRole = normalizeRole(user?.role, user?.role_code || user?.roll_number || user?.id);
  const isMasterUser = canonicalRole === "MASTER_OWNER" || location.pathname === "/master-setup";

  // 1. GLOBAL INSTITUTIONAL SUSPENSION & LICENSING LOCK (ROOT ROUTER LEVEL)
  // If a school's status or subscription_status is marked suspended or its license has expired,
  // all users (Students, Teachers, Accountants, Principals) are immediately blocked from dashboard access.
  // MASTER_OWNER role is strictly exempted so they can manage and renew institutions via /master-setup.
  if (!isPublicPage && !isMasterUser && subscription?.isBlocked) {
    return (
      <SuspensionNoticeBarrier
        tenant={tenant}
        subscription={subscription}
        onLogout={logout}
      />
    );
  }

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
        const saved = localStorage.getItem("erp_session_user");
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
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-slate-50 dark:bg-[#0A0E1A] text-slate-900 dark:text-slate-100 font-sans relative transition-colors duration-200">
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

      {/* UNIVERSAL GLOBAL COMMAND PALETTE (Ctrl + K) */}
      <CommandPalette />
    </div>
  );
};

const RouteLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
    <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading Academic OS workspace...</span>
  </div>
);

export default function App() {
  return (
    <SentryErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <ToastProvider>
        <AppLayout>
          <ErrorBoundary>
            <React.Suspense fallback={<RouteLoadingFallback />}>
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
              <Route path="/verify-credential/:token" element={<PublicCredentialVerify />} />

            {/* SUPER ADMIN & SYSTEM AUDIT (Leadership Suite) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "principal", "trustee"]}>
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
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "accountant", "staff"]}>
                  <AdmissionsCRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/documents"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "accountant", "staff", "teacher"]}>
                  <DocumentIntelligence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transport"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "accountant", "staff"]}>
                  <TransportManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/accreditation"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal"]}>
                  <AccreditationCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/health"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal"]}>
                  <ClinicHealthVault />
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
            {/* Direct Dashboard Aliases for Compatibility */}
            <Route path="/principal-dashboard" element={<Navigate to="/principal/dashboard" replace />} />
            <Route path="/trustee-dashboard" element={<Navigate to="/trustee/dashboard" replace />} />
            <Route path="/accountant-dashboard" element={<Navigate to="/accountant/dashboard" replace />} />
            <Route path="/teacher-dashboard" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/student-dashboard" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/staff-dashboard" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />

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
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/homework"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee"]}>
                  <TeacherHomework />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/attendance"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee", "staff"]}>
                  <TeacherAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee"]}>
                  <TeacherClasses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/analytics"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee"]}>
                  <TeacherAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/planner"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "principal", "trustee"]}>
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
              path="/teacher/class-tests"
              element={
                <ProtectedRoute allowedRoles={["teacher", "admin", "trustee", "principal"]}>
                  <TeacherClassTests />
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
              path="/student/marks"
              element={
                <ProtectedRoute allowedRoles={["student", "admin"]}>
                  <StudentMarks />
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
              path="/admin/certificates"
              element={
                <ProtectedRoute allowedRoles={["admin", "trustee", "principal", "staff"]}>
                  <CertificateGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <ProtectedRoute allowedRoles={["student", "admin", "principal", "trustee"]}>
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
            </React.Suspense>
          </ErrorBoundary>
        </AppLayout>
      </ToastProvider>
    </AppProvider>
    </ThemeProvider>
    </SentryErrorBoundary>
  );
}