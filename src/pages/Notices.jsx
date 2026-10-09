import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Notices() {
  const { notices, addNotice, deleteNotice } = useContext(AppContext);
  const [formData, setFormData] = useState({ title: "", message: "" });

  const handlePost = () => {
    if (!formData.title || !formData.message) return alert("Fill all fields");
    addNotice(formData);
    setFormData({ title: "", message: "" });
  };

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>📢 Noticeboard</h1>

      {/* POST A NOTICE FORM */}
      <div style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", border: "1px solid #334155", borderRadius: "12px", padding: "25px", marginBottom: "30px" }}>
        <h2 style={{ marginTop: "0", fontSize: "18px" }}>Broadcast New Message</h2>
        <input 
          type="text" placeholder="Notice Title..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
          style={{ width: "100%", padding: "12px", marginBottom: "15px", background: "rgba(255,255,255,0.05)", border: "1px solid #334155", color: "white", borderRadius: "8px", boxSizing: "border-box" }}
        />
        <textarea 
          placeholder="Type your announcement here..." value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows="4"
          style={{ width: "100%", padding: "12px", marginBottom: "15px", background: "rgba(255,255,255,0.05)", border: "1px solid #334155", color: "white", borderRadius: "8px", boxSizing: "border-box", resize: "none" }}
        />
        <button onClick={handlePost} style={{ padding: "10px 25px", background: "#3B82F6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
          🚀 Post Notice
        </button>
      </div>

      {/* RECENT NOTICES */}
      <div style={{ display: "grid", gap: "15px" }}>
        {notices.length === 0 ? <p style={{ color: "#94A3B8" }}>No notices posted yet.</p> : notices.map(notice => (
          <div key={notice.id} style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid #334155", borderRadius: "12px", padding: "20px", position: "relative" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#60A5FA" }}>{notice.title}</h3>
            <p style={{ margin: "0 0 15px 0", color: "#CBD5E1", fontSize: "15px", lineHeight: "1.5" }}>{notice.message}</p>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Posted: {new Date(notice.date).toLocaleString()}</div>
            <button onClick={() => deleteNotice(notice.id)} style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}