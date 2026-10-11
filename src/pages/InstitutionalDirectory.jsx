import React, { useState } from "react";

export default function InstitutionalDirectory() {
  const [directory] = useState([
    { name: "Dr. V. K. Sharma", role: "Principal / Headmaster", dept: "Administration", phone: "+91 98230 11101", email: "principal@sirjp.edu" },
    { name: "Mrs. Sunita Rao", role: "Chief Accountant", dept: "Finance & Accounts", phone: "+91 98230 22202", email: "accounts@sirjp.edu" },
    { name: "Prof. Rajesh Verma", role: "Head of Mathematics Dept", dept: "Academics", phone: "+91 98230 33303", email: "r.verma@sirjp.edu" },
    { name: "Captain M. R. Nair", role: "Transport & Security Head", dept: "Operations", phone: "+91 98230 44404", email: "transport@sirjp.edu" },
    { name: "School Reception Desk", role: "Front Office Inquiry", dept: "Administration", phone: "+91 22 2755 0000", email: "info@sirjp.edu" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Institution Directory</p>
            <h1 className="text-3xl font-extrabold text-white">Staff & Department Directory 📞</h1>
            <p className="text-slate-400 text-sm mt-1">Official verified institutional contacts and department extensions</p>
          </div>
          <button onClick={() => alert("Opening broadcast message composer...")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all">
            Send Broadcast Notice 📢
          </button>
        </div>

        {/* DIRECTORY TABLE */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Verified Institutional Contacts</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5">Name & Role</th>
                <th className="p-5">Department</th>
                <th className="p-5">Contact Phone & Email</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {directory.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-white text-base">{d.name}</p>
                    <p className="text-xs text-blue-400 font-medium">{d.role}</p>
                  </td>
                  <td className="p-5 text-slate-300 font-medium">{d.dept}</td>
                  <td className="p-5">
                    <p className="font-mono text-xs text-emerald-400">{d.phone}</p>
                    <p className="text-xs text-slate-400">{d.email}</p>
                  </td>
                  <td className="p-5 text-center">
                    <button onClick={() => alert(`Initiating direct message to ${d.name}...`)} className="bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-600 hover:border-blue-500 transition-all">
                      Message 💬
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