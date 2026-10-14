import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { StatSkeleton, TableSkeleton } from "../Components/Skeleton";

export default function AccountantDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingDues: 0, totalPaidCount: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    student_name: "",
    class_name: "",
    amount: "",
    status: "paid",
    payment_mode: "Cash / Cheque",
  });

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fee_ledger")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setLedger(data);

        // Calculate real-time financial stats
        let revenue = 0;
        let pending = 0;
        let paidCount = 0;

        data.forEach((item) => {
          const val = Number(item.amount) || 0;
          if (item.status === "paid") {
            revenue += val;
            paidCount += 1;
          } else {
            pending += val;
          }
        });

        setStats({ totalRevenue: revenue, pendingDues: pending, totalPaidCount: paidCount });
      }
    } catch (err) {
      console.error("Error fetching financial ledger:", err);
      showToast("Error retrieving financial records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.amount) {
      showToast("Please provide student name and amount", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("fee_ledger").insert([
        {
          school_id: user?.school_id || "school-demo-01",
          student_name: formData.student_name.trim(),
          class_name: formData.class_name.trim() || "10-A",
          amount: Number(formData.amount),
          status: formData.status,
          payment_mode: formData.payment_mode,
          date: new Date().toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      showToast(`Transaction of ₹${Number(formData.amount).toLocaleString()} recorded!`, "success");
      setFormData({
        student_name: "",
        class_name: "",
        amount: "",
        status: "paid",
        payment_mode: "Cash / Cheque",
      });
      fetchLedger();
    } catch (err) {
      console.error("Error logging transaction:", err);
      showToast("Failed to record transaction to database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transactions
  const filteredLedger = ledger.filter((item) => {
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesSearch =
      (item.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.class_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Financial Treasury Suite
            </p>
            <h1 className="text-3xl font-extrabold text-white">Accountant Command Center 💰</h1>
            <p className="text-slate-400 text-sm mt-1">
              Live tuition fee reconciliation, Razorpay settlements, and defaulter tracking
            </p>
          </div>
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Syncing..." : "🔄 Refresh Ledger"}
          </button>
        </div>

        {/* FINANCIAL METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">
                  ₹
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Total Collected Revenue
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Live synced with Razorpay</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl font-bold">
                  ⏳
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Pending Defaulter Dues
                  </p>
                  <p className="text-2xl font-extrabold text-amber-400">
                    ₹{stats.pendingDues.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Awaiting payment settlement</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl font-bold">
                  🧾
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Completed Receipts
                  </p>
                  <p className="text-2xl font-extrabold text-blue-400">{stats.totalPaidCount} Verified</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">100% audit compliant</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: MANUAL FEE ENTRY FORM */}
          <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Log Fee Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Astik Kumar"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Class / Section
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 10-A, 12-Sci"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 5000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-mono font-bold"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Payment Status
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="paid">Paid (Receipt Cleared)</option>
                  <option value="pending">Pending (Defaulter Due)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Payment Mode
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                >
                  <option value="Cash / Cheque">Cash / Cheque</option>
                  <option value="Online (Razorpay)">Online (Razorpay)</option>
                  <option value="Bank Transfer (NEFT/UPI)">Bank Transfer (NEFT/UPI)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all mt-4 disabled:opacity-50"
              >
                {submitting ? "Logging Transaction..." : "Record Transaction 🚀"}
              </button>
            </form>
          </div>

          {/* RIGHT: LEDGER TABLE */}
          <div className="lg:col-span-2 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-700/60 bg-slate-800/50 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-lg font-bold text-white">Live Institutional Fee Ledger</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "all" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({ledger.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("paid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "paid" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Paid ({stats.totalPaidCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "pending" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Pending ({ledger.length - stats.totalPaidCount})
                  </button>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <input
                type="text"
                placeholder="Search ledger by student name or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : filteredLedger.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="font-bold text-white text-base">No transactions found.</p>
                <p className="text-xs mt-1">Transactions recorded here or paid online via Razorpay appear live.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4">Student & Class</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment Mode</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {filteredLedger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{item.student_name}</p>
                          <p className="text-xs text-slate-400">Class {item.class_name}</p>
                        </td>
                        <td className="p-4 font-extrabold text-white">
                          ₹{Number(item.amount).toLocaleString()}
                        </td>
                        <td className="p-4 text-slate-300 text-xs">
                          <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                            {item.payment_mode}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                              item.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xs font-mono">{item.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}