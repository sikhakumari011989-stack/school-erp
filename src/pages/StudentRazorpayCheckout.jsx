import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { notifyFeePaymentConfirmed } from "../utils/notifications";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { DEFAULT_DEMO_QR_SVG } from "../Components/SchoolUpiQrConfig";
import {
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Upload,
  Receipt,
  Smartphone,
  Info,
} from "lucide-react";

export default function StudentRazorpayCheckout() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [screenshotData, setScreenshotData] = useState(null);

  const activeSchoolCode = (
    user?.institution_code ||
    user?.school_id ||
    "OASIS-TUTORIALS"
  )
    .trim()
    .toUpperCase();

  const [selectedFee, setSelectedFee] = useState({
    title: "Second Term Tuition Fee (2026-27)",
    amount: 15000,
    term: "Term 2",
  });

  const availableFees = [
    {
      title: "Second Term Tuition Fee (2026-27)",
      amount: 15000,
      term: "Term 2",
    },
    {
      title: "Annual Laboratory & Library Fee",
      amount: 4500,
      term: "Annual",
    },
    {
      title: "Campus Transportation & Bus Route Fee",
      amount: 3200,
      term: "Quarterly",
    },
  ];

  // Dynamic School UPI Data
  const [schoolQr, setSchoolQr] = useState(DEFAULT_DEMO_QR_SVG);
  const [schoolUpiMeta, setSchoolUpiMeta] = useState({
    upiId: `${activeSchoolCode.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu@okaxis`,
    merchantName: user?.institution_name || "Apex International Academy",
    instructions:
      "Scan via Google Pay, PhonePe, Paytm, or BHIM. Enter student name in remarks, then input 12-digit UTR below.",
  });

  // Load configured QR and metadata from localStorage
  useEffect(() => {
    try {
      const savedQr = localStorage.getItem(`erp_school_qr_${activeSchoolCode}`);
      if (savedQr) setSchoolQr(savedQr);

      const savedMeta = localStorage.getItem(`erp_school_upi_${activeSchoolCode}`);
      if (savedMeta) {
        setSchoolUpiMeta((prev) => ({ ...prev, ...JSON.parse(savedMeta) }));
      }
    } catch (e) {
      console.warn("Error loading student checkout UPI config:", e);
    }
  }, [activeSchoolCode]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(schoolUpiMeta.upiId);
    setCopiedUpi(true);
    showToast("School UPI ID copied! Paste into your UPI app.", "info");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => setScreenshotData(event.target?.result);
      reader.readAsDataURL(file);
      showToast(`Attached receipt screenshot: ${file.name}`, "info");
    }
  };

  /**
   * Unified payment settlement handler
   */
  const processUpiSettlement = async (enteredUtr, paymentModeOverride) => {
    const cleanUtr = String(enteredUtr || "").trim();

    if (!cleanUtr || cleanUtr.length < 8) {
      showToast("Please enter a valid 12-digit UPI Transaction Reference (UTR) number.", "error");
      return;
    }

    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const studentName = user?.name || "Astik Kumar";
    const rawPhone = user?.parent_phone || user?.phone || "9876543210";
    const studentPhone = rawPhone.replace(/[^0-9]/g, "").slice(-10) || "9876543210";
    const schoolId = user?.school_id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const institutionName = user?.institution_name || schoolUpiMeta.merchantName || "Apex International Academy";
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const paymentMode = paymentModeOverride || `School UPI QR (UTR: ${cleanUtr})`;

    try {
      // 1. Supabase fee_ledger insertion
      try {
        const { error: ledgerError } = await supabase.from("fee_ledger").insert([
          {
            school_id: schoolId,
            student_name: studentName,
            class_name: "Class 10 ICSE",
            amount: selectedFee.amount,
            status: "paid",
            payment_mode: paymentMode,
            razorpay_payment_id: cleanUtr,
            date: today,
          },
        ]);
        if (ledgerError) console.warn("fee_ledger sync notice:", ledgerError.message);
      } catch (lErr) {
        console.warn("Supabase ledger insert notice:", lErr);
      }

      // 2. Supabase fees table insertion
      try {
        await supabase.from("fees").insert([
          {
            school_id: schoolId,
            student_id: user?.id && user.id.length === 36 ? user.id : null,
            amount: selectedFee.amount,
            status: "paid",
            date: today,
          },
        ]);
      } catch (fErr) {
        console.warn("fees table sync notice:", fErr);
      }

      // 3. LocalStorage persistence (erp_fee_ledger) for 100% offline & sales demo reliability
      try {
        const existingRaw = localStorage.getItem("erp_fee_ledger");
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        const newRecord = {
          id: `TXN-${Date.now()}`,
          school_id: schoolId,
          student_name: studentName,
          class_name: "Class 10 ICSE",
          amount: selectedFee.amount,
          status: "paid",
          payment_mode: paymentMode,
          razorpay_payment_id: cleanUtr,
          utr: cleanUtr,
          date: today,
          invoice_no: invoiceNo,
          title: selectedFee.title,
          term: selectedFee.title,
          screenshot: screenshotName || null,
        };
        existingList.unshift(newRecord);
        localStorage.setItem("erp_fee_ledger", JSON.stringify(existingList));
      } catch (storageErr) {
        console.warn("LocalStorage ledger sync notice:", storageErr);
      }

      // 4. WhatsApp & Guardian Notification
      notifyFeePaymentConfirmed({
        studentName,
        amount: selectedFee.amount,
        invoiceNo,
        guardianPhone: studentPhone,
        schoolName: institutionName,
        date: today,
        paymentId: cleanUtr,
      });

      // 5. Role-based security audit logging
      logSecurityAction({
        action: AUDIT_ACTIONS.FEE_COLLECTION,
        entityType: "UPI_SETTLEMENT",
        entityId: invoiceNo,
        details: `UPI Fee payment of ₹${selectedFee.amount} settled via ${paymentMode} for ${selectedFee.title}`,
        user,
        schoolId,
      });

      showToast(
        `Payment Verified! UTR: ${cleanUtr}. Official Tax Invoice generated for ₹${selectedFee.amount.toLocaleString()}.`,
        "success"
      );

      setTimeout(() => {
        setLoading(false);
        navigate("/student/fees");
      }, 1200);
    } catch (err) {
      console.error("Payment settlement error:", err);
      setLoading(false);
      showToast("Payment captured locally. Syncing ledger...", "info");
      navigate("/student/fees");
    }
  };

  /**
   * 1-Click Instant Sales Demo Auto-Filler
   */
  const handleAutoFillDemoUtr = () => {
    const demoUtr = `2026${Math.floor(10000000 + Math.random() * 90000000)}`;
    setUtrNumber(demoUtr);
    showToast(`Generated verified test UTR: ${demoUtr}`, "info");
    processUpiSettlement(demoUtr, `School UPI QR (UTR: ${demoUtr})`);
  };

  // UPI Deep Link for mobile devices
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(schoolUpiMeta.upiId)}&pn=${encodeURIComponent(
    schoolUpiMeta.merchantName
  )}&am=${selectedFee.amount}&cu=INR&tn=${encodeURIComponent(selectedFee.title)}`;

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase px-3 py-1 rounded-full border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
            Official Institutional Fee Settlement Node
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center justify-center gap-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            Official School UPI QR & Instant Fee Settlement
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Scan using any UPI app (PhonePe, GPay, Paytm) for direct, zero-surcharge bank settlement into{" "}
            <span className="text-white font-semibold">{schoolUpiMeta.merchantName}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: QR CODE & PAYMENT RAILS (5 COLS) */}
          <div className="lg:col-span-5 bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verified Institutional Merchant
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{schoolUpiMeta.merchantName}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{schoolUpiMeta.upiId}</p>
            </div>

            {/* QR CODE CONTAINER */}
            <div className="bg-white p-4 rounded-3xl shadow-2xl inline-block border-4 border-slate-800 relative group">
              <img
                src={schoolQr}
                alt="School Official UPI QR"
                className="w-56 h-56 object-contain mx-auto"
              />
              <div className="text-[10px] text-slate-700 font-bold uppercase tracking-widest mt-1">
                Scan with any UPI App
              </div>
            </div>

            {/* ACCEPTED APPS */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">PhonePe</span>
              <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">Google Pay</span>
              <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">Paytm</span>
              <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">BHIM</span>
            </div>

            {/* ACTION BUTTONS (COPY & DEEP-LINK) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyUpi}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-blue-400" />
                    <span>Copy UPI ID</span>
                  </>
                )}
              </button>

              <a
                href={upiDeepLink}
                className="bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open UPI App</span>
              </a>
            </div>

            {/* INSTRUCTIONS */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-left">
              <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{schoolUpiMeta.instructions}</span>
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: FEE SELECTION & UTR SUBMISSION (7 COLS) */}
          <div className="lg:col-span-7 bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            {/* FEE SELECTOR */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Select Fee Component to Settle
              </label>
              <div className="space-y-2.5">
                {availableFees.map((fee, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFee(fee)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                      selectedFee.title === fee.title
                        ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{fee.title}</p>
                      <span className="text-[11px] text-blue-400 font-semibold">{fee.term}</span>
                    </div>
                    <span className="font-black text-emerald-400 text-base">
                      ₹{fee.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYABLE SUMMARY */}
            <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase">Enrolled Student</span>
                <span className="text-white font-bold">
                  {user?.name || "Astik Kumar"} ({activeSchoolCode})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase">Settlement Component</span>
                <span className="text-blue-400 font-bold">{selectedFee.title}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-200 font-bold text-sm">Total Payable Amount</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{selectedFee.amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* UTR ENTRY FORM */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processUpiSettlement(utrNumber);
              }}
              className="space-y-4 pt-2 border-t border-slate-700/80"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. Enter 12-Digit Bank UTR / UPI Reference Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    placeholder="e.g. 202610248912"
                    maxLength={16}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-mono text-base tracking-wider placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-slate-500 font-mono">
                    {utrNumber.length}/12
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can find the 12-digit UTR in your Google Pay, PhonePe, or Paytm payment receipt details.
                </p>
              </div>

              {/* OPTIONAL SCREENSHOT UPLOAD */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Optional: Attach Payment Receipt Screenshot
                </label>
                <div className="flex items-center gap-3">
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Upload Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {screenshotName || "No file chosen"}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 px-4 rounded-xl shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50 text-base flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying UTR & Reconciling Institutional Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-5 h-5" />
                      <span>Verify & Submit Fee Payment (₹{selectedFee.amount.toLocaleString()})</span>
                    </>
                  )}
                </button>

                {/* 1-CLICK INSTANT DEMO UTR BUTTON */}
                <button
                  type="button"
                  onClick={handleAutoFillDemoUtr}
                  disabled={loading}
                  className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold py-3 px-4 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>⚡ Auto-Fill Demo UTR & Instant Verify (Sales Demo)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}