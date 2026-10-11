import React, { useState } from "react";

export default function TrusteeDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const branches = [
    { name: "Palghar Main Campus", students: 1250, revenue: "₹45,20,000", status: "Optimal" },
    { name: "Boisar Branch", students: 820, revenue: "₹28,50,000", status: "Growing" },
    { name: "Vasai Extension", students: 640, revenue: "₹22,10,000", status: "Stable" }
  ];

  const documents = [
    { title: "Annual Trust Deed & Registration", date: "Verified 2025", status: "Compliant" },
    { title: "Municipal Fire Safety Clearance", date: "Valid till Dec 2026", status: "Active" },
    { title: "Government Educational Audit Report", date: "FY 2025-26", status: "Approved" }
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Executive Board Oversight</p>
            <h1 className="text-3xl font-extrabold text-white">Trustee Audit & Growth Portal 🏛️</h1>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "overview" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Macro Analytics
            </button>
            <button
              onClick={() => setActiveTab("compliance")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "compliance" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Legal & Compliance Vault
            </button>
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* MACRO STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Institutional Enrollment</p>
                <p className="text-3xl font-extrabold text-white">2,710 <span className="text-xs text-emerald-400 font-bold">+12% YoY</span></p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Consolidated Annual Revenue</p>
                <p className="text-3xl font-extrabold text-emerald-400">₹95,80,000</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Branches</p>
                <p className="text-3xl font-extrabold text-purple-400">3 Campuses</p>
              </div>
            </div>

            {/* BRANCH COMPARISON TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Multi-Branch Performance Comparison</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Campus Branch</th>
                    <th className="p-5">Student Strength</th>
                    <th className="p-5">Revenue Generated</th>
                    <th className="p-5 text-center">Operational Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {branches.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-white text-base">{b.name}</td>
                      <td className="p-5 font-mono text-slate-300">{b.students} Enrolled</td>
                      <td className="p-5 font-extrabold text-emerald-400">{b.revenue}</td>
                      <td className="p-5 text-center">
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white mb-6">Secure Legal & Compliance Vault</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {documents.map((doc, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-2xl block mb-3">📁</span>
                    <h3 className="text-base font-bold text-white mb-1">{doc.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{doc.date}</p>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <span className="text-xs font-extrabold text-emerald-400 uppercase">{doc.status}</span>
                    <button onClick={() => alert("Accessing secure document preview...")} className="text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-600/40 transition-all">
                      View File
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}