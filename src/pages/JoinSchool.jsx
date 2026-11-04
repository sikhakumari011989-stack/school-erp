import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { buildStandardErpEmail } from "./Login";
import BrandLogo from "../Components/BrandLogo";

export default function JoinSchool() {
  const { login } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([
    { code: "CAMPUS-01", name: "Greenwood International Academy" },
    { code: "PALGHAR-01", name: "Palghar International School" },
  ]);

  const [formData, setFormData] = useState({
    institutionCode: "",
    role: "student",
    personalCode: "",
    fullName: "",
    email: "",
    password: "",
  });

  // Extract ?school= or ?code= from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramSchool = params.get("school") || params.get("code") || params.get("inst");
    if (paramSchool) {
      setFormData((prev) => ({
        ...prev,
        institutionCode: paramSchool.toUpperCase().trim(),
      }));
    }

    // Load registered schools from Supabase
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("code, name")
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          // Merge unique schools
          const map = new Map();
          [...schools, ...data].forEach((s) => {
            if (s.code) map.set(s.code.toUpperCase(), s);
          });
          setSchools(Array.from(map.values()));
        }
      } catch (err) {
        console.warn("Notice loading schools list:", err);
      }
    };

    fetchSchools();
  }, [location.search]);

  // Personal code placeholder for student enrollment
  const getPersonalCodeHint = () => "e.g., STU-1025 or ROLL-2026";

  const dashboardFor = () => "/student/dashboard";

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!formData.institutionCode || !formData.personalCode || !formData.fullName || !formData.email || !formData.password) {
      showToast("Please provide all required fields.", "error");
      return;
    }

    setLoading(true);
    const cleanInstCode = formData.institutionCode.trim().toUpperCase();
    const cleanPersonalCode = formData.personalCode.trim().toUpperCase();

    try {
      // 1. Resolve school UUID
      const schoolUuid = await resolveSchoolUuid(cleanInstCode);

      // 2. Register live Supabase Auth account (strictly student role)
      if (!supabase) {
        showToast("Database connection unavailable. Cannot enroll without Supabase Auth.", "error");
        setLoading(false);
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: "student",
            role_code: cleanPersonalCode,
            institution_code: cleanInstCode,
          },
        },
      });

      if (authErr) {
        showToast(`Registration failed: ${authErr.message}`, "error");
        setLoading(false);
        return;
      }

      const authUser = authData?.user;
      if (!authUser) {
        showToast("Registration incomplete: No user returned from authentication service.", "error");
        setLoading(false);
        return;
      }

      // 3. Insert student profile row in Supabase
      try {
        await supabase.from("profiles").insert([
          {
            id: authUser.id,
            full_name: formData.fullName.trim(),
            role: "student",
            role_code: cleanPersonalCode,
            school_id: schoolUuid,
          },
        ]);
      } catch (profErr) {
        console.warn("Profile table insert notice:", profErr);
      }

      // 4. Provision student directory record
      try {
        await supabase.from("students").insert([
          {
            name: formData.fullName.trim(),
            school_id: cleanInstCode,
            email: formData.email.trim(),
          },
        ]);
      } catch (stuErr) {
        console.warn("Student record sync notice:", stuErr);
      }

      // 5. Construct authenticated user session
      const matchedSchool = schools.find((s) => s.code === cleanInstCode);
      const userSession = {
        id: authUser.id,
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        role: "STU",
        role_code: cleanPersonalCode,
        school_id: schoolUuid,
        institution_code: cleanInstCode,
        institution_name: matchedSchool?.name || "Tuition Campus Partner",
      };

      // 6. Security Audit Log
      logSecurityAction({
        action: AUDIT_ACTIONS.STUDENT_ADMITTED,
        entityType: "USER_JOINED",
        entityId: cleanPersonalCode,
        details: `Student self-enrollment: ${formData.fullName} enrolled as STUDENT under ${cleanInstCode}`,
        user: userSession,
        schoolId: schoolUuid,
      });

      showToast(`Enrollment successful! Welcome to ${cleanInstCode}, ${formData.fullName}!`, "success");
      navigate("/student/dashboard");
    } catch (err) {
      console.error("Error joining institution:", err);
      showToast(err.message || "Enrollment failed. Please contact your school administrator.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0B0F19] p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Neon Blobs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl">
        {/* BRAND HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" className="shadow-xl shadow-indigo-600/30" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-block mb-2">
            Member Enrollment
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Join Your Campus Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Connect your personal account directly to your school or coaching institute using your personal ID
          </p>
        </div>

        {/* FORM CONTAINER */}
        <div className="bg-[#1E293B]/70 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleJoin} className="space-y-4">
            {/* SCHOOL SELECTOR / CODE */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                Select Your Institution *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">🏫</span>
                <select
                  value={formData.institutionCode}
                  onChange={(e) => setFormData({ ...formData, institutionCode: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono uppercase tracking-wider text-sm appearance-none cursor-pointer"
                >
                  {schools.map((s, idx) => (
                    <option key={idx} value={s.code} className="bg-slate-900 text-white">
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <span className="absolute right-4 top-3.5 text-slate-400 pointer-events-none text-xs">▼</span>
              </div>
            </div>

            {/* ROLE DISPLAY & SECURITY NOTICE */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                Enrollment Track *
              </label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-600/15 border border-purple-500/40 text-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  <div>
                    <p className="text-xs font-black text-white">Student / Scholar Portal</p>
                    <p className="text-[10px] text-purple-300">Self-service registration enabled for students & parents</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-400/40">
                  Role: STU
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 ml-1 leading-relaxed">
                <span className="text-amber-400 font-bold">Staff / Faculty Notice:</span> Teacher, Accountant, and Principal accounts are provisioned directly by School Administration or the Master Setup Gateway.
              </p>
            </div>

            {/* PERSONAL CODE (TIER 2) */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                  Assigned Personal Code (Roll No / ID) *
                </label>
                <span className="text-[10px] text-purple-400 font-bold">{getPersonalCodeHint()}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">👤</span>
                <input
                  type="text"
                  required
                  placeholder={getPersonalCodeHint()}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono uppercase tracking-wider text-sm"
                  value={formData.personalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, personalCode: e.target.value.toUpperCase().trim() })
                  }
                />
              </div>
            </div>

            {/* FULL NAME */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Aarav Mehta"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                Email Address *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">✉️</span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                Set Account Password *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">🔑</span>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 px-4 rounded-xl shadow-xl shadow-purple-600/30 disabled:opacity-50 transition-all mt-4 border border-purple-400/30 text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Enrolling into Campus Directory...</span>
                </>
              ) : (
                <span>Activate Account & Enter Portal 🚀</span>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Already registered?{" "}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
                  Sign in here →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

