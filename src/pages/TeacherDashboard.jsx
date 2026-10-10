import { useState } from "react";

export default function TeacherDashboard() {
  // Mock Data
  const [schedule, setSchedule] = useState([
    { id: 1, time: "08:30 AM", class: "10-A", subject: "Mathematics", status: "Completed", attendance: "32/35" },
    { id: 2, time: "10:15 AM", class: "9-B", subject: "Mathematics", status: "Ongoing", attendance: "-" },
    { id: 3, time: "11:45 AM", class: "11-Sci", subject: "Physics", status: "Upcoming", attendance: "-" },
    { id: 4, time: "01:30 PM", class: "10-B", subject: "Mathematics", status: "Upcoming", attendance: "-" },
  ]);

  const [tasks, setTasks] = useState([
    { id: 1, task: "Grade Unit Test 2 for Class 10-A", priority: "High" },
    { id: 2, task: "Submit Leave application for Friday", priority: "Medium" },
    { id: 3, task: "Upload Physics Assignment for 11-Sci", priority: "Low" }
  ]);

  return (
    <div className="text-slate-200">
      
      {/* HEADER & PROFILE SUMMARY */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 bg-[#1E293B] border border-slate-700 p-6 rounded-xl shadow-lg relative overflow-hidden">
        {/* BG Accent */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500 p-1">
            <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, Mr. Sharma</h1>
            <p className="text-slate-400 mt-1">Class Teacher: 10-A • Department: Mathematics</p>
          </div>
        </div>
        
        <div className="flex gap-3 z-10">
          <button className="bg-[#0F172A] border border-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all">
            Apply Leave
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/20">
            ✓ Quick Mark Attendance
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Classes Today</p>
          <p className="text-3xl font-bold text-white">4</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">My Class (10-A) Strength</p>
          <p className="text-3xl font-bold text-emerald-400">35</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Assignments</p>
          <p className="text-3xl font-bold text-orange-400">12</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Leave Balance</p>
          <p className="text-3xl font-bold text-blue-400">8 Days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TODAY'S TIMETABLE */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Today's Schedule</h2>
            <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full">
              Friday
            </span>
          </div>
          
          <div className="divide-y divide-slate-700">
            {schedule.map((session) => (
              <div key={session.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="text-slate-400 text-sm font-bold w-20">{session.time}</div>
                  <div className="w-1.5 h-12 rounded-full bg-blue-500"></div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{session.class} <span className="text-slate-500 text-sm font-normal ml-2">{session.subject}</span></h3>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {session.status === "Completed" ? `Attendance: ${session.attendance}` : "Room: 402"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    session.status === 'Ongoing' ? 'bg-emerald-500 text-white animate-pulse' : 
                    session.status === 'Completed' ? 'bg-slate-700 text-slate-300' : 
                    'bg-[#0F172A] text-blue-400 border border-blue-500/30'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PENDING TASKS & NOTICES */}
        <div className="space-y-6">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg p-5">
            <h2 className="text-lg font-bold text-white mb-4">Pending Tasks</h2>
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-[#0F172A] border border-slate-600 rounded-lg p-3 flex gap-3 items-start">
                  <input type="checkbox" className="mt-1 border-slate-500 rounded bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer" />
                  <div>
                    <p className="text-sm text-slate-200">{task.task}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold mt-1 inline-block ${
                      task.priority === 'High' ? 'text-red-400' : 
                      task.priority === 'Medium' ? 'text-orange-400' : 'text-emerald-400'
                    }`}>
                      {task.priority} Priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              + Add Task
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/20 rounded-xl shadow-lg p-5">
            <h2 className="text-sm font-bold text-blue-300 mb-2">📢 Latest Admin Notice</h2>
            <p className="text-sm text-slate-300 mb-3">All class teachers must submit the term 1 final attendance registers by 4:00 PM today.</p>
            <span className="text-xs text-slate-500">Posted 2 hours ago</span>
          </div>
        </div>

      </div>
    </div>
  );
}