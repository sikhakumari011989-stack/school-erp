import React from 'react';

export default function Dashboard() {
  const kpis = [
    { title: "Total Students", value: "850", icon: "👥", color: "text-blue-400" },
    { title: "Today's Attendance", value: "94%", icon: "✓", color: "text-emerald-400" },
    { title: "Fees Collected", value: "₹2.5L", icon: "💰", color: "text-purple-400" },
    { title: "Pending Leaves", value: "5", icon: "🏖️", color: "text-orange-400" }
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">School Manager Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg flex items-center gap-4">
            <div className={`text-3xl ${kpi.color} bg-[#0F172A] p-3 rounded-lg`}>{kpi.icon}</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{kpi.title}</p>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-[#0F172A] border border-slate-600 p-4 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <span className="text-2xl mb-2 block">✓</span>
              <span className="font-semibold text-white">Mark Attendance</span>
            </button>
            <button className="bg-[#0F172A] border border-slate-600 p-4 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <span className="text-2xl mb-2 block">💰</span>
              <span className="font-semibold text-white">Collect Fees</span>
            </button>
            <button className="bg-[#0F172A] border border-slate-600 p-4 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <span className="text-2xl mb-2 block">📢</span>
              <span className="font-semibold text-white">Send Notice</span>
            </button>
            <button className="bg-[#0F172A] border border-slate-600 p-4 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <span className="text-2xl mb-2 block">📊</span>
              <span className="font-semibold text-white">View Reports</span>
            </button>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <p className="text-sm text-slate-300">New student <strong>Raj Kumar</strong> enrolled in 10-A</p>
              <span className="text-xs text-slate-500 ml-auto">10 mins ago</span>
            </div>
            <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <p className="text-sm text-slate-300">Fee payment of ₹5,000 collected from <strong>Priya Singh</strong></p>
              <span className="text-xs text-slate-500 ml-auto">1 hour ago</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <p className="text-sm text-slate-300">Notice sent to <strong>All Classes</strong> regarding Holiday</p>
              <span className="text-xs text-slate-500 ml-auto">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}