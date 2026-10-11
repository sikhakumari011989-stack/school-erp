import React, { useState } from "react";

export default function SystemAudit() {
  const [logs] = useState([
    { id: 1, user: "ADMIN-01 (Super Admin)", action: "Created Class 10-A record in Supabase", ip: "192.168.1.45", time: "10 mins ago", status: "Secure" },
    { id: 2, user: "ACC-01 (Accountant)", action: "Logged fee transaction of ₹15,000 via Razorpay", ip: "192.168.1.88", time: "25 mins ago", status: "Verified" },
    { id: 3, user: "TCH-05 (Faculty)", action: "Marked daily attendance for Class 10-A", ip: "192.168.1.12", time: "1 hour ago", status: "Secure" },
    { id: 4, user: "TRU-01 (Trustee)", action: "Downloaded annual financial audit report PDF", ip: "192.168.2.14", time: "3 hours ago", status: "Encrypted" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Enterprise Security</p>
            <h1 className="text-3xl font-extrabold text-white">System Security Audit Vault ⚙️</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time cryptographic logs and institutional access tracking</p>
          </div>
          <button onClick={() => alert("Exporting full institutional audit log as CSV...")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all">
            Export Audit Logs (CSV) 📊
          </button>
        </div>

        {/* SECURITY STATUS BANNER */}
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30 rounded-3xl p-6 shadow-2xl mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Encryption Status</span>
            <h2 className="text-2xl font-black text-white mt-1">SSL/TLS 256-bit Secure Node Active 🛡️</h2>
            <p className="text-slate-300 text-sm mt-1">Row-Level Security (RLS) enabled across all Supabase PostgreSQL tenants.</p>
          </div>
          <div className="text-4xl">🔒</div>
        </div>

        {/* AUDIT LOGS TABLE */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Live Institutional Activity Logs</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5">User & Role</th>
                <th className="p-5">Action Performed</th>
                <th className="p-5">IP Address & Time</th>
                <th className="p-5 text-center">Security Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 font-bold text-white">{l.user}</td>
                  <td className="p-5 text-slate-300 font-medium">{l.action}</td>
                  <td className="p-5">
                    <p className="font-mono text-xs text-blue-400">{l.ip}</p>
                    <p className="text-xs text-slate-400">{l.time}</p>
                  </td>
                  <td className="p-5 text-center">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                      {l.status}
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