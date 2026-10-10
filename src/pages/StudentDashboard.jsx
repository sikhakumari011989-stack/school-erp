import { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";

export default function StudentDashboard() {
  const { user } = useContext(AppContext) || { user: { name: "Anshika" } };

  // Matching the 14 Quick Actions from the video
  const quickActions = [
    { name: "Attendance", icon: "📅", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", path: "/student-attendance" },
    { name: "Homework", icon: "📝", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", path: "/student-homework" },
    { name: "Marks", icon: "📊", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", path: "/student-marks" },
    { name: "Diary", icon: "📖", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", path: "/student-diary" },
    { name: "Chat", icon: "💬", color: "bg-pink-500/10 text-pink-400 border-pink-500/20", path: "/chat" },
    { name: "Fees", icon: "💰", color: "bg-green-500/10 text-green-400 border-green-500/20", path: "/student-fees" },
    { name: "Request Cert", icon: "📜", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", path: "/request-cert" },
    { name: "Certificates", icon: "🏆", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", path: "/certificates" },
    { name: "Online Exam", icon: "💻", color: "bg-red-500/10 text-red-400 border-red-500/20", path: "/online-exam" },
    { name: "Calendar", icon: "📆", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", path: "/calendar" },
    { name: "Live Class", icon: "🎥", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", path: "/live-class" },
    { name: "Gallery", icon: "🖼️", color: "bg-teal-500/10 text-teal-400 border-teal-500/20", path: "/gallery" },
    { name: "LMS Hub", icon: "📚", color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20", path: "/lms-hub" },
    { name: "Conduct", icon: "⚖️", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", path: "/conduct" },
  ];

  return (
    <div className="text-slate-200 pb-10">
      
      {/* HEADER SECTION - Matching video layout */}
      <div className="bg-gradient-to-r from-blue-900 to-[#1E293B] rounded-2xl p-6 shadow-2xl mb-6 relative overflow-hidden border border-blue-500/20">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1">Good Afternoon</p>
            <h1 className="text-3xl font-bold text-white">{user?.name} 👋</h1>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white border-2 border-white/20 shadow-lg">
            {user?.name?.charAt(0) || "A"}
          </div>
        </div>
      </div>

      {/* TOP NOTIFICATION BAR */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex justify-between items-center mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg">🛡️</div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Attendance</p>
            <p className="text-lg font-bold text-white">Not marked</p>
          </div>
        </div>
        <span className="bg-[#0F172A] border border-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg">
          10 Oct
        </span>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg text-center">
          <span className="text-orange-400 text-2xl font-bold mb-1">0</span>
          <span className="text-slate-400 text-xs font-semibold">Homework</span>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg text-center">
          <span className="text-blue-400 text-2xl font-bold mb-1">0</span>
          <span className="text-slate-400 text-xs font-semibold">Exams</span>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg text-center">
          <span className="text-red-400 text-2xl font-bold mb-1">₹0</span>
          <span className="text-slate-400 text-xs font-semibold">Fees Due</span>
        </div>
      </div>

      {/* QUICK ACTIONS GRID - The 14 Features */}
      <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4 mb-8">
        {quickActions.map((action, idx) => (
          <Link key={idx} to={action.path} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shadow-lg transition-transform group-hover:scale-105 group-hover:-translate-y-1 ${action.color}`}>
              {action.icon}
            </div>
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white text-center">
              {action.name}
            </span>
          </Link>
        ))}
      </div>

      {/* THREE BOTTOM CARDS FROM VIDEO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Classes */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-48">
          <h3 className="w-full text-left text-sm font-bold text-white mb-4">Today's Classes</h3>
          <span className="text-3xl mb-2">🏖️</span>
          <p className="text-slate-300 font-bold">No classes today</p>
          <p className="text-slate-500 text-sm">Take a break!</p>
        </div>

        {/* Pending Homework */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-48">
          <h3 className="w-full text-left text-sm font-bold text-white mb-4">Pending Homework</h3>
          <span className="text-3xl mb-2">✅</span>
          <p className="text-slate-300 font-bold">No pending homework</p>
          <p className="text-slate-500 text-sm">You're all caught up! ✌️</p>
        </div>

        {/* Recent Notices */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg h-48 overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-white mb-4">Recent Notices</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 border-b border-slate-700/50 pb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-slate-200 font-bold text-sm leading-tight">MONTH END COMPETITION NOTICE</p>
              </div>
            </li>
            <li className="flex items-start gap-3 border-b border-slate-700/50 pb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-slate-200 font-bold text-sm leading-tight">Holiday Due to Heavy Rain</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}