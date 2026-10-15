import React from "react";

export default function StudentAttendance() {
  const attendanceHistory = [
    { date: "09 Oct, 2026", status: "Present", remark: "-" },
    { date: "08 Oct, 2026", status: "Present", remark: "-" },
    { date: "07 Oct, 2026", status: "Absent", remark: "Fever" },
    { date: "06 Oct, 2026", status: "Present", remark: "-" },
    { date: "05 Oct, 2026", status: "Holiday", remark: "Dussehra" },
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Attendance</h1>
        <p className="text-slate-400 mt-1">Track your daily presence and leave history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Overall Attendance</p>
          <p className="text-4xl font-bold text-emerald-400">92%</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Present</p>
          <p className="text-4xl font-bold text-white">142 Days</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 shadow-lg text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Leaves Taken</p>
          <p className="text-4xl font-bold text-orange-400">4 Days</p>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="font-bold text-white">Recent History</h2>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[450px]">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-sm">
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {attendanceHistory.map((record, index) => (
                <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-800/20">
                  <td className="p-4 font-mono text-slate-300">{record.date}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      record.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 
                      record.status === 'Absent' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{record.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}