import React, { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { user } = useContext(AppContext);
  const navigate = useNavigate();

  const studentActions = [
    { name: "My Homework", icon: "📝", color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30", path: "/student/homework" },
    { name: "Pay Fees", icon: "💳", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30", path: "/student/fees" },
    { name: "View Report Card", icon: "📊", color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30", path: "/student/reports" },
    { name: "School Notices", icon: "🔔", color: "from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/30", path: "/student/notices" },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 flex justify-between items-center">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Hello, {user?.name || "Student"} 🎓
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-slate-400 text-sm font-bold">Class</p>
            <p className="text-xl font-bold text-white">10th - ICSE</p>
          </div>
        </div>

        {/* PERFORMANCE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Overall Attendance", value: "92%", icon: "📅", color: "text-emerald-400" },
            { label: "Pending Assignments", value: "3", icon: "📚", color: "text-orange-400" },
            { label: "Latest Grade", value: "A-", icon: "🏆", color: "text-purple-400" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center text-2xl border border-slate-700/50">
                {stat.icon}
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* STUDENT ACTIONS */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {studentActions.map((action, idx) => (
            <button 
              key={idx} 
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:-translate-y-2 transition-all w-full"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border group-hover:scale-110 transition-transform shadow-inner`}>
                {action.icon}
              </div>
              <span className="text-sm font-bold text-slate-300 group-hover:text-white text-center">
                {action.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}