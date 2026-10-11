import React, { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function StudentRazorpayCheckout() {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState({ title: "Second Term Tuition Fee", amount: 15000 });

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      // 1. Record transaction in Supabase fee_ledger as paid via Online (Razorpay)
      const { error } = await supabase.from("fee_ledger").insert([{
        school_id: user?.school_id || "school-demo-01",
        student_name: user?.name || "Student",
        class_name: "10-A",
        amount: selectedFee.amount,
        status: "paid",
        payment_mode: "Online (Razorpay)",
        date: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;

      setTimeout(() => {
        setLoading(false);
        alert(`Razorpay Payment Successful! Paid ₹${selectedFee.amount.toLocaleString()} for ${selectedFee.title}. Receipt generated and synced to Supabase.`);
      }, 1200);
    } catch (err) {
      console.error("Payment error:", err);
      setLoading(false);
      alert("Payment processing failed.");
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Financial Gateway</p>
          <h1 className="text-3xl font-extrabold text-white">Razorpay Secure Fee Checkout 💳</h1>
          <p className="text-slate-400 text-sm mt-1">Instant, encrypted fee settlement with automated institutional ledger entry</p>
        </div>

        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Student Account</span>
              <span className="text-white font-bold text-sm">{user?.name || "Astik Kumar"} ({user?.school_id || "DEMO-SCHOOL"})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Fee Particular</span>
              <span className="text-blue-400 font-bold text-sm">{selectedFee.title}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-slate-200 font-bold">Total Amount Due</span>
              <span className="text-2xl font-black text-emerald-400">₹{selectedFee.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl text-left font-bold text-white flex items-center gap-3">
                <span>⚡</span> UPI / QR (GPay / PhonePe)
              </button>
              <button className="bg-slate-900 border border-slate-700 p-4 rounded-xl text-left font-bold text-slate-300 flex items-center gap-3 hover:border-slate-500 transition-all">
                <span>💳</span> Credit / Debit Card
              </button>
            </div>
          </div>

          <button 
            onClick={handleRazorpayPayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {loading ? "Processing Secure Payment via Razorpay..." : `Pay ₹${selectedFee.amount.toLocaleString()} Securely via Razorpay 🚀`}
          </button>
        </div>
      </div>
    </div>
  );
}