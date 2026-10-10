import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Homework() {
  // Using your new AppContext functions
  const { user, uploadHomework } = useContext(AppContext) || { user: { role: 'teacher' } };
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Local state to hold the list before we wire up the getClassHomework fetch
  const [homeworkList, setHomeworkList] = useState([
    { id: 1, subject: "Mathematics", title: "Algebra Ex 4.2", dueDate: "2026-10-15", class: "10-A" },
    { id: 2, subject: "Physics", title: "Light Reflection Notes", dueDate: "2026-10-16", class: "10-A" },
    { id: 3, subject: "Computer App", title: "Java Arrays Assignment", dueDate: "2026-10-18", class: "10-A" }
  ]);

  return (
    <div className="text-slate-200 relative">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Homework Management</h1>
          <p className="text-slate-400 mt-1">Assign, track, and manage student assignments</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all">
            + Assign New Homework
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {homeworkList.map((hw) => (
          <div key={hw.id} className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg group hover:border-slate-500 transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {hw.subject}
              </span>
              <span className="text-xs text-slate-400 font-semibold bg-[#0F172A] px-2 py-1 rounded border border-slate-700">Class {hw.class}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{hw.title}</h2>
            <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                Due: {hw.dueDate}
              </span>
              <button className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                View Submissions →
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white mb-4">Assign New Homework</h2>
            <form onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Class</label>
                <select className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500">
                  <option>10-A</option>
                  <option>9-B</option>
                  <option>11-Sci</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                  <input type="text" required placeholder="e.g. Physics" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                  <input type="date" required className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500 custom-calendar-icon" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assignment Title</label>
                <input type="text" required placeholder="e.g. Solve Chapter 4 Equations" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">Publish to Students</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}