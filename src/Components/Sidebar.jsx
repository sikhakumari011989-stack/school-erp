import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

export default function Sidebar() {
  const { user, tenant, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Define links based on user role
  const getLinks = () => {
    const role = (user.role || "").toLowerCase();
    if (role === "admin") {
      return [
        { name: "Super Admin", path: "/admin/dashboard", icon: "🛡️" },
        { name: "Principal Suite", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Accountant Suite", path: "/accountant/dashboard", icon: "💰" },
        { name: "Trustee Audit", path: "/trustee/dashboard", icon: "📈" },
        { name: "Staff Operations", path: "/staff/dashboard", icon: "🛠️" },
        { name: "Security Audit", path: "/admin/audit", icon: "⚙️" },
        { name: "Directory & Comms", path: "/admin/directory", icon: "📞" },
      ];
    } else if (role === "staff") {
      return [{ name: "Dashboard", path: "/staff/dashboard", icon: "🛠️" }];
    } else if (role === "trustee" || role === "principal") {
      return [
        { name: "Executive Command", path: "/trustee/dashboard", icon: "📈" },
        { name: "Principal Hub", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Security & Audit", path: "/admin/audit", icon: "⚙️" },
        { name: "Institutional Directory", path: "/admin/directory", icon: "📞" },
      ];
    } else if (role === "accountant") {
      return [
        { name: "Treasury Dashboard", path: "/accountant/dashboard", icon: "💰" },
        { name: "Directory & Contacts", path: "/admin/directory", icon: "📞" },
      ];
    } else if (role === "teacher") {
      return [
        { name: "Faculty Dashboard", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "My Classroom Batches", path: "/teacher/classes", icon: "🏫" },
        { name: "Attendance Register", path: "/teacher/attendance", icon: "✅" },
        { name: "Publish Homework", path: "/teacher/homework", icon: "📚" },
        { name: "Analytics & Papers", path: "/teacher/analytics", icon: "📊" },
        { name: "Curriculum Planner", path: "/teacher/planner", icon: "📝" },
      ];
    } else if (role === "student") {
      return [
        { name: "Student Dashboard", path: "/student/dashboard", icon: "🎓" },
        { name: "Homework & Tasks", path: "/student/homework", icon: "📚" },
        { name: "Fee Ledger & Reports", path: "/student/fees", icon: "💳" },
        { name: "Pay Online (Razorpay)", path: "/student/pay", icon: "⚡" },
        { name: "LMS & Quizzes", path: "/student/lms", icon: "📖" },
        { name: "Certificates Vault", path: "/student/certificates", icon: "📜" },
        { name: "Campus Calendar", path: "/student/calendar", icon: "📅" },
        { name: "Campus Gallery", path: "/student/gallery", icon: "📸" },
        { name: "Conduct & Discipline", path: "/student/conduct", icon: "⚖️" },
        { name: "Transport Fleet GPS", path: "/student/transport", icon: "🚌" },
      ];
    }
    return [];
  };

  const roleBadgeColors = {
    admin: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    trustee: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    principal: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    teacher: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    accountant: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    student: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  };

  const badgeClass = roleBadgeColors[user.role?.toLowerCase()] || "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <div className="w-64 bg-[#0F172A] border-r border-slate-800/80 h-screen flex flex-col z-50 relative font-sans flex-shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-600/30 border border-white/10 flex-shrink-0">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-7 h-7 object-contain" />
            ) : (
              "🏫"
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white leading-snug truncate" title={tenant?.name || "Apex International"}>
              {tenant?.name || "Apex International"}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest truncate">
                {tenant?.code || user.institution_code || "OASIS-TUTORIALS"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {getLinks().map((link, idx) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={idx}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-left ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <span className="text-base">{link.icon}</span>
              <span className="truncate">{link.name}</span>
            </button>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-white truncate">{user.name}</p>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}
            >
              {user.role}
            </span>
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[80px]">
              {user.role_code || "ACTIVE"}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold py-2.5 px-3 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2 text-xs"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </div>
  );
}