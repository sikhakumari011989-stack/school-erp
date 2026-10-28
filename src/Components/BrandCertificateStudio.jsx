import React, { useState, useContext, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { generateReportCardPDF, generateFeeInvoicePDF, resolveInstitutionName } from "../utils/pdfGenerator";
import CertificateManagementCard from "./CertificateManagementCard";
import CustomLogoUploader from "./CustomLogoUploader";
import { FileText, Receipt, Award, Image as ImageIcon, Sparkles, ShieldCheck, Download } from "lucide-react";

export default function BrandCertificateStudio({ schoolId: propSchoolId, mode = "principal" }) {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = (propSchoolId || user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();
  const schoolName = resolveInstitutionName({
    ...tenant,
    institution_name: user?.institution_name || user?.school_name || tenant?.name,
  });

  const [activeSubTab, setActiveSubTab] = useState("preview"); // 'preview' | 'certificates' | 'logo'
  const [schoolLogo, setSchoolLogo] = useState(null);

  useEffect(() => {
    const loadLogo = () => {
      try {
        const stored =
          localStorage.getItem(`erp_logo_${activeSchoolId}`) ||
          localStorage.getItem(`erp_school_logo_${activeSchoolId}`) ||
          tenant?.logoUrl ||
          null;
        setSchoolLogo(stored);
      } catch {
        setSchoolLogo(null);
      }
    };
    loadLogo();
    window.addEventListener("erp-logo-updated", loadLogo);
    return () => window.removeEventListener("erp-logo-updated", loadLogo);
  }, [activeSchoolId, tenant?.logoUrl]);

  // 1-Click Sample Report Card Generator
  const handleGenerateSampleReportCard = () => {
    try {
      generateReportCardPDF({
        tenant: {
          name: schoolName,
          institution_name: schoolName,
          code: activeSchoolId,
          logoUrl: schoolLogo,
        },
        student: {
          name: "Aarav S. Sharma (Sample Scholar)",
          roll_number: "STU-SAMPLE-01",
          class: "Class 10-A (ICSE Accelerated)",
        },
        academicTerm: "Term II Comprehensive Examination (2026-27)",
        attendanceRate: "97.8%",
        grades: [
          { subject: "Advanced Physics", marks: "96/100", grade: "O" },
          { subject: "Pure Mathematics", marks: "98/100", grade: "O" },
          { subject: "Organic Chemistry", marks: "94/100", grade: "A+" },
          { subject: "Computer Science & AI", marks: "99/100", grade: "O" },
          { subject: "English Literature", marks: "91/100", grade: "A+" },
        ],
      });
      showToast(`Sample Report Card for "${schoolName}" generated & downloaded!`, "success");
    } catch (err) {
      console.error("Sample report card generation failed:", err);
      showToast("Could not generate sample report card PDF.", "error");
    }
  };

  // 1-Click Sample Fee Receipt Generator
  const handleGenerateSampleFeeReceipt = () => {
    try {
      generateFeeInvoicePDF({
        tenant: {
          name: schoolName,
          institution_name: schoolName,
          code: activeSchoolId,
          logoUrl: schoolLogo,
          address: "Institutional Campus Ground Floor, Academic Complex",
          email: `${activeSchoolId.toLowerCase()}@institutional.edu`,
        },
        student: {
          name: "Pooja V. Deshmukh (Sample Scholar)",
          roll_number: "STU-SAMPLE-02",
          class: "Class 12-Science (PCM-CS)",
        },
        payment: {
          invoiceNo: `REC-SAMPLE-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString("en-IN"),
          amount: 32500,
          title: "Quarterly Composite Tuition & Advanced Science Lab Fee",
          payment_mode: "Online (UPI / Razorpay Verified)",
          transactionId: `UTR${Date.now().toString(36).toUpperCase()}`,
        },
      });
      showToast(`Sample Fee Receipt for "${schoolName}" generated & downloaded!`, "success");
    } catch (err) {
      console.error("Sample fee receipt generation failed:", err);
      showToast("Could not generate sample fee receipt PDF.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-purple-500/15 text-purple-300 border border-purple-400/30 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              White-Label Branding & Certificates
            </span>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950/60 px-3 py-1 rounded-full border border-white/5">
              {activeSchoolId}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Brand & Certificate Studio 🎨
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Live preview of your dynamic school branding across generated documents. Digitally sign certificate requests and generate verified PDF transcripts.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-white/10 relative z-10 flex-wrap">
          <button
            onClick={() => setActiveSubTab("preview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "preview"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sample PDF Builder</span>
          </button>
          <button
            onClick={() => setActiveSubTab("certificates")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "certificates"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Digital Signatures</span>
          </button>
          <button
            onClick={() => setActiveSubTab("logo")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "logo"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Campus Logo</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SAMPLE PDF BUILDER */}
      {activeSubTab === "preview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live School Brand Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/20">
                  Active Brand Identity
                </span>
                <span className="text-xs font-mono text-slate-400">{activeSchoolId}</span>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/70 border border-white/10 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-2xl">🏛️</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white truncate" title={schoolName}>
                    {schoolName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Header: <strong className="text-purple-300 uppercase">100% Dynamic White-Label</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hardcoded brand names: <strong className="text-emerald-400">Completely Eradicated</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Institutional Node labels: <strong className="text-emerald-400">Purged</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dynamic QR cryptographic seals: <strong className="text-emerald-400">Active</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setActiveSubTab("logo")}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Custom Logo</span>
              </button>
            </div>
          </div>

          {/* 1-Click Action 1: Sample Report Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-2xl mb-4">
                📜
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                Sample Report Card (PDF)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Generate an official term report card featuring dummy scholar performance data, academic terms, and letter grades, rendered under your dynamic <strong className="text-white">{schoolName}</strong> header.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Type:</span>
                  <span className="font-bold text-white">Annual Report Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Header:</span>
                  <span className="font-bold text-purple-300 uppercase">{schoolName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Anti-Tamper QR:</span>
                  <span className="font-mono text-emerald-400">SHA256 Encrypted</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateSampleReportCard}
              className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Generate Sample Report Card</span>
            </button>
          </div>

          {/* 1-Click Action 2: Sample Fee Receipt */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4">
                🧾
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                Sample Fee Receipt (PDF)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Generate an official tax invoice receipt with breakdown of tuition, lab fees, UPI transaction IDs, and Razorpay 256-bit SSL verification stamps under your institutional name.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Type:</span>
                  <span className="font-bold text-white">Official Tax Invoice</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Header:</span>
                  <span className="font-bold text-emerald-300 uppercase">{schoolName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Engine:</span>
                  <span className="font-mono text-cyan-400">Razorpay / UPI Verified</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateSampleFeeReceipt}
              className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Generate Sample Fee Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DIGITAL CERTIFICATE SIGNATURES */}
      {activeSubTab === "certificates" && (
        <CertificateManagementCard mode={mode} />
      )}

      {/* SUB-TAB 3: CAMPUS LOGO */}
      {activeSubTab === "logo" && (
        <CustomLogoUploader schoolCode={activeSchoolId} />
      )}
    </div>
  );
}

