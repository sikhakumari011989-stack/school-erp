import React from "react";

export default function TimeTable() {
  const periods = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"];
  
  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Timetable Manager</h1>
          <p className="text-slate-400 mt-1">Schedule classes and manage routines</p>
        </div>
        <select className="bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white outline-none">
          <option>Select Class: 10-A</option>
          <option>Select Class: 9-B</option>
        </select>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-x-auto w-full p-4">
        <table className="w-full text-center border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="p-3 text-slate-400 font-semibold w-24">Time</th>
              <th className="p-3 text-white font-semibold bg-slate-800/30">Monday</th>
              <th className="p-3 text-white font-semibold bg-slate-800/30">Tuesday</th>
              <th className="p-3 text-white font-semibold bg-slate-800/30">Wednesday</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((time, idx) => (
              <tr key={idx} className="border-b border-slate-700/50">
                <td className="p-4 font-mono text-xs text-slate-400 border-r border-slate-700">{time}</td>
                <td className="p-4 border-r border-slate-700 hover:bg-slate-800/30 cursor-pointer">
                  <div className="font-bold text-blue-400">Mathematics</div>
                  <div className="text-xs text-slate-500">Mr. Sharma</div>
                </td>
                <td className="p-4 border-r border-slate-700 hover:bg-slate-800/30 cursor-pointer">
                  <div className="font-bold text-emerald-400">Physics</div>
                  <div className="text-xs text-slate-500">Dr. Verma</div>
                </td>
                <td className="p-4 hover:bg-slate-800/30 cursor-pointer">
                  <div className="font-bold text-orange-400">English</div>
                  <div className="text-xs text-slate-500">Mrs. Davis</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}