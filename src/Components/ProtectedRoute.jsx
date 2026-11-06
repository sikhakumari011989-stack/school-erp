import React, { useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { dashboardFor, inferRoleFromCode } from "../pages/Login";
import SuspensionNoticeBarrier from "./SuspensionNoticeBarrier";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, session, loading, subscription, tenant, logout } = useContext(AppContext);
  const { showToast } = useToast();
  const location = useLocation();

  // Authoritative session user: from React context OR persistent session storage
  const resolvedUser =
    user ||
    (() => {
      try {
        const s = typeof localStorage !== "undefined" ? localStorage.getItem("erp_session_user") : null;
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    })();

  // If session is still resolving on initial visit, render verified loading spinner rather than premature bounce
  if (loading && !resolvedUser) {
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

  const rawRole = (resolvedUser.role || inferRoleFromCode(resolvedUser.role_code || resolvedUser.roll_number || resolvedUser.id) || "").toUpperCase();
  const roleCode = String(resolvedUser.role_code || resolvedUser.id || "").toUpperCase();
  const isMasterUser = rawRole === "MASTER_OWNER" || roleCode === "MASTER_OWNER";

  // INSTITUTIONAL SUBSCRIPTION & SUSPENSION ENFORCEMENT:
  // If the campus subscription has expired or is marked suspended, block all non-MASTER_OWNER users
  // and render the full-screen institutional suspension notice barrier.
  if (!isMasterUser && subscription?.isBlocked) {
    return (
      <SuspensionNoticeBarrier
        tenant={tenant}
        subscription={subscription}
        onLogout={logout}
      />
    );
  }

  // If specific roles are required and user does not have required role
  if (allowedRoles && allowedRoles.length > 0) {
    // STRICT GUARD FOR MASTER_OWNER: Only verified MASTER_OWNER can access /master-setup
    const isMasterRoute = allowedRoles.some((r) => r.toUpperCase() === "MASTER_OWNER");

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
      canonicalUserRole === "HOD" ||
      roleCode.startsWith("HOD-") ||
      roleCode.startsWith("PRIN-") ||
      roleCode.startsWith("TR-") ||
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

