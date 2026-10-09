import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Students() {
  const { students, classes, addStudent, deleteStudent } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: "",
    class_id: "",
    roll_number: ""
  });

  const handleAddStudent = () => {
    if (!formData.name || !formData.class_id || !formData.roll_number) {
      alert("Fill all fields");
      return;
    }

    // Sending exact database format directly to AppContext
    addStudent(formData);

    setFormData({ name: "", class_id: "", roll_number: "" });
  };

  const getClassName = (class_id) => {
    const cls = classes.find(c => c.id === class_id);
    return cls ? `${cls.name} ${cls.section}` : "Unknown";
  };

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>
        👥 Student Management
      </h1>

      {/* ADD STUDENT FORM */}
      <div style={{
        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
        borderRadius: "12px",
        padding: "30px",
        marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(59, 130, 246, 0.2)"
      }}>
        <h2 style={{ marginTop: "0", fontSize: "20px" }}>Add New Student</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Student Name
            </label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter student name"
              style={{
                width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
                color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
                backdropFilter: "blur(10px)"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Select Class
            </label>
            <select 
              value={formData.class_id}
              onChange={(e) => setFormData({...formData, class_id: e.target.value})}
              style={{
                width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
                color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
                cursor: "pointer", backdropFilter: "blur(10px)"
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
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
            Roll Number
          </label>
          <input 
            type="text"
            value={formData.roll_number}
            onChange={(e) => setFormData({...formData, roll_number: e.target.value})}
            placeholder="Enter roll number"
            style={{
              width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
              color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
              backdropFilter: "blur(10px)"
            }}
          />
        </div>

        <button 
          onClick={handleAddStudent}
          style={{
            padding: "12px 30px", background: "#FFFFFF", color: "#2563EB",
            border: "none", cursor: "pointer", borderRadius: "8px",
            fontWeight: "bold", fontSize: "15px", transition: "all 0.3s ease",
            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.2)";
          }}
        >
          ➕ Add Student
        </button>
      </div>

      {/* STUDENTS LIST */}
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px" }}>
        {students.length} Student{students.length !== 1 ? "s" : ""} Registered
      </h2>

      {students.length === 0 ? (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "2px dashed #334155", borderRadius: "12px",
          padding: "40px", textAlign: "center"
        }}>
          <p style={{ color: "#94A3B8", fontSize: "18px" }}>📭 No students added yet</p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>Add your first student to get started</p>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px"
        }}>
          {students.map(student => (
            <div
              key={student.id}
              style={{
                background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                border: "1px solid #334155", borderRadius: "12px",
                padding: "20px", transition: "all 0.3s ease", cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3B82F6";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(59, 130, 246, 0.2)";
                e.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#334155";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ marginBottom: "15px" }}>
                <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
                  Student Name
                </p>
                <h3 style={{ color: "#60A5FA", fontSize: "18px", fontWeight: "bold", margin: "0" }}>
                  {student.name}
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
                    Class
                  </p>
                  <p style={{ color: "#E2E8F0", fontSize: "14px", fontWeight: "500", margin: "0" }}>
                    {getClassName(student.class_id)}
                  </p>
                </div>
                <div>
                  <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
                    Roll No.
                  </p>
                  <p style={{ color: "#E2E8F0", fontSize: "14px", fontWeight: "500", margin: "0" }}>
                    {student.roll_number}
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteStudent(student.id)}
                style={{
                  width: "100%", padding: "10px", background: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444", border: "1px solid #EF444444",
                  cursor: "pointer", borderRadius: "8px", fontWeight: "bold",
                  fontSize: "13px", transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#EF4444";
                  e.target.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(239, 68, 68, 0.1)";
                  e.target.style.color = "#EF4444";
                }}
              >
                🗑️ Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}