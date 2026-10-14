import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";

export const dashboardFor = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "accountant") return "/accountant/dashboard";
  if (role === "trustee" || role === "principal") return "/trustee/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/student/dashboard";
};

export default function Login() {
  const { user, login, loading: sessionLoading } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    institutionCode: "",
    personalCode: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to the authorized dashboard
  useEffect(() => {
    if (!sessionLoading && user?.role) {
      navigate(dashboardFor(user.role), { replace: true });
    }
  }, [user, sessionLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const inst = formData.institutionCode.trim().toLowerCase();
    const code = formData.personalCode.trim().toLowerCase();
    const pass = formData.password.trim();

    if (!inst || !code || !pass) {
      setError("Please provide all required fields: Institution Code, Personal ID, and Password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Primary email strategy: inst.code@erp-login.com
      const emailPrimary = `${inst}.${code}@erp-login.com`;
      const emailAlt = `${inst.replace(/[^a-z0-9]/g, "")}.${code.replace(/[^a-z0-9]/g, "")}@gmail.com`;

      let authResult = await supabase.auth.signInWithPassword({
        email: emailPrimary,
        password: pass,
      });

      // If primary email domain had delivery restrictions, try alt
      if (authResult.error && (authResult.error.message.includes("Invalid login") || authResult.error.message.includes("invalid"))) {
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
        // Confirm this account has a linked row in the profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, role_code, full_name, school_id, schools ( code, name )")
          .eq("id", authResult.data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          setError("Account authenticated, but no linked institution profile was found. Please contact your administrator.");
          showToast("Missing institution link in directory", "error");
          setLoading(false);
          return;
        }

        showToast(`Welcome back, ${profile.full_name || "Administrator"}!`, "success");
        navigate(dashboardFor(profile.role));
        return;
      }

      // 2. Fallback: If live Supabase auth returns error, check for known demo credentials or provide smart feedback
      const normalizedCode = code.toUpperCase();
      const isKnownDemoInst = inst === "oasis-tutorials" || inst === "school-demo-01" || inst === "demo";

      if (isKnownDemoInst && (pass === "password" || pass === "password123" || pass === "Password123" || pass === "demo" || pass === "123456")) {
        // Map to demo profile
        let role = "student";
        let roleName = "Enrolled Student";

        if (normalizedCode.includes("HOD") || normalizedCode.includes("TRU") || normalizedCode.includes("PRIN")) {
          role = "trustee";
          roleName = "HOD & Trustee Principal";
        } else if (normalizedCode.includes("ACC")) {
          role = "accountant";
          roleName = "Chief Accountant";
        } else if (normalizedCode.includes("TCH") || normalizedCode.includes("TEACH")) {
          role = "teacher";
          roleName = "Faculty Member";
        } else if (normalizedCode.includes("ADM")) {
          role = "admin";
          roleName = "Super Administrator";
        }

        const demoUser = {
          id: `demo-${role}-${Date.now()}`,
          name: `${roleName} (Demo)`,
          role,
          role_code: normalizedCode,
          school_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          institution_code: "OASIS-TUTORIALS",
          institution_name: "Oasis Tutorials",
        };

        login(demoUser);
        showToast(`Signed in to ${roleName} Portal (Demo Mode)`, "success");
        navigate(dashboardFor(role));
        return;
      }

      // If credentials failed and not demo
      const errMsg = authResult.error?.message || "Invalid institution code, personal ID, or password.";
      setError(
        errMsg.includes("Invalid login")
          ? "Invalid credentials. Use the 1-Click Demo buttons below or check your registered code."
          : errMsg
      );
      showToast(errMsg, "error");
    } catch (err) {
      console.error("Login unexpected error:", err);
      setError("An unexpected authentication error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Instant one-click demo login helper
  const handleQuickDemo = (roleKey, instCode, personalCode) => {
    setFormData({
      institutionCode: instCode,
      personalCode: personalCode,
      password: "password123",
    });

    const roleMap = {
      trustee: { role: "trustee", name: "HOD / Trustee Principal", path: "/trustee/dashboard" },
      accountant: { role: "accountant", name: "Chief Financial Accountant", path: "/accountant/dashboard" },
      teacher: { role: "teacher", name: "Prof. Satwik Sharma (Faculty)", path: "/teacher/dashboard" },
      student: { role: "student", name: "Astik Kumar (Student)", path: "/student/dashboard" },
      admin: { role: "admin", name: "Super Administrator", path: "/admin/dashboard" },
    };

    const target = roleMap[roleKey] || roleMap.trustee;

    const demoUser = {
      id: `demo-${roleKey}-user`,
      name: target.name,
      role: target.role,
      role_code: personalCode,
      school_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      institution_code: "OASIS-TUTORIALS",
      institution_name: "Oasis Tutorials",
    };

    login(demoUser);
    showToast(`Access granted: ${target.name}`, "success");
    navigate(target.path);
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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl shadow-blue-600/30 border border-white/20 text-3xl">
            🏛️
          </div>
          <span className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            Multi-Tenant Enterprise ERP
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Institutional Portal Login
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Enter your 2-Tier institutional credentials to access your command center
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
              Tier 1: Institution Code
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400">🏢</span>
              <input
                type="text"
                required
                placeholder="e.g., OASIS-TUTORIALS"
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
                placeholder="e.g., HOD-01, ACC-01, TCH-01, STU-1024"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider text-sm"
                value={formData.personalCode}
                onChange={(e) => setFormData({ ...formData, personalCode: e.target.value })}
              />
            </div>
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
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-3 border border-blue-500/40 hover:scale-[1.01]"
          >
            {loading ? "Verifying Credentials & Institutional Node..." : "Access Tuition Portal 🚀"}
          </button>
        </form>

        {/* 1-CLICK INSTANT DEMO TESTING LAUNCHPAD */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-3">
            ⚡ 1-Click Instant Demo Access (Test All Portals)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("trustee", "OASIS-TUTORIALS", "HOD-01")}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center"
            >
              🏛️ HOD/Trustee
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("accountant", "OASIS-TUTORIALS", "ACC-01")}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center"
            >
              💰 Accountant
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("teacher", "OASIS-TUTORIALS", "TCH-01")}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center"
            >
              👨‍🏫 Teacher
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("student", "OASIS-TUTORIALS", "STU-1024")}
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center"
            >
              🎓 Student
            </button>
          </div>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => handleQuickDemo("admin", "OASIS-TUTORIALS", "ADMIN-01")}
              className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              🛡️ Super Administrator Bypass →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}