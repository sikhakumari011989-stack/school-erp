import StudentFees from "./pages/StudentFees";
import StudentAttendance from "./pages/StudentAttendance";
import StudentTimeTable from "./pages/StudentTimeTable";
import { useState, useContext, useEffect } from "react";
import { AppContext } from "./context/AppContext";
import Login from "./pages/Login";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Dashboard from "./pages/Dashboard";
import Timetable from "./pages/TimeTable";
import StudentDashboard from "./pages/StudentDashboard";
import Notices from "./pages/Notices"; // 📢 Added Noticeboard Import

export default function App() {
  const { user, logout } = useContext(AppContext);
  const [currentPage, setCurrentPage] = useState("");

  // Define menus based on role
  const adminNav = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "students", label: "Students", icon: "👥" },
    { id: "classes", label: "Classes", icon: "🏫" },
    { id: "timetable", label: "Timetable", icon: "⏰" },
    { id: "attendance", label: "Attendance", icon: "✓" },
    { id: "fees", label: "Fees", icon: "💰" },
    { id: "notices", label: "Noticeboard", icon: "📢" } // 📢 Added Noticeboard Tab
  ];

  const studentNav = [
    { id: "student-dashboard", label: "My Dashboard", icon: "📊" },
    { id: "my-attendance", label: "My Attendance", icon: "✋" },
    { id: "my-timetable", label: "My Timetable", icon: "⏰" },
    { id: "my-fees", label: "My Fees", icon: "💰" }
  ];

  // If not logged in, show login screen
  if (!user) {
    return <Login />;
  }

  // Get the correct menu for the logged-in user
  const currentNavItems = user.role === "admin" ? adminNav : studentNav;

  // Make sure the active page is valid for the user's role
  const activeNavItem = currentNavItems.find(n => n.id === currentPage) || currentNavItems[0];
  const activePageId = activeNavItem.id;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0F172A" }}>
      
      {/* SIDEBAR (Same for everyone) */}
      <div style={{
        width: "250px",
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        borderRight: "1px solid #334155",
        padding: "20px 0",
        position: "fixed",
        height: "100vh",
        overflowY: "auto"
      }}>
        
        {/* LOGO */}
        <div style={{
          padding: "20px",
          textAlign: "center",
          borderBottom: "1px solid #334155",
          marginBottom: "20px"
        }}>
          <h1 style={{ color: "#60A5FA", fontSize: "24px", margin: "0", fontWeight: "bold" }}>
            📚 School ERP
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "12px", margin: "5px 0 0 0" }}>
            v1.0 Beta
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          {currentNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: "100%",
                padding: "15px 20px",
                border: "none",
                background: activePageId === item.id 
                  ? "linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)"
                  : "transparent",
                color: activePageId === item.id ? "#FFFFFF" : "#CBD5E1",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "15px",
                fontWeight: activePageId === item.id ? "600" : "500",
                transition: "all 0.3s ease",
                borderLeft: activePageId === item.id ? "4px solid #60A5FA" : "4px solid transparent",
                marginBottom: "8px"
              }}
              onMouseEnter={(e) => {
                if (activePageId !== item.id) {
                  e.target.style.background = "#1E293B";
                  e.target.style.color = "#E2E8F0";
                }
              }}
              onMouseLeave={(e) => {
                if (activePageId !== item.id) {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#CBD5E1";
                }
              }}
            >
              <span style={{ marginRight: "10px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: "250px", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* TOP NAVBAR */}
        <div style={{
          background: "linear-gradient(90deg, #1E293B 0%, #0F172A 100%)",
          borderBottom: "1px solid #334155",
          padding: "20px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ color: "#F1F5F9", margin: "0", fontSize: "20px", fontWeight: "600" }}>
            {activeNavItem.label}
          </h2>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <div style={{
              background: "#334155",
              color: "#E2E8F0",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px"
            }}>
              👤 {user.name} ({user.role})
            </div>
            <button 
              onClick={logout}
              style={{
                background: "#EF4444", color: "white", border: "none", padding: "8px 16px",
                borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, padding: "30px", overflowY: "auto", background: "#0F172A" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            
            {/* ADMIN ROUTES */}
            {user.role === "admin" && (
              <>
                {activePageId === "dashboard" && <Dashboard />}
                {activePageId === "students" && <Students />}
                {activePageId === "classes" && <Classes />}
                {activePageId === "attendance" && <Attendance />}
                {activePageId === "fees" && <Fees />}
                {activePageId === "timetable" && <Timetable />}
                {activePageId === "notices" && <Notices />} {/* 📢 Added Noticeboard Page */}
              </>
            )}

           {/* STUDENT ROUTES */}
            {user.role === "student" && (
              <>
                {activePageId === "student-dashboard" && <StudentDashboard />}
                {activePageId === "my-attendance" && <StudentAttendance />}
                {activePageId === "my-timetable" && <StudentTimeTable />}
                {activePageId === "my-fees" && <StudentFees />}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}