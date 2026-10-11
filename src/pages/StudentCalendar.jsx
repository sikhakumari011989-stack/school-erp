import React, { useState } from "react";

export default function StudentCalendar() {
  const [selectedMonth, setSelectedMonth] = useState("October 2026");

  const events = [
    { date: "Oct 15, 2026", title: "Mid-Term Examination Begins", type: "Exam", status: "Working Day" },
    { date: "Oct 20, 2026", title: "Diwali Vacation Start", type: "Holiday", status: "Holiday 🏖️" },
    { date: "Oct 30, 2026", title: "School Reopens Post-Diwali", type: "Event", status: "Working Day" },
    { date: "Nov 05, 2026", title: "Inter-School Football Tournament", type: "Sports", status: "Working Day" },
    { date: "Nov 14, 2026", title: "Children's Day Celebration & Cultural Fest", type: "Event", status: "Working Day" }
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
            <h1 className="text-3xl font-extrabold text-white">School Calendar & Holidays 📅</h1>
            <p className="text-slate-400 text-sm mt-1">Track academic schedules, holidays, and campus events</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-white font-bold">
            {selectedMonth}
          </div>
        </div>

        {/* TODAY'S STATUS BANNER */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl mb-8 flex justify-between items-center">
          <div>
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Today's Status</span>
            <h2 className="text-2xl font-black text-white mt-1">Working Academic Day 📚</h2>
            <p className="text-slate-300 text-sm mt-1">Regular classes are in session. Check your timetable for periods.</p>
          </div>
          <div className="text-4xl">🏫</div>
        </div>

        {/* EVENTS LIST */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Upcoming Schedule & Holidays</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {events.map((ev, idx) => (
              <div key={idx} className="p-6 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-emerald-400 uppercase">{ev.date.split(' ')[0]}</span>
                    <span className="text-lg font-black text-white">{ev.date.split(' ')[1].replace(',', '')}</span>
                  </div>
                  <div>
                    <span className="bg-slate-800 text-slate-300 px-3 py-0.5 rounded-md text-[10px] font-extrabold uppercase mb-1 inline-block">
                      {ev.type}
                    </span>
                    <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                  </div>
                </div>
                <div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase ${
                    ev.status.includes('Holiday') 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {ev.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}