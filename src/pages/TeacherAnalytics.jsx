import React, { useState } from "react";

export default function TeacherAnalytics() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [papers] = useState([
    { id: 1, title: "Mid-Term Mathematics Question Paper Set A", class: "Class 10-A", format: "PDF", date: "Oct 01, 2026" },
    { id: 2, title: "Algebra Weekly Test Question Bank", class: "Class 10-B", format: "DOCX", date: "Sep 25, 2026" }
  ]);
  const [supportStudents] = useState([
    { name: "Rahul Sharma", class: "Class 10-A", issue: "Low Mathematics test scores (Below 40%)", action: "Assigned Remedial Algebra Class" },
    { name: "Priya Singh", class: "Class 10-B", issue: "Irregular attendance trend over 3 weeks", action: "Parent consultation scheduled" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Performance Analytics & Question Bank 📊</h1>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "analytics" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Student Analytics[cite: 3]
            </button>
            <button
              onClick={() => setActiveTab("papers")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "papers" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Question Papers[cite: 3]
            </button>
          </div>
        </div>

        {activeTab === "analytics" ? (
          <div className="space-y-8">
            {/* OVERVIEW METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Class Average Score</p>
                <p className="text-3xl font-extrabold text-emerald-400">78.4% <span className="text-xs text-slate-400">+4.2% MoM</span></p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Overall Attendance Trend</p>
                <p className="text-3xl font-extrabold text-blue-400">92.1%</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Students Needing Support</p>
                <p className="text-3xl font-extrabold text-orange-400">2 Students[cite: 3]</p>
              </div>
            </div>

            {/* STUDENTS NEEDING EXTRA SUPPORT TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Students Requiring Extra Support ⚠️[cite: 3]</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Student Name & Class</th>
                    <th className="p-5">Performance / Attendance Issue[cite: 3]</th>
                    <th className="p-5">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {supportStudents.map((st, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-white">{st.name} <span className="text-xs text-slate-400 block font-normal">{st.class}</span></td>
                      <td className="p-5 text-orange-400 font-medium">{st.issue}</td>
                      <td className="p-5 text-slate-300 font-bold">{st.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Upload Question Paper Source</h2>
                <p className="text-slate-400 text-xs">Upload assessment papers for upcoming exams or weekly tests[cite: 3].</p>
              </div>
              <button onClick={() => alert("Opening file uploader...")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all">
                + Upload Paper[cite: 3]
              </button>
            </div>

            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Uploaded Question Paper Sources</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Paper Title</th>
                    <th className="p-5">Class Target</th>
                    <th className="p-5">Format</th>
                    <th className="p-5">Date Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {papers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-white">{p.title}</td>
                      <td className="p-5 text-slate-300">{p.class}</td>
                      <td className="p-5 font-mono text-purple-400">{p.format}</td>
                      <td className="p-5 text-slate-400 text-xs">{p.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}