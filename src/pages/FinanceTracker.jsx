import { useState } from "react";

export default function FinanceTracker() {
  // Mock Daily Collection Data
  const [transactions, setTransactions] = useState([
    { id: "TRX-101", time: "09:15 AM", student: "Raj Kumar", class: "10-A", method: "Cash", amount: "₹5,000", status: "Verified" },
    { id: "TRX-102", time: "10:30 AM", student: "Amit Patel", class: "9-B", method: "UPI", amount: "₹4,500", status: "Verified" },
    { id: "TRX-103", time: "11:45 AM", student: "Priya Singh", class: "10-A", method: "Cheque", amount: "₹15,000", status: "Pending Clearance" },
    { id: "TRX-104", time: "01:20 PM", student: "Neha Sharma", class: "11-Sci", method: "Card", amount: "₹8,000", status: "Verified" },
    { id: "TRX-105", time: "02:10 PM", student: "Aarush Verma", class: "10-A", method: "UPI", amount: "₹5,000", status: "Verified" },
  ]);

  const [date] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

  return (
    <div className="text-slate-200">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance & Collections</h1>
          <p className="text-slate-400 mt-1">Daily revenue tracking and payment reconciliation</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg">
            Generate End-of-Day Report
          </button>
        </div>
      </div>

      {/* DASHBOARD CARDS (Fee Collection Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Collected */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-[#1E293B] border border-emerald-500/20 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-4 right-4 w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-xl">
            💵
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Today's Collection</p>
          <p className="text-4xl font-bold text-white mb-1">₹37,500</p>
          <p className="text-xs text-emerald-400 font-semibold">+12% vs yesterday</p>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Collection by Method</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-slate-300">Digital (UPI/Card)</span>
                <span className="text-blue-400">₹17,500</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-slate-300">Cash</span>
                <span className="text-emerald-400">₹5,000</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '15%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-slate-300">Cheque (Uncleared)</span>
                <span className="text-orange-400">₹15,000</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '40%' }}></div></div>
            </div>
          </div>
        </div>

        {/* Fee Health Status */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">October Fee Health</p>
          <div className="flex items-center gap-6">
            {/* Fake Donut Chart UI */}
            <div className="w-24 h-24 rounded-full border-[8px] border-emerald-500/20 border-t-emerald-500 border-r-emerald-500 border-b-emerald-500 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-l-red-500 rotate-45"></div>
              <span className="text-white font-bold text-lg">78%</span>
            </div>
            <div className="space-y-2 text-xs font-semibold">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div><span className="text-slate-300">Paid (78%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-600"></div><span className="text-slate-300">Pending (15%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500"></div><span className="text-slate-300">Overdue (7%)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY COLLECTION REPORT TABLE */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">Daily Collection Log</h2>
          <span className="text-xs font-semibold text-slate-400">{date}</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Transaction ID</th>
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Payment Method</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.map((trx) => (
                <tr key={trx.id} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-mono text-slate-400 text-xs font-bold">{trx.id}</td>
                  <td className="p-4 text-slate-400">{trx.time}</td>
                  <td className="p-4 font-bold text-white">
                    {trx.student} <span className="text-slate-500 font-normal text-xs ml-1">({trx.class})</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      trx.method === 'Cash' ? 'bg-emerald-500/10 text-emerald-400' :
                      trx.method === 'UPI' ? 'bg-blue-500/10 text-blue-400' :
                      trx.method === 'Cheque' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {trx.method}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-200">{trx.amount}</td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      trx.status === 'Verified' ? 'text-emerald-400' : 'text-orange-400 animate-pulse'
                    }`}>
                      {trx.status === 'Verified' ? '✓ Verified' : '⏳ Pending'}
                    </span>
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