import { useState } from "react";

export default function Notices() {
  const [notices] = useState([
    { id: 1, title: "Diwali Holidays Announcement", date: "2026-10-09", audience: "All", type: "Holiday", content: "The school will remain closed from Oct 20 to Oct 25 for Diwali." },
    { id: 2, title: "Term 1 Exam Schedule", date: "2026-10-08", audience: "Class 10", type: "Academic", content: "Term 1 exams will commence from Nov 1st. Time tables have been updated." },
    { id: 3, title: "Staff Meeting", date: "2026-10-07", audience: "Teachers", type: "Admin", content: "Mandatory staff meeting in the main hall at 3:00 PM tomorrow." }
  ]);

  return (
    <div className="text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Noticeboard</h1>
          <p className="text-slate-400 mt-1">Official announcements and communications</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg">
          + Create Notice
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {notices.map((notice) => (
          <div key={notice.id} className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  notice.type === 'Holiday' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  notice.type === 'Academic' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {notice.type}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{notice.date}</span>
                <span className="text-xs text-slate-400 font-semibold">• To: {notice.audience}</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">{notice.title}</h2>
              <p className="text-sm text-slate-300">{notice.content}</p>
            </div>
            <button className="text-slate-400 hover:text-white border border-slate-600 px-3 py-1.5 rounded text-xs transition-colors">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}