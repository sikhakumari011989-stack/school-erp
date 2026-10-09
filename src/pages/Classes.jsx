import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Classes() {
  const { classes, addClass } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: "",
    section: ""
  });

  const handleAddClass = () => {
    if (!formData.name || !formData.section) {
      alert("Fill all fields");
      return;
    }

    addClass({
      id: `${formData.name}${formData.section}`,
      name: formData.name,
      section: formData.section
    });

    alert("Class added!");
    setFormData({ name: "", section: "" });
  };

  const sections = ["A", "B", "C", "D"];
  const grades = ["8", "9", "10", "11", "12"];

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>
        🏫 Class Management
      </h1>

      {/* ADD CLASS FORM */}
      <div style={{
        background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
        borderRadius: "12px",
        padding: "30px",
        marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(139, 92, 246, 0.2)"
      }}>
        <h2 style={{ marginTop: "0", fontSize: "20px" }}>Add New Class</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Grade/Standard
            </label>
            <select 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{
                width: "100%",
                padding: "12px 15px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "14px",
                cursor: "pointer",
                backdropFilter: "blur(10px)"
              }}
            >
              <option value="">-- Select Grade --</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Section
            </label>
            <select 
              value={formData.section}
              onChange={(e) => setFormData({...formData, section: e.target.value})}
              style={{
                width: "100%",
                padding: "12px 15px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "14px",
                cursor: "pointer",
                backdropFilter: "blur(10px)"
              }}
            >
              <option value="">-- Select Section --</option>
              {sections.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleAddClass}
          style={{
            padding: "12px 30px",
            background: "#FFFFFF",
            color: "#7C3AED",
            border: "none",
            cursor: "pointer",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "15px",
            transition: "all 0.3s ease",
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
          ➕ Add Class
        </button>
      </div>

      {/* CLASSES LIST */}
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px" }}>
        {classes.length} Class{classes.length !== 1 ? "es" : ""} Available
      </h2>

      {classes.length === 0 ? (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "2px dashed #334155",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center"
        }}>
          <p style={{ color: "#94A3B8", fontSize: "18px" }}>📭 No classes added yet</p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>Add your first class to get started</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px"
        }}>
          {classes.map(cls => (
            <div
              key={cls.id}
              style={{
                background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                border: "1px solid #334155",
                borderRadius: "12px",
                padding: "25px",
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#8B5CF6";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(139, 92, 246, 0.2)";
                e.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#334155";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "15px"
              }}>
                <h1 style={{ margin: "0", fontSize: "48px" }}>
                  {cls.name}{cls.section}
                </h1>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
                  Grade
                </p>
                <p style={{ color: "#E2E8F0", fontSize: "16px", fontWeight: "bold", margin: "0" }}>
                  Grade {cls.name}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
                  Section
                </p>
                <p style={{ color: "#E2E8F0", fontSize: "16px", fontWeight: "bold", margin: "0" }}>
                  Section {cls.section}
                </p>
              </div>

              <div style={{
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "8px",
                padding: "10px",
                color: "#A78BFA",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                ✓ Ready to use
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}