import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: authUser, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", cleanEmail)
        .eq("password", password)
        .single(); 

      if (error) {
        if (error.code === 'PGRST116') setErrorMsg("Invalid email or password!");
        else setErrorMsg("Database Error: " + error.message);
        setLoading(false);
        return;
      }

      let finalId = authUser.id;
      let finalName = authUser.name;
      let finalClassId = null;

      // 🔥 THE FIX: Grab ALL students, and pick the LAST one (the one you just made)
      if (authUser.role === "student") {
        const { data: allStudents } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", authUser.school_id);

        if (allStudents && allStudents.length > 0) {
          // Get the very last student in the array!
          const realStudent = allStudents[allStudents.length - 1]; 
          finalId = realStudent.id;           
          finalName = realStudent.name;       
          finalClassId = realStudent.class_id; 
        }
      }

      login({
        id: finalId,
        name: finalName,
        email: authUser.email,
        role: authUser.role,
        school_id: authUser.school_id,
        class_id: finalClassId
      });
      
      navigate("/");
      
    } catch (err) {
      setErrorMsg("Could not connect to the database.");
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0F172A", color: "white", padding: "20px"
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
        border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "16px", padding: "40px",
        width: "100%", maxWidth: "400px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", color: "#F1F5F9" }}>🏫 School ERP</h1>
          <p style={{ color: "#94A3B8", margin: 0 }}>Login to your account</p>
        </div>

        {errorMsg && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.3)", textAlign: "center", fontSize: "14px" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#CBD5E1", fontSize: "14px" }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)", color: "white", outline: "none", boxSizing: "border-box" }} placeholder="Enter your email" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#CBD5E1", fontSize: "14px" }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)", color: "white", outline: "none", boxSizing: "border-box" }} placeholder="Enter your password" />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: "8px", background: loading ? "#475569" : "#3B82F6", color: "white", fontWeight: "bold", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "10px", transition: "background 0.3s ease" }}>
            {loading ? "Connecting..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}