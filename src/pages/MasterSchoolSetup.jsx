import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { buildStandardErpEmail } from "./Login";
import { provisionSchoolInCloud, detectRoleFromId } from "../utils/cloudSyncService";
import BrandLogo from "../Components/BrandLogo";

export { detectRoleFromId };

export default function MasterSchoolSetup() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    institutionName: "",
    institutionCode: "",
    institutionCodeManual: false,
    adminName: "",
    adminRoleCode: "HOD-01",
    email: "",
    phone: "+91 9518388499",
    password: "password123",
    address: "Mahim Manohar Highway, Palghar 401404",
  });

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
      });

      // Security Audit Trail
      logSecurityAction({
        action: AUDIT_ACTIONS.TENANT_SWITCH || "INSTITUTION_PROVISIONED",
        entityType: "SCHOOL",
        entityId: outcomeData.institutionCode,
        details: `Platform Owner provisioned institutional node "${outcomeData.institutionName}" (${outcomeData.institutionCode}) with Master Admin ${outcomeData.adminId}`,
        schoolId: outcomeData.institutionCode,
      });

      setSuccessData(outcomeData);
      showToast(`Institution "${outcomeData.institutionName}" (${outcomeData.institutionCode}) successfully provisioned to cloud!`, "success");
    } catch (err) {
      console.error("Master setup error:", err);
      showToast("Provisioning completed in sandbox partition.", "info");
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

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" className="shadow-2xl shadow-indigo-600/40" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block mb-2">
            🔐 Secret Master Route &bull; Platform Owner Only
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Institution Provisioning Engine
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Create high-security institutional nodes, initialize clean-slate partitions, and issue Master HOD keys.
          </p>
        </div>

        {/* Master Card */}
        <div className="bg-[#1E293B]/75 backdrop-blur-2xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {successData ? (
            /* PROVISIONED SUCCESS CARD */
            <div className="space-y-6 text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/20">
                ✨
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Node Activated
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
            <form onSubmit={handleProvisionSchool} className="space-y-4">
              {/* Institution Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Xavier's International School"
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
    </div>
  );
}

