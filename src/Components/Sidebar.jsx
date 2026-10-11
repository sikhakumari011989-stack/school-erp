import React from 'react';
import { NavLink } from 'react-router-dom';
// Standard Vite/Tailwind icons. If you use different icons, swap these out.
import { LayoutDashboard, Users, BookOpen, FileText, PieChart, CreditCard, Bell, LogOut } from 'lucide-react';

export default function Sidebar({ role, handleLogout }) {
  // 1. ADMIN TIER LINKS (Includes Homework, Reports, and Analytics)
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Homework', path: '/admin/homework', icon: BookOpen },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
    { name: 'Analytics', path: '/admin/analytics', icon: PieChart },
    { name: 'Notices', path: '/admin/notices', icon: Bell },
  ];

  // 2. TEACHER TIER LINKS
  const teacherLinks = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Homework', path: '/teacher/homework', icon: BookOpen },
    { name: 'Reports', path: '/teacher/reports', icon: FileText },
    { name: 'Notices', path: '/teacher/notices', icon: Bell },
  ];

  // 3. STUDENT TIER LINKS
  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Homework', path: '/student/homework', icon: BookOpen },
    { name: 'Fees', path: '/student/fees', icon: CreditCard },
    { name: 'Notices', path: '/student/notices', icon: Bell },
  ];

  // Determine which links to render based on the active user role
  const getLinks = () => {
    if (role === 'admin' || role === 'super_admin') return adminLinks;
    if (role === 'teacher') return teacherLinks;
    return studentLinks; // Default fallback to student
  };

  const activeLinks = getLinks();

  return (
    <div className="w-64 bg-[#1E293B] border-r border-slate-700 flex flex-col justify-between h-screen sticky top-0">
      {/* Top Section: Logo & Links */}
      <div>
        <div className="flex items-center justify-center h-20 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white tracking-wider">School ERP</h1>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {activeLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Logout */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}