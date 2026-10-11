import React, { useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { AppContext } from "../context/AppContext";

// Dynamically loads the Razorpay checkout script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function StudentFees() {
  const { user } = useContext(AppContext);

  // Converted to State so the UI updates instantly after payment
  const [feeRecords, setFeeRecords] = useState([
    { id: "INV-2026-001", term: "Term 2 Tuition Fee", amount: "₹5,000", amountValue: 5000, due: "15 Oct 2026", status: "Due" },
    { id: "INV-2026-002", term: "Term 1 Tuition Fee", amount: "₹5,000", amountValue: 5000, due: "15 Jul 2026", status: "Paid" },
    { id: "INV-2026-003", term: "Annual Sports Fee", amount: "₹1,500", amountValue: 1500, due: "10 Jun 2026", status: "Paid" },
  ]);

  const handlePayment = async (invoiceId, amount, description) => {
    const isLoaded = await loadRazorpayScript();

    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Check your internet connection.");
      return;
    }

    // Razorpay requires amounts in paise (multiply INR by 100)
    const amountInPaise = amount * 100;

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
      amount: amountInPaise,
      currency: "INR",
      name: "School ERP",
      description: `Payment for ${description}`,
      handler: async function (response) {
        console.log("Payment Success ID:", response.razorpay_payment_id);
        
        // 1. Save the successful payment to Supabase Database
        try {
          const { error } = await supabase.from("fees").insert([{
            school_id: user?.school_id || "school-demo-01",
            student_id: user?.id,
            amount: amount,
            status: "paid",
            date: new Date().toISOString().split('T')[0]
          }]);

          if (error) throw error;

          // 2. Update the UI instantly to show "Paid"
          if (invoiceId) {
            setFeeRecords((prev) => 
              prev.map(fee => fee.id === invoiceId ? { ...fee, status: "Paid" } : fee)
            );
          }
          
          alert(`Database Updated! Payment Successful. Transaction ID: ${response.razorpay_payment_id}`);
        } catch (dbError) {
          console.error("Database Sync Error:", dbError);
          alert("Payment successful, but failed to sync with database. Please contact Admin.");
        }
      },
      prefill: {
        name: user?.name || "Student Name",
        email: user?.email || "student@demo.com",
      },
      theme: {
        color: "#2563EB", 
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  // Calculate dynamic outstanding balance
  const outstandingBalance = feeRecords
    .filter(fee => fee.status === "Due")
    .reduce((sum, fee) => sum + fee.amountValue, 0);

  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">My Fees</h1>
          <p className="text-slate-400 mt-1">View invoices and payment history</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-900/40 to-[#1E293B] border border-red-500/30 rounded-xl p-6 shadow-lg mb-8 flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Outstanding Due</p>
          <p className="text-3xl font-bold text-white">₹{outstandingBalance.toLocaleString()}</p>
        </div>
        {outstandingBalance > 0 ? (
          <button 
            onClick={() => handlePayment(null, outstandingBalance, "Total Outstanding Due")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20"
          >
            Pay All Now
          </button>
        ) : (
          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-6 py-3 rounded-lg font-bold">
            All Dues Cleared 🎉
          </div>
        )}
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-400 text-sm">
              <th className="p-4">Invoice ID</th>
              <th className="p-4">Fee Description</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {feeRecords.map((fee, index) => (
              <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-800/20">
                <td className="p-4 font-mono text-slate-400">{fee.id}</td>
                <td className="p-4 font-bold text-white">{fee.term}</td>
                <td className="p-4 text-slate-300 font-mono">{fee.amount}</td>
                <td className="p-4 text-slate-400">{fee.due}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    fee.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    {fee.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {fee.status === 'Paid' ? (
                    <button className="text-blue-400 hover:text-blue-300 text-xs border border-blue-500/30 px-3 py-1 rounded transition-colors">
                      Download Receipt
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePayment(fee.id, fee.amountValue, fee.term)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs rounded font-bold transition-all"
                    >
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}