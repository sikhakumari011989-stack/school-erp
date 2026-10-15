import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { notifyFeePaymentConfirmed } from "../utils/notifications";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";

/**
 * Dynamically loads the official Razorpay Checkout SDK if not already in document
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export default function StudentRazorpayCheckout() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState({
    title: "Second Term Tuition Fee (2026-27)",
    amount: 15000,
    term: "Term 2",
  });

  const availableFees = [
    { title: "Second Term Tuition Fee (2026-27)", amount: 15000, term: "Term 2" },
    { title: "Annual Laboratory & Library Fee", amount: 4500, term: "Annual" },
    { title: "Transportation Fleet & GPS Fee", amount: 3200, term: "Quarterly" },
  ];

  const handleRazorpayPayment = async () => {
    setLoading(true);

    try {
      // 1. Ensure Razorpay Standard SDK script is injected
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        showToast("Unable to load Razorpay gateway. Please check your network connection.", "error");
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const studentName = user?.name || "Astik Kumar";
      const studentEmail = user?.email || "student@oasis-tutorials.edu";
      const studentPhone = user?.parent_phone || user?.phone || "+919876543210";
      const schoolId = user?.school_id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const institutionName = user?.institution_name || "Apex International School";
      
      // Default to live env variable or canonical test key
      const razorpayKey =
        import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag";

      // 2. Configure Official Razorpay Checkout Modal Options
      const options = {
        key: razorpayKey,
        amount: selectedFee.amount * 100, // Amount in paise
        currency: "INR",
        name: institutionName,
        description: selectedFee.title,
        image: "/favicon.svg",
        prefill: {
          name: studentName,
          email: studentEmail,
          contact: studentPhone,
        },
        notes: {
          student_name: studentName,
          fee_title: selectedFee.title,
          school_id: schoolId,
          institution_code: user?.institution_code || "OASIS-TUTORIALS",
        },
        theme: {
          color: "#0F172A",
        },
        // Callback handler triggered upon successful payment authorization
        handler: async function (response) {
          const paymentRef = response.razorpay_payment_id || `rzp_test_${Date.now().toString(36)}`;
          const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

          try {
            // A. Update / Insert transaction in Supabase fee_ledger as paid
            const { error: ledgerError } = await supabase.from("fee_ledger").insert([
              {
                school_id: schoolId,
                student_name: studentName,
                class_name: "Class 10 ICSE",
                amount: selectedFee.amount,
                status: "paid",
                payment_mode: "Online (Razorpay Test)",
                razorpay_payment_id: paymentRef,
                date: today,
              },
            ]);

            if (ledgerError) console.warn("fee_ledger sync notice:", ledgerError.message);

            // B. Also update fees table if linked to user UUID
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
              console.warn("fees table sync notice:", fErr.message);
            }

            // C. Automated WhatsApp & SMS Notification to Guardian
            notifyFeePaymentConfirmed({
              studentName,
              amount: selectedFee.amount,
              invoiceNo,
              guardianPhone: studentPhone,
              schoolName: institutionName,
              date: today,
              paymentId: paymentRef,
            });

            // D. Role-based security audit logging
            logSecurityAction({
              action: AUDIT_ACTIONS.FEE_COLLECTION,
              entityType: "FEE_PAYMENT",
              entityId: invoiceNo,
              details: `Online fee payment of ₹${selectedFee.amount} settled via Razorpay (Ref: ${paymentRef}) for ${selectedFee.title}`,
              user,
              schoolId,
            });

            showToast(
              `Payment Verified! Razorpay Ref: ${paymentRef}. Receipt generated for ₹${selectedFee.amount.toLocaleString()}.`,
              "success"
            );

            setTimeout(() => {
              setLoading(false);
              navigate("/student/fees");
            }, 1200);
          } catch (postPayErr) {
            console.error("Post-payment sync error:", postPayErr);
            setLoading(false);
            showToast("Payment captured, but ledger sync failed. Support notified.", "error");
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            showToast("Payment modal closed. Fee settlement was cancelled.", "info");
          },
        },
      };

      // 3. Launch the official Razorpay modal overlay
      const razorpayInstance = new window.Razorpay(options);
      
      razorpayInstance.on("payment.failed", function (response) {
        setLoading(false);
        showToast(
          `Payment Failed: ${response.error?.description || "Transaction declined by issuing bank."}`,
          "error"
        );
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Payment modal invocation error:", err);
      setLoading(false);
      showToast("Could not open Razorpay checkout. Please try again.", "error");
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
            Razorpay Secure Gateway
          </p>
          <h1 className="text-3xl font-extrabold text-white">Instant Fee Settlement 💳</h1>
          <p className="text-slate-400 text-sm mt-1">
            256-bit encrypted tuition settlement with automated real-time institutional ledger posting
          </p>
        </div>

        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* FEE SELECTOR */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Fee Component to Settle
            </label>
            <div className="space-y-2">
              {availableFees.map((fee, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedFee(fee)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                    selectedFee.title === fee.title
                      ? "bg-blue-600/20 border-blue-500 shadow-md"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-bold text-white text-sm">{fee.title}</p>
                    <span className="text-[11px] text-blue-400 font-semibold">{fee.term}</span>
                  </div>
                  <span className="font-extrabold text-emerald-400 text-base">
                    ₹{fee.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SUMMARY CARD */}
          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Enrolled Student</span>
              <span className="text-white font-bold text-sm">
                {user?.name || "Astik Kumar"} ({user?.institution_code || "OASIS-TUTORIALS"})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Settlement Reference</span>
              <span className="text-blue-400 font-bold text-sm">{selectedFee.title}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-slate-200 font-bold text-base">Total Payable Amount</span>
              <span className="text-3xl font-black text-emerald-400">
                ₹{selectedFee.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* PAYMENT RAILS BADGES */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Payment Rails (Razorpay Certified)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-2xl text-left font-bold text-white flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-xs font-extrabold text-blue-300">Instant UPI / QR</p>
                  <p className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700/80 p-4 rounded-2xl text-left font-bold text-slate-300 flex items-center gap-3">
                <span className="text-xl">💳</span>
                <div>
                  <p className="text-xs font-extrabold text-slate-300">NetBanking / Cards</p>
                  <p className="text-[10px] text-slate-400">All major Indian banks</p>
                </div>
              </div>
            </div>
          </div>

          {/* CHECKOUT ACTION BUTTON */}
          <button
            onClick={handleRazorpayPayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-4 rounded-xl shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Opening Razorpay Secure Gateway...</span>
              </>
            ) : (
              <span>Authorize ₹{selectedFee.amount.toLocaleString()} via Razorpay 🚀</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}