import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Analytics() {
  const { getSchoolAnalytics } = useContext(AppContext);
  const analytics = getSchoolAnalytics();

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      <h1 className="text-4xl font-bold text-white mb-8">📊 School Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Students</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.total_students}</p>
            </div>
            <div className="text-5xl">👥</div>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm font-medium">Total Teachers</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.total_teachers}</p>
            </div>
            <div className="text-5xl">👨‍🏫</div>
          </div>
        </div>

        {/* Total Classes */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Classes</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.total_classes}</p>
            </div>
            <div className="text-5xl">🏫</div>
          </div>
        </div>

        {/* Fees Collected */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Fees Collected</p>
              <p className="text-4xl font-bold text-white mt-2">₹{(analytics.total_fees_collected / 1000).toFixed(1)}K</p>
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>

        {/* Pending Fees */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Pending Fees</p>
              <p className="text-4xl font-bold text-white mt-2">₹{(analytics.pending_fees / 1000).toFixed(1)}K</p>
            </div>
            <div className="text-5xl">⚠️</div>
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Avg Attendance</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.average_attendance}%</p>
            </div>
            <div className="text-5xl">📈</div>
          </div>
        </div>

        {/* Homework Assigned */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Homework Assigned</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.total_homework_assigned}</p>
            </div>
            <div className="text-5xl">📚</div>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm font-medium">Pending Leaves</p>
              <p className="text-4xl font-bold text-white mt-2">{analytics.pending_leaves}</p>
            </div>
            <div className="text-5xl">🚫</div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Overview */}
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">📋 School Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-300">Total Enrollment:</span>
              <span className="text-white font-semibold">{analytics.total_students} students</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Teaching Staff:</span>
              <span className="text-white font-semibold">{analytics.total_teachers} teachers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Class Sections:</span>
              <span className="text-white font-semibold">{analytics.total_classes} classes</span>
            </div>
            <div className="h-px bg-slate-600/50 my-4"></div>
            <div className="flex justify-between">
              <span className="text-slate-300">Student-Teacher Ratio:</span>
              <span className="text-white font-semibold">
                {analytics.total_teachers > 0 ? (analytics.total_students / analytics.total_teachers).toFixed(1) : 0}:1
              </span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">💳 Financial Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-300">Total Fees Due:</span>
              <span className="text-white font-semibold">₹{(analytics.total_fees_collected + analytics.pending_fees).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Collected:</span>
              <span className="text-green-400 font-semibold">₹{analytics.total_fees_collected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Pending:</span>
              <span className="text-red-400 font-semibold">₹{analytics.pending_fees.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-600/50 my-4"></div>
            <div className="flex justify-between">
              <span className="text-slate-300">Collection Rate:</span>
              <span className="text-blue-400 font-semibold">
                {analytics.total_fees_collected + analytics.pending_fees > 0
                  ? ((analytics.total_fees_collected / (analytics.total_fees_collected + analytics.pending_fees)) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}