import { useState } from "react";

export default function Attendance() {
  const [selectedClass, setSelectedClass] = useState("10-A");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock Student Attendance Data
  const [attendance, setAttendance] = useState([
    { id: 1, roll: "101", name: "Raj Kumar", status: "Present" },
    { id: 2, roll: "102", name: "Priya Singh", status: "Present" },
    { id: 3, roll: "105", name: "Aarush Verma", status: "Absent" },
    { id: 4, roll: "106", name: "Satwik Sharma", status: "Present" },
    { id: 5, roll: "108", name: "Astik Kumar", status: "Leave" },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setAttendance(attendance.map(student => 
      student.id === id ? { ...student, status: newStatus } : student
    ));
  };

  const markAllPresent = () => {
    setAttendance(attendance.map(student => ({ ...student, status: "Present" })));
  };

  // Calculate live stats
  const total = attendance.length;
  const present = attendance.filter(s => s.status === "Present").length;
  const absent = attendance.filter(s => s.status === "Absent").length;
  const onLeave = attendance.filter(s => s.status === "Leave").length;
  const attendancePercentage = Math.round((present / total) * 100) || 0;

  return (
    <div className="text-slate-200">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Management</h1>
          <p className="text-slate-400 mt-1">Track daily attendance and generate reports</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
          Save Attendance
        </button>
      </div>

      {/* CONTROLS & LIVE STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Date & Class Selector */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all text-sm font-semibold"
            >
              <option value="9-B">Class 9-B</option>
              <option value="10-A">Class 10-A</option>
              <option value="11-Sci">Class 11-Science</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all text-sm custom-calendar-icon"
            />
          </div>
        </div>

        {/* Live Attendance Report Summary */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex gap-8 w-full">
            <div className="flex-1 text-center border-r border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
              <p className="text-3xl font-bold text-white">{total}</p>
            </div>
            <div className="flex-1 text-center border-r border-slate-700">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Present</p>
              <p className="text-3xl font-bold text-white">{present}</p>
            </div>
            <div className="flex-1 text-center border-r border-slate-700">
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Absent</p>
              <p className="text-3xl font-bold text-white">{absent}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Rate</p>
              <p className="text-3xl font-bold text-white">{attendancePercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* MARK ATTENDANCE TABLE */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/30">
          <h2 className="text-sm font-bold text-white">Student Roster - {selectedClass}</h2>
          <button 
            onClick={markAllPresent}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            ✓ Mark All Present
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-24">Roll No</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {attendance.map((student) => (
                <tr key={student.id} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-mono text-slate-400 font-semibold">{student.roll}</td>
                  <td className="p-4 font-bold text-white">{student.name}</td>
                  <td className="p-4 text-right">
                    
                    {/* Status Toggle Buttons */}
                    <div className="inline-flex bg-[#0F172A] border border-slate-600 rounded-lg p-1 gap-1">
                      <button 
                        onClick={() => handleStatusChange(student.id, "Present")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                          student.status === "Present" 
                            ? "bg-emerald-500 text-white shadow-md" 
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        Present
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, "Absent")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                          student.status === "Absent" 
                            ? "bg-red-500 text-white shadow-md" 
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        Absent
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, "Leave")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                          student.status === "Leave" 
                            ? "bg-blue-500 text-white shadow-md" 
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        Leave
                      </button>
                    </div>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}