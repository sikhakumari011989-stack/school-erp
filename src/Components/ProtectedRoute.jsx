import React, { useContext, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor, normalizeRole } from "../utils/credentials";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, session, loading, subscription, tenant, logout } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const location = useLocation();

  const resolvedUser = user;
  const userCanonicalRole = resolvedUser
    ? normalizeRole(resolvedUser.role, resolvedUser.role_code || resolvedUser.roll_number || resolvedUser.id)
    : "";
  const isMasterUser = userCanonicalRole === "MASTER_OWNER";

  const hasAllowedRoles = Boolean(!loading && resolvedUser && allowedRoles && allowedRoles.length > 0);
  const isMasterRoute = hasAllowedRoles && allowedRoles.some((r) => normalizeRole(r) === "MASTER_OWNER");
  const isBlockedMaster = isMasterRoute && !isMasterUser;

  const normalizedAllowedRoles = hasAllowedRoles ? allowedRoles.map((r) => normalizeRole(r)) : [];
  const hasDirectRole = normalizedAllowedRoles.includes(userCanonicalRole);
  const isExecutive = userCanonicalRole === "HOD" || userCanonicalRole === "PRIN";
  const allowsExecutive = normalizedAllowedRoles.includes("HOD") || normalizedAllowedRoles.includes("PRIN");
  const isAnalyticsRoute =
    location.pathname.startsWith("/teacher/analytics") ||
    location.pathname.includes("/analytics");

  const hasRole =
    !hasAllowedRoles ||
    hasDirectRole ||
    (isExecutive && (allowsExecutive || isAnalyticsRoute));

  const isUnauthorized = hasAllowedRoles && !isMasterRoute && !hasRole;

  useEffect(() => {
    if (!loading && resolvedUser) {
      if (isBlockedMaster) {
        showToast(
          `Unauthorized access to ${location.pathname}. Master Owner authority required.`,
          "error"
        );
      } else if (isUnauthorized) {
        showToast(
          `Unauthorized access to ${location.pathname}. Redirecting to your portal.`,
          "error"
        );
      }
    }
  }, [loading, resolvedUser, isBlockedMaster, isUnauthorized, location.pathname]);

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

  // Fail closed: Not authenticated -> redirect to login
  if (!resolvedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // INSTITUTIONAL SUBSCRIPTION & SUSPENSION ENFORCEMENT:
  // If the campus subscription has expired or is marked suspended, AppLayout renders
  // the full-screen barrier (z-[9999]) while keeping the normal app mounted underneath.
  if (!isMasterUser && subscription?.isBlocked) {
    return children;
  }

  if (isBlockedMaster || isUnauthorized) {
    return <Navigate to={dashboardFor(resolvedUser.role || userCanonicalRole)} replace />;
  }

  return children;
}

