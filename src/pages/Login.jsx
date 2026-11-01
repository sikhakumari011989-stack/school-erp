import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import BrandLogo from "../Components/BrandLogo";
import ThemeToggle from "../Components/ThemeToggle";
import { verifyCloudLogin, checkSchoolSubscriptionStatus } from "../utils/cloudSyncService";
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

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
  if (upper.startsWith("NON") || upper.startsWith("NTS") || upper.startsWith("STF") || upper.startsWith("STAFF")) return "staff";
  if (upper.startsWith("ADM") || upper.startsWith("SUPER")) return "admin";
  const lower = String(code || "").toLowerCase();
  if (lower === "principal") return "principal";
  if (lower === "trustee" || lower === "hod") return "trustee";
  if (lower === "accountant") return "accountant";
  if (lower === "teacher") return "teacher";
  if (lower === "staff" || lower === "non_teaching") return "staff";
  if (lower === "admin" || lower === "super_admin") return "admin";
  return "student";
};

export const dashboardFor = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin/dashboard";
  if (normalized === "accountant") return "/accountant/dashboard";
  if (normalized === "principal") return "/principal/dashboard";
  if (normalized === "trustee" || normalized === "hod") return "/trustee/dashboard";
  if (normalized === "teacher") return "/teacher/dashboard";
  if (normalized === "staff" || normalized === "non_teaching" || normalized === "nts") return "/staff/dashboard";
  return "/student/dashboard";
};

export default function Login({ isDirectPortal = false }) {
  const { user, setUser, login } = useContext(AppContext);
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suspendedNotice, setSuspendedNotice] = useState(null);

  // Fast auto-route if persistent session already exists
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("signedOut") === "true") return;
    try {
      const active =
        user ||
        (() => {
          const s = localStorage.getItem("erp_session_user") || localStorage.getItem("erp_demo_session");
          return s ? JSON.parse(s) : null;
        })();

      if (active && (active.role || active.role_code)) {
        const dest = dashboardFor(active.role || inferRoleFromCode(active.role_code || active.roll_number));
        navigate(dest, { replace: true });
      }
    } catch {
      // Ignored
    }
  }, [user, location.search, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanInst = formData.institutionCode.trim().toUpperCase();
    const rawPersonal = formData.personalCode.trim();
    const isEmail = rawPersonal.includes("@");
    const cleanPersonal = rawPersonal.replace(/@.*$/, "").toUpperCase();
    const pass = formData.password.trim();

    // Validation checks
    if (!pass) {
      setError("Please enter your security password.");
      return;
    }

    if (!isEmail && (!cleanInst || !cleanPersonal)) {
      setError("Please provide all required fields: Institution Access Code, Personal Credential ID, and Password.");
      return;
    }

    if (isEmail && !rawPersonal) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    // 0. Subscription & Master Kill-Switch Check
    if (cleanInst) {
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
    }

    const standardizedEmail = buildStandardErpEmail(cleanInst, cleanPersonal);
    const emailAlt = `${cleanInst.toLowerCase().replace(/[^a-z0-9]/g, "")}.${cleanPersonal.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`;

    let authUser = null;
    let explicitAuthError = null;

    // STEP 1: Supabase Auth (Primary Identity Provider)
    if (supabase) {
      const candidates = isEmail
        ? [rawPersonal.toLowerCase()]
        : [standardizedEmail, emailAlt];

      for (const candidateEmail of candidates) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: candidateEmail,
            password: pass,
          });

          if (!authErr && authData?.user) {
            authUser = authData.user;
            break;
          }

          if (authErr) {
            const msg = (authErr.message || "").toLowerCase();
            const status = authErr.status;

            if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
              explicitAuthError = "Email not confirmed. Please check your inbox and confirm your email before logging in.";
              break;
            } else if (msg.includes("disabled") || msg.includes("banned")) {
              explicitAuthError = "This account has been disabled. Please contact your campus administrator.";
              break;
            } else if (msg.includes("rate limit") || status === 429) {
              explicitAuthError = "Too many failed attempts. Please wait a few moments before trying again.";
              break;
            }
          }
        } catch (authErr) {
          console.warn("Supabase auth attempt notice:", authErr);
        }
      }
    }

    // If explicit non-credential auth error occurred (e.g. email unconfirmed)
    if (explicitAuthError) {
      setError(explicitAuthError);
      showToast(explicitAuthError, "error");
      setLoading(false);
      return;
    }

    // If Supabase Auth successfully authenticated the user
    if (authUser) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, role_code, full_name, school_id, schools ( code, name )")
          .eq("id", authUser.id)
          .maybeSingle();

        const appMeta = authUser.app_metadata || {};
        const userMeta = authUser.user_metadata || {};

        // Cross-tenant protection
        const profileSchool = (profile?.schools?.code || profile?.school_id || appMeta.school_id || userMeta.school_id || "").toUpperCase();
        if (cleanInst && profileSchool && profileSchool !== cleanInst && profileSchool !== "ALL") {
          const msg = `Cross-tenant access denied: Account belongs to ${profileSchool}, not ${cleanInst}.`;
          setError(msg);
          showToast(msg, "error");
          setLoading(false);
          return;
        }

        const rawRole = profile?.role || appMeta.role || userMeta.role || inferRoleFromCode(cleanPersonal);
        const resolvedRole = inferRoleFromCode(rawRole);
        const fullName = profile?.full_name || userMeta.full_name || userMeta.name || cleanPersonal;

        const sessionPayload = {
          id: authUser.id,
          name: fullName,
          full_name: fullName,
          role: resolvedRole,
          role_code: profile?.role_code || appMeta.role_code || cleanPersonal,
          personal_code: profile?.role_code || cleanPersonal,
          school_id: profile?.school_id || appMeta.school_id || cleanInst || "default-school",
          institution_code: profile?.schools?.code || cleanInst || "CAMPUS-01",
          institution_name: profile?.schools?.name || cleanInst || "Academic Campus",
          email: authUser.email,
          authUid: authUser.id,
        };

        // Synchronously store session before routing
        try {
          localStorage.setItem("erp_session_user", JSON.stringify(sessionPayload));
          localStorage.setItem("erp_demo_session", JSON.stringify(sessionPayload));
          localStorage.setItem("erp_active_tenant", cleanInst || sessionPayload.institution_code);
        } catch {}

        if (typeof setUser === "function") setUser(sessionPayload);
        if (typeof login === "function") login(sessionPayload);

        showToast(`Welcome back, ${fullName}!`, "success");
        navigate(dashboardFor(resolvedRole), { replace: true });
        return;
      } catch (postAuthErr) {
        console.warn("Post-auth profile resolution notice:", postAuthErr);
      }
    }

    // STEP 2: Cloud Directory & Multi-Tenant Provisioning Package
    if (cleanInst) {
      try {
        const cloudResult = await verifyCloudLogin({
          institutionCode: cleanInst,
          personalCode: cleanPersonal,
          password: pass,
        });

        if (cloudResult && cloudResult.success && cloudResult.user) {
          const userObj = cloudResult.user;
          const userRole = inferRoleFromCode(userObj.role || cleanPersonal);
          const sessionPayload = {
            ...userObj,
            role: userRole,
            school_id: userObj.school_id || cleanInst,
            institution_code: cleanInst,
            institution_name: userObj.institution_name || cleanInst,
          };

          try {
            localStorage.setItem("erp_session_user", JSON.stringify(sessionPayload));
            localStorage.setItem("erp_demo_session", JSON.stringify(sessionPayload));
            localStorage.setItem("erp_active_tenant", cleanInst);
          } catch {}

          if (typeof setUser === "function") setUser(sessionPayload);
          if (typeof login === "function") login(sessionPayload);

          showToast(`Access granted: ${sessionPayload.name || sessionPayload.full_name || cleanPersonal}`, "success");
          navigate(dashboardFor(userRole), { replace: true });
          return;
        }

        if (cloudResult && cloudResult.error && cloudResult.error.toLowerCase().includes("password")) {
          const msg = "Invalid credentials. The password you entered is incorrect.";
          setError(msg);
          showToast(msg, "error");
          setLoading(false);
          return;
        }
      } catch (cloudErr) {
        console.warn("Cloud directory verification notice:", cloudErr);
      }
    }

    // Both primary Supabase Auth and Cloud directory verification failed
    const finalError = "Invalid credentials. Please verify your Institution Access Code, Personal ID, and Password.";
    setError(finalError);
    showToast(finalError, "error");
    setLoading(false);
  };

  // Quick fill demo role credentials for rapid evaluation
  const setDemoCredentials = (roleCode) => {
    setFormData({
      institutionCode: formData.institutionCode || "CAMPUS-01",
      personalCode: roleCode,
      password: "password123",
    });
    setError("");
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans p-4 sm:p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Flagship Cosmic Ambient Glow Nodes */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[200px] pointer-events-none"></div>

      {/* Subtle Cosmic Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Top Controls: Stealth Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Flagship Voyager Glassmorphic Card */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-cyan-500/5 max-w-lg w-full relative z-10 transition-all duration-300 ease-in-out">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" className="shadow-2xl shadow-cyan-500/20" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-2.5">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{isDirect ? "Dedicated Campus Node" : "Multi-Tenant Enterprise ERP"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isDirect ? "Campus Portal Access" : "Institutional OS Login"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Enter your institutional credentials to access your isolated role workspace
          </p>
        </div>

        {/* High-Legibility Explicit Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs sm:text-sm p-4 rounded-2xl mb-6 flex items-start gap-3 animate-fade-in shadow-lg shadow-rose-500/10">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-200">Authentication Failed</p>
              <p className="text-rose-300/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* TIER 1: INSTITUTION ACCESS CODE */}
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Institution Access Code</span>
              </label>
              <span className="text-[10px] text-slate-400">e.g. CAMPUS-01</span>
            </div>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="CAMPUS-01"
                className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all font-mono uppercase tracking-wider text-sm font-semibold"
                value={formData.institutionCode}
                onChange={(e) => setFormData({ ...formData, institutionCode: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* TIER 2: PERSONAL CREDENTIAL ID */}
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Personal ID or Institutional Email</span>
              </label>
              <span className="text-[10px] text-slate-400">PRIN-01, HOD-01, TCH-01</span>
            </div>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="PRIN-01 or user@school.com"
                className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all font-mono uppercase tracking-wider text-sm font-semibold"
                value={formData.personalCode}
                onChange={(e) => setFormData({ ...formData, personalCode: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Security Password</span>
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-11 pr-11 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm font-medium"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Role Tester Pills */}
          <div className="pt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Quick Role Test Logins (Password: password123)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Principal", code: "PRIN-01", color: "hover:border-cyan-500/50 hover:bg-cyan-500/10" },
                { label: "Trustee (HOD)", code: "HOD-01", color: "hover:border-purple-500/50 hover:bg-purple-500/10" },
                { label: "Accountant", code: "ACC-01", color: "hover:border-emerald-500/50 hover:bg-emerald-500/10" },
                { label: "Teacher", code: "TCH-01", color: "hover:border-blue-500/50 hover:bg-blue-500/10" },
                { label: "Student", code: "STU-01", color: "hover:border-amber-500/50 hover:bg-amber-500/10" },
              ].map((role) => (
                <button
                  key={role.code}
                  type="button"
                  onClick={() => setDemoCredentials(role.code)}
                  className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 transition-all cursor-pointer ${role.color}`}
                >
                  {role.label} <span className="text-slate-400">({role.code})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating & Verifying Session...</span>
              </>
            ) : (
              <>
                <span>Sign In to Institutional Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Official Support & Session Controls */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant Row-Level Security Protected</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Support:{" "}
            <a href="mailto:sikhakumari011989@gmail.com" className="text-cyan-400 hover:underline">
              sikhakumari011989@gmail.com
            </a>{" "}
            &bull; <span className="font-mono text-slate-300">+91 9518388499</span>
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                try {
                  const savedTheme = localStorage.getItem("erp_theme_mode");
                  localStorage.clear();
                  sessionStorage.clear();
                  if (savedTheme) localStorage.setItem("erp_theme_mode", savedTheme);
                } catch {}
                window.location.href = "/login?reset=true";
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium pt-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Clear Session Cache & Reset</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            &copy; 2026 Academic OS ERP. All rights reserved.
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
              &larr; Return to Login / Enter Different School Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
