import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function StudentFees() {
  const { user, fees } = useContext(AppContext);

  // Filter Cloud data!
  const myFees = fees.filter(f => f.student_id === user?.id);
  
  const total = myFees.reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const paid = myFees.filter(f => f.status === "paid").reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const pending = total - paid;

  return (
    <div style={{ color: "white" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", color: "#F1F5F9" }}>💳 My Fees</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "12px", padding: "20px" }}>
          <span style={{ fontSize: "14px", color: "#06B6D4", fontWeight: "bold", textTransform: "uppercase" }}>Total Fees</span>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F1F5F9" }}>₹{total}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px", padding: "20px" }}>
          <span style={{ fontSize: "14px", color: "#10B981", fontWeight: "bold", textTransform: "uppercase" }}>Total Paid</span>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F1F5F9" }}>₹{paid}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "12px", padding: "20px" }}>
          <span style={{ fontSize: "14px", color: "#F59E0B", fontWeight: "bold", textTransform: "uppercase" }}>Total Pending</span>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F1F5F9" }}>₹{pending}</div>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)", border: "1px solid rgba(51, 65, 85, 0.8)", borderRadius: "16px", padding: "25px" }}>
        <h2 style={{ marginTop: "0", fontSize: "18px", color: "#F1F5F9", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "15px", marginBottom: "20px" }}>Fee Records</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {myFees.length === 0 ? <p style={{ color: "#94A3B8" }}>No fees recorded.</p> : myFees.map((record) => (
            <div key={record.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "10px", padding: "15px 20px" }}>
              <div>
                <div style={{ color: "#F1F5F9", fontWeight: "bold", fontSize: "16px" }}>Fee Payment</div>
                <div style={{ color: "#94A3B8", fontSize: "13px" }}>Date: {record.date}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: "bold" }}>₹{record.amount}</div>
                <div style={{
                  background: record.status === "paid" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: record.status === "paid" ? "#10B981" : "#F59E0B",
                  padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase"
                }}>{record.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}