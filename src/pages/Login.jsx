import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import BrandLogo from "../Components/BrandLogo";
import { verifyCloudLogin, checkSchoolSubscriptionStatus } from "../utils/cloudSyncService";

/**
 * Standardizes email generation pattern for 2-Tier institutional credentials:
 * [institution_code].[personal_code]@erp-login.com (forced lowercase, trimmed of spaces)
 */
export function buildStandardErpEmail(institutionCode, personalCode) {
  const cleanInst = String(institutionCode || "campus")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/\s+/g, "-");
  const cleanRole = String(personalCode || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "") // Strip domain if user accidentally typed an email
    .replace(/[^a-z0-9-]/g, "")
    .replace(/\s+/g, "-");
  return `${cleanInst || "campus"}.${cleanRole || "user"}@erp-login.com`;
}

export const inferRoleFromCode = (code) => {
  const upper = String(code || "").toUpperCase();
  if (upper.startsWith("PRIN")) return "principal";
  if (upper.startsWith("HOD") || upper.startsWith("TR")) return "trustee";
  if (upper.startsWith("ACC")) return "accountant";
  if (upper.startsWith("TCH") || upper.startsWith("FAC")) return "teacher";
  if (upper.startsWith("NON") || upper.startsWith("STF") || upper.startsWith("STAFF")) return "staff";
  if (upper.startsWith("ADM") || upper.startsWith("SUPER")) return "admin";
  return "student";
};

export const dashboardFor = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin/dashboard";
  if (normalized === "accountant") return "/accountant/dashboard";
  if (normalized === "principal") return "/principal/dashboard";
  if (normalized === "trustee") return "/trustee/dashboard";
  if (normalized === "teacher") return "/teacher/dashboard";
  if (normalized === "staff" || normalized === "non_teaching") return "/staff/dashboard";
  return "/student/dashboard";
};

export default function Login({ isDirectPortal = false }) {
  const { user, setUser, login, loading: sessionLoading } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isDirect = isDirectPortal || location.pathname === "/portal";
  const initialSchool =
    searchParams.get("school") ||
    searchParams.get("tenant") ||
    searchParams.get("code") ||
    "";

  const [formData, setFormData] = useState({
    institutionCode: initialSchool ? initialSchool.toUpperCase() : "",
    personalCode: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suspendedNotice, setSuspendedNotice] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanInst = formData.institutionCode.trim().toUpperCase();
    const rawPersonal = formData.personalCode.trim();
    const cleanPersonal = rawPersonal.replace(/@.*$/, "").toUpperCase();
    const pass = formData.password.trim();

    if (!cleanInst || !cleanPersonal || !pass) {
      setError("Please provide all required fields: Institution Code, Personal ID, and Password.");
      return;
    }

    setLoading(true);

    // 0. Manual Subscription & Master Kill-Switch Enforcement
    try {
      const sub = await checkSchoolSubscriptionStatus(cleanInst);
      if (sub && sub.isBlocked) {
        setLoading(false);
        setSuspendedNotice({
          schoolCode: cleanInst,
          isSuspended: sub.isSuspended,
          isExpired: sub.isExpired,
          expiryDate: sub.expiryDate,
        });
        showToast(
          sub.isSuspended
            ? `Campus node ${cleanInst} is SUSPENDED by platform administrator.`
            : `Campus node ${cleanInst} license expired on ${sub.expiryDate}.`,
          "error"
        );
        return;
      }
    } catch (subErr) {
      console.warn("Subscription check notice:", subErr);
    }

    const standardizedEmail = buildStandardErpEmail(cleanInst, cleanPersonal);
    const emailAlt = `${cleanInst.toLowerCase().replace(/[^a-z0-9]/g, "")}.${cleanPersonal.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`;

    try {
      // 1. Cloud-First Verification: Query Supabase cloud first
      // Inspects Supabase schools, cloud directory package, profiles, students, and teachers.
      const cloudResult = await verifyCloudLogin({
        institutionCode: cleanInst,
        personalCode: cleanPersonal,
        password: pass,
      });

      if (cloudResult && cloudResult.success && cloudResult.user) {
        const userObj = cloudResult.user;
        const userRole = userObj.role || inferRoleFromCode(cleanPersonal);
        const sessionPayload = {
          ...userObj,
          role: userRole,
          school_id: userObj.school_id || cleanInst,
          institution_code: cleanInst,
          institution_name: userObj.institution_name || cleanInst,
        };

        if (typeof setUser === "function") setUser(sessionPayload);
        login(sessionPayload);
        try {
          localStorage.setItem("erp_session_user", JSON.stringify(sessionPayload));
          localStorage.setItem("erp_demo_session", JSON.stringify(sessionPayload));
          localStorage.setItem("erp_active_tenant", cleanInst);
        } catch (e) {}

        showToast(`Access granted: ${sessionPayload.name || sessionPayload.full_name || cleanPersonal}`, "success");
        navigate(dashboardFor(userRole));
        return;
      }

      // If cloud verification reported an explicit password mismatch
      if (cloudResult && cloudResult.error && cloudResult.error.toLowerCase().includes("password")) {
        setError(cloudResult.error);
        showToast(cloudResult.error, "error");
        return;
      }

      // 2. Primary Supabase Auth with standardized email (for auth accounts)
      if (supabase) {
        try {
          let authResult = await supabase.auth.signInWithPassword({
            email: standardizedEmail,
            password: pass,
          });

          // If primary email had domain restrictions, try alt
          if (
            authResult.error &&
            (authResult.error.message.includes("Invalid login") || authResult.error.message.includes("invalid"))
          ) {
            const altResult = await supabase.auth.signInWithPassword({
              email: emailAlt,
              password: pass,
            });
            if (!altResult.error) {
              authResult = altResult;
            }
          }

          // Check if Supabase auth succeeded
          if (!authResult.error && authResult.data?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, role, role_code, full_name, school_id, schools ( code, name )")
              .eq("id", authResult.data.user.id)
              .maybeSingle();

            const profileSchool = (profile?.schools?.code || profile?.school_id || "").toUpperCase();
            if (profileSchool && profileSchool !== cleanInst) {
              const msg = `Cross-tenant access denied: Account belongs to ${profileSchool}, not ${cleanInst}.`;
              setError(msg);
              showToast(msg, "error");
              return;
            }

            const role = profile?.role || authResult.data.user.user_metadata?.role || inferRoleFromCode(cleanPersonal);
            const fullName = profile?.full_name || authResult.data.user.user_metadata?.full_name || cleanPersonal;
            const userObj = {
              id: authResult.data.user.id,
              name: fullName,
              full_name: fullName,
              role,
              role_code: profile?.role_code || cleanPersonal,
              personal_code: profile?.role_code || cleanPersonal,
              school_id: profile?.school_id || cleanInst,
              institution_code: profile?.schools?.code || cleanInst,
              institution_name: profile?.schools?.name || cleanInst,
              email: authResult.data.user.email,
              authUid: authResult.data.user.id,
            };

            if (typeof setUser === "function") setUser(userObj);
            login(userObj);
            try {
              localStorage.setItem("erp_session_user", JSON.stringify(userObj));
              localStorage.setItem("erp_demo_session", JSON.stringify(userObj));
              localStorage.setItem("erp_active_tenant", cleanInst);
            } catch (e) {}
            showToast(`Welcome back, ${fullName}!`, "success");
            navigate(dashboardFor(role));
            return;
          }
        } catch (authErr) {
          console.warn("Supabase auth check notice:", authErr);
        }
      }

      const friendlyMsg = cloudResult?.error || "Incorrect institution code or personal ID. Please check your school credentials.";
      setError(friendlyMsg);
      showToast(friendlyMsg, "error");
    } catch (err) {
      console.error("Login unexpected error:", err);
      const friendlyMsg = err.message || "Incorrect institution code or personal ID. Please check your school credentials.";
      setError(friendlyMsg);
      showToast(friendlyMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans p-4">
      {/* Ambient Radial Lighting */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[200px] pointer-events-none"></div>

      <div className="bg-slate-900/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-700/60 max-w-lg w-full relative z-10 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" className="shadow-xl shadow-indigo-600/30" />
          </div>
          <span className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            {isDirect ? "Dedicated Campus Portal" : "Multi-Tenant Enterprise ERP"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isDirect ? "Student & Faculty Portal Login" : "Institutional Portal Login"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {isDirect
              ? "Enter your School Code and Personal ID (STU-*, TCH-*, ACC-*, HOD-*) to access your portal"
              : "Enter your 2-Tier institutional credentials to access your command center"}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs sm:text-sm p-3.5 rounded-xl mb-6 text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* TIER 1: INSTITUTION CODE */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
              Tier 1: Institution / School Code
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400">🏢</span>
              <input
                type="text"
                required
                placeholder="e.g., PALGHAR-01"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider text-sm"
                value={formData.institutionCode}
                onChange={(e) => setFormData({ ...formData, institutionCode: e.target.value })}
              />
            </div>
          </div>

          {/* TIER 2: PERSONAL ROLE CODE */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
              Tier 2: Personal Role ID (HOD, ACC, TCH, STU)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400">👤</span>
              <input
                type="text"
                required
                placeholder="e.g., HOD-01, TCH-01, STU-101"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider text-sm"
                value={formData.personalCode}
                onChange={(e) => setFormData({ ...formData, personalCode: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono truncate px-1">
              Mapped Auth ID: <span className="text-blue-400/90">{buildStandardErpEmail(formData.institutionCode, formData.personalCode)}</span>
            </p>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400">🔑</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-3 border border-blue-500/40 hover:scale-[1.01] cursor-pointer"
          >
            {loading ? "Verifying Credentials & Institutional Node..." : "Sign In to Institutional Portal 🚀"}
          </button>
        </form>

        {/* OFFICIAL SUPPORT & SESSION CONTROLS */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center space-y-2">
          <p className="text-[11px] text-slate-400">
            Support Desk:{" "}
            <a href="mailto:sikhakumari011989@gmail.com" className="text-blue-400 hover:underline">
              sikhakumari011989@gmail.com
            </a>{" "}
            &bull; <span className="font-mono text-slate-300">+91 9518388499</span>
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (e) {}
                window.location.href = "/login?reset=true";
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>🧹</span>
              <span>Clear Mobile Session Cache & Reset</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-600 pt-1">
            &copy; 2026 EduSaaS ERP. All rights reserved.
          </p>
        </div>
      </div>

      {/* NON-DISMISSIBLE SUBSCRIPTION SUSPENSION / EXPIRY NOTICE */}
      {suspendedNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border-2 border-rose-500/70 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-center shadow-2xl relative animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-rose-500/20">
              🚫
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30">
                {suspendedNotice.isSuspended ? "Master Kill-Switch Activated" : "Institutional License Expired"}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                Campus Portal Access Blocked
              </h2>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                {suspendedNotice.isSuspended ? (
                  <>
                    Access to campus node <strong className="text-white font-mono">{suspendedNotice.schoolCode}</strong> has been suspended by the platform administrator via the master subscription kill-switch.
                  </>
                ) : (
                  <>
                    The enterprise software license for campus node <strong className="text-white font-mono">{suspendedNotice.schoolCode}</strong> expired on <strong className="text-rose-400 font-mono">{suspendedNotice.expiryDate}</strong>.
                  </>
                )}
              </p>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-left space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notice for Faculty, Staff & Students</p>
              <p className="text-xs text-slate-400">
                All portal services (Trustee, Teacher, Accountant, Staff, Student) are temporarily restricted. Please contact your school management or platform support to renew access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuspendedNotice(null);
                setFormData((prev) => ({ ...prev, institutionCode: "", personalCode: "", password: "" }));
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-xs"
            >
              ← Return to Login / Enter Different School Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}