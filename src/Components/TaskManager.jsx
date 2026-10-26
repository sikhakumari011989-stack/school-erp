import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function TaskManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [tasks, setTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeRole: "Teacher", // Teacher | Accountant | Non-Teaching Staff (NTS)
    assigneeName: "",
    priority: "High", // High | Medium | Normal
    dueDate: "",
  });

  const loadTasks = () => {
    try {
      const saved = localStorage.getItem(`erp_tasks_${schoolId}`);
      if (saved) {
        setTasks(JSON.parse(saved));
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    loadTasks();
    const handleUpdate = () => loadTasks();
    window.addEventListener("erp-tasks-updated", handleUpdate);
    return () => window.removeEventListener("erp-tasks-updated", handleUpdate);
  }, [schoolId]);

  const saveTasks = (updated) => {
    setTasks(updated);
    try {
      localStorage.setItem(`erp_tasks_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-tasks-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assigneeName.trim()) {
      showToast("Please provide task title and assignee name.", "error");
      return;
    }

    const newTask = {
      id: `task_${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || "Complete operational requirements as delegated by Principal.",
      assigneeRole: form.assigneeRole,
      assigneeName: form.assigneeName.trim(),
      priority: form.priority,
      status: "Pending", // 'Pending' | 'In Progress' | 'Completed'
      dueDate: form.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
      assignedBy: user?.name || "Executive Principal",
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);

    logSecurityAction({
      action: "TASK_DELEGATED",
      entityType: "TASK",
      entityId: newTask.id,
      details: `Delegated task "${newTask.title}" to ${newTask.assigneeName} (${newTask.assigneeRole})`,
      schoolId,
    });

    showToast(`Task assigned to ${newTask.assigneeName}!`, "success");
    setForm({
      title: "",
      description: "",
      assigneeRole: "Teacher",
      assigneeName: "",
      priority: "High",
      dueDate: "",
    });
    setShowAddModal(false);
  };

  const handleStatusChange = (taskId, newStatus) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    saveTasks(updated);
    showToast(`Task marked as ${newStatus}`, "info");
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
    showToast("Task removed.", "info");
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesRole = filterRole === "ALL" || t.assigneeRole === filterRole;
    const matchesSearch =
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assigneeName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⚡</span> Operational Command
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Task Delegation Engine</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Assign strict institutional duties to Teachers, Accountants, or NTS staff with milestone tracking and automated status verification.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Assign New Duty</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Duties Assigned</p>
          <p className="text-2xl font-black text-white mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Verification</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {tasks.filter((t) => t.status === "Pending").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">In Progress</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {tasks.filter((t) => t.status === "In Progress").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Completed</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {tasks.filter((t) => t.status === "Completed").length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex-1 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search task title or staff name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Roles</option>
            <option value="Teacher">Teachers</option>
            <option value="Accountant">Accountants</option>
            <option value="Non-Teaching Staff (NTS)">NTS Operations</option>
          </select>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">📋</span>
            <h4 className="text-base font-bold text-white">No Delegated Tasks Found (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no active duties assigned. Click "Assign New Duty" to delegate responsibilities to staff.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Duty Title & Detail</th>
                  <th className="p-4">Assigned To</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Principal Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredTasks.map((t) => {
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                    >
                      <td className="p-4 pl-6">
                        <p className="font-bold text-white text-sm">{t.title}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-200 block text-xs">{t.assigneeName}</span>
                        <span className="text-[10px] text-cyan-400 font-mono uppercase">{t.assigneeRole}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.priority === "High"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : t.priority === "Medium"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-700 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-300">{t.dueDate}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                            t.status === "Completed"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : t.status === "In Progress"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== "In Progress" && t.status !== "Completed" && (
                            <button
                              onClick={() => handleStatusChange(t.id, "In Progress")}
                              className="text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded-lg border border-cyan-400/30 transition-all"
                            >
                              In Progress
                            </button>
                          )}
                          {t.status !== "Completed" && (
                            <button
                              onClick={() => handleStatusChange(t.id, "Completed")}
                              className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold transition-all"
                            >
                              ✓ Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 transition-all"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Assign Duty */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Assign Operational Duty</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Duty Title / Action Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Collect board exam verification certificates"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Assignee Role
                  </label>
                  <select
                    value={form.assigneeRole}
                    onChange={(e) => setForm({ ...form, assigneeRole: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Teacher">Teacher / Faculty</option>
                    <option value="Accountant">Accountant / Treasury</option>
                    <option value="Non-Teaching Staff (NTS)">Non-Teaching Staff (NTS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Assignee Name / ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Prof. Sharma / TCH-01"
                    value={form.assigneeName}
                    onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="High">High (Immediate)</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Normal">Normal Scheduled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Strict Deadline
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Specific Directives / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide precise execution details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Delegate Duty 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

