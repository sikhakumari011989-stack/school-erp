import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  Settings,
  Menu
} from "lucide-react";

export default function MainLayout() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium
    transition-all duration-200
    ${isActive
      ? "bg-purple-600/20 text-purple-300"
      : "text-gray-300 hover:bg-white/5"
    }`;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0B0F1A] text-white">

      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F1424] border-b border-white/10 flex items-center justify-between px-4 z-50">
        <h1 className="text-purple-400 font-bold">ERP</h1>

        <button onClick={() => setOpen(!open)}>
          <Menu />
        </button>
      </div>

      {/* SIDEBAR */}
      <div
        className={`
        fixed md:static top-0 left-0 h-full w-64 bg-[#0F1424]
        border-r border-white/5 p-5 z-40
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >

        <h1 className="text-xl font-bold text-purple-400 mb-8 mt-10 md:mt-0">
          School ERP
        </h1>

        <div className="space-y-2">

          <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/students" className={linkClass} onClick={() => setOpen(false)}>
            <Users size={18} />
            Students
          </NavLink>

          <NavLink to="/attendance" className={linkClass} onClick={() => setOpen(false)}>
            <Calendar size={18} />
            Attendance
          </NavLink>

          <NavLink to="/fees" className={linkClass} onClick={() => setOpen(false)}>
            <IndianRupee size={18} />
            Fees
          </NavLink>

          <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
            <Settings size={18} />
            Settings
          </NavLink>

        </div>
      </div>

      {/* OVERLAY (mobile only) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 md:hidden"
        />
      )}

      {/* MAIN AREA */}
      <div className="flex-1 h-full flex flex-col md:ml-64 overflow-hidden">

        {/* TOP BAR (desktop only) */}
        <div className="hidden md:flex h-16 px-6 items-center justify-between border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-xl">

          <div className="flex items-center bg-white/5 px-4 py-2 rounded-xl w-80 border border-white/10">
            <input
              placeholder="Search students..."
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-xl">🔔</div>
            <div className="px-3 py-2 bg-white/5 rounded-lg">Admin</div>
          </div>

        </div>

        {/* PAGE CONTENT */}
        <div className="flex-1 p-4 md:p-6 pt-16 md:pt-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Outlet />
          </motion.div>
        </div>

      </div>
    </div>
  );
}