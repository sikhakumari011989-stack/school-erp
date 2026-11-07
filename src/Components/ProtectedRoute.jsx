import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor, normalizeRole } from "../utils/credentials";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, session, loading, subscription, tenant, logout } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const location = useLocation();

  // If session is still resolving on initial visit, render verified loading spinner rather than premature bounce
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0F172A] w-full flex flex-col items-center justify-center text-center px-6 font-sans">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Verifying Institutional Session & RLS Permissions...
        </p>
      </div>
    );
  }

  // Authoritative session user from React context
  const resolvedUser = user;

  // Fail closed: Not authenticated -> redirect to login
  if (!resolvedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userCanonicalRole = normalizeRole(
    resolvedUser.role,
    resolvedUser.role_code || resolvedUser.roll_number || resolvedUser.id
  );
  const isMasterUser = userCanonicalRole === "MASTER_OWNER";

  // INSTITUTIONAL SUBSCRIPTION & SUSPENSION ENFORCEMENT:
  // If the campus subscription has expired or is marked suspended, AppLayout renders
  // the full-screen barrier (z-[9999]) while keeping the normal app mounted underneath.
  if (!isMasterUser && subscription?.isBlocked) {
    return children;
  }

  // If specific roles are required and user does not have required role
  if (allowedRoles && allowedRoles.length > 0) {
    // STRICT GUARD FOR MASTER_OWNER: Only verified MASTER_OWNER can access /master-setup
    const isMasterRoute = allowedRoles.some((r) => normalizeRole(r) === "MASTER_OWNER");

    if (isMasterRoute) {
      if (!isMasterUser) {
        showToast(
          `Unauthorized access to ${location.pathname}. Master Owner authority required.`,
          "error"
        );
        return <Navigate to={dashboardFor(resolvedUser.role || userCanonicalRole)} replace />;
      }
      return children;
    }

    const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRole(r));
    const hasDirectRole = normalizedAllowedRoles.includes(userCanonicalRole);

    // Executive Suite: HOD & PRIN cross-access and executive authority
    // HOD and PRIN have authorized cross-access across all executive pages and academic analytics (/teacher/analytics)
    const isExecutive = userCanonicalRole === "HOD" || userCanonicalRole === "PRIN";
    const allowsExecutive = normalizedAllowedRoles.includes("HOD") || normalizedAllowedRoles.includes("PRIN");
    const isAnalyticsRoute =
      location.pathname.startsWith("/teacher/analytics") ||
      location.pathname.includes("/analytics");

    const hasRole =
      hasDirectRole ||
      (isExecutive && (allowsExecutive || isAnalyticsRoute));

    if (!hasRole) {
      showToast(
        `Unauthorized access to ${location.pathname}. Redirecting to your portal.`,
        "error"
      );
      return <Navigate to={dashboardFor(resolvedUser.role || userCanonicalRole)} replace />;
    }
  }

  return children;
}

