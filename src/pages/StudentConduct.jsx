import React, { useState } from "react";

export default function StudentConduct() {
  const [records] = useState([
    { id: 1, title: "Positive Participation in Science Exhibition", type: "Merit", date: "Oct 05, 2026", status: "Commendation" },
    { id: 2, title: "Exemplary Fair Play in Inter-House Football", type: "Sportsmanship", date: "Sep 22, 2026", status: "Awarded" },
    { id: 3, title: "Library Book Return Compliance", type: "Record", date: "Sep 10, 2026", status: "Verified" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-3xl font-extrabold text-white">Conduct & Discipline Record ⚖️</h1>
          <p className="text-slate-400 text-sm mt-1">Review behavioral standing, commendations, and discipline history</p>
        </div>

        {/* STATUS CARD */}
        <div className="bg-gradient-to-r from-emerald-600/25 to-teal-600/10 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl mb-8 flex justify-between items-center">
          <div>
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Behavioral Standing</span>
            <h2 className="text-2xl font-black text-white mt-1">Excellent Standing (Grade A+) ⭐</h2>
            <p className="text-slate-300 text-sm mt-1">No disciplinary infractions recorded. Keep up the outstanding discipline!</p>
          </div>
          <div className="text-4xl">🛡️</div>
        </div>

        {/* RECORDS TABLE */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Merit & Conduct Log</h2>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-5">Record Description</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Date</th>
                  <th className="p-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 font-bold text-white text-base">{rec.title}</td>
                    <td className="p-5 font-mono text-slate-300">{rec.type}</td>
                    <td className="p-5 text-slate-400 text-xs">{rec.date}</td>
                    <td className="p-5 text-center">
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}