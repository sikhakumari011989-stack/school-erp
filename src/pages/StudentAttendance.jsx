import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function StudentAttendance() {
  const { user, attendance } = useContext(AppContext);

  // Live Cloud Calculation!
  const myHistory = attendance
    .map(a => {
      const myRecord = a.records.find(r => r.student_id === user?.id);
      return myRecord ? { date: a.date, status: myRecord.status } : null;
    })
    .filter(record => record !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

  const total = myHistory.length || 1; // Prevent division by zero
  const presentCount = myHistory.filter(r => r.status === "present").length;
  const absentCount = myHistory.filter(r => r.status === "absent").length;
  const percentage = myHistory.length === 0 ? 0 : Math.round((presentCount / total) * 100);

  return (
    <div style={{ color: "white" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", color: "#F1F5F9" }}>
          ✋ My Attendance
        </h1>
        <p style={{ color: "#94A3B8", margin: 0 }}>Track your daily presence.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px", marginBottom: "30px" }}>
        
        {/* STATS GAUGE */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)",
          border: "1px solid rgba(51, 65, 85, 0.8)", borderRadius: "16px", padding: "30px",
          display: "flex", flexDirection: "column", alignItems: "center"
        }}>
          <h2 style={{ color: "#F1F5F9", fontSize: "40px", fontWeight: "bold", margin: "10px 0" }}>{percentage}%</h2>
          <p style={{ color: "#94A3B8", textTransform: "uppercase", fontSize: "12px", marginTop: "0" }}>Overall Attendance</p>
          
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#F1F5F9", fontSize: "20px", fontWeight: "bold" }}>{presentCount}</div>
              <div style={{ color: "#10B981", fontSize: "12px", textTransform: "uppercase" }}>Present</div>
            </div>
            <div style={{ width: "1px", background: "rgba(51, 65, 85, 0.8)" }}></div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#F1F5F9", fontSize: "20px", fontWeight: "bold" }}>{absentCount}</div>
              <div style={{ color: "#EF4444", fontSize: "12px", textTransform: "uppercase" }}>Absent</div>
            </div>
          </div>
        </div>

        {/* LIVE HISTORY */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)",
          border: "1px solid rgba(51, 65, 85, 0.8)", borderRadius: "16px", padding: "25px",
        }}>
          <h2 style={{ marginTop: "0", fontSize: "18px", color: "#F1F5F9", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "15px", marginBottom: "20px" }}>
            Recent History
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {myHistory.length === 0 ? <p style={{ color: "#94A3B8" }}>No attendance recorded yet.</p> : myHistory.map((record, index) => (
              <div key={index} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)",
                borderRadius: "10px", padding: "12px 20px"
              }}>
                <div style={{ color: "#CBD5E1", fontSize: "15px", fontWeight: "500" }}>{record.date}</div>
                <div style={{
                  background: record.status === "present" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: record.status === "present" ? "#10B981" : "#EF4444",
                  padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase"
                }}>
                  {record.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}