import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function SuperAdminDashboard() {
  const { user } = useContext(AppContext);
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch all database counts simultaneously for maximum speed
      const [studentRes, teacherRes, classRes, feeRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('fees').select('amount').eq('status', 'paid')
      ]);

      // Calculate total revenue from the fetched fee records
      const totalRevenue = feeRes.data 
        ? feeRes.data.reduce((sum, fee) => sum + Number(fee.amount), 0) 
        : 0;

      setStats({
        students: studentRes.count || 0,
        teachers: teacherRes.count || 0,
        classes: classRes.count || 0,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    { name: "Add Student", icon: "👨‍🎓", color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30" },
    { name: "Add Teacher", icon: "👨‍🏫", color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30" },
    { name: "Create Class", icon: "🏫", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { name: "Global Notice", icon: "📢", color: "from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/30" },
    { name: "Manage Fees", icon: "💰", color: "from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30" },
    { name: "System Logs", icon: "⚙️", color: "from-slate-500/20 to-gray-500/10 text-slate-400 border-slate-500/30" },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      
      {/* GLOWING AMBIENT BACKGROUND ORBS */}
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        {/* HERO HEADER */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 relative overflow-hidden flex justify-between items-center">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">System Overview</p>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Super Admin Control 👋
            </h1>
          </div>
          <button 
            onClick={fetchAdminStats}
            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
          >
            {loading ? "Syncing..." : "🔄 Refresh Data"}
          </button>
        </div>

        {/* LIVE STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Students", value: stats.students, icon: "👥", color: "text-blue-400" },
            { label: "Total Teachers", value: stats.teachers, icon: "🎓", color: "text-purple-400" },
            { label: "Active Classes", value: stats.classes, icon: "🏫", color: "text-orange-400" },
            { label: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: "📈", color: "text-emerald-400" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4 group hover:border-white/20 transition-all">
              <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center text-2xl border border-slate-700/50 group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-extrabold ${stat.color}`}>
                  {loading ? "..." : stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Database Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
          {adminActions.map((action, idx) => (
            <button key={idx} className="group relative flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.1)] transition-all duration-300 ease-out w-full">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-white text-center transition-colors">
                {action.name}
              </span>
            </button>
          ))}
        </div>

        {/* RECENT ACTIVITY LOG (Placeholder for MVP) */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <span>⚡</span> Recent System Activity
          </h3>
          <div className="flex flex-col items-center justify-center h-32 opacity-50">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-slate-200 font-bold">Activity logs are empty</p>
            <p className="text-slate-500 text-xs mt-1">Start adding students to generate logs</p>
          </div>
        </div>

      </div>
    </div>
  );
}