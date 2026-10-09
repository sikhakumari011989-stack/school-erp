import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Timetable() {
  const { classes, timetable, addTimetableEntry } = useContext(AppContext);
  const [selectedClass, setSelectedClass] = useState("");
  
  // 🔥 Updated to match DB columns exactly
  const [newEntry, setNewEntry] = useState({
    day: "Monday",
    subject: "",
    start_time: "09:00",
    end_time: "10:00"
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleAddPeriod = () => {
    if (!selectedClass || !newEntry.subject) {
      alert("Select class and enter subject");
      return;
    }

    // Send directly to Cloud Context
    addTimetableEntry({
      class_id: selectedClass,
      ...newEntry
    });

    alert("✅ Period saved to Cloud!");
    setNewEntry({
      day: "Monday",
      subject: "",
      start_time: "09:00",
      end_time: "10:00"
    });
  };

  const classTimetable = timetable.filter(t => t.class_id === selectedClass);

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>
        🕒 Timetable Management
      </h1>

      {/* ADD PERIOD FORM */}
      <div style={{
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "25px",
        marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
      }}>
        <h2 style={{ marginTop: "0", fontSize: "20px" }}>Add Period</h2>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "#94A3B8" }}>Class:</label>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              width: "100%", padding: "10px 15px", marginTop: "5px",
              background: "rgba(255,255,255,0.05)", color: "white",
              border: "1px solid #334155", borderRadius: "8px", cursor: "pointer"
            }}
          >
            <option value="" style={{ color: "black" }}>-- Select Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id} style={{ color: "black" }}>
                {cls.name} {cls.section}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#94A3B8" }}>Day:</label>
            <select 
              value={newEntry.day}
              onChange={(e) => setNewEntry({...newEntry, day: e.target.value})}
              style={{
                width: "100%", padding: "10px 15px", marginTop: "5px",
                background: "rgba(255,255,255,0.05)", color: "white",
                border: "1px solid #334155", borderRadius: "8px", cursor: "pointer"
              }}
            >
              {days.map(day => (
                <option key={day} value={day} style={{ color: "black" }}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#94A3B8" }}>Subject:</label>
            <input 
              type="text"
              value={newEntry.subject}
              onChange={(e) => setNewEntry({...newEntry, subject: e.target.value})}
              placeholder="e.g., Mathematics"
              style={{
                width: "100%", padding: "10px 15px", marginTop: "5px",
                background: "rgba(255,255,255,0.05)", color: "white",
                border: "1px solid #334155", borderRadius: "8px"
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#94A3B8" }}>Start Time:</label>
            <input 
              type="time"
              value={newEntry.start_time}
              onChange={(e) => setNewEntry({...newEntry, start_time: e.target.value})}
              style={{
                width: "100%", padding: "10px 15px", marginTop: "5px",
                background: "rgba(255,255,255,0.05)", color: "white",
                border: "1px solid #334155", borderRadius: "8px", cursor: "pointer"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#94A3B8" }}>End Time:</label>
            <input 
              type="time"
              value={newEntry.end_time}
              onChange={(e) => setNewEntry({...newEntry, end_time: e.target.value})}
              style={{
                width: "100%", padding: "10px 15px", marginTop: "5px",
                background: "rgba(255,255,255,0.05)", color: "white",
                border: "1px solid #334155", borderRadius: "8px", cursor: "pointer"
              }}
            />
          </div>
        </div>

        <button 
          onClick={handleAddPeriod}
          style={{
            padding: "12px 25px", background: "#3B82F6", color: "white",
            border: "none", cursor: "pointer", borderRadius: "8px", fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)", transition: "all 0.2s"
          }}
        >
          ➕ Add Period
        </button>
      </div>

      {/* TIMETABLE VIEW */}
      {selectedClass && (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid #334155", borderRadius: "12px", padding: "25px"
        }}>
          <h2 style={{ marginTop: "0", fontSize: "18px", marginBottom: "20px" }}>
            Timetable for {classes.find(c => c.id === selectedClass)?.name} {classes.find(c => c.id === selectedClass)?.section}
          </h2>
          
          {classTimetable.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", border: "2px dashed #334155", borderRadius: "8px" }}>
              <p style={{ color: "#94A3B8" }}>📭 No periods added yet</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #334155" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94A3B8" }}>Day</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94A3B8" }}>Subject</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94A3B8" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {classTimetable.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid #1E293B" }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>{entry.day}</td>
                      <td style={{ padding: "12px", color: "#60A5FA", fontWeight: "bold" }}>{entry.subject}</td>
                      <td style={{ padding: "12px", color: "#CBD5E1" }}>
                        {entry.start_time} - {entry.end_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}