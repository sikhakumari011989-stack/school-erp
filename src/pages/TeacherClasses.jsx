import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function TeacherClasses() {
  const { showToast } = useToast();
  const [classesList] = useState([
    { id: 1, name: "Class 10-A", strength: 42, subject: "Mathematics", timing: "09:00 AM - 09:45 AM", room: "Room 302" },
    { id: 2, name: "Class 10-B", strength: 38, subject: "Mathematics", timing: "10:00 AM - 10:45 AM", room: "Room 304" },
    { id: 3, name: "Class 9-A", strength: 45, subject: "Advanced Math", timing: "11:30 AM - 12:15 PM", room: "Room 201" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Portal</p>
          <h1 className="text-3xl font-extrabold text-white">My Classes & Timetable 👨‍🏫</h1>
          <p className="text-slate-400 text-sm mt-1">Review assigned classes, section strengths, schedules, and student lists</p>
        </div>

        {/* TIMETABLE & CLASSES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {classesList.map((cls) => (
            <div key={cls.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group hover:border-blue-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase">
                    {cls.subject}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">{cls.room}</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {cls.name}
                </h3>
                <p className="text-slate-300 text-sm mb-2 font-medium">Strength: <span className="text-white font-bold">{cls.strength} Students</span></p>
                <p className="text-slate-400 text-xs font-mono mb-6">Timing: {cls.timing}</p>
              </div>
              <button 
                onClick={() => showToast(`Opening student roster for ${cls.name}...`, "info")}
                className="w-full bg-slate-800 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 hover:border-blue-500 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>👥</span> View Student Roster
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}