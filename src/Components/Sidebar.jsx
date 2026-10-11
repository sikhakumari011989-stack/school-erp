import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function Sidebar() {
  const { user, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Define links based on user role
  const getLinks = () => {
    if (user.role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: '🛡️' },
        { name: 'Principal Suite', path: '/principal/dashboard', icon: '🏛️' },
        { name: 'Accountant Suite', path: '/accountant/dashboard', icon: '💰' },
        { name: 'Trustee Audit', path: '/trustee/dashboard', icon: '📈' },
        { name: 'Staff Portal', path: '/staff/dashboard', icon: '🛠️' },
        { name: 'Security Audit', path: '/admin/audit', icon: '⚙️' } // NEW LINK
      ];
    } else if (user.role === 'staff') {
      return [
        { name: 'Dashboard', path: '/staff/dashboard', icon: '🛠️' }
      ];
    } else if (user.role === 'trustee') {
      return [
        { name: 'Dashboard', path: '/trustee/dashboard', icon: '📈' }
      ];
    } else if (user.role === 'accountant') {
      return [
        { name: 'Dashboard', path: '/accountant/dashboard', icon: '💰' }
      ];
    } else if (user.role === 'teacher') {
      return [
        { name: 'Dashboard', path: '/teacher/dashboard', icon: '👨‍🏫' },
        { name: 'My Classes', path: '/teacher/classes', icon: '🏫' },
        { name: 'Attendance', path: '/teacher/attendance', icon: '✅' },
        { name: 'Homework', path: '/teacher/homework', icon: '📚' },
        { name: 'Analytics & Papers', path: '/teacher/analytics', icon: '📊' },
        { name: 'Planner & Tasks', path: '/teacher/planner', icon: '📝' }
      ];
    } else if (user.role === 'student') {
      return [
        { name: 'Dashboard', path: '/student/dashboard', icon: '🎓' },
        { name: 'Fee Ledger & Reports', path: '/student/fees', icon: '💳' },
        { name: 'Pay Dues (Razorpay)', path: '/student/pay', icon: '⚡' },
        { name: 'LMS & Quizzes', path: '/student/lms', icon: '📖' },
        { name: 'Certificates', path: '/student/certificates', icon: '📜' },
        { name: 'School Calendar', path: '/student/calendar', icon: '📅' },
        { name: 'Campus Gallery', path: '/student/gallery', icon: '📸' },
        { name: 'Conduct & Discipline', path: '/student/conduct', icon: '⚖️' },
        { name: 'Transport Fleet', path: '/student/transport', icon: '🚌' }
      ];
    }
    return [];
  };

  return (
    <div className="w-64 bg-[#1E293B] border-r border-slate-800 h-screen flex flex-col z-50 relative">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <span className="text-blue-500">🏫</span> ERP
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
          {user.school_id}
        </p>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2">
        {getLinks().map((link, idx) => (
          <button
            key={idx}
            onClick={() => navigate(link.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              location.pathname === link.path
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{link.icon}</span>
            {link.name}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-white truncate">{user.name}</p>
          <p className="text-xs text-slate-400 uppercase">{user.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 px-4 rounded-xl transition-all border border-red-500/20 flex items-center justify-center gap-2"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
}