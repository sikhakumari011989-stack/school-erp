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
        { name: "Academic Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Staff Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Faculty Dashboard", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Attendance Register", path: "/teacher/attendance", icon: "📋" },
        { name: "Record Class Tests", path: "/teacher/class-tests", icon: "⚡" },
        { name: "Homework & Notes", path: "/teacher/homework", icon: "📚" },
        { name: "Classes & Students", path: "/teacher/classes", icon: "👥" },
        { name: "Timetable Schedule", path: "/admin/timetable", icon: "🗓️" },
        { name: "Timed Exams / CBT", path: "/teacher/exams", icon: "📝" },
        { name: "Student Marks Vault", path: "/teacher/analytics", icon: "📊" },
        { name: "Academic Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Staff Leave Portal", path: "/teacher/leave", icon: "🏖️" },
        { name: "Staff Messenger", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "staff") {
      return [
        { name: "Operations Workspace", path: "/staff/dashboard", icon: "🛠️" },
        { name: "Attendance Roll Call", path: "/teacher/attendance", icon: "📋" },
        { name: "Academic Calendar", path: "/admin/calendar", icon: "📅" },
        { name: "Leave Requests", path: "/staff/leave", icon: "🏖️" },
        { name: "Staff Broadcasts", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "admin") {
      // Platform Owner
      return [
        { name: "Global Master Setup", path: "/master-setup", icon: "⚙️" },
        { name: "Executive Oversight", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Financial Terminal", path: "/accountant/dashboard", icon: "💰" },
        { name: "System Diagnostic", path: "/system-check", icon: "🩺" },
        { name: "QA Workbench", path: "/qa-workbench", icon: "🧪" },
      ];
    } else {
      // Student & Parent Workspace
      return [
        { name: "Student Dashboard", path: "/student/dashboard", icon: "🎓" },
        { name: "Marks & Transcripts", path: "/student/marks", icon: "📊" },
        { name: "Homework & DPPs", path: "/student/homework", icon: "📚" },
        { name: "Fee Vault & Receipts", path: "/student/fees", icon: "💳" },
        { name: "Exam Schedule", path: "/student/exams", icon: "📝" },
        { name: "LMS Courseware", path: "/student/lms", icon: "📖" },
        { name: "Academic Calendar", path: "/student/calendar", icon: "📅" },
        { name: "Conduct Record", path: "/student/conduct", icon: "🏆" },
        { name: "Campus Gallery", path: "/student/gallery", icon: "📸" },
      ];
    }
  };

  const links = getLinks();
  const categoryTitle =
    roleType === "principal" ? "Executive Control" :
    roleType === "trustee" ? "Trustee Governance" :
    roleType === "accountant" ? "Financial Vault" :
    roleType === "teacher" ? "Faculty Modules" :
    roleType === "staff" ? "Staff Operations" :
    roleType === "admin" ? "Master Node" : "Scholar Suite";

  const getBottomNavItems = () => {
    if (roleType === "principal") {
      return [
        { name: "Command", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Trustee", path: "/trustee/dashboard", icon: "📈" },
        { name: "Analytics", path: "/admin/analytics", icon: "📊" },
        { name: "Fees", path: "/accountant/dashboard", icon: "💰" },
      ];
    } else if (roleType === "trustee") {
      return [
        { name: "Command", path: "/trustee/dashboard", icon: "📈" },
        { name: "Principal", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Analytics", path: "/admin/analytics", icon: "📊" },
        { name: "Treasury", path: "/accountant/dashboard", icon: "💰" },
      ];
    } else if (roleType === "accountant") {
      return [
        { name: "Treasury", path: "/accountant/dashboard", icon: "💰" },
        { name: "Reports", path: "/admin/reports", icon: "📑" },
        { name: "Payroll", path: "/accountant/payroll", icon: "💵" },
        { name: "Expenses", path: "/accountant/expenses", icon: "🧾" },
      ];
    } else if (roleType === "teacher") {
      return [
        { name: "Dashboard", path: "/teacher/dashboard", icon: "👨‍🏫" },
        { name: "Attendance", path: "/teacher/attendance", icon: "📋" },
        { name: "Tests", path: "/teacher/class-tests", icon: "⚡" },
        { name: "Homework", path: "/teacher/homework", icon: "📚" },
      ];
    } else if (roleType === "staff") {
      return [
        { name: "Workspace", path: "/staff/dashboard", icon: "🛠️" },
        { name: "Attendance", path: "/teacher/attendance", icon: "📋" },
        { name: "Leave", path: "/staff/leave", icon: "🏖️" },
        { name: "Messages", path: "/admin/messages", icon: "💬" },
      ];
    } else if (roleType === "admin") {
      return [
        { name: "Master", path: "/master-setup", icon: "⚙️" },
        { name: "Command", path: "/principal/dashboard", icon: "🏛️" },
        { name: "Treasury", path: "/accountant/dashboard", icon: "💰" },
        { name: "System", path: "/system-check", icon: "🩺" },
      ];
    } else {
      return [
        { name: "Dashboard", path: "/student/dashboard", icon: "🎓" },
        { name: "Marks", path: "/student/marks", icon: "📊" },
        { name: "Homework", path: "/student/homework", icon: "📚" },
        { name: "Fees", path: "/student/fees", icon: "💳" },
      ];
    }
  };

  const bottomItems = getBottomNavItems();

  const handleLinkClick = (path) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" customLogoUrl={tenant?.logoUrl} />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 truncate">{tenant?.name || "EduSaaS ERP"}</h3>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{schoolCode}</span>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? "border-l-4 border-indigo-500 text-white bg-slate-800/80 shadow-md font-black"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium"
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    <span className="truncate">{link.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 mb-2 shadow-sm">
                <p className="text-xs font-bold text-slate-100 truncate">{user.name || user.full_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {roleType}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{personalCode || "ACTIVE"}</span>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold py-2.5 px-3 rounded-xl transition-all duration-200 border border-rose-500/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around z-40 px-2 shadow-2xl">
        {bottomItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-cyan-400 font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-extrabold truncate max-w-[65px]">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <span className="text-lg">☰</span>
          <span className="text-[10px] font-extrabold">More</span>
        </button>
      </div>

      {/* DESKTOP VOYAGER SPACE SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col h-full flex-shrink-0 sticky top-0 z-40 border-r border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Holographic Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size="md" customLogoUrl={tenant?.logoUrl} />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-100 leading-snug truncate" title={tenant?.name || "EduSaaS ERP"}>
                  {tenant?.name || "EduSaaS ERP"}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
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
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer ml-auto"
          >
            <span className="text-xs font-mono">{isCollapsed ? "»" : "«"}</span>
          </button>
        </div>

        {/* Route Links */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {!isCollapsed && (
            <div className="px-3 pt-1 pb-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 text-left cursor-pointer ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "border-l-4 border-indigo-500 text-white bg-slate-800/90 shadow-lg shadow-indigo-500/10 font-bold"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium"
                }`}
              >
                <span className="text-base flex-shrink-0">{link.icon}</span>
                {!isCollapsed && <span className="truncate">{link.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0 mt-auto">
          {!isCollapsed ? (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 mb-2 shadow-sm">
              <p className="text-xs font-bold text-slate-100 truncate">{user.name || user.full_name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {roleType}
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                  {personalCode || "ACTIVE"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center mb-2">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {roleType.slice(0, 3)}
              </span>
            </div>
          )}

          <button
            onClick={onSignOut}
            title="Sign Out"
            className={`w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-extrabold py-2 px-2 rounded-xl transition-all duration-200 border border-rose-500/30 flex items-center justify-center gap-2 text-xs cursor-pointer ${
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
