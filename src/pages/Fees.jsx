import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

export default function Fees() {
  const { students, fees, updateFees } = useContext(AppContext);
  const [feeData, setFeeData] = useState({
    student_id: "",
    amount: "",
    status: "pending"
  });

  const handleAddFee = () => {
    if (!feeData.student_id || !feeData.amount) {
      alert("Fill all fields");
      return;
    }

    // Send directly to AppContext in database format
    updateFees(feeData);

    alert("✅ Fee record added to Cloud!");
    setFeeData({ student_id: "", amount: "", status: "pending" });
  };

  const studentName = (id) => students.find(s => s.id === id)?.name || "Unknown";
  
  const totalFees = fees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const paidFees = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const pendingFees = totalFees - paidFees;

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "0" }}>
        💰 Fees Management
      </h1>

      {/* STATS */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "15px", marginBottom: "30px"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #06B6D433 0%, #0891B233 100%)",
          border: "1px solid #06B6D466", borderRadius: "10px", padding: "20px", textAlign: "center"
        }}>
          <p style={{ color: "#67E8F9", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>
            Total Fees
          </p>
          <h3 style={{ color: "#06B6D4", margin: "0", fontSize: "28px", fontWeight: "bold" }}>
            ₹{totalFees.toFixed(0)}
          </h3>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #10B98133 0%, #059669 100%)",
          border: "1px solid #10B98166", borderRadius: "10px", padding: "20px", textAlign: "center"
        }}>
          <p style={{ color: "#86EFAC", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>
            Paid
          </p>
          <h3 style={{ color: "#10B981", margin: "0", fontSize: "28px", fontWeight: "bold" }}>
            ₹{paidFees.toFixed(0)}
          </h3>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #F59E0B33 0%, #FBBF2433 100%)",
          border: "1px solid #F59E0B66", borderRadius: "10px", padding: "20px", textAlign: "center"
        }}>
          <p style={{ color: "#FCD34D", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "500" }}>
            Pending
          </p>
          <h3 style={{ color: "#F59E0B", margin: "0", fontSize: "28px", fontWeight: "bold" }}>
            ₹{pendingFees.toFixed(0)}
          </h3>
        </div>
      </div>

      {/* ADD FEE FORM */}
      <div style={{
        background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
        borderRadius: "12px", padding: "30px", marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(6, 182, 212, 0.2)"
      }}>
        <h2 style={{ marginTop: "0", fontSize: "20px" }}>Add Fee Record</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Student
            </label>
            <select 
              value={feeData.student_id}
              onChange={(e) => setFeeData({...feeData, student_id: e.target.value})}
              style={{
                width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
                color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
                cursor: "pointer", backdropFilter: "blur(10px)"
              }}
            >
              <option value="" style={{ color: "black" }}>-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id} style={{ color: "black" }}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Amount (₹)
            </label>
            <input 
              type="number"
              value={feeData.amount}
              onChange={(e) => setFeeData({...feeData, amount: e.target.value})}
              placeholder="Enter amount"
              style={{
                width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
                color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
                backdropFilter: "blur(10px)"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
            Status
          </label>
          <select 
            value={feeData.status}
            onChange={(e) => setFeeData({...feeData, status: e.target.value})}
            style={{
              width: "100%", padding: "12px 15px", background: "rgba(255, 255, 255, 0.1)",
              color: "white", border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px", boxSizing: "border-box", fontSize: "14px",
              cursor: "pointer", backdropFilter: "blur(10px)"
            }}
          >
            <option value="pending" style={{ color: "black" }}>⏳ Pending</option>
            <option value="paid" style={{ color: "black" }}>✓ Paid</option>
            <option value="overdue" style={{ color: "black" }}>⚠️ Overdue</option>
          </select>
        </div>

        <button 
          onClick={handleAddFee}
          style={{
            padding: "12px 30px", background: "#FFFFFF", color: "#0891B2",
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
          ➕ Add Fee
        </button>
      </div>

      {/* FEES LIST */}
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px" }}>
        {fees.length} Fee Record{fees.length !== 1 ? "s" : ""}
      </h2>

      {fees.length === 0 ? (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "2px dashed #334155", borderRadius: "12px",
          padding: "40px", textAlign: "center"
        }}>
          <p style={{ color: "#94A3B8", fontSize: "18px" }}>📭 No fee records yet</p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>Add your first fee record to get started</p>
        </div>
      ) : (
        <div style={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid #334155", borderRadius: "12px",
          padding: "25px", overflowX: "auto"
        }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #334155" }}>
                <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Student</th>
                <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Amount</th>
                <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "15px", textAlign: "left", color: "#94A3B8", fontWeight: "600" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee.id} style={{ borderBottom: "1px solid #1E293B" }}>
                  <td style={{ padding: "15px", color: "#E2E8F0" }}>
                    {studentName(fee.student_id)}
                  </td>
                  <td style={{ padding: "15px", color: "#E2E8F0", fontWeight: "bold" }}>
                    ₹{fee.amount}
                  </td>
                  <td style={{ padding: "15px" }}>
                    <span style={{
                      padding: "6px 12px", borderRadius: "6px",
                      background: fee.status === "paid" ? "#10B98133" : 
                                 fee.status === "overdue" ? "#EF444433" : "#F59E0B33",
                      color: fee.status === "paid" ? "#10B981" : 
                             fee.status === "overdue" ? "#EF4444" : "#F59E0B",
                      fontSize: "12px", fontWeight: "bold"
                    }}>
                      {fee.status === "paid" ? "✓ Paid" : 
                       fee.status === "overdue" ? "⚠️ Overdue" : "⏳ Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "15px", color: "#CBD5E1" }}>
                    {fee.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}