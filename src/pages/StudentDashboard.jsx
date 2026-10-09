import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function StudentDashboard() {
  const { user, attendance, fees, notices } = useContext(AppContext); // 📢 Imported notices!

  const myAttendance = attendance.filter(a => a.records.some(r => r.student_id === user?.id));
  const todayRecord = myAttendance.find(a => a.date === new Date().toISOString().split('T')[0]);
  const myStatusToday = todayRecord?.records.find(r => r.student_id === user?.id)?.status || "Not Marked";
  
  const myFees = fees.filter(f => f.student_id === user?.id);
  const pendingAmount = myFees.filter(f => f.status !== "paid").reduce((sum, f) => sum + parseFloat(f.amount), 0);

  return (
    <div style={{ color: "white" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", color: "#F1F5F9" }}>
          Welcome back, {user?.name || "Student"}! 👋
        </h1>
        <p style={{ color: "#94A3B8", margin: 0 }}>Here is your live academic overview.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        {/* Attendance Card */}
        <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px", padding: "25px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <span style={{ fontSize: "24px" }}>✋</span>
            <div style={{ fontSize: "14px", color: "#10B981", fontWeight: "bold", textTransform: "uppercase" }}>Today's Attendance</div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F1F5F9", textTransform: "capitalize" }}>{myStatusToday}</div>
        </div>

        {/* Fees Card */}
        <div style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "12px", padding: "25px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <span style={{ fontSize: "24px" }}>💰</span>
            <div style={{ fontSize: "14px", color: "#06B6D4", fontWeight: "bold", textTransform: "uppercase" }}>Fees Due</div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F1F5F9" }}>₹{pendingAmount}</div>
        </div>
      </div>

      {/* 📢 LIVE ANNOUNCEMENTS FEED */}
      <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)", border: "1px solid rgba(51, 65, 85, 0.8)", borderRadius: "12px", padding: "25px" }}>
        <h2 style={{ marginTop: "0", fontSize: "18px", color: "#F1F5F9", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "15px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>📢</span> Live Announcements
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {notices.length === 0 ? (
            <p style={{ color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>No new announcements from the school.</p>
          ) : (
            notices.map(notice => (
              <div key={notice.id} style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(59, 130, 246, 0.3)", borderLeft: "4px solid #3B82F6", borderRadius: "8px", padding: "15px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0, color: "#F1F5F9", fontSize: "16px" }}>{notice.title}</h3>
                  <span style={{ fontSize: "12px", color: "#94A3B8", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                    {new Date(notice.date).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <p style={{ margin: 0, color: "#CBD5E1", fontSize: "14px", lineHeight: "1.5" }}>{notice.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}