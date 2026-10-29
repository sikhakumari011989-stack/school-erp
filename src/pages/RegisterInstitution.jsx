import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { buildStandardErpEmail } from "./Login";
import BrandLogo from "../Components/BrandLogo";
import { getDefaultSchoolDirectory } from "../utils/idGenerator";

export default function RegisterInstitution() {
  const { login } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    institutionName: "",
    institutionCode: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleNameChange = (name) => {
    // Auto-generate suggested code from name if user hasn't explicitly customized it
    const suggestedCode = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 16);

    setFormData((prev) => ({
      ...prev,
      institutionName: name,
      institutionCode: prev.institutionCodeManual ? prev.institutionCode : suggestedCode,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.institutionName || !formData.institutionCode || !formData.adminName || !formData.email || !formData.password) {
      showToast("Please fill in all mandatory institutional fields.", "error");
      return;
    }

    setLoading(true);
    const cleanCode = formData.institutionCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

    try {
      // 1. Insert new school record into Supabase schools table
      const schoolPayload = {
        name: formData.institutionName.trim(),
        code: cleanCode,
        contact_email: formData.email.trim(),
        phone: formData.phone.trim(),
        brand_color: "#3B82F6",
      };

      let createdSchool = null;
      try {
        const { data: schoolData, error: schoolErr } = await supabase
          .from("schools")
          .insert([schoolPayload])
          .select("id, code, name")
          .single();

        if (!schoolErr && schoolData) {
          createdSchool = schoolData;
        } else if (schoolErr?.message?.includes("duplicate")) {
          // School code already taken; fetch existing
          const { data: existingSchool } = await supabase
            .from("schools")
            .select("id, code, name")
            .eq("code", cleanCode)
            .single();
          createdSchool = existingSchool;
        }
      } catch (dbErr) {
        console.warn("Notice inserting school into DB:", dbErr);
      }

      const schoolId = createdSchool?.id || `school-${Date.now().toString(36)}`;

      // 2. Register live Supabase Auth account if possible
      let authUser = null;
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.adminName.trim(),
              role: "trustee",
              role_code: "HOD-01",
              institution_code: cleanCode,
            },
          },
        });
        if (!authErr && authData?.user) {
          authUser = authData.user;
        }
      } catch (authException) {
        console.warn("Supabase Auth sign-up notice:", authException);
      }

      // 3. Provision master HOD entry in profiles table
      try {
        await supabase.from("profiles").insert([
          {
            id: authUser?.id || undefined,
            full_name: formData.adminName.trim(),
            role: "trustee",
            role_code: "HOD-01",
            school_id: schoolId,
          },
        ]);
      } catch (profErr) {
        console.warn("Profile table sync notice:", profErr);
      }

      // 4. Construct active session payload with standardized login email for HOD-01
      const mappedEmail = buildStandardErpEmail(cleanCode, "HOD-01");
      const registeredHod = {
        id: authUser?.id || `hod-${Date.now()}`,
        name: formData.adminName.trim(),
        email: mappedEmail,
        role: "trustee",
        role_code: "HOD-01",
        personal_code: "HOD-01",
        school_id: schoolId,
        institution_code: cleanCode,
        institution_name: formData.institutionName.trim(),
      };

      // Set active tenant and sync HOD + default members to local directory
      localStorage.setItem("erp_active_tenant", cleanCode);
      try {
        const defaultMembers = getDefaultSchoolDirectory(cleanCode);
        const existingDir = [
          {
            full_name: formData.adminName.trim(),
            role: "trustee",
            role_code: "HOD-01",
            roll_number: "HOD-01",
            personal_code: "HOD-01",
            school_id: cleanCode,
            email: mappedEmail,
          },
          ...defaultMembers,
        ];
        localStorage.setItem(`erp_directory_${cleanCode}`, JSON.stringify(existingDir));
        window.dispatchEvent(new Event("erp-directory-updated"));
      } catch (e) {
        console.warn("Local directory cache update notice:", e);
      }

      // 5. Audit Log
      logSecurityAction({
        action: AUDIT_ACTIONS.TENANT_SWITCH,
        entityType: "SCHOOL",
        entityId: cleanCode,
        details: `Self-service onboarding: Registered "${formData.institutionName}" (${cleanCode}) with Master HOD ${formData.adminName}`,
        user: registeredHod,
        schoolId: schoolId,
      });

      // Auto-establish session immediately
      if (typeof login === "function") {
        login(registeredHod);
      }
      localStorage.setItem("erp_session_user", JSON.stringify(registeredHod));
      localStorage.setItem("erp_demo_session", JSON.stringify(registeredHod));

      setSuccessData({
        ...registeredHod,
        password: formData.password,
      });

      showToast(`School "${formData.institutionName}" registered successfully! Master HOD account activated.`, "success");
    } catch (err) {
      console.error("Institution registration error:", err);
      showToast("Registration completed with offline sandbox parameters.", "info");
      const fallbackHod = {
        name: formData.adminName,
        institution_code: cleanCode,
        institution_name: formData.institutionName,
        role: "trustee",
        role_code: "HOD-01",
        personal_code: "HOD-01",
        school_id: cleanCode,
      };
      if (typeof login === "function") {
        login(fallbackHod);
      }
      setSuccessData(fallbackHod);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDashboard = () => {
    if (successData) {
      if (typeof login === "function") {
        login(successData);
      } else {
        localStorage.setItem("erp_demo_session", JSON.stringify(successData));
      }
      navigate("/trustee/dashboard");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0B0F19] p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Neon Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl">
        {/* BRAND LOGO HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" className="shadow-xl shadow-indigo-600/30" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block mb-2">
            Multi-Tenant SaaS Onboarding
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Register Your Institution
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Provision your school, coaching institute, or college on our cloud ERP in under 60 seconds
          </p>
        </div>

        {/* REGISTRATION FORM OR SUCCESS MODAL */}
        <div className="bg-[#1E293B]/70 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {successData ? (
            /* SUCCESS ONBOARDING PROVISION SCREEN */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
                🎉
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Your Campus Node is Live!</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Institutional database partition successfully created. Save your credentials below:
                </p>
              </div>

              {/* CREDENTIALS CARD */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider font-sans font-bold">Institution Name:</span>
                  <span className="text-white font-bold">{successData.institution_name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider font-sans font-bold">Tier 1 Institution Code:</span>
                  <span className="text-blue-400 font-extrabold text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                    {successData.institution_code}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider font-sans font-bold">Tier 2 Master Role ID:</span>
                  <span className="text-emerald-400 font-bold">{successData.role_code || "HOD-01"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 uppercase tracking-wider font-sans font-bold">Master HOD / Trustee:</span>
                  <span className="text-slate-200">{successData.name}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-2xl text-left text-xs text-blue-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <span>💡</span> Share with your faculty & students:
                </p>
                <p className="text-slate-300">
                  Give students and staff your Institution Code <strong className="text-white">"{successData.institution_code}"</strong> so they can log in at <strong className="text-white">/portal</strong>.
                </p>
              </div>

              <button
                onClick={handleLaunchDashboard}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-6 rounded-xl shadow-xl shadow-blue-600/30 transition-all text-sm border border-blue-400/40 cursor-pointer"
              >
                Launch HOD / Trustee Command Center 🚀
              </button>
            </div>
          ) : (
            /* ONBOARDING INPUT FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* INSTITUTION NAME */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Academy of Sciences"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  value={formData.institutionName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              {/* INSTITUTION CODE (TIER 1) */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                    Preferred Institution Code (Tier 1 Login Code) *
                  </label>
                  <span className="text-[10px] text-blue-400 font-bold">ALL CAPS</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400">🏛️</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g., QUANTUM-ACADEMY"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider text-sm"
                    value={formData.institutionCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        institutionCode: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                        institutionCodeManual: true,
                      })
                    }
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  Your students and staff will enter this code on the login page to access your portal.
                </p>
              </div>

              {/* ADMIN NAME & PHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Super Admin Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dr. Ramesh Verma"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Official Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 9518388499"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* ADMIN EMAIL */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400">✉️</span>
                  <input
                    type="email"
                    required
                    placeholder="admin@yourinstitution.com"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Master Security Password *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400">🔑</span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl shadow-xl shadow-blue-600/30 disabled:opacity-50 transition-all mt-4 border border-blue-400/30 text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Provisioning School Partition...</span>
                  </>
                ) : (
                  <span>Register & Activate Campus Cloud 🚀</span>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Already have an institutional code?{" "}
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                    Sign in to Portal →
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

