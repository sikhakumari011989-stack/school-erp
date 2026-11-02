import React, { useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor, inferRoleFromCode } from "../pages/Login";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AppContext);
  const { showToast } = useToast();
  const location = useLocation();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    // Hard 800ms safety timeout guarantees screen never hangs on Android / mobile
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Read active authenticated session user
  const getFreshUser = () => {
    if (user) return user;
    try {
      const saved = localStorage.getItem("erp_session_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const resolvedUser = getFreshUser();

  if (loading && !resolvedUser && !forceReady) {
    return (
      <div className="min-h-[100dvh] bg-[#0F172A] w-full flex flex-col items-center justify-center text-center px-6 font-sans">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Verifying Institutional Session & RLS Permissions...
        </p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!resolvedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required and user does not have required role
  if (allowedRoles && allowedRoles.length > 0) {
    const rawRole = (resolvedUser.role || inferRoleFromCode(resolvedUser.role_code || resolvedUser.roll_number || resolvedUser.id) || "").toUpperCase();
    const roleCode = String(resolvedUser.role_code || resolvedUser.id || "").toUpperCase();

    const canonicalUserRole =
      rawRole === "PRIN" || rawRole === "PRINCIPAL" ? "PRIN" :
      rawRole === "HOD" || rawRole === "TRUSTEE" ? "HOD" :
      rawRole === "ACC" || rawRole === "ACCOUNTANT" ? "ACC" :
      rawRole === "TCH" || rawRole === "TEACHER" || rawRole === "FACULTY" ? "TCH" :
      rawRole === "NTS" || rawRole === "STAFF" || rawRole === "NON_TEACHING" || rawRole === "NON-TEACHING" ? "NTS" :
      rawRole === "ADM" || rawRole === "ADMIN" || rawRole === "SUPER_ADMIN" || rawRole === "SUPERADMIN" ? "PRIN" : "STU";

    const hasRole =
      allowedRoles.some((r) => {
        const target = r.toUpperCase();
        if (target === canonicalUserRole) return true;
        if (target === rawRole) return true;

        // Executive Suite: HOD & PRIN cross-access
        if ((target === "HOD" || target === "PRIN" || target === "TRUSTEE" || target === "PRINCIPAL") &&
            (canonicalUserRole === "HOD" || canonicalUserRole === "PRIN" || roleCode.startsWith("HOD-") || roleCode.startsWith("PRIN-") || roleCode.startsWith("TR-"))) {
          return true;
        }

        // Staff / NTS
        if ((target === "NTS" || target === "STAFF" || target === "NON_TEACHING") &&
            (canonicalUserRole === "NTS" || roleCode.startsWith("NTS-") || roleCode.startsWith("NON-") || roleCode.startsWith("STF-"))) {
          return true;
        }

        return false;
      }) ||
      canonicalUserRole === "PRIN" ||
      roleCode.startsWith("ADM-") ||
      roleCode.startsWith("SUPER-");

    if (!hasRole) {
      showToast(
        `Unauthorized access to ${location.pathname}. Redirecting to your portal.`,
        "error"
      );
      return <Navigate to={dashboardFor(resolvedUser.role)} replace />;
    }
  }

  return children;
}

