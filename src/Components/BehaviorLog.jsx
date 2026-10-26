import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function BehaviorLog({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState("ALL"); // ALL | Merit | Demerit
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    studentName: "",
    studentRoll: "",
    className: "Class 10-A",
    type: "Merit", // Merit | Demerit
    category: "Academic Excellence",
    points: 10,
    remarks: "",
  });

  const loadLogs = () => {
    try {
      const saved = localStorage.getItem(`erp_behavior_logs_${schoolId}`);
      if (saved) {
        setLogs(JSON.parse(saved));
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener("erp-behavior-updated", handleUpdate);
    return () => window.removeEventListener("erp-behavior-updated", handleUpdate);
  }, [schoolId]);

  const saveLogs = (updated) => {
    setLogs(updated);
    try {
      localStorage.setItem(`erp_behavior_logs_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-behavior-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.studentRoll.trim()) {
      showToast("Please provide student name and roll code.", "error");
      return;
    }

    const pointsValue = form.type === "Merit" ? Math.abs(Number(form.points)) : -Math.abs(Number(form.points));

    const newEntry = {
      id: `beh_${Date.now()}`,
      studentName: form.studentName.trim(),
      studentRoll: form.studentRoll.trim().toUpperCase(),
      className: form.className,
      type: form.type,
      category: form.category,
      points: pointsValue,
      remarks: form.remarks.trim() || (form.type === "Merit" ? "Commended for exemplary conduct." : "Cautioned for policy violation."),
      recordedBy: user?.name || "Executive Principal",
      date: new Date().toISOString().split("T")[0],
    };

    const updated = [newEntry, ...logs];
    saveLogs(updated);

    logSecurityAction({
      action: `BEHAVIOR_${form.type.toUpperCase()}_LOGGED`,
      entityType: "STUDENT_BEHAVIOR",
      entityId: newEntry.studentRoll,
      details: `Logged ${form.type} (${pointsValue > 0 ? "+" : ""}${pointsValue} pts) for ${newEntry.studentName} (${newEntry.studentRoll}): ${newEntry.category}`,
      schoolId,
    });

    showToast(`Logged ${form.type} for ${newEntry.studentName}!`, "success");
    setForm({
      studentName: "",
      studentRoll: "",
      className: "Class 10-A",
      type: "Merit",
      category: "Academic Excellence",
      points: 10,
      remarks: "",
    });
    setShowAddModal(false);
  };

  const handleDeleteLog = (id) => {
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated);
    showToast("Behavior incident record deleted.", "info");
  };

  // Helper to compute total behavior score for a student (Baseline: 100)
  const computeScore = (roll) => {
    const studentLogs = logs.filter((l) => l.studentRoll === roll);
    const delta = studentLogs.reduce((acc, curr) => acc + curr.points, 0);
    return Math.max(0, 100 + delta);
  };

  const getBadgeClass = (score) => {
    if (score >= 90) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if (score >= 75) return "bg-cyan-500/20 text-cyan-400 border-cyan-400/40";
    if (score >= 60) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-rose-500/20 text-rose-400 border-rose-500/40";
  };

  const getBadgeLabel = (score) => {
    if (score >= 95) return "Exemplary Scholar";
    if (score >= 80) return "Commendable Standing";
    if (score >= 65) return "Satisfactory";
    return "Remedial Counseling Required";
  };

  const filteredLogs = logs.filter((l) => {
    const matchesType = filterType === "ALL" || l.type === filterType;
    const matchesSearch =
      (l.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.studentRoll || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⚖️</span> Student Conduct & Character Intelligence
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Exceptional Behavior Tracker</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Record student leadership commendations (Merits) and disciplinary infractions (Demerits). Generates a dynamic composite Behavior Score badge on student records.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Log Conduct Citation</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Citations</p>
          <p className="text-2xl font-black text-white mt-1">{logs.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Merit Honors</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {logs.filter((l) => l.type === "Merit").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Demerit Infractions</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {logs.filter((l) => l.type === "Demerit").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Campus Baseline Score</p>
          <p className="text-2xl font-black text-cyan-300 mt-1">100 Pts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex-1 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search student name, roll ID, or citation category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "Merit", "Demerit"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer ${
                filterType === t
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Behavior Logs Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">⚖️</span>
            <h4 className="text-base font-bold text-white">No Behavior Citations Recorded (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All students currently maintain a flawless 100-point behavioral standing. Click "Log Conduct Citation" to record merits or demerits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Student Scholar</th>
                  <th className="p-4">Citation Category</th>
                  <th className="p-4">Points Delta</th>
                  <th className="p-4">Dynamic Behavior Score</th>
                  <th className="p-4">Incident Remarks</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredLogs.map((l) => {
                  const studentScore = computeScore(l.studentRoll);
                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                    >
                      <td className="p-4 pl-6 font-bold text-white">
                        {l.studentName}
                        <span className="block text-[10px] font-mono text-cyan-400 font-normal">
                          {l.studentRoll} • {l.className}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            l.type === "Merit"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {l.type}: {l.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-black text-sm">
                        <span className={l.points > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {l.points > 0 ? `+${l.points}` : l.points} Pts
                        </span>
                      </td>
                      <td className="p-4">
                        {/* Dynamic Behavior Score Badge */}
                        <div className="inline-flex flex-col">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider ${getBadgeClass(
                              studentScore
                            )}`}
                          >
                            ⭐ {studentScore}/100 Pts
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5 ml-1">
                            {getBadgeLabel(studentScore)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-400 max-w-[220px] truncate" title={l.remarks}>
                        {l.remarks}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => handleDeleteLog(l.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-all cursor-pointer"
                        >
                          ✕ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Log Citation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Log Student Conduct Citation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Aarav Sharma"
                    value={form.studentName}
                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Student Roll / ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., STU-101"
                    value={form.studentRoll}
                    onChange={(e) => setForm({ ...form, studentRoll: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Citation Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Merit">Merit (Positive)</option>
                    <option value="Demerit">Demerit (Penalty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Class / Batch
                  </label>
                  <input
                    type="text"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Score Delta
                  </label>
                  <select
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value={5}>5 Points</option>
                    <option value={10}>10 Points</option>
                    <option value={15}>15 Points</option>
                    <option value={20}>20 Points</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Category of Citation
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {form.type === "Merit" ? (
                    <>
                      <option value="Academic Excellence">Academic Excellence</option>
                      <option value="Leadership & Mentorship">Leadership & Mentorship</option>
                      <option value="Olympiad / Competition Winner">Olympiad / Competition Winner</option>
                      <option value="Outstanding Sportsmanship">Outstanding Sportsmanship</option>
                      <option value="Community & Civic Service">Community & Civic Service</option>
                    </>
                  ) : (
                    <>
                      <option value="Classroom Disruption">Classroom Disruption</option>
                      <option value="Chronic Unexcused Tardiness">Chronic Unexcused Tardiness</option>
                      <option value="Uniform / Dress Code Deficit">Uniform / Dress Code Deficit</option>
                      <option value="Unauthorized Device Use">Unauthorized Device Use</option>
                      <option value="Academic Dishonesty">Academic Dishonesty</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Specific Observations / Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Elaborate on the student's behavior or achievement..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
                  Save Citation ⚖️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

