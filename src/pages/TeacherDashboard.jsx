import React, { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function TeacherDashboard() {
  const { user } = useContext(AppContext);
  const navigate = useNavigate();

  const teacherActions = [
    { name: "Mark Attendance", icon: "✅", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30", path: "/teacher/attendance" },
    { name: "Upload Homework", icon: "📚", color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30", path: "/teacher/homework" },
    { name: "Input Grades", icon: "📝", color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30", path: "/teacher/reports" },
    { name: "Broadcast Notice", icon: "📢", color: "from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/30", path: "/teacher/notices" },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 flex justify-between items-center">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Portal</p>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Welcome back, {user?.name || "Teacher"} 👋
            </h1>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm font-bold">Today's Date</p>
            <p className="text-xl font-bold text-white">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "My Classes", value: "4", icon: "🏫", color: "text-blue-400" },
            { label: "Total Students", value: "128", icon: "👥", color: "text-purple-400" },
            { label: "Pending Homework", value: "2", icon: "⏳", color: "text-orange-400" }
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

        {/* QUICK ACTIONS */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Classroom Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {teacherActions.map((action, idx) => (
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