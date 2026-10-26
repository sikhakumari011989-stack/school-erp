import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import BrandLogo from "./BrandLogo";

export default function Sidebar() {
  const { user, tenant, logout, handleSignOut, setUser } = useContext(AppContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("erp_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("erp_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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

  const schoolCode = (user.institution_code || user.school_id || tenant?.code || "CAMPUS-01").toUpperCase();
  const rawRole = (user.role || "").toLowerCase();
  const personalCode = (user.role_code || user.roll_number || user.personal_code || "").toUpperCase();

  // Strict 6-Role Detection
  const roleType = (() => {
    if (personalCode.startsWith("PRIN") || rawRole === "principal") return "principal";
    if (personalCode.startsWith("HOD") || personalCode.startsWith("TR") || rawRole === "trustee") return "trustee";
    if (personalCode.startsWith("ACC") || rawRole === "accountant") return "accountant";
    if (personalCode.startsWith("TCH") || personalCode.startsWith("FAC") || rawRole === "teacher") return "teacher";
    if (personalCode.startsWith("NTS") || personalCode.startsWith("NON") || rawRole === "staff" || rawRole === "non_teaching") return "staff";
    if (personalCode.startsWith("ADM") || rawRole === "admin") return "admin";
    return "student";
  })();

  // Dynamic Navigation Links strictly partitioned by Role
  const getLinks = () => {
    if (roleType === "principal") {
      return [
        { name: "Executive Hub", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Task Delegation", path: "/principal/dashboard?tab=tasks", icon: "⚡" },
        { name: "Staff Leaves", path: "/principal/dashboard?tab=leaves", icon: "🏖️" },
        { name: "Asset Registry", path: "/principal/dashboard?tab=assets", icon: "📦" },
        { name: "Student Conduct", path: "/principal/dashboard?tab=behavior", icon: "⚖️" },
        { name: "Grievance Inbox", path: "/principal/dashboard?tab=grievances", icon: "📩" },
        { name: "Meeting Agenda", path: "/principal/dashboard?tab=scheduler", icon: "📅" },
        { name: "Alumni Network", path: "/principal/dashboard?tab=alumni", icon: "🎓" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
        { name: "Broadcast Hub", path: "/admin/broadcasts", icon: "📢" },
        { name: "Admissions CRM", path: "/admin/admissions", icon: "🎯" },
        { name: "ID Card Studio", path: "/admin/id-cards", icon: "🪪" },
        { name: "Staff Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expense Tracker", path: "/accountant/expenses", icon: "🧾" },
        { name: "Institutional Directory", path: "/admin/directory", icon: "📞" },
        { name: "Security Audit", path: "/admin/audit", icon: "⚙️" },
      ];
    } else if (roleType === "trustee") {
      return [
        { name: "Trustee Executive", path: "/trustee/dashboard", icon: "📈" },
        { name: "Principal Command", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
        { name: "Broadcast Hub", path: "/admin/broadcasts", icon: "📢" },
        { name: "Admissions CRM", path: "/admin/admissions", icon: "🎯" },
        { name: "Staff Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expense Tracker", path: "/accountant/expenses", icon: "🧾" },
        { name: "Treasury Ledger", path: "/accountant/dashboard", icon: "💰" },
        { name: "Institutional Directory", path: "/admin/directory", icon: "📞" },
        { name: "Security Audit", path: "/admin/audit", icon: "⚙️" },
      ];
    } else if (roleType === "accountant") {
      return [
        { name: "Treasury Dashboard", path: "/accountant/dashboard", icon: "💰" },
        { name: "Staff Payroll & Payslips", path: "/accountant/payroll", icon: "💵" },
        { name: "Expense Ledger", path: "/accountant/expenses", icon: "🧾" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
        { name: "Admissions CRM", path: "/admin/admissions", icon: "🎯" },
        { name: "ID Card Studio", path: "/admin/id-cards", icon: "🪪" },
        { name: "Directory & Contacts", path: "/admin/directory", icon: "📞" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Faculty Dashboard", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Staff Messenger", path: "/teacher/messages", icon: "💬" },
        { name: "Timed Online Exams", path: "/teacher/exams", icon: "📝" },
        { name: "Classroom Batches", path: "/teacher/classes", icon: "🏫" },
        { name: "Attendance Register", path: "/teacher/attendance", icon: "✅" },
        { name: "Homework & Quizzes", path: "/teacher/homework", icon: "📚" },
        { name: "Analytics & Marks", path: "/teacher/analytics", icon: "📊" },
        { name: "Curriculum Planner", path: "/teacher/planner", icon: "📝" },
        { name: "ID Card Studio", path: "/admin/id-cards", icon: "🪪" },
      ];
    } else if (roleType === "staff") {
      return [
        { name: "Operations Command", path: "/staff/dashboard", icon: "🛠️" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
        { name: "ID Card Studio", path: "/admin/id-cards", icon: "🪪" },
      ];
    } else if (roleType === "admin") {
      return [
        { name: "Super Admin Hub", path: "/admin/dashboard", icon: "🛡️" },
        { name: "Principal Suite", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Trustee Audit", path: "/trustee/dashboard", icon: "📈" },
        { name: "Treasury Suite", path: "/accountant/dashboard", icon: "💰" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
        { name: "Broadcast Hub", path: "/admin/broadcasts", icon: "📢" },
        { name: "Admissions CRM", path: "/admin/admissions", icon: "🎯" },
        { name: "ID Card Studio", path: "/admin/id-cards", icon: "🪪" },
        { name: "Staff Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expense Tracker", path: "/accountant/expenses", icon: "🧾" },
        { name: "Online Exams (CBT)", path: "/teacher/exams", icon: "📝" },
        { name: "Security Audit Vault", path: "/admin/audit", icon: "⚙️" },
        { name: "Institutional Directory", path: "/admin/directory", icon: "📞" },
      ];
    } else {
      // Default: Student / Parent
      return [
        { name: "Student Dashboard", path: "/student/dashboard", icon: "🎓" },
        { name: "Online Tests (CBT)", path: "/student/exams", icon: "📝" },
        { name: "Homework & Tasks", path: "/student/homework", icon: "📚" },
        { name: "Fee Vault & Receipts", path: "/student/fees", icon: "💳" },
        { name: "Pay Online", path: "/student/pay", icon: "⚡" },
        { name: "LMS & Courseware", path: "/student/lms", icon: "📖" },
        { name: "Certificates Vault", path: "/student/certificates", icon: "📜" },
        { name: "Campus Calendar", path: "/student/calendar", icon: "📅" },
        { name: "Conduct & Discipline", path: "/student/conduct", icon: "⚖️" },
      ];
    }
  };

  const links = getLinks();

  const handleLinkClick = (path) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  // Quick mobile bottom bar items
  const getBottomBarItems = () => {
    if (roleType === "student") {
      return [
        { name: "Home", path: "/student/dashboard", icon: "🎓" },
        { name: "Tasks", path: "/student/homework", icon: "📚" },
        { name: "Pay", path: "/student/pay", icon: "⚡" },
        { name: "LMS", path: "/student/lms", icon: "📖" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Home", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Attendance", path: "/teacher/attendance", icon: "✅" },
        { name: "Tasks", path: "/teacher/homework", icon: "📚" },
        { name: "Chat", path: "/teacher/messages", icon: "💬" },
      ];
    } else if (roleType === "principal") {
      return [
        { name: "Command", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Chat", path: "/admin/messages", icon: "💬" },
        { name: "Broadcasts", path: "/admin/broadcasts", icon: "📢" },
        { name: "Directory", path: "/admin/directory", icon: "📞" },
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 z-40 flex items-center justify-between px-4 shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
          <div className="min-w-0">
            <h2 className="text-xs font-black text-white truncate max-w-[150px]">
              {tenant?.name || "EduSaaS ERP"}
            </h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <p className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-wider truncate">
                {schoolCode}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-cyan-400/30 text-cyan-300">
            {roleType}
          </span>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
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
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          ></div>

          <div className="relative w-72 max-w-[85vw] h-full bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col shadow-2xl animate-slide-right">
            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
                <div>
                  <h3 className="text-xs font-black text-white truncate max-w-[140px]">
                    {tenant?.name || "EduSaaS ERP"}
                  </h3>
                  <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                    {schoolCode}
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

            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
              {links.map((link, idx) => {
                const currentFullPath = location.pathname + location.search;
                const isActive = link.path.includes("?")
                  ? currentFullPath === link.path
                  : location.pathname === link.path && !location.search;
                return (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(link.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ease-in-out hover:scale-[1.02] text-left ${
                      isActive
                        ? "border-l-4 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)] font-black"
                        : "text-slate-400 hover:bg-white/5 hover:text-white hover:shadow-cyan-500/10"
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    <span className="truncate">{link.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 mb-2">
                <p className="text-xs font-bold text-white truncate">{user.name || user.full_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {roleType}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{personalCode || "ACTIVE"}</span>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 px-3 rounded-xl transition-all duration-300 ease-in-out hover:scale-[1.02] border border-rose-500/20 flex items-center justify-center gap-2 text-xs"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-40 px-2 shadow-2xl shadow-cyan-500/10">
        {bottomItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ease-in-out hover:scale-105 cursor-pointer ${
                isActive ? "text-cyan-400 font-black drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-extrabold truncate max-w-[65px]">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-white transition-all duration-300 ease-in-out cursor-pointer"
        >
          <span className="text-lg">☰</span>
          <span className="text-[10px] font-extrabold">More</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. DESKTOP HOLOGRAPHIC SIDEBAR (Viewports >= 768px)          */}
      {/* ============================================================ */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl shadow-cyan-500/10 transition-all duration-300 ease-in-out flex-shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Holographic Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size="md" customLogoUrl={tenant?.logoUrl} />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white leading-snug truncate" title={tenant?.name || "EduSaaS ERP"}>
                  {tenant?.name || "EduSaaS ERP"}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest truncate">
                    {schoolCode}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center">
              <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
            </div>
          )}

          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-400 transition-all duration-300 ease-in-out hover:scale-[1.05] cursor-pointer ml-auto"
          >
            <span className="text-xs font-mono">{isCollapsed ? "»" : "«"}</span>
          </button>
        </div>

        {/* Dynamic Holographic Route Links */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {links.map((link, idx) => {
            const currentFullPath = location.pathname + location.search;
            const isActive = link.path.includes("?")
              ? currentFullPath === link.path
              : location.pathname === link.path && !location.search;
            return (
              <button
                key={idx}
                onClick={() => navigate(link.path)}
                title={isCollapsed ? link.name : ""}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-300 ease-in-out hover:scale-[1.02] text-left cursor-pointer ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "border-l-4 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)] font-black"
                    : "text-slate-400 hover:bg-white/5 hover:text-white hover:shadow-cyan-500/10 font-medium"
                }`}
              >
                <span className="text-base flex-shrink-0">{link.icon}</span>
                {!isCollapsed && <span className="truncate">{link.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          {!isCollapsed ? (
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 mb-2 shadow-lg">
              <p className="text-xs font-bold text-white truncate">{user.name || user.full_name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {roleType}
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                  {personalCode || "ACTIVE"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center mb-2">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {roleType.slice(0, 3)}
              </span>
            </div>
          )}

          <button
            onClick={onSignOut}
            title="Sign Out"
            className={`w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold py-2 px-2 rounded-xl transition-all duration-300 ease-in-out hover:scale-[1.02] border border-rose-500/20 flex items-center justify-center gap-2 text-xs cursor-pointer ${
              isCollapsed ? "px-1" : ""
            }`}
          >
            <span>🚪</span>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
