import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import {
  QrCode,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  Building,
  CreditCard,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Eye,
} from "lucide-react";
import BrandLogo from "./BrandLogo";

/**
 * Clean, high-contrast SVG UPI QR Code representation
 * Works 100% offline with zero external dependencies
 */
export const DEFAULT_DEMO_QR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <rect width="300" height="300" fill="%23ffffff" rx="16"/>
  <!-- Top Left Finder Pattern -->
  <rect x="25" y="25" width="70" height="70" fill="%230F172A" rx="8"/>
  <rect x="35" y="35" width="50" height="50" fill="%23ffffff" rx="4"/>
  <rect x="45" y="45" width="30" height="30" fill="%230F172A" rx="2"/>
  <!-- Top Right Finder Pattern -->
  <rect x="205" y="25" width="70" height="70" fill="%230F172A" rx="8"/>
  <rect x="215" y="35" width="50" height="50" fill="%23ffffff" rx="4"/>
  <rect x="225" y="45" width="30" height="30" fill="%230F172A" rx="2"/>
  <!-- Bottom Left Finder Pattern -->
  <rect x="25" y="205" width="70" height="70" fill="%230F172A" rx="8"/>
  <rect x="35" y="215" width="50" height="50" fill="%23ffffff" rx="4"/>
  <rect x="45" y="225" width="30" height="30" fill="%230F172A" rx="2"/>
  <!-- Timing and Data Grid Matrix -->
  <rect x="105" y="35" width="12" height="12" fill="%230F172A"/>
  <rect x="125" y="35" width="12" height="12" fill="%230F172A"/>
  <rect x="145" y="35" width="12" height="12" fill="%230F172A"/>
  <rect x="165" y="35" width="12" height="12" fill="%230F172A"/>
  <rect x="185" y="35" width="12" height="12" fill="%230F172A"/>
  <rect x="35" y="105" width="12" height="12" fill="%230F172A"/>
  <rect x="35" y="125" width="12" height="12" fill="%230F172A"/>
  <rect x="35" y="145" width="12" height="12" fill="%230F172A"/>
  <rect x="35" y="165" width="12" height="12" fill="%230F172A"/>
  <rect x="35" y="185" width="12" height="12" fill="%230F172A"/>
  <!-- Central UPI Data Pattern -->
  <rect x="105" y="105" width="22" height="22" fill="%232563EB" rx="4"/>
  <rect x="135" y="105" width="14" height="14" fill="%230F172A"/>
  <rect x="155" y="105" width="20" height="20" fill="%230F172A"/>
  <rect x="180" y="105" width="15" height="15" fill="%232563EB"/>
  <rect x="105" y="135" width="18" height="18" fill="%230F172A"/>
  <rect x="130" y="130" width="40" height="40" fill="%230F172A" rx="6"/>
  <rect x="140" y="140" width="20" height="20" fill="%2310B981" rx="3"/>
  <rect x="175" y="135" width="20" height="20" fill="%230F172A"/>
  <rect x="105" y="160" width="15" height="15" fill="%232563EB"/>
  <rect x="125" y="175" width="16" height="16" fill="%230F172A"/>
  <rect x="145" y="175" width="22" height="22" fill="%230F172A"/>
  <rect x="172" y="160" width="23" height="23" fill="%230F172A"/>
  <rect x="105" y="205" width="25" height="25" fill="%230F172A"/>
  <rect x="135" y="205" width="15" height="15" fill="%232563EB"/>
  <rect x="155" y="205" width="20" height="20" fill="%230F172A"/>
  <rect x="180" y="205" width="25" height="25" fill="%230F172A"/>
  <rect x="105" y="235" width="18" height="18" fill="%230F172A"/>
  <rect x="130" y="225" width="22" height="22" fill="%2310B981"/>
  <rect x="160" y="235" width="16" height="16" fill="%230F172A"/>
  <rect x="182" y="235" width="23" height="23" fill="%232563EB"/>
  <rect x="205" y="105" width="20" height="20" fill="%230F172A"/>
  <rect x="235" y="105" width="18" height="18" fill="%230F172A"/>
  <rect x="260" y="105" width="15" height="15" fill="%232563EB"/>
  <rect x="210" y="130" width="25" height="25" fill="%230F172A"/>
  <rect x="240" y="130" width="35" height="35" fill="%230F172A"/>
  <rect x="215" y="165" width="20" height="20" fill="%232563EB"/>
  <rect x="245" y="170" width="25" height="25" fill="%230F172A"/>
  <rect x="210" y="205" width="20" height="20" fill="%230F172A"/>
  <rect x="235" y="205" width="22" height="22" fill="%230F172A"/>
  <rect x="262" y="205" width="15" height="15" fill="%2310B981"/>
  <rect x="215" y="235" width="25" height="25" fill="%230F172A"/>
  <rect x="245" y="235" width="20" height="20" fill="%230F172A"/>
  <!-- Verified UPI Watermark Badge -->
  <circle cx="150" cy="150" r="14" fill="%23ffffff"/>
  <path d="M145 150l3 3l7 -7" stroke="%2310B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

export default function SchoolUpiQrConfig({ schoolId = "OASIS-TUTORIALS", institutionName = "Apex International Academy" }) {
  const { showToast } = useToast();
  const activeCode = (schoolId || "OASIS-TUTORIALS").trim().toUpperCase();

  const storageKeyQr = `erp_school_qr_${activeCode}`;
  const storageKeyMeta = `erp_school_upi_${activeCode}`;
  const storageKeyLogo = `erp_school_logo_${activeCode}`;

  const [qrImage, setQrImage] = useState(DEFAULT_DEMO_QR_SVG);
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [config, setConfig] = useState({
    upiId: `${activeCode.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu@okaxis`,
    merchantName: institutionName || "Apex International Academy",
    instructions: "Scan via Google Pay, PhonePe, Paytm, or BHIM. Enter student name in remarks, then input 12-digit UTR below.",
    accountNumber: "910020084918234",
    ifscCode: "UTIB0001245",
    bankName: "Axis Bank Ltd (Institutional Branch)",
    isVerified: true,
  });

  // Load existing configuration from localStorage on mount
  useEffect(() => {
    try {
      const savedQr = localStorage.getItem(storageKeyQr);
      if (savedQr) {
        setQrImage(savedQr);
      } else {
        setQrImage(DEFAULT_DEMO_QR_SVG);
      }

      const savedLogo = localStorage.getItem(storageKeyLogo);
      if (savedLogo) {
        setSchoolLogo(savedLogo);
      } else {
        setSchoolLogo(null);
      }

      const savedMeta = localStorage.getItem(storageKeyMeta);
      if (savedMeta) {
        setConfig((prev) => ({ ...prev, ...JSON.parse(savedMeta) }));
      }
    } catch (e) {
      console.warn("Error loading UPI QR config:", e);
    }
  }, [activeCode, storageKeyQr, storageKeyMeta, storageKeyLogo]);

  // Handle custom school logo / crest upload (.png, .jpg, .jpeg, .svg, .webp)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      showToast("Please upload a valid image file (.png, .jpg, .svg, .webp)", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit. Please choose a smaller image.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setSchoolLogo(dataUrl);
        try {
          localStorage.setItem(storageKeyLogo, dataUrl);
          localStorage.setItem("erp_school_logo_default", dataUrl);
          // Broadcast real-time update event so Sidebar and mobile header update instantly
          window.dispatchEvent(
            new CustomEvent("erp-logo-updated", {
              detail: { logoUrl: dataUrl, schoolId: activeCode },
            })
          );
          window.dispatchEvent(new Event("storage"));
          showToast(
            "Custom school crest updated! Live in Sidebar, Mobile Header & Invoices.",
            "success"
          );
        } catch {
          showToast("Logo updated in current session.", "info");
        }
      }
    };
    reader.onerror = () => {
      showToast("Failed to read image file.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setSchoolLogo(null);
    try {
      localStorage.removeItem(storageKeyLogo);
      localStorage.removeItem("erp_school_logo_default");
      window.dispatchEvent(
        new CustomEvent("erp-logo-updated", {
          detail: { logoUrl: null, schoolId: activeCode },
        })
      );
      window.dispatchEvent(new Event("storage"));
      showToast("Reset to official EduSaaS Nexus Crest.", "info");
    } catch (err) {
      console.warn("Storage reset error:", err);
    }
  };

  // Handle QR image file upload (.png, .jpg, .jpeg, .webp)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      showToast("Please upload a valid image file (.png, .jpg, .jpeg, .webp)", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit. Please choose a smaller image.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setQrImage(dataUrl);
        try {
          localStorage.setItem(storageKeyQr, dataUrl);
          showToast("School UPI QR code uploaded and activated for parent portal!", "success");
        } catch {
          showToast("Image uploaded to view. Local storage quota full; saving in memory.", "info");
        }
      }
    };
    reader.onerror = () => {
      showToast("Failed to read image file. Please try again.", "error");
    };
    reader.readAsDataURL(file);
  };

  // Save textual config metadata
  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (!config.upiId.trim() || !config.merchantName.trim()) {
      showToast("UPI ID and Official Merchant Name are required.", "error");
      return;
    }

    try {
      localStorage.setItem(storageKeyMeta, JSON.stringify(config));
      showToast("Institutional UPI payment configuration saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save configuration.", "error");
    }
  };

  // Load Sample Demo QR with instant 1-click fallback
  const handleLoadDemoQr = () => {
    setQrImage(DEFAULT_DEMO_QR_SVG);
    const demoMeta = {
      upiId: `${activeCode.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu@okaxis`,
      merchantName: institutionName || "Apex International Academy",
      instructions: "Scan via Google Pay, PhonePe, Paytm, or BHIM. Enter student name in remarks, then input 12-digit UTR below.",
      accountNumber: "910020084918234",
      ifscCode: "UTIB0001245",
      bankName: "Axis Bank Ltd (Institutional Branch)",
      isVerified: true,
    };
    setConfig(demoMeta);
    try {
      localStorage.setItem(storageKeyQr, DEFAULT_DEMO_QR_SVG);
      localStorage.setItem(storageKeyMeta, JSON.stringify(demoMeta));
      showToast("Loaded official sample demo QR and verified merchant profile!", "success");
    } catch (err) {
      console.warn("Storage notice:", err);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(config.upiId);
    setCopiedUpi(true);
    showToast("School UPI ID copied to clipboard!", "info");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                RBI & NPCI Compliant Direct Settlement
              </span>
              <span className="bg-blue-500/20 text-blue-400 text-xs font-bold uppercase px-3 py-1 rounded-full border border-blue-500/30">
                0% Gateway Surcharge
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <QrCode className="w-8 h-8 text-blue-400" />
              School UPI QR & Fee Scanner Setup
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Configure your institution's direct bank UPI QR code. Parents scan this official QR via PhonePe, GPay, or Paytm, and pay straight into your school bank account with zero intermediate escrow delay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLoadDemoQr}
              type="button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Load Sample Demo QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN CONFIG & LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CONFIGURATION FORM (7 COLS) */}
        <div className="lg:col-span-7 bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-700/80 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Institutional Banking & UPI Parameters
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Updates propagate in real-time to the Student Fee Settlement Portal (`/student/pay`).
            </p>
          </div>

          {/* WHITE-LABEL SCHOOL CREST UPLOADER */}
          <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Upload Custom School Logo / Crest (White-Label)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Accepted: .png, .jpg, .svg, .webp • Live in Sidebar, Mobile Header & PDF Invoices
                  </p>
                </div>
              </div>
              {schoolLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 cursor-pointer transition-colors"
                >
                  Reset to Nexus Crest
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <BrandLogo size="lg" customLogoUrl={schoolLogo} />
              <div className="flex-1 min-w-0">
                <label className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                  <Upload className="w-4 h-4" />
                  <span>Browse School Crest File</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {schoolLogo
                    ? "✓ Custom school crest active across ERP node"
                    : "Currently using official EduSaaS Nexus Crest"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            {/* FILE UPLOAD INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Upload Official School UPI QR Image (.png, .jpg, .webp)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-5 text-center transition-all bg-slate-900/50">
                <input
                  type="file"
                  id="upi-qr-upload"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="upi-qr-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
                      Click to Browse School QR Image
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recommended: High resolution square image (min 400x400)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* UPI ID & MERCHANT NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Official School UPI ID (VPA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.upiId}
                    onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                    placeholder="e.g. oasis.tuition@okaxis"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Registered Merchant / Beneficiary Name *
                </label>
                <input
                  type="text"
                  value={config.merchantName}
                  onChange={(e) => setConfig({ ...config, merchantName: e.target.value })}
                  placeholder="e.g. Apex International Academy"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* BANK ACCOUNT & IFSC FOR NEFT/IMPS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Institutional Bank Account (Optional)
                </label>
                <input
                  type="text"
                  value={config.accountNumber}
                  onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                  placeholder="e.g. 910020084918234"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Bank IFSC Code (Optional)
                </label>
                <input
                  type="text"
                  value={config.ifscCode}
                  onChange={(e) => setConfig({ ...config, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. UTIB0001245"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* PARENT INSTRUCTIONS */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Custom Settlement Instructions for Parents
              </label>
              <textarea
                rows={3}
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                placeholder="Instructions displayed to parents below the QR code..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Instant Parent Portal Synchronization</span>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer"
              >
                Save & Broadcast UPI Configuration
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: LIVE STUDENT PREVIEW CARD (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-400" />
              Live Parent / Student Portal Preview
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono font-bold">
              /student/pay
            </span>
          </div>

          <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-2 border-blue-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* WATERMARK */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Institutional Merchant
              </div>

              <div>
                <h4 className="text-lg font-black text-white">{config.merchantName || institutionName}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{config.upiId}</p>
              </div>

              {/* QR CODE CONTAINER */}
              <div className="bg-white p-4 rounded-2xl shadow-xl inline-block border-4 border-slate-800">
                <img
                  src={qrImage}
                  alt="Official School UPI QR"
                  className="w-48 h-48 md:w-52 md:h-52 object-contain mx-auto"
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Accepted by:</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">PhonePe</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">GPay</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Paytm</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">BHIM</span>
              </div>

              {/* ACTION BUTTONS PREVIEW */}
              <div className="space-y-2 pt-2">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ℹ️ <strong className="text-slate-200">Parent Guidance:</strong> {config.instructions}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-center font-bold text-slate-300">
                    📋 Copy UPI ID
                  </div>
                  <div className="bg-blue-600/30 border border-blue-500/50 p-2.5 rounded-xl text-center font-bold text-blue-300">
                    📲 Open UPI App
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
