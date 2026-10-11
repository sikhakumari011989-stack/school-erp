import React, { useState } from "react";

export default function StudentFees() {
  const [fees] = useState([
    { id: 1, term: "First Term Tuition Fee (2026-27)", amount: 15000, status: "Paid", date: "June 10, 2026" },
    { id: 2, term: "Second Term Tuition Fee (2026-27)", amount: 15000, status: "Pending", date: "Due Nov 15, 2026" },
    { id: 3, term: "Annual Laboratory & Library Fee", amount: 4500, status: "Paid", date: "June 10, 2026" }
  ]);

  const [reportCards] = useState([
    { id: 1, term: "Class 10 Mid-Term Examination", percentage: "92.4%", grade: "A+", status: "Verified" },
    { id: 2, term: "Class 9 Final Examination", percentage: "89.8%", grade: "A+", status: "Archived" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-3xl font-extrabold text-white">Fee Ledger & Report Cards 💳</h1>
          <p className="text-slate-400 text-sm mt-1">Review your tuition fee status, payment history, and academic grade vaults</p>
        </div>

        {/* FEE LEDGER SECTION */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Fee Payment Ledger</h2>
            <button onClick={() => alert("Initiating Razorpay secure payment gateway...")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all">
              Pay Dues Online 🚀
            </button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5">Fee Description</th>
                <th className="p-5">Amount</th>
                <th className="p-5">Due / Paid Date</th>
                <th className="p-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {fees.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 font-bold text-white">{f.term}</td>
                  <td className="p-5 font-extrabold text-emerald-400">₹{f.amount.toLocaleString()}</td>
                  <td className="p-5 text-slate-400 text-xs">{f.date}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      f.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* REPORT CARD VAULT */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Academic Report Card Vault</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5">Examination Term</th>
                <th className="p-5">Percentage</th>
                <th className="p-5">Grade</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {reportCards.map((rc) => (
                <tr key={rc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 font-bold text-white">{rc.term}</td>
                  <td className="p-5 font-extrabold text-blue-400">{rc.percentage}</td>
                  <td className="p-5 font-mono font-bold text-emerald-400">{rc.grade}</td>
                  <td className="p-5 text-center">
                    <button onClick={() => alert("Downloading official report card PDF...")} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-600 transition-all">
                      Download PDF 📥
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}