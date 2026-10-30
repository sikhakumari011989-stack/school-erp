import React, { useState, useEffect } from "react";
import { AlertTriangle, Send, Search, ShieldAlert, CheckCircle2, DollarSign } from "lucide-react";
import { useToast } from "../context/ToastContext";

export default function FeeRiskRadar({ schoolCode = "CAMPUS-01" }) {
  const { showToast } = useToast();
  const [riskList, setRiskList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("all"); // 'all' | 'high' | 'moderate' | 'low'

  const cleanSchool = schoolCode.toUpperCase();

  useEffect(() => {
    calculateRiskRadar();

    const handleUpdate = () => calculateRiskRadar();
    window.addEventListener("erp-directory-updated", handleUpdate);
    window.addEventListener("erp-fee-ledger-updated", handleUpdate);
    return () => {
      window.removeEventListener("erp-directory-updated", handleUpdate);
      window.removeEventListener("erp-fee-ledger-updated", handleUpdate);
    };
  }, [cleanSchool]);

  const calculateRiskRadar = () => {
    try {
      const dirRaw = localStorage.getItem(`erp_directory_${cleanSchool}`);
      const dir = dirRaw ? JSON.parse(dirRaw) : [];
      const students = dir.filter((m) => (m.role || "student").toLowerCase() === "student");

      const ledgerRaw = localStorage.getItem(`erp_fee_ledger_${cleanSchool}`);
      const ledger = ledgerRaw ? JSON.parse(ledgerRaw) : [];

      const scored = students.map((st) => {
        const studentCode = (st.roll_number || st.id || "").toUpperCase();
        const studentName = st.name || st.full_name || "Scholar";
        const total = Number(st.totalFees || 45000);
        const initialPaid = Number(st.paidFees || 0);

        // Find transactions for this student
        const txns = ledger.filter((t) => {
          const tRoll = (t.roll_number || t.student_roll || "").toUpperCase();
          const tName = (t.student_name || "").toLowerCase();
          return (studentCode && tRoll === studentCode) || (tName && tName === studentName.toLowerCase());
        });

        const additionalPaid = txns
          .filter((t) => (t.status || "").toLowerCase() === "paid")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const totalPaid = initialPaid + additionalPaid;
        const overdue = Math.max(0, total - totalPaid);
        const rejectedCount = txns.filter((t) => (t.status || "").toLowerCase() === "rejected").length;
        const hasPartial = txns.some((t) => t.is_partial || Number(t.amount) < total * 0.5);

        // Compute 0-100 Risk Score
        let score = 0;
        if (overdue > 0) {
          score += Math.round((overdue / total) * 50);
        }
        if (rejectedCount > 0) {
          score += Math.min(30, rejectedCount * 15);
        }
        if (hasPartial) {
          score += 15;
        }

        score = Math.min(100, Math.max(0, score));

        let tier = "Low";
        if (score >= 75) tier = "High";
        else if (score >= 45) tier = "Moderate";

        return {
          id: studentCode,
          name: studentName,
          rollNumber: studentCode,
          className: st.class_name || "General",
          phone: st.phone || "+91 9800000000",
          totalFees: total,
          paidFees: totalPaid,
          overdueBalance: overdue,
          riskScore: score,
          riskTier: tier,
          rejectedCount,
        };
      });

      scored.sort((a, b) => b.riskScore - a.riskScore);
      setRiskList(scored);
    } catch (e) {
      console.warn("Fee Risk Radar calculation error:", e);
      setRiskList([]);
    }
  };

  const handleSendWhatsApp = (item) => {
    const text = encodeURIComponent(
      `*Institutional Tuition Notice - Action Required*\n` +
      `Scholar: ${item.name} (${item.rollNumber})\n` +
      `Class: ${item.className}\n` +
      `Overdue Balance: ₹${item.overdueBalance.toLocaleString()}\n` +
      `Risk Assessment: Early payment assistance notice.\n` +
      `Please clear dues via portal or contact accounts desk.`
    );
    const cleanPhone = (item.phone || "").replace(/[^0-9]/g, "");
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    showToast(`WhatsApp reminder dispatched for ${item.name}! 📲`, "success");
  };

  const filtered = riskList.filter((item) => {
    if (filterTier !== "all" && item.riskTier.toLowerCase() !== filterTier.toLowerCase()) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.rollNumber.toLowerCase().includes(q) ||
      item.className.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm dark:shadow-2xl space-y-5 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
              Predictive FinTech AI
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Tenant: {cleanSchool}</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>Predictive Fee Defaulter Risk Radar</span>
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Composite 0–100 risk scoring based on payment velocity, rejected UTR counts, and partial settlement frequency.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {["all", "high", "moderate", "low"].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTier === tier
                  ? tier === "high"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                    : tier === "moderate"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                    : "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tier === "all" ? "All Accounts" : `${tier.toUpperCase()} Risk`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or class batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
          {filtered.length} scholars assessed
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Zero High-Risk Fee Accounts Found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All active scholars have demonstrated healthy fee clearance timelines with zero payment rejection flags.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full border border-slate-200 dark:border-white/10 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 uppercase">
                <th className="p-3">Scholar & Roll ID</th>
                <th className="p-3">Class/Batch</th>
                <th className="p-3">Annual Dues</th>
                <th className="p-3">Overdue Balance</th>
                <th className="p-3">Risk Assessment</th>
                <th className="p-3 text-right">Early Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    {item.name}
                    <span className="block font-mono text-[10px] text-cyan-600 dark:text-cyan-400">{item.rollNumber}</span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{item.className}</td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">₹{item.totalFees.toLocaleString()}</td>
                  <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                    ₹{item.overdueBalance.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.riskScore >= 75
                              ? "bg-rose-500"
                              : item.riskScore >= 45
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{ width: `${item.riskScore}%` }}
                        ></div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                          item.riskTier === "High"
                            ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            : item.riskTier === "Moderate"
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {item.riskScore}/100 ({item.riskTier})
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleSendWhatsApp(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:border-emerald-500/40 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm hover:-translate-y-0.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Trigger Early WhatsApp</span>
                    </button>
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

