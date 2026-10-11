import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";
import CreateClassModal from "../Components/CreateClassModal"; // NEW IMPORT

export default function SuperAdminDashboard() {
  const { user } = useContext(AppContext);
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  
  // NEW STATE FOR MODAL
  const [activeModal, setActiveModal] = useState(null); 

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const [studentRes, teacherRes, classRes, feeRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('fees').select('amount').eq('status', 'paid')
      ]);

      const totalRevenue = feeRes.data ? feeRes.data.reduce((sum, fee) => sum + Number(fee.amount), 0) : 0;

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
    { id: "student", name: "Add Student", icon: "👨‍🎓", color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30" },
    { id: "teacher", name: "Add Teacher", icon: "👨‍🏫", color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30" },
    { id: "class", name: "Create Class", icon: "🏫", color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { id: "notice", name: "Global Notice", icon: "📢", color: "from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/30" },
    { id: "fees", name: "Manage Fees", icon: "💰", color: "from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30" },
    { id: "logs", name: "System Logs", icon: "⚙️", color: "from-slate-500/20 to-gray-500/10 text-slate-400 border-slate-500/30" },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 relative overflow-hidden flex justify-between items-center">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">System Overview</p>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Super Admin Control 👋
            </h1>
          </div>
          <button onClick={fetchAdminStats} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg font-bold transition-all">
            {loading ? "Syncing..." : "🔄 Refresh Data"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Students", value: stats.students, icon: "👥", color: "text-blue-400" },
            { label: "Total Teachers", value: stats.teachers, icon: "🎓", color: "text-purple-400" },
            { label: "Active Classes", value: stats.classes, icon: "🏫", color: "text-orange-400" },
            { label: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: "📈", color: "text-emerald-400" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4 group">
              <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center text-2xl border border-slate-700/50 group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-extrabold ${stat.color}`}>{loading ? "..." : stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Database Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
          {adminActions.map((action) => (
            <button 
              key={action.id} 
              onClick={() => setActiveModal(action.id)} // OPENS MODAL
              className="group relative flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:-translate-y-2 transition-all w-full"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border group-hover:scale-110 transition-transform shadow-inner`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-white text-center">
                {action.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER MODAL HERE */}
      <CreateClassModal 
        isOpen={activeModal === 'class'} 
        onClose={() => setActiveModal(null)} 
        onRefresh={fetchAdminStats}
      />

    </div>
  );
}