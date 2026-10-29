import React, { useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor } from "../pages/Login";

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

  // Synchronously read the active role from the freshly set session
  // Prioritize localStorage so fresh 1-click role switches take immediate effect
  const getFreshUser = () => {
    try {
      const saved =
        localStorage.getItem("erp_session_user") ||
        localStorage.getItem("erp_demo_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    return user || null;
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

  // If specific roles are required and user does not have required role (SuperAdmin has full access)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (resolvedUser.role || "").toLowerCase();
    const hasRole =
      allowedRoles.some((r) => r.toLowerCase() === userRole) ||
      userRole === "admin";

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

