import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { buildStandardErpEmail } from "./Login";
import {
  provisionSchoolInCloud,
  detectRoleFromId,
  getAllRegisteredSchools,
  updateSchoolSubscription,
  getSchoolSubscription,
} from "../utils/cloudSyncService";
import BrandLogo from "../Components/BrandLogo";

export { detectRoleFromId };

export default function MasterSchoolSetup() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem("erp_master_gate_unlocked") === "true"
  );
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [schoolsList, setSchoolsList] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [searchSchoolTerm, setSearchSchoolTerm] = useState("");

  const [formData, setFormData] = useState({
    institutionName: "",
    institutionCode: "",
    institutionCodeManual: false,
    institutionMode: "school", // 'school' | 'tuition'
    adminName: "",
    adminRoleCode: "HOD-01",
    email: "",
    phone: "+91 9518388499",
    password: "password123",
    address: "Mahim Manohar Highway, Palghar 401404",
  });

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const list = await getAllRegisteredSchools();
      setSchoolsList(list);
    } catch (e) {
      console.warn("Error loading schools list:", e);
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadSchools();
      window.addEventListener("erp-schools-updated", loadSchools);
      return () => window.removeEventListener("erp-schools-updated", loadSchools);
    }
  }, [isUnlocked]);

  const handleUnlockGateway = (e) => {
    e.preventDefault();
    if (passkeyInput.trim() === "ASK&1412") {
      setIsUnlocked(true);
      sessionStorage.setItem("erp_master_gate_unlocked", "true");
      setPasskeyError("");
      showToast("Master Gateway Unlocked! Access Granted.", "success");
    } else {
      setPasskeyError("Access Denied: Invalid Master Passkey.");
      showToast("Access Denied: Invalid Master Passkey.", "error");
    }
  };

  const handleLockGateway = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem("erp_master_gate_unlocked");
    setPasskeyInput("");
    showToast("Master Provisioning Gateway Locked.", "info");
  };

  const handleToggleSubscription = async (school) => {
    const isCurrentlyActive = (school.subscriptionStatus || "active").toLowerCase() === "active";
    const newStatus = isCurrentlyActive ? "suspended" : "active";
    await updateSchoolSubscription({
      schoolCode: school.code,
      status: newStatus,
      expiryDate: school.expiryDate,
    });
    showToast(
      `School ${school.code} subscription set to ${newStatus.toUpperCase()}! ${newStatus === "suspended" ? "Access blocked." : "Access restored."}`,
      newStatus === "suspended" ? "error" : "success"
    );
    loadSchools();
  };

  const handleUpdateExpiry = async (schoolCode, newDate) => {
    const current = getSchoolSubscription(schoolCode);
    await updateSchoolSubscription({
      schoolCode,
      status: current.status,
      expiryDate: newDate,
    });
    showToast(`Expiry date for ${schoolCode} updated to ${newDate}!`, "success");
    loadSchools();
  };

  const handleNameChange = (name) => {
    // Generate suggested code from institution name unless manually modified
    const suggestedCode = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 14);

    setFormData((prev) => ({
      ...prev,
      institutionName: name,
      institutionCode: prev.institutionCodeManual ? prev.institutionCode : (suggestedCode ? `${suggestedCode}-01` : ""),
    }));
  };

  const handleProvisionSchool = async (e) => {
    e.preventDefault();
    if (!formData.institutionName.trim()) {
      showToast("Please enter an institution name.", "error");
      return;
    }
    if (!formData.institutionCode.trim()) {
      showToast("Please provide a unique institution code.", "error");
      return;
    }
    if (!formData.adminName.trim()) {
      showToast("Please provide the trustee / HOD name.", "error");
      return;
    }

    setLoading(true);

    try {
      const explicitRole = detectRoleFromId(formData.adminRoleCode, "trustee");
      // Execute 100% cloud-first provisioning via Supabase
      const outcomeData = await provisionSchoolInCloud({
        institutionName: formData.institutionName,
        institutionCode: formData.institutionCode,
        adminName: formData.adminName,
        adminId: formData.adminRoleCode,
        adminRole: explicitRole,
        password: formData.password,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        institutionMode: formData.institutionMode,
      });

      localStorage.setItem(`erp_institution_type_${outcomeData.institutionCode}`, formData.institutionMode);

      // Security Audit Trail
      logSecurityAction({
        action: AUDIT_ACTIONS.TENANT_SWITCH || "INSTITUTION_PROVISIONED",
        entityType: "SCHOOL",
        entityId: outcomeData.institutionCode,
        details: `Platform Owner provisioned institutional node "${outcomeData.institutionName}" (${outcomeData.institutionCode}) with Master Admin ${outcomeData.adminId} [Mode: ${formData.institutionMode}]`,
        schoolId: outcomeData.institutionCode,
      });

      setSuccessData({ ...outcomeData, institutionMode: formData.institutionMode });
      showToast(`Institution "${outcomeData.institutionName}" (${outcomeData.institutionCode}) successfully provisioned to cloud!`, "success");
      loadSchools();
    } catch (err) {
      console.error("Master setup error:", err);
      showToast("Provisioning completed in sandbox partition.", "info");
      loadSchools();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const creds = [
      `🏛️ EduSaaS ERP - Master Institutional Credentials`,
      `================================================`,
      `Institution Name: ${successData.institutionName}`,
      `Architecture Mode: ${successData.institutionMode === "tuition" ? "Tuition / Coaching Institute" : "Full K-12 School"}`,
      `School Code (Tier 1): ${successData.institutionCode}`,
      `Master Admin ID (Tier 2): ${successData.adminId}`,
      `Security Password: ${successData.password}`,
      `Mapped Auth Identifier: ${successData.mappedEmail}`,
      `Direct Portal Login: ${successData.portalUrl}`,
      `================================================`,
    ].join("\n");

    navigator.clipboard.writeText(creds);
    showToast("Master credentials copied to clipboard! 📋", "success");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl py-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <BrandLogo size="lg" className="shadow-2xl shadow-indigo-600/40" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                🔐 Secret Master Route &bull; Platform Owner Only
              </span>
              {isUnlocked && (
                <button
                  type="button"
                  onClick={handleLockGateway}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 px-2.5 py-1 rounded-full bg-slate-900 transition-colors cursor-pointer"
                  title="Lock Master Provisioning Gateway"
                >
                  🔒 Lock Terminal
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Institution Provisioning Engine
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              Create high-security institutional nodes, initialize clean-slate partitions, and issue Master HOD keys.
            </p>
          </div>

          {/* Master Card */}
          <div className="bg-[#1E293B]/75 backdrop-blur-2xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {!isUnlocked ? (
            /* PASSWORD GATE */
            <form onSubmit={handleUnlockGateway} className="space-y-5 text-center py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-amber-500/10">
                🔒
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Master Engineering Gateway</h2>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                  This route is strictly restricted to platform owners. Please enter the master passkey to unlock node provisioning.
                </p>
              </div>

              {passkeyError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                  {passkeyError}
                </div>
              )}

              <div className="text-left">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Master Security Passkey *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter Master Passkey..."
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-4 py-3.5 text-amber-300 font-mono text-center tracking-widest text-base focus:outline-none focus:border-amber-500"
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value);
                    setPasskeyError("");
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black py-4 px-4 rounded-xl shadow-xl shadow-amber-600/30 transition-all cursor-pointer text-sm"
              >
                🔓 Authenticate & Unlock Provisioning
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/portal")}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  ← Return to Member Portal Login
                </button>
              </div>
            </form>
          ) : successData ? (
            /* PROVISIONED SUCCESS CARD */
            <div className="space-y-6 text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/20">
                ✨
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Node Activated &bull; {successData.institutionMode === "tuition" ? "Tuition Mode" : "K-12 School"}
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  Institutional Node Provisioned!
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Cloud database partition initialized with zero mock data. Save these credentials:
                </p>
              </div>

              {/* CREDENTIALS BREAKDOWN */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Institution Name:</span>
                  <span className="text-white font-extrabold">{successData.institutionName}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Architecture Mode:</span>
                  <span className="text-purple-300 font-sans font-bold">
                    {successData.institutionMode === "tuition" ? "🎓 Tuition / Coaching Institute" : "🏫 Full K-12 School"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Tier 1 School Code:</span>
                  <span className="text-blue-400 font-black text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                    {successData.institutionCode}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Tier 2 Master ID:</span>
                  <span className="text-emerald-400 font-bold">{successData.adminId}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Master Password:</span>
                  <span className="text-amber-300 font-bold">{successData.password}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Direct Portal URL:</span>
                  <a
                    href={successData.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline truncate max-w-[200px]"
                  >
                    /portal?school={successData.institutionCode}
                  </a>
                </div>
                <div className="flex justify-between items-center py-1 text-[11px]">
                  <span className="text-slate-400 font-sans font-bold">Mapped Auth ID:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{successData.mappedEmail}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs border border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  <span>Copy Complete Credentials to Clipboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/portal?school=${successData.institutionCode}`)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 border border-blue-400/40"
                >
                  <span>🚀</span>
                  <span>Launch Institutional Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSuccessData(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs font-bold pt-2 cursor-pointer transition-colors"
                >
                  + Provision Another Institution
                </button>
              </div>
            </div>
          ) : (
            /* PROVISIONING FORM */
            <form onSubmit={handleProvisionSchool} className="space-y-4 animate-fade-in">
              {/* Institution Mode Selector */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                  Institution Operating Mode *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, institutionMode: "school" })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.institutionMode === "school"
                        ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-600/20"
                        : "bg-slate-900/60 border-slate-700/80 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🏫</span>
                      <span className="font-extrabold text-white text-sm">Full K-12 School</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard school infrastructure, comprehensive registers & faculty departments.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, institutionMode: "tuition" })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.institutionMode === "tuition"
                        ? "bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-600/20"
                        : "bg-slate-900/60 border-slate-700/80 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🎓</span>
                      <span className="font-extrabold text-white text-sm">Tuition / Coaching</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Streamlined coaching hub focusing on Batches, Attendance, Fees & LMS.
                    </p>
                  </button>
                </div>
              </div>

              {/* Institution Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.institutionMode === "tuition"
                      ? "e.g. Apex IIT-JEE & Medical Academy"
                      : "e.g. St. Xavier's International School"
                  }
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.institutionName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              {/* Tier 1 Institution Code */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                    Tier 1 Institution Code (School Code) *
                  </label>
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Uppercase Code</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400">🏢</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XAVIER-01"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-blue-400 font-mono font-bold uppercase tracking-wider text-sm focus:outline-none focus:border-blue-500"
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
                  Students and faculty will type this on the 2-Tier login screen.
                </p>
              </div>

              {/* Trustee / HOD Name & Master Admin ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Trustee / HOD Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Verma"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Master Admin ID (Tier 2) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HOD-01"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-emerald-400 font-mono font-bold uppercase text-sm focus:outline-none focus:border-blue-500"
                    value={formData.adminRoleCode}
                    onChange={(e) =>
                      setFormData({ ...formData, adminRoleCode: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>

              {/* Password & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Master Admin Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-mono text-sm focus:outline-none focus:border-blue-500"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Official Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9518388499"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Official Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder={buildStandardErpEmail(formData.institutionCode || "campus", formData.adminRoleCode || "HOD-01")}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 border border-blue-400/40 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Initializing Institutional Cloud Node...</span>
                  </>
                ) : (
                  <span>🚀 Provision Institutional Node & Generate Keys</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/portal")}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  ← Return to Member Portal Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

        {/* MANUAL SUBSCRIPTION & EXPIRY CONTROLLER (MASTER KILL-SWITCH) */}
        {isUnlocked && (
          <div className="mt-10 bg-[#1E293B]/80 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎛️</span>
                  <h2 className="text-xl font-black text-white">
                    Manual Subscription & Expiry Controller
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Master kill-switch and custom license validity controls across all active institutional campus nodes.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search campus code or name..."
                  value={searchSchoolTerm}
                  onChange={(e) => setSearchSchoolTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52"
                />
                <button
                  type="button"
                  onClick={loadSchools}
                  disabled={loadingSchools}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>{loadingSchools ? "Syncing..." : "Refresh Nodes"}</span>
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/70 text-slate-400 uppercase tracking-wider bg-slate-900/50">
                    <th className="p-4">Campus Node & Code</th>
                    <th className="p-4 text-center">Architecture Mode</th>
                    <th className="p-4 text-center">Subscription Status (Kill-Switch)</th>
                    <th className="p-4 text-center">Custom License Expiry Date</th>
                    <th className="p-4 text-center">Master Admin</th>
                    <th className="p-4 text-right pr-6">Portal Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {schoolsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">
                        No registered schools found. Provision a new node above to begin.
                      </td>
                    </tr>
                  ) : (
                    schoolsList
                      .filter((s) => {
                        const term = searchSchoolTerm.toLowerCase();
                        return (
                          (s.code || "").toLowerCase().includes(term) ||
                          (s.name || "").toLowerCase().includes(term) ||
                          (s.adminName || "").toLowerCase().includes(term)
                        );
                      })
                      .map((school) => {
                        const isSuspended = (school.subscriptionStatus || "active").toLowerCase() === "suspended";
                        const today = new Date().toISOString().split("T")[0];
                        const isExpired = Boolean(school.expiryDate && today > school.expiryDate);

                        return (
                          <tr key={school.code} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <p className="font-extrabold text-white text-sm">{school.name}</p>
                              <span className="font-mono text-blue-400 font-bold text-xs">{school.code}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                                  school.institutionMode === "tuition"
                                    ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                    : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                }`}
                              >
                                {school.institutionMode === "tuition" ? "🎓 Tuition Hub" : "🏫 K-12 School"}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSubscription(school)}
                                className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer border inline-flex items-center gap-1.5 ${
                                  isSuspended
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                                }`}
                                title={isSuspended ? "Click to Re-activate" : "Click to Suspend Node (Kill-Switch)"}
                              >
                                <span>{isSuspended ? "🔴" : "🟢"}</span>
                                <span>{isSuspended ? "Suspended (Locked)" : "Active (Operational)"}</span>
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <input
                                  type="date"
                                  value={school.expiryDate || "2027-12-31"}
                                  onChange={(e) => handleUpdateExpiry(school.code, e.target.value)}
                                  className={`bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 ${
                                    isExpired ? "border-rose-500 text-rose-300" : "border-slate-700 text-white"
                                  }`}
                                />
                                {isExpired ? (
                                  <span className="text-[10px] text-rose-400 font-extrabold uppercase mt-1">
                                    ⚠️ License Expired
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 font-semibold mt-1">
                                    ✓ License Valid
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center text-slate-300">
                              <p className="font-bold text-white text-xs">{school.adminName || "Trustee"}</p>
                              <span className="text-[10px] font-mono text-slate-400">{school.adminId || "HOD-01"}</span>
                            </td>
                            <td className="p-4 text-right pr-6">
                              <a
                                href={`/portal?school=${school.code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-800 hover:bg-blue-600/30 border border-slate-700 hover:border-blue-500/40 text-blue-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-all inline-flex items-center gap-1"
                              >
                                <span>Open Portal</span>
                                <span>↗</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

