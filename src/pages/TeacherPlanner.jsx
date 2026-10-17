import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function TeacherPlanner() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("planner");
  const [lessons] = useState([
    { id: 1, subject: "Mathematics", chapter: "Chapter 4: Quadratic Equations", objective: "Solve by factorization and formula", status: "Completed" },
    { id: 2, subject: "Mathematics", chapter: "Chapter 5: Arithmetic Progressions", objective: "Derive nth term and sum formulas", status: "In Progress" },
    { id: 3, subject: "Advanced Math", chapter: "Probability Distributions", objective: "Conditional probability theorems", status: "Planned" }
  ]);
  const [tasks, setTasks] = useState([
    { id: 1, title: "Submit mid-term exam question papers to Principal", due: "Tomorrow, 10:00 AM", completed: false },
    { id: 2, title: "Evaluate Class 10-A homework submissions", due: "Oct 15, 2026", completed: true },
    { id: 3, title: "Parent-Teacher consultation meeting preparation", due: "Oct 18, 2026", completed: false }
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Lesson Planner & Reminders 📝</h1>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("planner")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "planner" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Lesson Planner
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "tasks" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Tasks & Reminders
            </button>
          </div>
        </div>

        {activeTab === "planner" ? (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Syllabus & Lesson Planner Schedule</h2>
              <button
                onClick={() => showToast("Lesson entry form initialized. Add curriculum topic.", "info")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                + Add Lesson Plan
              </button>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Subject</th>
                    <th className="p-5">Chapter & Topic</th>
                    <th className="p-5">Learning Objective</th>
                    <th className="p-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-blue-400">{l.subject}</td>
                      <td className="p-5 font-bold text-white">{l.chapter}</td>
                      <td className="p-5 text-slate-300">{l.objective}</td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          l.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          l.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Faculty Tasks & Reminders</h2>
              <button
                onClick={() => showToast("Task scheduler initialized. Create institutional reminder.", "info")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                + New Task
              </button>
            </div>
            <div className="divide-y divide-slate-700/50">
              {tasks.map((t) => (
                <div key={t.id} className="p-6 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      checked={t.completed} 
                      onChange={() => toggleTask(t.id)}
                      className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    />
                    <div>
                      <h3 className={`text-base font-bold ${t.completed ? 'line-through text-slate-500' : 'text-white'}`}>{t.title}</h3>
                      <p className="text-xs text-orange-400 font-semibold mt-1">Due: {t.due}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${t.completed ? 'bg-slate-800 text-slate-500' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                    {t.completed ? 'Finished' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}