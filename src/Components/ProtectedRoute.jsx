import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor } from "../pages/Login";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AppContext);
  const { showToast } = useToast();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Verifying Institutional Session & RLS Permissions...
        </p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required and user does not have required role (SuperAdmin has full access)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || "").toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole) || userRole === "admin";

    if (!hasRole) {
      showToast(`Unauthorized access to ${location.pathname}. Redirecting to your portal.`, "error");
      return <Navigate to={dashboardFor(user.role)} replace />;
    }
  }

  return children;
}

