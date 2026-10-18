import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MasterTimetableManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [schedule, setSchedule] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    day: "Monday",
    periodNo: "Period 1",
    timeWindow: "08:30 AM - 09:15 AM",
    className: "Class 10-ICSE",
    subject: "Mathematics",
    teacher: "Prof. S. R. Sharma",
    room: "Room 101",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`erp_master_timetable_${schoolId}`);
      if (saved) {
        setSchedule(JSON.parse(saved));
      } else {
        setSchedule([]);
      }
    } catch (e) {
      setSchedule([]);
    }
  }, [schoolId]);

  const handleAddPeriod = (e) => {
    e.preventDefault();
    if (!form.periodNo.trim() || !form.subject.trim() || !form.teacher.trim()) {
      showToast("Please provide period number, subject, and teacher.", "error");
      return;
    }

    const newPeriod = {
      id: `period_${Date.now()}`,
      day: form.day,
      periodNo: form.periodNo.trim(),
      timeWindow: form.timeWindow.trim(),
      className: form.className.trim(),
      subject: form.subject.trim(),
      teacher: form.teacher.trim(),
      room: form.room.trim() || "Room 101",
    };

    const updated = [...schedule, newPeriod];
    setSchedule(updated);
    try {
      localStorage.setItem(`erp_master_timetable_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: "Timetable Period Scheduled",
      entityType: "TIMETABLE",
      entityId: `${newPeriod.day}-${newPeriod.periodNo}`,
      details: `Scheduled ${newPeriod.periodNo} (${newPeriod.subject}) on ${newPeriod.day} for ${newPeriod.className}`,
      user,
      schoolId,
    });

    showToast(`Added ${newPeriod.periodNo} (${newPeriod.subject}) to ${newPeriod.day} schedule!`, "success");
    setShowAddModal(false);
  };

  const handleDeletePeriod = (id) => {
    const updated = schedule.filter((p) => p.id !== id);
    setSchedule(updated);
    try {
      localStorage.setItem(`erp_master_timetable_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Period schedule removed.", "info");
  };

  const filteredPeriods = schedule.filter((p) => p.day === selectedDay);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⏰</span> Master Curriculum Scheduling
          </div>
          <h2 className="text-2xl font-black text-white">Master Timetable & Period Scheduler</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Configure Monday–Saturday classroom bell timings, subject allocations, classroom numbers, and faculty assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setForm({ ...form, day: selectedDay });
              setShowAddModal(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add Period to {selectedDay}</span>
          </button>
        </div>
      </div>

      {/* DAY SELECTOR TABS & SCHEDULE TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">{selectedDay} Academic Timetable</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus Node: {schoolId}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDay === d
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {d} ({schedule.filter((p) => p.day === d).length})
              </button>
            ))}
          </div>
        </div>

        {filteredPeriods.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">⏰</span>
            <h4 className="text-lg font-bold text-white">No Periods Scheduled for {selectedDay} (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You haven't scheduled any periods for {selectedDay} yet. Click below to add period timings, assigned teacher, and classroom number.
            </p>
            <button
              onClick={() => {
                setForm({ ...form, day: selectedDay });
                setShowAddModal(true);
              }}
              className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Schedule First Period
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Period & Bell Timing</th>
                  <th className="p-4">Target Batch</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Faculty Instructor</th>
                  <th className="p-4">Room No.</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{p.periodNo}</p>
                      <span className="text-xs font-mono text-cyan-400">{p.timeWindow}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-200">{p.className}</td>
                    <td className="p-4">
                      <span className="bg-slate-900 border border-slate-700 text-cyan-300 px-2.5 py-1 rounded text-xs font-bold">
                        {p.subject}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-300">{p.teacher}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{p.room}</td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeletePeriod(p.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
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

      {/* ADD PERIOD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Schedule Timetable Period ⏰</h3>
            <p className="text-xs text-slate-400 mb-6">Assign subject, teacher, and room number for {form.day}.</p>

            <form onSubmit={handleAddPeriod} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Day</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Period Slot</label>
                  <select
                    value={form.periodNo}
                    onChange={(e) => setForm({ ...form, periodNo: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Period 1">Period 1</option>
                    <option value="Period 2">Period 2</option>
                    <option value="Period 3">Period 3</option>
                    <option value="Period 4">Period 4</option>
                    <option value="Period 5">Period 5</option>
                    <option value="Period 6">Period 6</option>
                    <option value="Period 7">Period 7</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time Window</label>
                <input
                  type="text"
                  placeholder="e.g. 08:30 AM - 09:15 AM"
                  value={form.timeWindow}
                  onChange={(e) => setForm({ ...form, timeWindow: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Classroom Batch</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10-ICSE"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Room No.</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Teacher</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. S. R. Sharma"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Period Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

