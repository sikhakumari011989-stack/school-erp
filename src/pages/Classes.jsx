import React from "react";

export default function Classes() {
  const classes = [
    { id: 1, name: "10-A", teacher: "Mr. Sharma", strength: 35, room: "401" },
    { id: 2, name: "9-B", teacher: "Mrs. Gupta", strength: 32, room: "305" },
    { id: 3, name: "11-Sci", teacher: "Dr. Verma", strength: 40, room: "502" }
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Class Management</h1>
          <p className="text-slate-400 mt-1">Manage sections, rooms, and class teachers</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg">
          + Add New Class
        </button>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-sm">
              <th className="p-4 font-semibold">Class & Section</th>
              <th className="p-4 font-semibold">Class Teacher</th>
              <th className="p-4 font-semibold">Student Strength</th>
              <th className="p-4 font-semibold">Room No.</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {classes.map((cls) => (
              <tr key={cls.id} className="border-b border-slate-700/50 hover:bg-slate-800/20">
                <td className="p-4 font-bold text-blue-400">{cls.name}</td>
                <td className="p-4 text-white font-semibold">{cls.teacher}</td>
                <td className="p-4 text-slate-300">{cls.strength} Students</td>
                <td className="p-4 text-slate-400">Room {cls.room}</td>
                <td className="p-4 text-right">
                  <button className="text-slate-400 hover:text-white px-2 py-1 text-xs border border-slate-600 rounded">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}