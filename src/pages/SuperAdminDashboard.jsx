import React from 'react';

export default function SuperAdminDashboard() {
  // Mock Data
  const kpis = [
    { title: "Total Students", value: "2,845", trend: "+12% this year", icon: "🎓", color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Active Staff", value: "142", trend: "+3% this year", icon: "👨‍🏫", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Total Revenue", value: "₹45.2L", trend: "+8% this month", icon: "💵", color: "text-purple-400", bg: "bg-purple-400/10" },
    { title: "Pending Fees", value: "₹3.8L", trend: "-2% this month", icon: "⚠️", color: "text-orange-400", bg: "bg-orange-400/10" }
  ];

  const monthlyRevenue = [
    { month: 'Apr', height: '60%' },
    { month: 'May', height: '80%' },
    { month: 'Jun', height: '40%' },
    { month: 'Jul', height: '90%' },
    { month: 'Aug', height: '75%' },
    { month: 'Sep', height: '85%' },
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">HQ Overview</h1>
          <p className="text-slate-400 mt-1">Super Admin Global Dashboard</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/20">
          Download Report
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-lg ${kpi.bg} flex items-center justify-center text-2xl`}>
                {kpi.icon}
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-slate-400 text-sm font-semibold mb-1">{kpi.title}</h3>
            <p className="text-3xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* REVENUE GRAPH */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Monthly Fee Collection</h2>
            <select className="bg-[#0F172A] border border-slate-600 text-sm rounded-lg px-3 py-1 text-slate-300 outline-none">
              <option>2026-2027</option>
              <option>2025-2026</option>
            </select>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-4 pt-4 border-b border-slate-700 pb-2">
            {monthlyRevenue.map((data, index) => (
              <div key={index} className="w-full flex flex-col items-center gap-2 group">
                <div className="w-full bg-[#0F172A] rounded-t-sm h-full flex items-end relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded border border-slate-600 transition-opacity whitespace-nowrap z-10">
                    {data.height} Target
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 group-hover:brightness-110" 
                    style={{ height: data.height }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-slate-400">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK STATS / HEALTH OVERVIEW */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-6">School Health</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300 font-semibold">Today's Attendance</span>
                <span className="text-emerald-400 font-bold">92%</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-2.5 border border-slate-700">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300 font-semibold">Fee Collection Target</span>
                <span className="text-blue-400 font-bold">78%</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-2.5 border border-slate-700">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300 font-semibold">Staff Present</span>
                <span className="text-orange-400 font-bold">135 / 142</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-2.5 border border-slate-700">
                <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold py-2 rounded-lg transition-all text-sm">
              View Detailed Analytics
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}