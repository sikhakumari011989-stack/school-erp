import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { normalizeRole } from "../utils/credentials";
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

  // Strict Canonical Role Detection via Unified normalizeRole
  const canonical = normalizeRole(user.role, personalCode);
  const roleType =
    canonical === "PRIN" ? "principal" :
    canonical === "HOD" ? "trustee" :
    canonical === "ACC" ? "accountant" :
    canonical === "TCH" ? "teacher" :
    canonical === "NTS" ? "staff" :
    canonical === "MASTER_OWNER" ? "admin" : "student";

  // Streamlined Navigation strictly centered on Core MVP School Management Areas
  const getLinks = () => {
    if (roleType === "principal") {
      return [
        { name: "Executive Command", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Trustee Oversight", path: "/trustee/dashboard", icon: "📈" },
        { name: "School Analytics", path: "/admin/analytics", icon: "📊" },
        { name: "Executive Reports", path: "/admin/reports", icon: "📑" },
        { name: "Students & Admissions", path: "/admin/admissions", icon: "🎯" },
        { name: "Classes & Sections", path: "/admin/classes", icon: "🏫" },
        { name: "Master Timetable", path: "/admin/timetable", icon: "🗓️" },
        { name: "Fee Collection & Dues", path: "/accountant/dashboard", icon: "💰" },
        { name: "Examinations & Marks", path: "/teacher/analytics", icon: "📊" },
        { name: "Attendance & Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "trustee") {
      return [
        { name: "Trustee Command", path: "/trustee/dashboard", icon: "📈" },
        { name: "Principal Operations", path: "/principal/dashboard", icon: "🏛️" },
        { name: "School Analytics", path: "/admin/analytics", icon: "📊" },
        { name: "Executive Reports", path: "/admin/reports", icon: "📑" },
        { name: "Students & Admissions", path: "/admin/admissions", icon: "🎯" },
        { name: "Classes & Sections", path: "/admin/classes", icon: "🏫" },
        { name: "Master Timetable", path: "/admin/timetable", icon: "🗓️" },
        { name: "Fee Treasury & Dues", path: "/accountant/dashboard", icon: "💰" },
        { name: "Academic Performance", path: "/teacher/analytics", icon: "📊" },
        { name: "School Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "accountant") {
      return [
        { name: "Fee Treasury & Receipts", path: "/accountant/dashboard", icon: "💰" },
        { name: "Financial Reports", path: "/admin/reports", icon: "📑" },
        { name: "Staff Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expense Ledger", path: "/accountant/expenses", icon: "🧾" },
        { name: "Admissions & Dues", path: "/admin/admissions", icon: "🎯" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Teacher Overview", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Mark Attendance", path: "/teacher/attendance", icon: "✅" },
        { name: "Class Test Marks", path: "/teacher/class-tests", icon: "📝" },
        { name: "My Classes & Students", path: "/teacher/classes", icon: "🏫" },
        { name: "Exam Marks & Results", path: "/teacher/analytics", icon: "📊" },
        { name: "Homework & Tasks", path: "/teacher/homework", icon: "📚" },
        { name: "Timetable & Planner", path: "/teacher/planner", icon: "🗓️" },
        { name: "Staff Messages", path: "/teacher/messages", icon: "💬" },
      ];
    } else if (roleType === "staff") {
      return [
        { name: "Operations Overview", path: "/staff/dashboard", icon: "🛠️" },
        { name: "Student Directory", path: "/admin/admissions", icon: "🎯" },
        { name: "Campus Attendance", path: "/teacher/attendance", icon: "✅" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "admin") {
      return [
        { name: "Principal Operations", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Trustee Oversight", path: "/trustee/dashboard", icon: "📈" },
        { name: "Fee Treasury", path: "/accountant/dashboard", icon: "💰" },
        { name: "Academic Performance", path: "/teacher/analytics", icon: "📊" },
        { name: "School Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Admissions CRM", path: "/admin/admissions", icon: "🎯" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else {
      // Default: Student / Parent (view own profile, attendance, fees, marks, homework)
      return [
        { name: "Student Overview", path: "/student/dashboard", icon: "🎓" },
        { name: "My Marks", path: "/student/marks", icon: "📊" },
        { name: "Attendance & Calendar", path: "/student/calendar", icon: "📅" },
        { name: "Fee Dues & Receipts", path: "/student/fees", icon: "💳" },
        { name: "Exams & Results", path: "/student/exams", icon: "📝" },
        { name: "Homework & Assignments", path: "/student/homework", icon: "📚" },
      ];
    }
  };

  const links = getLinks();
  const categoryTitle =
    roleType === "principal" || roleType === "trustee" || roleType === "admin"
      ? "Executive Suite / Command Center"
      : roleType === "teacher"
      ? "Academic Operations"
      : roleType === "accountant"
      ? "Fiscal Treasury & Ledgers"
      : roleType === "staff"
      ? "Campus Operations"
      : "Student Workspace";

  const handleLinkClick = (path) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  // Quick mobile bottom bar items
  const getBottomBarItems = () => {
    if (roleType === "student") {
      return [
        { name: "Home", path: "/student/dashboard", icon: "🎓" },
        { name: "Attendance", path: "/student/calendar", icon: "📅" },
        { name: "Fees", path: "/student/fees", icon: "💳" },
        { name: "Exams", path: "/student/exams", icon: "📝" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Home", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Attendance", path: "/teacher/attendance", icon: "✅" },
        { name: "Marks", path: "/teacher/analytics", icon: "📊" },
        { name: "Classes", path: "/teacher/classes", icon: "🏫" },
      ];
    } else if (roleType === "accountant") {
      return [
        { name: "Treasury", path: "/accountant/dashboard", icon: "💰" },
        { name: "Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expenses", path: "/accountant/expenses", icon: "🧾" },
        { name: "Chat", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "principal") {
      return [
        { name: "Overview", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Students", path: "/admin/admissions", icon: "🎯" },
        { name: "Treasury", path: "/accountant/dashboard", icon: "💰" },
        { name: "Calendar", path: "/admin/calendar", icon: "📅" },
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 z-40 flex items-center justify-between px-4 shadow-sm dark:shadow-2xl dark:shadow-cyan-500/10 transition-colors duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
          <div className="min-w-0">
            <h2 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {tenant?.name || "EduSaaS ERP"}
            </h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400 animate-pulse"></span>
              <p className="text-[9px] text-indigo-600 dark:text-cyan-400 font-extrabold uppercase tracking-wider truncate">
                {schoolCode}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-cyan-400/30 text-indigo-700 dark:text-cyan-300">
            {roleType}
          </span>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-all duration-200 ease-in-out cursor-pointer"
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
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
          ></div>

          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-[#0A0E1A] backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800/90 z-50 flex flex-col shadow-2xl animate-slide-right transition-colors duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#131A2B]/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px]">
                    {tenant?.name || "EduSaaS ERP"}
                  </h3>
                  <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                    {schoolCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
              <div className="px-2 pb-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {categoryTitle}
              </div>
              {links.map((link, idx) => {
                const currentFullPath = location.pathname + location.search;
                const isActive = link.path.includes("?")
                  ? currentFullPath === link.path
                  : location.pathname === link.path && !location.search;
                return (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(link.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 text-left cursor-pointer ${
                      isActive
                        ? "border-l-4 border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-white bg-indigo-50 dark:bg-[#131A2B] dark:border-indigo-500/40 shadow-sm dark:shadow-[0_0_20px_rgba(99,102,241,0.2)] font-black"
                        : "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131A2B] hover:text-slate-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    <span className="truncate">{link.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#131A2B]/70">
              <div className="bg-white dark:bg-[#131A2B] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 mb-2 shadow-sm">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name || user.full_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {roleType}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{personalCode || "ACTIVE"}</span>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 font-bold py-2.5 px-3 rounded-xl transition-all duration-200 ease-in-out hover:-translate-y-0.5 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center gap-2 text-xs cursor-pointer"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 flex items-center justify-around z-40 px-2 shadow-lg dark:shadow-2xl dark:shadow-cyan-500/10 transition-colors duration-200">
        {bottomItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer ${
                isActive
                  ? "text-indigo-600 dark:text-cyan-400 font-black drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-extrabold truncate max-w-[65px]">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all duration-200 ease-in-out cursor-pointer"
        >
          <span className="text-lg">☰</span>
          <span className="text-[10px] font-extrabold">More</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. DESKTOP HOLOGRAPHIC SIDEBAR (Viewports >= 768px)          */}
      {/* ============================================================ */}
      <aside
        className={`hidden md:flex flex-col h-full flex-shrink-0 sticky top-0 z-40 border-r border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#0A0E1A] backdrop-blur-xl shadow-sm dark:shadow-2xl transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Holographic Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#131A2B]/70 flex items-center justify-between flex-shrink-0 transition-colors">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size="md" customLogoUrl={tenant?.logoUrl} />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-900 dark:text-white leading-snug truncate" title={tenant?.name || "EduSaaS ERP"}>
                  {tenant?.name || "EduSaaS ERP"}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-emerald-400 animate-pulse"></span>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-widest truncate">
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
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#131A2B] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 ease-in-out hover:scale-105 cursor-pointer ml-auto"
          >
            <span className="text-xs font-mono">{isCollapsed ? "»" : "«"}</span>
          </button>
        </div>

        {/* Dynamic Holographic Route Links */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {!isCollapsed && (
            <div className="px-3 pt-1 pb-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {categoryTitle}
            </div>
          )}
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 text-left cursor-pointer ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "border-l-4 border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-white bg-indigo-50 dark:bg-[#131A2B] dark:border-indigo-500/40 shadow-sm dark:shadow-lg dark:shadow-indigo-500/10 font-black"
                    : "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131A2B] hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <span className="text-base flex-shrink-0">{link.icon}</span>
                {!isCollapsed && <span className="truncate">{link.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#131A2B]/70 flex-shrink-0 mt-auto transition-colors">
          {!isCollapsed ? (
            <div className="bg-white dark:bg-[#131A2B] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 mb-2 shadow-sm dark:shadow-lg">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name || user.full_name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {roleType}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                  {personalCode || "ACTIVE"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center mb-2">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {roleType.slice(0, 3)}
              </span>
            </div>
          )}

          <button
            onClick={onSignOut}
            title="Sign Out"
            className={`w-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 font-extrabold py-2 px-2 rounded-xl transition-all duration-200 ease-in-out hover:-translate-y-0.5 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center gap-2 text-xs cursor-pointer ${
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
