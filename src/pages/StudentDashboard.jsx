import { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";

export default function StudentDashboard() {
  const { user } = useContext(AppContext) || { user: { name: "Anshika" } };

  // Upgraded Quick Actions with rich gradients instead of flat colors
  const quickActions = [
    { name: "Attendance", icon: "📅", gradient: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30", path: "/student-attendance" },
    { name: "Homework", icon: "📝", gradient: "from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/30", path: "/student-homework" },
    { name: "Marks", icon: "📊", gradient: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30", path: "/student-marks" },
    { name: "Diary", icon: "📖", gradient: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30", path: "/student-diary" },
    { name: "Chat", icon: "💬", gradient: "from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30", path: "/chat" },
    { name: "Fees", icon: "💰", gradient: "from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30", path: "/student-fees" },
    { name: "Request Cert", icon: "📜", gradient: "from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30", path: "/request-cert" },
    { name: "Certificates", icon: "🏆", gradient: "from-yellow-500/20 to-amber-500/10 text-yellow-400 border-yellow-500/30", path: "/certificates" },
    { name: "Online Exam", icon: "💻", gradient: "from-red-500/20 to-rose-500/10 text-red-400 border-red-500/30", path: "/online-exam" },
    { name: "Calendar", icon: "📆", gradient: "from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30", path: "/calendar" },
    { name: "Live Class", icon: "🎥", gradient: "from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30", path: "/live-class" },
    { name: "Gallery", icon: "🖼️", gradient: "from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30", path: "/gallery" },
    { name: "LMS Hub", icon: "📚", gradient: "from-fuchsia-500/20 to-purple-500/10 text-fuchsia-400 border-fuchsia-500/30", path: "/lms-hub" },
    { name: "Conduct", icon: "⚖️", gradient: "from-slate-500/20 to-gray-500/10 text-slate-300 border-slate-500/30", path: "/conduct" },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      
      {/* GLOWING AMBIENT BACKGROUND ORBS */}
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        {/* HERO HEADER - Glassmorphism */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-700"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Welcome back, {user?.name?.split(' ')[0] || "Student"} 👋
              </h1>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-white/20 transform hover:rotate-6 transition-all duration-300 cursor-pointer">
              {user?.name?.charAt(0) || "S"}
            </div>
          </div>
        </div>

        {/* STATUS BAR - Floating Glass */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex justify-between items-center mb-8 shadow-lg hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-xl border border-slate-700/50">🛡️</div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Today's Attendance</p>
              <p className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Marked Present
              </p>
            </div>
          </div>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold px-4 py-2 rounded-xl shadow-inner">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* STATS ROW - Animated Hover Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { value: "0", label: "Pending Homework", color: "text-orange-400", border: "group-hover:border-orange-500/50" },
            { value: "Upcoming", label: "Next Exam", color: "text-blue-400", border: "group-hover:border-blue-500/50" },
            { value: "₹0", label: "Fees Due", color: "text-emerald-400", border: "group-hover:border-emerald-500/50" }
          ].map((stat, i) => (
            <div key={i} className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${stat.border}`}>
              <span className={`text-3xl font-extrabold mb-1 transform group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>{stat.value}</span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS - Glass App Grid */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Quick Actions</h2>
          <span className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">Edit Layout ⚙️</span>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6 mb-10">
          {quickActions.map((action, idx) => (
            <Link key={idx} to={action.path} className="group relative flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.1)] transition-all duration-300 ease-out">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.gradient} border group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-white text-center transition-colors">
                {action.name}
              </span>
            </Link>
          ))}
        </div>

        {/* BOTTOM WIDGETS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Classes Widget */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-white/20 transition-all">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <span>📅</span> Today's Classes
            </h3>
            <div className="flex flex-col items-center justify-center h-32 transform group-hover:scale-105 transition-transform duration-500">
              <span className="text-4xl mb-3 drop-shadow-2xl">🏖️</span>
              <p className="text-slate-200 font-bold">No classes today</p>
              <p className="text-slate-500 text-xs mt-1">Take a break and relax!</p>
            </div>
          </div>

          {/* Recent Notices Widget */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl hover:border-white/20 transition-all">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <span>📢</span> Live Announcements
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">🏆</div>
                <div className="flex-1">
                  <p className="text-slate-200 font-bold text-sm">Techfest Innovation Challenge</p>
                  <p className="text-slate-500 text-xs mt-0.5">Registrations open for Grade 8-10</p>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-800 px-2 py-1 rounded">2 hrs ago</span>
              </li>
              <li className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:border-red-500/30 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-lg border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">⛈️</div>
                <div className="flex-1">
                  <p className="text-slate-200 font-bold text-sm">Holiday Due to Heavy Rain</p>
                  <p className="text-slate-500 text-xs mt-0.5">School will remain closed tomorrow</p>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-800 px-2 py-1 rounded">1 day ago</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}