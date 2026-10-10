import { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AppContext } from "./context/AppContext";

// Import all your pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import TimeTable from "./pages/TimeTable";
import Notices from "./pages/Notices";
import Homework from "./pages/Homework";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import StudentAttendance from "./pages/StudentAttendance";
import StudentFees from "./pages/StudentFees";
import StudentTimeTable from "./pages/StudentTimeTable";

export default function App() {
  const { user, loading, logout } = useContext(AppContext);

  if (loading) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white font-bold">Connecting to Supabase...</div>;
  }

  if (!user) {
    return <Login />;
  }

  // TIER-BASED SIDEBAR LOGIC
  const getSidebarLinks = () => {
    // Tier 3: Super Admin (Global View)
    if (user.role === 'superadmin') {
      return [
        { name: "Global Analytics", path: "/analytics", icon: "🌍" },
        { name: "Master Reports", path: "/reports", icon: "📊" },
        { name: "All Schools", path: "/", icon: "🏢" },
      ];
    }
    // Tier 2: School Admin / Teacher
    if (user.role === 'admin' || user.role === 'teacher') {
      return [
        { name: "Dashboard", path: "/", icon: "📈" },
        { name: "Students", path: "/students", icon: "👥" },
        { name: "Classes", path: "/classes", icon: "🏫" },
        { name: "Timetable", path: "/timetable", icon: "⏰" },
        { name: "Attendance", path: "/attendance", icon: "✅" },
        { name: "Homework", path: "/homework", icon: "📝" },
        { name: "Fees", path: "/fees", icon: "💰" },
        { name: "Reports", path: "/reports", icon: "📥" },
        { name: "Noticeboard", path: "/notices", icon: "📢" },
      ];
    }
    // Tier 1: Student / Parent
    return [
      { name: "My Dashboard", path: "/", icon: "🏠" },
      { name: "My Attendance", path: "/student-attendance", icon: "✅" },
      { name: "My Timetable", path: "/student-timetable", icon: "⏰" },
      { name: "My Fees", path: "/student-fees", icon: "💰" },
    ];
  };

  const sidebarLinks = getSidebarLinks();

  return (
    <Router>
      <div className="flex h-screen bg-[#0F172A] font-sans">
        
        {/* DYNAMIC 3-TIER SIDEBAR */}
        <div className="w-64 bg-[#1E293B] border-r border-slate-700 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-blue-500">⚡</span> EduCore
              </h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'School Admin' : user.role === 'teacher' ? 'Teacher' : 'Student Portal'}
              </p>
            </div>
            <nav className="p-4 space-y-1">
              {sidebarLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-semibold text-sm"
                >
                  <span>{link.icon}</span>
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-colors text-sm font-bold border border-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-auto bg-[#0F172A] p-8">
          <Routes>
            {/* Conditional Root Route based on Role */}
            <Route path="/" element={
              user.role === 'student' ? <StudentDashboard /> : 
              user.role === 'superadmin' ? <Analytics /> : 
              <Dashboard />
            } />
            
            {/* Admin & Teacher Routes */}
            <Route path="/students" element={<Students />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/timetable" element={<TimeTable />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />

            {/* Student Routes */}
            <Route path="/student-attendance" element={<StudentAttendance />} />
            <Route path="/student-fees" element={<StudentFees />} />
            <Route path="/student-timetable" element={<StudentTimeTable />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}