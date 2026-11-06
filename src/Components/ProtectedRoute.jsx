import React, { useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor, inferRoleFromCode } from "../pages/Login";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, session, loading } = useContext(AppContext);
  const { showToast } = useToast();
  const location = useLocation();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    // Safety timeout ensures screen never hangs on network latency
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Authoritative session user strictly from authenticated Supabase context
  const resolvedUser = user;

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

  // Fail closed: Not authenticated -> redirect to login
  if (!resolvedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required and user does not have required role
  if (allowedRoles && allowedRoles.length > 0) {
    const rawRole = (resolvedUser.role || inferRoleFromCode(resolvedUser.role_code || resolvedUser.roll_number || resolvedUser.id) || "").toUpperCase();
    const roleCode = String(resolvedUser.role_code || resolvedUser.id || "").toUpperCase();

    // STRICT GUARD FOR MASTER_OWNER: Only verified MASTER_OWNER can access /master-setup
    const isMasterRoute = allowedRoles.some((r) => r.toUpperCase() === "MASTER_OWNER");
    const isMasterUser = rawRole === "MASTER_OWNER" || roleCode === "MASTER_OWNER";

    if (isMasterRoute) {
      if (!isMasterUser) {
        showToast(
          `Unauthorized access to ${location.pathname}. Master Owner authority required.`,
          "error"
        );
        return <Navigate to={dashboardFor(resolvedUser.role)} replace />;
      }
      return children;
    }

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

