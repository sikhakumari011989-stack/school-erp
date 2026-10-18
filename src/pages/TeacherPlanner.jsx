import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function TeacherPlanner() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";

  const [activeTab, setActiveTab] = useState("planner");
  const [lessons, setLessons] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Modal States
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Form States
  const [lessonForm, setLessonForm] = useState({
    subject: "Mathematics",
    chapter: "",
    objective: "",
    status: "Planned",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    due: "",
  });

  useEffect(() => {
    try {
      const storedLessons = localStorage.getItem(`erp_lessons_${schoolId}`);
      if (storedLessons) {
        setLessons(JSON.parse(storedLessons));
      } else {
        setLessons([]);
      }

      const storedTasks = localStorage.getItem(`erp_tasks_${schoolId}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.warn("Planner storage load error:", e);
      setLessons([]);
      setTasks([]);
    }
  }, [schoolId]);

  const handleAddLesson = (e) => {
    e.preventDefault();
    if (!lessonForm.chapter.trim() || !lessonForm.objective.trim()) {
      showToast("Please provide chapter topic and learning objectives.", "error");
      return;
    }

    const newLesson = {
      id: `lesson_${Date.now()}`,
      subject: lessonForm.subject,
      chapter: lessonForm.chapter.trim(),
      objective: lessonForm.objective.trim(),
      status: lessonForm.status,
      createdAt: new Date().toISOString(),
    };

    const updated = [newLesson, ...lessons];
    setLessons(updated);
    try {
      localStorage.setItem(`erp_lessons_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Lesson plan for "${newLesson.chapter}" added!`, "success");
    setLessonForm({ subject: "Mathematics", chapter: "", objective: "", status: "Planned" });
    setShowLessonModal(false);
  };

  const handleDeleteLesson = (id) => {
    const updated = lessons.filter((l) => l.id !== id);
    setLessons(updated);
    try {
      localStorage.setItem(`erp_lessons_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Lesson plan removed.", "info");
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showToast("Please provide task title / description.", "error");
      return;
    }

    const newTask = {
      id: `task_${Date.now()}`,
      title: taskForm.title.trim(),
      due: taskForm.due.trim() || "Pending Scheduling",
      completed: false,
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    try {
      localStorage.setItem(`erp_tasks_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Reminder "${newTask.title}" scheduled!`, "success");
    setTaskForm({ title: "", due: "" });
    setShowTaskModal(false);
  };

  const toggleTask = (id) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    try {
      localStorage.setItem(`erp_tasks_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    try {
      localStorage.setItem(`erp_tasks_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Reminder task removed.", "info");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Lesson Planner & Reminders 📝</h1>
            <p className="text-slate-400 text-sm mt-1">Manage syllabus milestones, academic schedules, and faculty reminders</p>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("planner")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "planner" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Lesson Planner ({lessons.length})
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "tasks" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Tasks & Reminders ({tasks.length})
            </button>
          </div>
        </div>

        {activeTab === "planner" ? (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Syllabus & Lesson Planner Schedule</h2>
                <p className="text-xs text-slate-400 mt-0.5">Faculty curriculum goals and lesson objectives</p>
              </div>
              <button
                onClick={() => setShowLessonModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Add Lesson Plan</span>
              </button>
            </div>

            {lessons.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="text-lg font-bold text-white mb-1">No Lesson Plans Created (Clean Slate)</h3>
                <p className="text-sm max-w-md mx-auto text-slate-400 mb-6">
                  You haven't scheduled any curriculum lessons yet. Click "Add Lesson Plan" to log your upcoming syllabus chapters.
                </p>
                <button
                  onClick={() => setShowLessonModal(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  + Create First Lesson Plan
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/30">
                      <th className="p-5">Subject</th>
                      <th className="p-5">Chapter & Topic</th>
                      <th className="p-5">Learning Objective</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {lessons.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-5 font-bold text-blue-400">{l.subject}</td>
                        <td className="p-5 font-bold text-white">{l.chapter}</td>
                        <td className="p-5 text-slate-300">{l.objective}</td>
                        <td className="p-5 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                              l.status === "Completed"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : l.status === "In Progress"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => handleDeleteLesson(l.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Faculty Tasks & Institutional Reminders</h2>
                <p className="text-xs text-slate-400 mt-0.5">Stay on top of paper grading, principal deadlines, and events</p>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>New Task</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-bold text-white mb-1">No Active Tasks (Clean Slate)</h3>
                <p className="text-sm max-w-md mx-auto text-slate-400 mb-6">
                  Your reminders list is empty. Click "New Task" to log faculty homework evaluations or exam submissions.
                </p>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  + Add First Task
                </button>
              </div>
            ) : (
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
                        <h3 className={`text-base font-bold ${t.completed ? "line-through text-slate-500" : "text-white"}`}>
                          {t.title}
                        </h3>
                        <p className="text-xs text-orange-400 font-semibold mt-1">Due: {t.due}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          t.completed ? "bg-slate-800 text-slate-500" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {t.completed ? "Finished" : "Pending"}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD LESSON MODAL */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Curriculum Lesson Plan 📝</h3>
            <p className="text-xs text-slate-400 mb-6">Schedule syllabus chapters and lesson objectives for your classes.</p>

            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <select
                  value={lessonForm.subject}
                  onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Social Studies">Social Studies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chapter & Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Quadratic Equations"
                  value={lessonForm.chapter}
                  onChange={(e) => setLessonForm({ ...lessonForm, chapter: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Learning Objective</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Solve quadratic equations using factorization and quadratic formula"
                  value={lessonForm.objective}
                  onChange={(e) => setLessonForm({ ...lessonForm, objective: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={lessonForm.status}
                  onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all"
                >
                  Save Lesson Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Faculty Reminder / Task 📋</h3>
            <p className="text-xs text-slate-400 mb-6">Create a personal reminder for papers, attendance, or submissions.</p>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Submit mid-term exam question papers to Principal"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date / Timing</label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow, 10:00 AM or Oct 25, 2026"
                  value={taskForm.due}
                  onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}