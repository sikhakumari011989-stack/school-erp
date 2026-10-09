import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Dashboard() {
  const { students, classes, fees, attendance } = useContext(AppContext);

  // Calculate stats
  const totalStudents = students.length;
  const totalClasses = classes.length;
  const totalFees = fees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const paidFees = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const pendingFees = totalFees - paidFees;

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `1px solid ${color}44`,
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      minWidth: "200px"
    }}>
      <div style={{ fontSize: "30px", marginBottom: "10px" }}>{icon}</div>
      <p style={{ color: "#94A3B8", margin: "0 0 5px 0", fontSize: "13px" }}>{label}</p>
      <h3 style={{ color, margin: "0", fontSize: "28px", fontWeight: "bold" }}>
        {label.includes("₹") ? `₹${value}` : value}
      </h3>
    </div>
  );

  return (
    <div style={{ color: "white" }}>
      <h1>Dashboard Overview</h1>
      
      {/* STATS GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "15px",
        marginBottom: "40px"
      }}>
        <StatCard icon="👥" label="Total Students" value={totalStudents} color="#3B82F6" />
        <StatCard icon="🏫" label="Total Classes" value={totalClasses} color="#8B5CF6" />
        <StatCard icon="💰" label="Total Fees" value={totalFees} color="#10B981" />
        <StatCard icon="✓" label="Paid Fees" value={paidFees} color="#06B6D4" />
        <StatCard icon="⏳" label="Pending Fees" value={pendingFees} color="#F59E0B" />
      </div>

      {/* RECENT ACTIVITY */}
      <div style={{
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2 style={{ color: "#F1F5F9", marginTop: "0" }}>Quick Stats</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <p style={{ color: "#94A3B8", fontSize: "13px" }}>Students Status</p>
            <p style={{ color: "#60A5FA", fontSize: "18px", fontWeight: "bold", margin: "10px 0" }}>
              {totalStudents} total registered
            </p>
            <p style={{ color: "#CBD5E1", fontSize: "13px" }}>
              Across {totalClasses} classes
            </p>
          </div>

          <div>
            <p style={{ color: "#94A3B8", fontSize: "13px" }}>Fee Collection</p>
            <p style={{ color: "#10B981", fontSize: "18px", fontWeight: "bold", margin: "10px 0" }}>
              ₹{paidFees.toFixed(2)} collected
            </p>
            <p style={{ color: "#CBD5E1", fontSize: "13px" }}>
              ₹{pendingFees.toFixed(2)} pending
            </p>
          </div>
        </div>
      </div>

      {/* RECENT FEES */}
      {fees.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "20px"
        }}>
          <h2 style={{ color: "#F1F5F9", marginTop: "0" }}>Recent Fee Records</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ padding: "10px", textAlign: "left", color: "#94A3B8" }}>Amount</th>
                <th style={{ padding: "10px", textAlign: "left", color: "#94A3B8" }}>Status</th>
                <th style={{ padding: "10px", textAlign: "left", color: "#94A3B8" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {fees.slice(-5).reverse().map(fee => (
                <tr key={fee.id} style={{ borderBottom: "1px solid #1E293B" }}>
                  <td style={{ padding: "10px", color: "#E2E8F0" }}>₹{fee.amount}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: fee.status === "paid" ? "#10B98133" : fee.status === "overdue" ? "#EF444433" : "#F59E0B33",
                      color: fee.status === "paid" ? "#10B981" : fee.status === "overdue" ? "#EF4444" : "#F59E0B",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}>
                      {fee.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px", color: "#CBD5E1" }}>{fee.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}