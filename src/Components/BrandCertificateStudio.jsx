import React, { useState, useContext, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import {
  generateReportCardPDF,
  generateFeeInvoicePDF,
  resolveInstitutionName,
} from "../utils/pdfGenerator";
import CertificateManagementCard from "./CertificateManagementCard";
import CustomLogoUploader from "./CustomLogoUploader";
import {
  FileText,
  Receipt,
  Award,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Download,
  Upload,
} from "lucide-react";

export default function BrandCertificateStudio({ schoolId: propSchoolId, mode = "principal" }) {
  const { user, tenant, schoolLogoUrl } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = (propSchoolId || user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();
  const schoolName = resolveInstitutionName({
    ...tenant,
    institution_name: user?.institution_name || user?.school_name || tenant?.name,
  });

  const [activeSubTab, setActiveSubTab] = useState("preview"); // 'preview' | 'certificates' | 'logo'
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [digitalSignature, setDigitalSignature] = useState(() => {
    try {
      return localStorage.getItem(`erp_digital_signature_${activeSchoolId}`) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const loadLogo = () => {
      try {
        const stored =
          schoolLogoUrl ||
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
  }, [activeSchoolId, tenant?.logoUrl, schoolLogoUrl]);

  // Load Enrolled Students from Supabase with Directory Fallback
  useEffect(() => {
    async function fetchStudents() {
      try {
        let list = [];
        if (supabase) {
          const { data } = await supabase
            .from("students")
            .select("id, name, full_name, roll_number, class_name, roll_no")
            .limit(100);
          if (data && data.length > 0) {
            list = data.map((s) => ({
              id: s.id || s.roll_number || s.roll_no,
              name: s.full_name || s.name || "Enrolled Scholar",
              roll_number: s.roll_number || s.roll_no || s.id,
              class: s.class_name || "General Standard",
            }));
          }
        }
        if (list.length === 0) {
          const rawDir = localStorage.getItem(`erp_directory_${activeSchoolId}`) || localStorage.getItem("erp_active_roster");
          if (rawDir) {
            const parsed = JSON.parse(rawDir);
            list = parsed
              .filter((m) => (m.role || "").toLowerCase() === "student")
              .map((s) => ({
                id: s.id || s.role_code || s.roll_number,
                name: s.full_name || s.name,
                roll_number: s.role_code || s.roll_number || "STU-01",
                class: s.class_name || "Class 10-A",
              }));
          }
        }
        if (list.length === 0) {
          list = [
            { id: "STU-01", name: "Aarav S. Sharma", roll_number: "STU-01", class: "Class 10-A" },
            { id: "STU-02", name: "Priya V. Deshmukh", roll_number: "STU-02", class: "Class 12-Science" },
          ];
        }
        setStudentsList(list);
        if (list.length > 0) setSelectedStudentId(list[0].id);
      } catch (e) {
        console.warn("Could not load enrolled students:", e);
      }
    }
    fetchStudents();
  }, [activeSchoolId]);

  const activeStudent = studentsList.find((s) => s.id === selectedStudentId) || studentsList[0] || {
    name: "Enrolled Scholar",
    roll_number: "STU-01",
    class: "Class 10-A",
  };

  // Upload Authorized Digital Signature with Canvas Compression
  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      showToast("Please select a valid image file (PNG, JPG, or WEBP).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxW = 512;
        const maxH = 256;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL("image/png", 0.85);

        try {
          localStorage.setItem(`erp_digital_signature_${activeSchoolId}`, compressedBase64);
          localStorage.setItem("erp_digital_signature_default", compressedBase64);
          setDigitalSignature(compressedBase64);
          showToast("Authorized digital signature saved and linked to PDF transcripts!", "success");
        } catch (err) {
          console.error("Signature save error:", err);
          showToast("Failed to save signature.", "error");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Sample Report Card Generator
  const handleGenerateSampleReportCard = () => {
    try {
      generateReportCardPDF({
        tenant: {
          name: schoolName,
          institution_name: schoolName,
          code: activeSchoolId,
          logoUrl: schoolLogo,
          schoolLogoUrl: schoolLogo,
        },
        student: {
          name: activeStudent.name,
          roll_number: activeStudent.roll_number,
          class: activeStudent.class,
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
      showToast(`Report Card for "${activeStudent.name}" generated & downloaded!`, "success");
    } catch (err) {
      console.error("Sample report card generation failed:", err);
      showToast("Could not generate report card PDF.", "error");
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
          schoolLogoUrl: schoolLogo,
          address: "Institutional Campus Ground Floor, Academic Complex",
          email: `${activeSchoolId.toLowerCase()}@institutional.edu`,
        },
        student: {
          name: activeStudent.name,
          roll_number: activeStudent.roll_number,
          class: activeStudent.class,
        },
        payment: {
          invoiceNo: `REC-${Date.now().toString().slice(-6)}`,
          date: new Date().toLocaleDateString("en-IN"),
          amount: 32500,
          title: "Quarterly Composite Term Fee & Advanced Science Lab Fee",
          payment_mode: "Online (UPI Verified)",
          transactionId: `UTR${Date.now().toString(36).toUpperCase()}`,
        },
      });
      showToast(`Fee Receipt for "${activeStudent.name}" generated & downloaded!`, "success");
    } catch (err) {
      console.error("Sample fee receipt generation failed:", err);
      showToast("Could not generate fee receipt PDF.", "error");
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

      {/* SUB-TAB 1: SAMPLE PDF BUILDER (CLEAN 3-COLUMN LAYOUT) */}
      {activeSubTab === "preview" && (
        <div className="space-y-6">
          {/* LIVE STUDENT SELECTOR BAR */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
                🎓
              </span>
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Select Enrolled Scholar for PDF Generation
                </label>
                <p className="text-[11px] text-slate-400">
                  Target scholar for Report Cards, Transcripts, and Official Fee Invoices
                </p>
              </div>
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-400 cursor-pointer min-w-[260px]"
            >
              {studentsList.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.roll_number}) &bull; {s.class}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CARD 1: Live School Brand Card */}
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
                    <span>Dynamic QR cryptographic seals: <strong className="text-emerald-400">Active</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Instant Verification System: <strong className="text-emerald-400">Enabled</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Authorized Digital Signature: <strong className={digitalSignature ? "text-emerald-400" : "text-amber-400"}>{digitalSignature ? "Synchronized" : "Pending Upload"}</strong></span>
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

            {/* CARD 2: Sample Report Card */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-2xl mb-4">
                  📜
                </div>
                <h3 className="text-lg font-black text-white mb-1">
                  Sample Report Card (PDF)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Generate an official term report card featuring academic terms and letter grades, rendered under your dynamic <strong className="text-white">{schoolName}</strong> header.
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Type:</span>
                    <span className="font-bold text-white">Annual Report Card</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Scholar:</span>
                    <span className="font-bold text-purple-300 truncate max-w-[150px]">{activeStudent.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Evaluation Engine:</span>
                    <span className="font-mono text-emerald-400">Dynamic CGPA Calculation</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateSampleReportCard}
                className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Generate Official Report Card</span>
              </button>
            </div>

            {/* CARD 3: Sample Fee Receipt */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4">
                  🧾
                </div>
                <h3 className="text-lg font-black text-white mb-1">
                  Sample Fee Receipt (PDF)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Generate an official tax invoice receipt with breakdown of tuition, lab fees, UPI transaction IDs, and 256-bit SSL verification stamps under your institutional name.
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Type:</span>
                    <span className="font-bold text-white">Official Tax Invoice</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Scholar:</span>
                    <span className="font-bold text-emerald-300 truncate max-w-[150px]">{activeStudent.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Engine:</span>
                    <span className="font-mono text-cyan-400">UPI Verified</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateSampleFeeReceipt}
                className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Generate Official Fee Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DIGITAL CERTIFICATE SIGNATURES */}
      {activeSubTab === "certificates" && (
        <div className="space-y-6">
          {/* DIGITAL SIGNATURE UPLOAD & PREVIEW CARD */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                Authorized Controller Digital Signature
              </div>
              <h3 className="text-lg font-black text-white">Principal & Controller of Examinations Signature</h3>
              <p className="text-xs text-slate-400 max-w-lg">
                Upload official transparent PNG signature (max 512x256, auto-compressed under 120KB). This signature is dynamically stamped onto generated student transcripts, report cards, and tax invoices.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="w-40 h-20 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                {digitalSignature ? (
                  <img src={digitalSignature} alt="Digital Signature" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-500 text-center font-mono">No Signature Uploaded</span>
                )}
              </div>

              <label className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Signature</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
              </label>
            </div>
          </div>

          <CertificateManagementCard mode={mode} />
        </div>
      )}

      {/* SUB-TAB 3: CAMPUS LOGO */}
      {activeSubTab === "logo" && (
        <CustomLogoUploader schoolCode={activeSchoolId} />
      )}
    </div>
  );
}
