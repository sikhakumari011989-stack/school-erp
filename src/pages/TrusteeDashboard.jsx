import React, { useState } from "react";

export default function TrusteeDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState([
    { id: 1, name: "Astik Kumar", class: "Class 10 ICSE", subject: "Advanced Math", status: "Active" },
    { id: 2, name: "Satwik Sharma", class: "Class 10 ICSE", subject: "Computer Science", status: "Active" },
    { id: 3, name: "Anshika Kumari", class: "Class 8 Maharashtra Board", subject: "General Science", status: "Active" }
  ]);
  const [newStudent, setNewStudent] = useState({ name: "", class: "", subject: "" });

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.class) return;
    setStudents([...students, { id: Date.now(), ...newStudent, status: "Active" }]);
    setNewStudent({ name: "", class: "", subject: "" });
    alert("Student successfully enrolled via HOD/Principal portal!");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Executive Suite</p>
            <h1 className="text-3xl font-extrabold text-white">HOD / Trustee & Principal Command Center 🏛️</h1>
            <p className="text-slate-400 text-sm mt-1">Unified institutional audit, financial growth, and academic student management</p>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "overview" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Trustee Analytics
            </button>
            <button
              onClick={() => setActiveTab("academics")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "academics" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Principal Student & Class Control
            </button>
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Tuition Revenue</p>
                <p className="text-3xl font-extrabold text-emerald-400">₹4,50,000</p>
                <span className="text-xs text-slate-400 mt-2 block">+18% growth this term</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Enrolled Students</p>
                <p className="text-3xl font-extrabold text-blue-400">{students.length} Enrolled</p>
                <span className="text-xs text-slate-400 mt-2 block">100% attendance verified</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Faculty Utilization</p>
                <p className="text-3xl font-extrabold text-purple-400">96.5%</p>
                <span className="text-xs text-slate-400 mt-2 block">8 Active Tutors</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Fee Collection Rate</p>
                <p className="text-3xl font-extrabold text-emerald-400">94.2%</p>
                <span className="text-xs text-slate-400 mt-2 block">Razorpay automated sync</span>
              </div>
            </div>

            {/* TRUSTEE AUDIT CARD */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Board & Financial Compliance Vault</h2>
              <p className="text-slate-300 text-sm mb-6">All institutional tax records, rental agreements, and teacher contracts are encrypted and verified under Supabase RLS security standards.</p>
              <button onClick={() => alert("Downloading certified financial audit report...")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all">
                Download Certified Financial Audit (PDF) 📥
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ADD STUDENT FORM */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Onlne Student Admission & Registration</h2>
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  type="text" 
                  placeholder="Student Full Name" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Class/Batch (e.g., Class 10 ICSE)" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                  + Enroll New Student 🚀
                </button>
              </form>
            </div>

            {/* STUDENT ROSTER TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Active Tuition Student Directory</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Student Name</th>
                    <th className="p-5">Batch / Class</th>
                    <th className="p-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-white text-base">{st.name}</td>
                      <td className="p-5 text-slate-300">{st.class}</td>
                      <td className="p-5 text-center">
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                          {st.status}
                        </span>
                      </td>
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