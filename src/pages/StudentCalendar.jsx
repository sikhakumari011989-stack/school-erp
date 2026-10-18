import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function StudentCalendar() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";
  const userRole = (user?.role || "").toLowerCase();
  const canManage = ["teacher", "principal", "trustee", "admin"].includes(userRole);

  const [selectedMonth] = useState("Academic Session 2026-27");
  const [events, setEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    type: "Exam",
    status: "Working Day",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`erp_calendar_${schoolId}`);
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        setEvents([]);
      }
    } catch (e) {
      setEvents([]);
    }
  }, [schoolId]);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date.trim()) {
      showToast("Please provide event title and date.", "error");
      return;
    }

    const newEv = {
      id: `ev_${Date.now()}`,
      title: eventForm.title.trim(),
      date: eventForm.date.trim(),
      type: eventForm.type,
      status: eventForm.status,
    };

    const updated = [...events, newEv];
    setEvents(updated);
    try {
      localStorage.setItem(`erp_calendar_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Event "${newEv.title}" added to school calendar!`, "success");
    setEventForm({ title: "", date: "", type: "Exam", status: "Working Day" });
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id) => {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    try {
      localStorage.setItem(`erp_calendar_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Event removed from calendar.", "info");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
            <h1 className="text-3xl font-extrabold text-white">School Calendar & Holidays 📅</h1>
            <p className="text-slate-400 text-sm mt-1">Track academic schedules, examination dates, holidays, and campus events</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-white font-bold text-xs">
              {selectedMonth}
            </div>
            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                + Add Calendar Event
              </button>
            )}
          </div>
        </div>

        {/* TODAY'S STATUS BANNER */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl mb-8 flex justify-between items-center">
          <div>
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Today's Academic Status</span>
            <h2 className="text-2xl font-black text-white mt-1">Working Academic Day 📚</h2>
            <p className="text-slate-300 text-sm mt-1">Regular classes in session. Check period schedules in your student dashboard.</p>
          </div>
          <div className="text-4xl">🏫</div>
        </div>

        {/* EVENTS LIST */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Upcoming Academic Schedule & Holidays</h2>
            <span className="text-xs text-slate-400 font-semibold">{events.length} Events Listed</span>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-4xl mb-3">📅</div>
              <h3 className="text-lg font-bold text-white mb-1">Calendar Initialized (Clean Slate)</h3>
              <p className="text-sm max-w-md mx-auto text-slate-400 mb-6">
                No academic calendar events or holidays published yet. Your school administration will publish exam dates and holiday circulars here.
              </p>
              {canManage && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  + Publish First Event
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {events.map((ev, idx) => (
                <div key={ev.id || idx} className="p-6 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-xs font-bold text-emerald-400 uppercase">
                        {String(ev.date).split(" ")[0] || "DATE"}
                      </span>
                      <span className="text-lg font-black text-white">
                        {String(ev.date).split(" ")[1]?.replace(",", "") || "•"}
                      </span>
                    </div>
                    <div>
                      <span className="bg-slate-800 text-slate-300 px-3 py-0.5 rounded-md text-[10px] font-extrabold uppercase mb-1 inline-block">
                        {ev.type}
                      </span>
                      <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase ${
                        (ev.status || "").includes("Holiday")
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {ev.status}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                        title="Delete event"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD EVENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Calendar Event 📅</h3>
            <p className="text-xs text-slate-400 mb-6">Schedule examinations, campus events, or holiday notices.</p>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Examination or Diwali Vacation"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="text"
                  placeholder="e.g. Oct 20, 2026 or Nov 14, 2026"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Exam">Exam</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Event">Event</option>
                  <option value="Sports">Sports</option>
                  <option value="Celebration">Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Badge</label>
                <select
                  value={eventForm.status}
                  onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Working Day">Working Day</option>
                  <option value="Holiday 🏖️">Holiday 🏖️</option>
                  <option value="Special Schedule">Special Schedule</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}