import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Attendance() {
  const { classes, students, markAttendance } = useContext(AppContext);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendanceData, setAttendanceData] = useState({});

  const handleMarkAttendance = () => {
    if (!selectedClass) {
      alert("Select a class first");
      return;
    }

    const records = students
      .filter(s => s.class_id === selectedClass)
      .map(s => ({
        student_id: s.id,
        name: s.name,
        status: attendanceData[s.id] || "present"
      }));

    const today = new Date().toISOString().split('T')[0];
    markAttendance(today, selectedClass, records);
    alert(`✅ Attendance saved to Cloud for class!`);
    setAttendanceData({});
  };

  const classStudents = students.filter(s => s.class_id === selectedClass);
  const presentCount = classStudents.filter(s => attendanceData[s.id] === "present" || (!attendanceData[s.id] && classStudents.length > 0)).length;
  const absentCount = classStudents.filter(s => attendanceData[s.id] === "absent").length;
  const leaveCount = classStudents.filter(s => attendanceData[s.id] === "leave").length;

  const selectedClassName = classes.find(c => c.id === selectedClass);

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>
        ✓ Attendance Management
      </h1>

      {/* CLASS SELECTOR */}
      <div style={{
        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        borderRadius: "12px", padding: "25px", marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)"
      }}>
        <h2 style={{ marginTop: "0", fontSize: "18px" }}>Select Class</h2>
        <select 
          value={selectedClass} 
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{
            width: "100%", padding: "12px 15px", borderRadius: "8px", border: "none",
            background: "rgba(255, 255, 255, 0.15)", color: "white", cursor: "pointer",
            fontSize: "15px", fontWeight: "500", backdropFilter: "blur(10px)"
          }}
        >
          <option value="" style={{ color: "black" }}>-- Choose Class --</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id} style={{ color: "black" }}>
              {cls.name} {cls.section}
            </option>
          ))}
        </select>
      </div>

      {/* ATTENDANCE MARKING */}
      {selectedClass && classStudents.length > 0 && (
        <div>
          {/* STATS */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px", marginBottom: "30px"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #10B98133 0%, #06B6D433 100%)",
              border: "1px solid #10B98166", borderRadius: "10px", padding: "20px", textAlign: "center"
            }}>
              <p style={{ color: "#86EFAC", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>Present</p>
              <h3 style={{ color: "#10B981", margin: "0", fontSize: "28px", fontWeight: "bold" }}>{presentCount}</h3>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #EF444433 0%, #DC262633 100%)",
              border: "1px solid #EF444466", borderRadius: "10px", padding: "20px", textAlign: "center"
            }}>
              <p style={{ color: "#FCA5A5", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>Absent</p>
              <h3 style={{ color: "#EF4444", margin: "0", fontSize: "28px", fontWeight: "bold" }}>{absentCount}</h3>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #F59E0B33 0%, #FBBF2433 100%)",
              border: "1px solid #F59E0B66", borderRadius: "10px", padding: "20px", textAlign: "center"
            }}>
              <p style={{ color: "#FCD34D", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>Leave</p>
              <h3 style={{ color: "#F59E0B", margin: "0", fontSize: "28px", fontWeight: "bold" }}>{leaveCount}</h3>
            </div>
          </div>

          {/* ATTENDANCE TABLE */}
          <div style={{
            background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
            border: "1px solid #334155", borderRadius: "12px", padding: "25px", marginBottom: "25px"
          }}>
            <h2 style={{ marginTop: "0", fontSize: "18px" }}>
              Mark Attendance - {selectedClassName?.name} {selectedClassName?.section}
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #334155" }}>
                    <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Roll No.</th>
                    <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Student Name</th>
                    <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, idx) => (
                    <tr key={student.id} style={{ borderBottom: "1px solid #1E293B" }}>
                      <td style={{ padding: "15px", color: "#CBD5E1", fontWeight: "500" }}>
                        {student.roll_number || idx + 1}
                      </td>
                      <td style={{ padding: "15px", color: "#E2E8F0", fontWeight: "500" }}>
                        {student.name}
                      </td>
                      <td style={{ padding: "15px" }}>
                        <select 
                          value={attendanceData[student.id] || "present"}
                          onChange={(e) => setAttendanceData({
                            ...attendanceData,
                            [student.id]: e.target.value
                          })}
                          style={{
                            padding: "8px 12px", borderRadius: "6px",
                            background: attendanceData[student.id] === "absent" ? "#EF444422" :
                                        attendanceData[student.id] === "leave" ? "#F59E0B22" : "#10B98122",
                            color: attendanceData[student.id] === "absent" ? "#EF4444" :
                                   attendanceData[student.id] === "leave" ? "#F59E0B" : "#10B981",
                            border: "1px solid currentColor", cursor: "pointer",
                            fontWeight: "600", fontSize: "13px"
                          }}
                        >
                          <option value="present">✓ Present</option>
                          <option value="absent">✗ Absent</option>
                          <option value="leave">📋 Leave</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            onClick={handleMarkAttendance}
            style={{
              padding: "14px 40px", background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white", border: "none", cursor: "pointer", borderRadius: "8px",
              fontWeight: "bold", fontSize: "15px", transition: "all 0.3s ease",
              boxShadow: "0 5px 15px rgba(16, 185, 129, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(16, 185, 129, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 5px 15px rgba(16, 185, 129, 0.3)";
            }}
          >
            ✓ Save Attendance
          </button>
        </div>
      )}

      {selectedClass && classStudents.length === 0 && (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "2px dashed #334155", borderRadius: "12px", padding: "40px", textAlign: "center"
        }}>
          <p style={{ color: "#94A3B8", fontSize: "18px" }}>📭 No students in {selectedClassName?.name} {selectedClassName?.section}</p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>Add students to this class first</p>
        </div>
      )}
    </div>
  );
}