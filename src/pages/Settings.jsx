import React, { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { safeStorage } from "../utils/safeStorage";
import CustomLogoUploader from "../Components/CustomLogoUploader";
import CustomPdfTemplateManager from "../Components/CustomPdfTemplateManager";
import { Settings as SettingsIcon, Save, Building, ShieldCheck, CreditCard } from "lucide-react";

export default function Settings() {
  const context = useContext(AppContext);
  const user = context?.user;
  const tenant = context?.tenant;
  const { showToast } = useToast();

  const activeSchoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [schoolName, setSchoolName] = useState(() => {
    return (
      tenant?.name ||
      tenant?.institution_name ||
      safeStorage.getItem(`erp_school_name_${activeSchoolCode}`) ||
      "My Institutional Campus"
    );
  });

  const [academicYear, setAcademicYear] = useState(() => {
    return safeStorage.getItem(`erp_academic_year_${activeSchoolCode}`) || "2025-2026";
  });

  const [fees, setFees] = useState(() => {
    const saved = safeStorage.getJSON(`erp_fee_structure_${activeSchoolCode}`);
    return (
      saved || {
        tuition: 30000,
        exam: 5000,
        labEquipment: 10000,
      }
    );
  });

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = () => {
    setSaving(true);
    try {
      safeStorage.setItem(`erp_school_name_${activeSchoolCode}`, schoolName);
      safeStorage.setItem(`erp_academic_year_${activeSchoolCode}`, academicYear);
      safeStorage.setJSON(`erp_fee_structure_${activeSchoolCode}`, fees);

      if (context?.setTenant && tenant) {
        context.setTenant({
          ...tenant,
          name: schoolName,
          institution_name: schoolName,
        });
      }

      showToast("Institutional preferences saved successfully!", "success");
    } catch (err) {
      console.error("Save settings error:", err);
      showToast("Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <SettingsIcon className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Institutional Preferences
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            System Settings & White-Label Configuration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Manage school identity, institutional branding logo, custom PDF templates, and baseline fees for node <strong className="font-mono text-purple-600 dark:text-purple-400">{activeSchoolCode}</strong>.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Preferences"}</span>
        </motion.button>
      </div>

      {/* SECTION 1: SCHOOL BRAND & CUSTOM LOGO */}
      <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
            Branding & Multi-Tenant White-Labeling
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Institutional Brand Logo Replacement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload your institution's official logo. The custom logo immediately propagates across login portals, top navigation bars, student report cards, and fee receipts.
          </p>
        </div>
        <CustomLogoUploader schoolCode={activeSchoolCode} />
      </div>

      {/* SECTION 2: SCHOOL INFO & FEE STRUCTURE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Info */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Campus Information</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                School / Institution Name
              </label>
              <input
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs font-medium transition"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Official School Name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Active Academic Year
              </label>
              <input
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs font-medium transition"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2025-2026"
              />
            </div>
          </div>
        </div>

        {/* Fee Structure */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Default Term Fee Schedule</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Standard Tuition Fee (₹)
              </label>
              <input
                type="number"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs font-medium transition"
                value={fees.tuition}
                onChange={(e) => setFees({ ...fees, tuition: Number(e.target.value) })}
                placeholder="Tuition Fee"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Exam Fee (₹)
                </label>
                <input
                  type="number"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs font-medium transition"
                  value={fees.exam}
                  onChange={(e) => setFees({ ...fees, exam: Number(e.target.value) })}
                  placeholder="Exam Fee"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Lab & IT Fee (₹)
                </label>
                <input
                  type="number"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs font-medium transition"
                  value={fees.labEquipment}
                  onChange={(e) => setFees({ ...fees, labEquipment: Number(e.target.value) })}
                  placeholder="Laboratory Fee"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: CUSTOM PDF DOCUMENT TEMPLATES */}
      <CustomPdfTemplateManager schoolCode={activeSchoolCode} />
    </div>
  );
}
