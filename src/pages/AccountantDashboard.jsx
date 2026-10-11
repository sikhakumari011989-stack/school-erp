import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function AccountantDashboard() {
  const { user } = useContext(AppContext);
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingDues: 0, totalPaidCount: 0 });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    student_name: "",
    class_name: "",
    amount: "",
    status: "paid",
    payment_mode: "Cash / Cheque"
  });

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fee_ledger")
      .select("*")
      .order('created_at', { ascending: false });

    if (data) {
      setLedger(data);
      
      // Calculate real-time financial stats
      let revenue = 0;
      let pending = 0;
      let paidCount = 0;

      data.forEach(item => {
        if (item.status === 'paid') {
          revenue += Number(item.amount);
          paidCount += 1;
        } else {
          pending += Number(item.amount);
        }
      });

      setStats({ totalRevenue: revenue, pendingDues: pending, totalPaidCount: paidCount });
    }
    setLoading(false);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("fee_ledger").insert([{
        school_id: user?.school_id || "school-demo-01",
        student_name: formData.student_name,
        class_name: formData.class_name,
        amount: formData.amount,
        status: formData.status,
        payment_mode: formData.payment_mode,
        date: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;

      alert("Transaction logged successfully!");
      setFormData({ student_name: "", class_name: "", amount: "", status: "paid", payment_mode: "Cash / Cheque" });
      fetchLedger();
    } catch (err) {
      console.error("Error logging transaction:", err);
      alert("Failed to record transaction.");
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8">
          <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Financial Operations</p>
          <h1 className="text-3xl font-extrabold text-white">Accountant Command Center 💰</h1>
        </div>

        {/* FINANCIAL METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">₹</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Collected Revenue</p>
              <p className="text-2xl font-extrabold text-emerald-400">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-2xl font-bold">⏳</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Defaulter Dues</p>
              <p className="text-2xl font-extrabold text-orange-400">₹{stats.pendingDues.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl font-bold">🧾</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Successful Receipts</p>
              <p className="text-2xl font-extrabold text-blue-400">{stats.totalPaidCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: MANUAL FEE ENTRY FORM */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Log Fee Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Name</label>
                <input 
                  type="text" required placeholder="e.g., Astik Kumar" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={formData.student_name} onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <input 
                  type="text" required placeholder="e.g., 10-A" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount (₹)</label>
                <input 
                  type="number" required placeholder="e.g., 5000" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending (Defaulter)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Mode</label>
                <select 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}
                >
                  <option value="Cash / Cheque">Cash / Cheque</option>
                  <option value="Online (Razorpay)">Online (Razorpay)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/UPI)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all mt-4">
                Record Transaction
              </button>
            </form>
          </div>

          {/* RIGHT: LEDGER TABLE */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">Live Institutional Fee Ledger</h2>
              <button onClick={fetchLedger} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 font-bold transition-all">
                🔄 Refresh Ledger
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading financial records...</div>
            ) : ledger.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Student & Class</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Mode</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {ledger.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{item.student_name}</p>
                          <p className="text-xs text-slate-400">Class {item.class_name}</p>
                        </td>
                        <td className="p-4 font-extrabold text-white">₹{Number(item.amount).toLocaleString()}</td>
                        <td className="p-4 text-slate-300 text-xs">{item.payment_mode}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                            item.status === 'paid' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xs">{item.date}</td>
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