import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import BrandLogo from "./BrandLogo";

export default function Sidebar() {
  const { user, tenant, logout, handleSignOut, setUser } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const onSignOut = async () => {
    try {
      localStorage.removeItem("erp_session_user");
      localStorage.removeItem("erp_demo_session");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear notice:", e);
    }
    if (typeof handleSignOut === "function") {
      handleSignOut();
    } else if (typeof logout === "function") {
      logout();
    } else {
      if (typeof setUser === "function") setUser(null);
      window.location.href = "/login?signedOut=true";
    }
  };

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
        { name: "Publish Homework & Quizzes", path: "/teacher/homework", icon: "📚" },
        { name: "Analytics & Papers", path: "/teacher/analytics", icon: "📊" },
        { name: "Curriculum Planner", path: "/teacher/planner", icon: "📝" },
      ];
    } else if (role === "student") {
      return [
        { name: "Student Dashboard", path: "/student/dashboard", icon: "🎓" },
        { name: "Homework & Tasks", path: "/student/homework", icon: "📚" },
        { name: "Fee Ledger & Vault", path: "/student/fees", icon: "💳" },
        { name: "Pay Online (Razorpay)", path: "/student/pay", icon: "⚡" },
        { name: "LMS & Quizzes", path: "/student/lms", icon: "📖" },
        { name: "Certificates Vault", path: "/student/certificates", icon: "📜" },
        { name: "Campus Calendar", path: "/student/calendar", icon: "📅" },
        { name: "Campus Gallery", path: "/student/gallery", icon: "📸" },
        { name: "Conduct & Discipline", path: "/student/conduct", icon: "⚖️" },
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
  const links = getLinks();

  const handleLinkClick = (path) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  // Quick bottom bar items for mobile
  const getBottomBarItems = () => {
    const role = (user.role || "").toLowerCase();
    if (role === "student") {
      return [
        { name: "Home", path: "/student/dashboard", icon: "🎓" },
        { name: "Tasks", path: "/student/homework", icon: "📚" },
        { name: "Pay Fees", path: "/student/pay", icon: "⚡" },
        { name: "LMS", path: "/student/lms", icon: "📖" },
      ];
    } else if (role === "teacher") {
      return [
        { name: "Dashboard", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Roll Call", path: "/teacher/attendance", icon: "✅" },
        { name: "Homework", path: "/teacher/homework", icon: "📚" },
        { name: "Batches", path: "/teacher/classes", icon: "🏫" },
      ];
    } else {
      return links.slice(0, 4);
    }
  };

  const bottomItems = getBottomBarItems();

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE TOP NAVIGATION BAR (Viewports < 768px)               */}
      {/* ============================================================ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-800/80 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
          <div className="min-w-0">
            <h2 className="text-xs font-black text-white truncate max-w-[150px]">
              {tenant?.name || "Apex International"}
            </h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[9px] text-blue-400 font-extrabold uppercase tracking-wider truncate">
                {tenant?.code || user.institution_code || "CAMPUS-01"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}`}
          >
            {user.role}
          </span>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <span className="text-base leading-none">{mobileDrawerOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MOBILE SLIDE-OUT DRAWER OVERLAY (Viewports < 768px)       */}
      {/* ============================================================ */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dimmed backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0F172A] border-r border-slate-800 z-50 flex flex-col shadow-2xl animate-slide-right">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
                <div>
                  <h3 className="text-xs font-black text-white truncate max-w-[140px]">
                    {tenant?.name || "Apex International"}
                  </h3>
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                    {tenant?.code || user.institution_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
              {links.map((link, idx) => {
                const isActive = location.pathname === link.path;
                return (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(link.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
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

            {/* Profile & Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-2">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badgeClass}`}>
                    {user.role}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{user.role_code || "ACTIVE"}</span>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 px-3 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2 text-xs"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Viewports < 768px)          */}
      {/* ============================================================ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A]/95 backdrop-blur-xl border-t border-slate-800/90 flex items-center justify-around z-40 px-2 shadow-2xl">
        {bottomItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
                isActive ? "text-blue-400 scale-105" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-extrabold truncate max-w-[65px]">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <span className="text-lg">☰</span>
          <span className="text-[10px] font-extrabold">More</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. DESKTOP SIDEBAR (Viewports >= 768px)                      */}
      {/* ============================================================ */}
      <div className="hidden md:flex w-64 bg-[#0F172A] border-r border-slate-800/80 h-screen flex-col z-40 sticky top-0 font-sans flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" customLogoUrl={tenant?.logoUrl} />
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white leading-snug truncate" title={tenant?.name || "Apex International"}>
                {tenant?.name || "Apex International"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-extrabold tracking-wider">
                  MULTI-TENANT RLS ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest truncate mt-0.5">
                {tenant?.code || user.institution_code || "CAMPUS-01"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {links.map((link, idx) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={idx}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-left cursor-pointer ${
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
            onClick={onSignOut}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold py-2.5 px-3 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}