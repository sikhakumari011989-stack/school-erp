import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function StudentTimeTable() {
  const { user, timetable } = useContext(AppContext);
  const [selectedDay, setSelectedDay] = useState("Monday");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Filter for the student's specific class, for the selected day!
  const todaysPeriods = timetable
    .filter(t => t.class_id === user?.class_id && t.day === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div style={{ color: "white" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", color: "#F1F5F9" }}>⏰ My Timetable</h1>
      </div>

      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "15px", marginBottom: "20px" }}>
        {days.map(day => (
          <button key={day} onClick={() => setSelectedDay(day)} style={{
            background: selectedDay === day ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)" : "rgba(30, 41, 59, 0.4)",
            border: selectedDay === day ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(51, 65, 85, 0.5)",
            color: selectedDay === day ? "#F59E0B" : "#94A3B8", padding: "10px 24px", borderRadius: "30px", cursor: "pointer", fontWeight: "bold"
          }}>
            {day}
          </button>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)", border: "1px solid rgba(51, 65, 85, 0.8)", borderRadius: "12px", padding: "25px" }}>
        <h2 style={{ marginTop: "0", fontSize: "18px", color: "#F1F5F9", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "15px", marginBottom: "20px" }}>
          Schedule for {selectedDay}
        </h2>
        
        {todaysPeriods.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#94A3B8" }}>No periods scheduled for {selectedDay}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {todaysPeriods.map((period) => (
              <div key={period.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "10px", padding: "15px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <div style={{ color: "#F1F5F9", fontWeight: "bold", fontSize: "16px" }}>{period.subject}</div>
                </div>
                <div style={{ color: "#60A5FA", fontWeight: "600", fontSize: "14px", background: "rgba(96, 165, 250, 0.1)", padding: "6px 12px", borderRadius: "6px" }}>
                  {period.start_time} - {period.end_time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}