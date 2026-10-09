import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-blue-600 text-white shadow"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="w-64 h-screen bg-white border-r shadow-sm flex flex-col">

      {/* TOP BRAND */}
      <div className="p-5 border-b">
        <h1 className="text-xl font-bold text-blue-600">
          School ERP
        </h1>
        <p className="text-xs text-gray-400">
          Admin Panel
        </p>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 p-4 space-y-2">

        <NavLink to="/" className={linkClass}>
          📊 Dashboard
        </NavLink>

        <NavLink to="/students" className={linkClass}>
          👨‍🎓 Students
        </NavLink>

        <NavLink to="/teachers" className={linkClass}>
          👩‍🏫 Teachers
        </NavLink>

        <NavLink to="/attendance" className={linkClass}>
          📅 Attendance
        </NavLink>

        <NavLink to="/timetable" className={linkClass}>
          🕒 Timetable
        </NavLink>

        <NavLink to="/fees" className={linkClass}>
          💰 Fees
        </NavLink>

      </div>

      {/* FOOTER */}
      <div className="p-4 border-t text-xs text-gray-400">
        v1.0 • SaaS Build
      </div>

    </div>
  );
}