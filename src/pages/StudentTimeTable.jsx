import React from "react";

export default function StudentTimeTable() {
  const schedule = [
    { time: "08:00 AM", subject: "Mathematics", teacher: "Mr. Sharma", room: "Room 401" },
    { time: "09:00 AM", subject: "Physics", teacher: "Dr. Verma", room: "Lab 2" },
    { time: "10:00 AM", subject: "Break", teacher: "-", room: "-" },
    { time: "10:30 AM", subject: "English", teacher: "Mrs. Davis", room: "Room 401" },
    { time: "11:30 AM", subject: "Computer App", teacher: "Mr. Gupta", room: "Computer Lab" },
  ];

  return (
    <div className="text-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Timetable</h1>
        <p className="text-slate-400 mt-1">Today's Class Schedule (Class 10-A)</p>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/30">
          <h2 className="font-bold text-white">Friday Schedule</h2>
          <button className="text-sm text-slate-400 border border-slate-600 px-3 py-1 rounded hover:text-white transition-colors">
            View Full Week
          </button>
        </div>
        
        <div className="divide-y divide-slate-700">
          {schedule.map((session, index) => (
            <div key={index} className="p-5 flex items-center gap-6 hover:bg-slate-800/20 transition-colors">
              <div className="text-slate-400 text-sm font-bold w-20 shrink-0">{session.time}</div>
              
              <div className={`w-1.5 h-12 rounded-full ${session.subject === 'Break' ? 'bg-slate-600' : 'bg-blue-500'}`}></div>
              
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${session.subject === 'Break' ? 'text-slate-500' : 'text-white'}`}>
                  {session.subject}
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {session.teacher !== "-" ? `Teacher: ${session.teacher} • ${session.room}` : "Snack Break"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}