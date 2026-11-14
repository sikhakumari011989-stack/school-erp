import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { safeStorage } from "../utils/safeStorage";
import { normalizeRole } from "../utils/credentials";
import BrandLogo from "./BrandLogo";
import {
  FileText,
  Receipt,
  GraduationCap,
  Upload,
  Eye,
  CheckCircle2,
  Palette,
  ShieldCheck,
  Building,
  Save,
  X,
  FileCheck,
} from "lucide-react";

import {
  DEFAULT_PDF_TEMPLATES,
  getSchoolPdfTemplates,
  saveSchoolPdfTemplates,
} from "../utils/pdfTemplateService.js";

export { DEFAULT_PDF_TEMPLATES };

export default function CustomPdfTemplateManager({ schoolCode }) {
  const context = useContext(AppContext);
  const user = context?.user;
  const tenant = context?.tenant;
  const { showToast } = useToast();

  const activeSchoolCode = (
    schoolCode ||
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const canonicalRole = normalizeRole(user?.role || user?.role_code);
  const canEditTemplates =
    canonicalRole === "PRIN" ||
    canonicalRole === "HOD" ||
    canonicalRole === "MASTER_OWNER";

  const [activeTab, setActiveTab] = useState("feeReceipt"); // 'feeReceipt' | 'reportCard'
  const [templateConfig, setTemplateConfig] = useState(DEFAULT_PDF_TEMPLATES);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved template config for this specific institution
  useEffect(() => {
    try {
      const stored = safeStorage.getItem(`erp_pdf_template_${activeSchoolCode}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplateConfig({
          feeReceipt: { ...DEFAULT_PDF_TEMPLATES.feeReceipt, ...(parsed.feeReceipt || {}) },
          reportCard: { ...DEFAULT_PDF_TEMPLATES.reportCard, ...(parsed.reportCard || {}) },
        });
      }
    } catch (err) {
      console.warn("Failed to load PDF templates:", err);
    }
  }, [activeSchoolCode]);

  const handleUpdateField = (docType, field, value) => {
    setTemplateConfig((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value,
      },
    }));
  };

  const handleSampleFileUpload = (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Uploaded sample layout must be smaller than 5 MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      handleUpdateField(docType, "sampleTemplateName", file.name);
      handleUpdateField(docType, "sampleTemplateData", dataUrl);
      showToast(`Attached custom sample template: ${file.name}`, "success");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplates = () => {
    if (!canEditTemplates) {
      showToast("Access Denied: Only leadership (Principal/Trustee) can modify document templates.", "error");
      return;
    }

    setSaving(true);
    try {
      safeStorage.setItem(
        `erp_pdf_template_${activeSchoolCode}`,
        JSON.stringify(templateConfig)
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("erp-pdf-template-updated", {
            detail: { schoolCode: activeSchoolCode, templateConfig },
          })
        );
      }
      showToast("Custom PDF Document Templates saved successfully!", "success");
    } catch (err) {
      console.error("Save template error:", err);
      showToast("Failed to save template configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = templateConfig[activeTab];

  return (
    <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileCheck className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Multi-Tenant Institutional Typography
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Custom PDF Document Templates & Sample Layout Mapping
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize header titles, statutory affiliation text, accent themes, and upload sample layout formats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Document Preview</span>
          </button>
          {canEditTemplates && (
            <button
              onClick={handleSaveTemplates}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Template"}</span>
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENT TYPE SELECTOR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("feeReceipt")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "feeReceipt"
              ? "border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Fee Receipts & Tax Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab("reportCard")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "reportCard"
              ? "border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Academic Report Cards</span>
        </button>
      </div>

      {/* CONFIGURATION FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Text & Header Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Document Header Title
            </label>
            <input
              type="text"
              disabled={!canEditTemplates}
              value={currentTemplate.headerTitle}
              onChange={(e) => handleUpdateField(activeTab, "headerTitle", e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Affiliation & Board Sub-Header Text
            </label>
            <input
              type="text"
              disabled={!canEditTemplates}
              value={currentTemplate.affiliationText}
              onChange={(e) => handleUpdateField(activeTab, "affiliationText", e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeTab === "feeReceipt" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Receipt Number Prefix
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.receiptPrefix}
                    onChange={(e) => handleUpdateField(activeTab, "receiptPrefix", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.signatoryTitle}
                    onChange={(e) => handleUpdateField(activeTab, "signatoryTitle", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Payment Terms & Legal Footnote
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditTemplates}
                  value={currentTemplate.termsNote}
                  onChange={(e) => handleUpdateField(activeTab, "termsNote", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.academicYear}
                    onChange={(e) => handleUpdateField(activeTab, "academicYear", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Assessment Term
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.termName}
                    onChange={(e) => handleUpdateField(activeTab, "termName", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Principal Signatory Label
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.principalSignTitle}
                    onChange={(e) => handleUpdateField(activeTab, "principalSignTitle", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Class Teacher Signatory Label
                  </label>
                  <input
                    type="text"
                    disabled={!canEditTemplates}
                    value={currentTemplate.teacherSignTitle}
                    onChange={(e) => handleUpdateField(activeTab, "teacherSignTitle", e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Default Principal Remarks Template
                </label>
                <textarea
                  rows={2}
                  disabled={!canEditTemplates}
                  value={currentTemplate.remarksDefault}
                  onChange={(e) => handleUpdateField(activeTab, "remarksDefault", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Right Column: Theme Color & Custom Sample Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Document Accent Theme
            </label>
            <div className="flex items-center gap-3">
              {[
                { label: "Navy", color: "#1E3A8A" },
                { label: "Indigo", color: "#4F46E5" },
                { label: "Emerald", color: "#047857" },
                { label: "Purple", color: "#7C3AED" },
                { label: "Slate", color: "#334155" },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  disabled={!canEditTemplates}
                  onClick={() => handleUpdateField(activeTab, "accentColor", c.color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    currentTemplate.accentColor === c.color
                      ? "scale-110 border-white shadow-md ring-2 ring-indigo-500"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">
                {currentTemplate.accentColor}
              </span>
            </div>
          </div>

          {/* Sample Format File Upload */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Upload Custom Sample Format (PDF / Image)
              </span>
              {currentTemplate.sampleTemplateName && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Attached
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Attach a scanned sample copy or existing institution letterhead format for exact layout recreation and archival.
            </p>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Sample</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={!canEditTemplates}
                  onChange={(e) => handleSampleFileUpload(activeTab, e)}
                  className="hidden"
                />
              </label>

              {currentTemplate.sampleTemplateName && (
                <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={currentTemplate.sampleTemplateName}>
                  📄 {currentTemplate.sampleTemplateName}
                </div>
              )}
            </div>
          </div>

          {/* Security & Isolation Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>Multi-Tenant Document Isolation</span>
            </div>
            <p>
              Template configurations are isolated to school node <strong className="font-mono text-slate-700 dark:text-slate-200">{activeSchoolCode}</strong> and automatically apply whenever generating official PDF downloads.
            </p>
          </div>
        </div>
      </div>

      {/* LIVE PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0B101E] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Document Preview: {activeTab === "feeReceipt" ? "Fee Receipt / Tax Invoice" : "Academic Report Card"}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SIMULATED PDF CANVAS */}
            <div
              className="p-8 rounded-2xl border bg-white text-slate-900 shadow-md space-y-6 font-sans"
              style={{ borderTop: `6px solid ${currentTemplate.accentColor}` }}
            >
              {/* Header with School Logo & Title */}
              <div className="flex items-start justify-between border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <BrandLogo size="lg" schoolCode={activeSchoolCode} />
                  <div>
                    <h2
                      className="text-base font-black uppercase tracking-tight"
                      style={{ color: currentTemplate.accentColor }}
                    >
                      {currentTemplate.headerTitle}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {currentTemplate.affiliationText}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  <span>INSTITUTION CODE: {activeSchoolCode}</span>
                </div>
              </div>

              {/* Sample Body Content */}
              {activeTab === "feeReceipt" ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Receipt No</span>
                      <span className="font-mono font-bold">{currentTemplate.receiptPrefix}-2026-00412</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Student Name</span>
                      <span className="font-bold">Aarav Sharma (Grade 10-A)</span>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2">Fee Description</th>
                        <th className="py-2 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      <tr>
                        <td className="py-2 font-medium">Term II Composite Tuition Fee</td>
                        <td className="py-2 text-right font-mono">₹28,500.00</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">IT & Laboratory Infrastructure Cess</td>
                        <td className="py-2 text-right font-mono">₹4,500.00</td>
                      </tr>
                      <tr className="font-bold text-slate-900 border-t-2">
                        <td className="py-2">Total Reconciled Amount</td>
                        <td className="py-2 text-right font-mono text-emerald-600">₹33,000.00</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-3 rounded-xl bg-slate-50 border text-[10px] text-slate-500 leading-relaxed">
                    <strong>Payment Terms:</strong> {currentTemplate.termsNote}
                  </div>

                  <div className="flex justify-between items-end pt-4">
                    <div className="text-[10px] text-slate-400">
                      <span>✓ Cryptographically Sealed & Verified</span>
                    </div>
                    <div className="text-center text-xs">
                      <div className="w-32 border-b border-slate-400 mb-1"></div>
                      <span className="text-[10px] font-bold text-slate-600">{currentTemplate.signatoryTitle}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Student Name</span>
                      <span className="font-bold">Ananya Verma</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Class & Roll</span>
                      <span className="font-bold">Class 10-A • Roll 14</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Academic Year</span>
                      <span className="font-bold">{currentTemplate.academicYear}</span>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2">Subject</th>
                        <th className="py-2 text-center">Max Marks</th>
                        <th className="py-2 text-center">Marks Obtained</th>
                        <th className="py-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      <tr>
                        <td className="py-1.5 font-medium">Mathematics</td>
                        <td className="py-1.5 text-center font-mono">100</td>
                        <td className="py-1.5 text-center font-mono font-bold">94</td>
                        <td className="py-1.5 text-right font-bold text-indigo-600">A1</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium">Physics & Chemistry</td>
                        <td className="py-1.5 text-center font-mono">100</td>
                        <td className="py-1.5 text-center font-mono font-bold">89</td>
                        <td className="py-1.5 text-right font-bold text-indigo-600">A1</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium">English Literature</td>
                        <td className="py-1.5 text-center font-mono">100</td>
                        <td className="py-1.5 text-center font-mono font-bold">88</td>
                        <td className="py-1.5 text-right font-bold text-indigo-600">A2</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-3 rounded-xl bg-slate-50 border text-[10px] text-slate-600">
                    <strong>Principal's Remarks:</strong> {currentTemplate.remarksDefault}
                  </div>

                  <div className="grid grid-cols-2 pt-6 text-center text-xs">
                    <div>
                      <div className="w-28 mx-auto border-b border-slate-400 mb-1"></div>
                      <span className="text-[10px] font-bold text-slate-600">{currentTemplate.teacherSignTitle}</span>
                    </div>
                    <div>
                      <div className="w-28 mx-auto border-b border-slate-400 mb-1"></div>
                      <span className="text-[10px] font-bold text-slate-600">{currentTemplate.principalSignTitle}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
