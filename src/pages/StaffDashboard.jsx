import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function StaffDashboard() {
  const { showToast } = useToast();
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const shifts = [
    { day: "Monday", duty: "Main Gate Security & Access Control", time: "08:00 AM - 04:00 PM", status: "Completed" },
    { day: "Tuesday", duty: "Bus Route #3 Transport Escort", time: "07:00 AM - 03:00 PM", status: "Completed" },
    { day: "Wednesday", duty: "Campus Maintenance & Lab Check", time: "09:00 AM - 05:00 PM", status: "Active Today" },
    { day: "Thursday", duty: "Library Inventory Organization", time: "08:00 AM - 04:00 PM", status: "Upcoming" },
    { day: "Friday", duty: "Main Gate Security & Access Control", time: "08:00 AM - 04:00 PM", status: "Upcoming" }
  ];

  const handleMarkEntry = () => {
    setAttendanceMarked(true);
    showToast("Daily entry attendance logged successfully!", "success");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Operational Support</p>
            <h1 className="text-3xl font-extrabold text-white">Non-Teaching Staff Portal 🛠️</h1>
          </div>
          <div>
            <button
              onClick={handleMarkEntry}
              disabled={attendanceMarked}
              className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                attendanceMarked 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
              }`}
            >
              {attendanceMarked ? "Attendance Logged ✓" : "Clock In / Mark Attendance 🕒"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: PROFILE & SALARY SLIPS */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Staff Profile</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Staff ID</span>
                  <span className="font-mono font-bold text-white">STF-8842</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Department</span>
                  <span className="font-bold text-white">Transport & Security</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Monthly Wages</span>
                  <span className="font-bold text-emerald-400">₹24,000</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Salary Slips</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-white">September 2026 Slip</p>
                    <p className="text-xs text-slate-400">Disbursed on Oct 1</p>
                  </div>
                  <button
                    onClick={() => showToast("Downloading verified salary slip (PDF)...", "info")}
                    className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600/40 transition-all cursor-pointer"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: SHIFT & DUTY ROSTER */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">Weekly Shift & Duty Roster</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Day</th>
                    <th className="p-5">Assigned Duty</th>
                    <th className="p-5">Shift Hours</th>
                    <th className="p-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {shifts.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-white">{s.day}</td>
                      <td className="p-5 text-slate-300 font-medium">{s.duty}</td>
                      <td className="p-5 font-mono text-slate-400 text-xs">{s.time}</td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          s.status === 'Completed' ? 'bg-slate-700 text-slate-300' :
                          s.status === 'Active Today' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}