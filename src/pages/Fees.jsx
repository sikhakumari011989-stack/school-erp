import { useState } from "react";

export default function Fees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  
  // Mock Fee Data
  const [fees, setFees] = useState([
    { id: 1, receipt: "REC-1001", student: "Raj Kumar", class: "10-A", amount: "₹5,000", dueDate: "2026-10-15", status: "Paid", datePaid: "2026-10-01" },
    { id: 2, receipt: "REC-1002", student: "Priya Singh", class: "10-A", amount: "₹5,000", dueDate: "2026-10-15", status: "Pending", datePaid: "-" },
    { id: 3, receipt: "REC-1003", student: "Amit Patel", class: "9-B", amount: "₹4,500", dueDate: "2026-09-30", status: "Overdue", datePaid: "-" },
    { id: 4, receipt: "REC-1004", student: "Neha Sharma", class: "11-Sci", amount: "₹8,000", dueDate: "2026-10-20", status: "Paid", datePaid: "2026-10-05" },
    { id: 5, receipt: "REC-1005", student: "Aarush Verma", class: "10-A", amount: "₹5,000", dueDate: "2026-10-15", status: "Pending", datePaid: "-" },
  ]);

  const filteredFees = filterStatus === "All" ? fees : fees.filter(fee => fee.status === filterStatus);

  // Stats calculation
  const totalCollected = fees.filter(f => f.status === "Paid").length * 5000; // Simplified mock calc
  const pendingCount = fees.filter(f => f.status === "Pending").length;
  const overdueCount = fees.filter(f => f.status === "Overdue").length;

  return (
    <div className="text-slate-200 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Management</h1>
          <p className="text-slate-400 mt-1">Track payments, issue invoices, and manage dues</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
        >
          + Create Fee Record
        </button>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Collected (Oct)</p>
          <p className="text-2xl font-bold text-white">₹13,000</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Invoices</p>
          <p className="text-2xl font-bold text-white">{pendingCount}</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg border-l-4 border-l-red-500">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Overdue Accounts</p>
          <p className="text-2xl font-bold text-white">{overdueCount}</p>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow-lg mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          {["All", "Paid", "Pending", "Overdue"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filterStatus === status 
                  ? "bg-slate-700 text-white shadow-md" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <button className="text-sm font-semibold text-slate-300 bg-[#0F172A] border border-slate-600 px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-all">
          📥 Export Excel
        </button>
      </div>

      {/* FEE TABLE */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-sm">
                <th className="p-4 font-semibold">Receipt No</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Due Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredFees.map((fee) => (
                <tr key={fee.id} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-mono text-slate-400 text-xs">{fee.receipt}</td>
                  <td className="p-4 font-bold text-white">
                    {fee.student} <span className="block text-xs font-normal text-slate-500">{fee.class}</span>
                  </td>
                  <td className="p-4 font-mono font-semibold text-slate-200">{fee.amount}</td>
                  <td className="p-4 text-slate-400">{fee.dueDate}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      fee.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      fee.status === 'Pending' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-400 hover:text-white px-2 py-1 text-xs border border-slate-600 rounded mr-2 transition-colors">View</button>
                    {fee.status !== 'Paid' && (
                      <button className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-2 py-1 text-xs rounded font-semibold transition-colors">
                        Collect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE FEE MODAL (OVERLAY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">Create Fee Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target</label>
                <select className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                  <option>Entire Class: 10-A</option>
                  <option>Entire Class: 9-B</option>
                  <option>Specific Student...</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fee Type</label>
                <select className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                  <option>Term 2 Tuition Fee</option>
                  <option>Transport Fee</option>
                  <option>Library Fine</option>
                  <option>Annual Sports Fee</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input type="number" required placeholder="5000" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                  <input type="date" required className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 custom-calendar-icon" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg border border-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-colors">Generate Invoices</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}