import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Analytics() {
  const { getSchoolAnalytics } = useContext(AppContext) || {};
  
  // These will eventually be populated by your getSchoolAnalytics() backend call
  const stats = [
    { title: "Total Revenue (YTD)", value: "₹45.2L", trend: "+12%", color: "text-emerald-400", border: "border-emerald-500/20" },
    { title: "Average Attendance", value: "94.2%", trend: "+2.1%", color: "text-blue-400", border: "border-blue-500/20" },
    { title: "Pending Leave Requests", value: "8", trend: "-3", color: "text-orange-400", border: "border-orange-500/20" },
    { title: "Total Active Students", value: "2,845", trend: "+145", color: "text-purple-400", border: "border-purple-500/20" }
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Analytics</h1>
          <p className="text-slate-400 mt-1">Real-time school performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className={`bg-[#1E293B] border ${stat.border} rounded-xl p-6 shadow-lg`}>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{stat.title}</p>
            <div className="flex items-end gap-3">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <span className="text-xs font-bold bg-[#0F172A] px-2 py-1 rounded text-slate-300 border border-slate-700 mb-1">
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg p-6 h-96 flex items-center justify-center">
        <p className="text-slate-500 font-bold">Chart.js / Recharts Component Will Mount Here</p>
      </div>
    </div>
  );
}